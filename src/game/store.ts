// src/game/store.ts

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { 
  GameState, 
  GameSettings, 
  Player, 
  Card,
  GameError,
  InvalidMoveError,
  GameStateError,
  GAME_CONSTANTS,
  isWildCard,
  isValidNonWildColor
} from './types';
import { 
  createDeck, 
  shuffleDeck, 
  dealInitialHands, 
  drawCards, 
  reshuffleDiscardPile,
  findStartingCard 
} from './deck';
import { 
  applyCardEffect, 
  getNextPlayerIndex, 
  validateGameState, 
  needsReshuffle,
  canGameContinue,
  getPlayableCards 
} from './rules';
import { 
  chooseAIMove, 
  chooseWildColor, 
  validateAIMove,
  createAIAnalytics,
  type AIAnalytics 
} from './ai';

interface GameStore extends GameState {
  settings: GameSettings;
  analytics: AIAnalytics;
  isProcessingMove: boolean;
  error: string | null;
  
  // Actions
  startGame: () => Promise<void>;
  resetGame: () => void;
  playCard: (card: Card) => Promise<void>;
  drawCard: () => Promise<void>;
  callUno: () => void;
  selectWildColor: (color: Exclude<Card['color'], 'wild'>) => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  clearError: () => void;
  
  // Internal actions
  processAITurn: () => Promise<void>;
  handleDrawPenalty: () => Promise<void>;
  checkForReshuffle: () => void;
  handleUnoMissed: () => void;
  executeAIDraw: (player: Player) => Promise<void>;
  executeAIPlay: (player: Player, card: Card) => Promise<void>;
  forceAIDraw: (player: Player) => Promise<void>;
  
  // Utility getters
  getCurrentPlayer: () => Player | null;
  getPlayableCards: () => readonly Card[];
  canCurrentPlayerPlay: () => boolean;
}

const initialGameState: GameState = {
  players: [],
  currentPlayerIndex: 0,
  direction: 'clockwise',
  phase: 'setup',
  drawPile: [],
  discardPile: [],
  currentColor: 'red',
  drawPenalty: 0,
  lastAction: '',
  winner: null,
  unoCallTimeLeft: 0,
  pendingWildCard: null,
  gameStartTime: Date.now(),
  turnStartTime: Date.now(),
};

const defaultSettings: GameSettings = {
  allowDrawStacking: false,
  strictWildDrawFour: false,
  aiOpponents: 3,
  animationIntensity: 'full',
  autoCallUno: false,
  turnTimeLimit: 0, // Unlimited
  soundEnabled: true,
};

export const useGameStore = create<GameStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...initialGameState,
      settings: defaultSettings,
      analytics: createAIAnalytics(),
      isProcessingMove: false,
      error: null,

      startGame: async () => {
        try {
          set(state => {
            state.isProcessingMove = true;
            state.error = null;
          });

          const { settings } = get();
          const deck = shuffleDeck(createDeck());
          const playerCount = Math.min(settings.aiOpponents + 1, GAME_CONSTANTS.MAX_PLAYERS);
          
          // Create players with immutable structure
          const players: Player[] = [
            {
              id: 'human',
              name: 'You',
              type: 'human',
              hand: [],
              hasCalledUno: false,
              isConnected: true,
            }
          ];
          
          for (let i = 0; i < settings.aiOpponents; i++) {
            players.push({
              id: `ai_${i}`,
              name: `AI ${i + 1}`,
              type: 'ai',
              hand: [],
              hasCalledUno: false,
              isConnected: true,
            });
          }
          
          // Deal initial hands
          const { hands, remainingDeck } = dealInitialHands(deck, playerCount);
          players.forEach((player, index) => {
            (player as any).hand = hands[index];
          });
          
          // Find suitable starting card
          const { startingCard, remainingDeck: finalDeck } = findStartingCard(remainingDeck);
          
          const gameStartTime = Date.now();
          
          set(state => {
            state.players = Object.freeze(players);
            state.drawPile = Object.freeze(finalDeck);
            state.discardPile = Object.freeze([startingCard]);
            state.currentColor = isWildCard(startingCard) ? 'red' : startingCard.color;
            state.phase = 'playing';
            state.lastAction = 'Game started!';
            state.currentPlayerIndex = 0;
            state.direction = 'clockwise';
            state.drawPenalty = 0;
            state.winner = null;
            state.unoCallTimeLeft = 0;
            state.pendingWildCard = null;
            state.gameStartTime = gameStartTime;
            state.turnStartTime = gameStartTime;
            state.isProcessingMove = false;
            state.analytics = createAIAnalytics();
          });
          
          // Process AI turn if AI goes first
          setTimeout(async () => {
            const state = get();
            if (state.players[state.currentPlayerIndex]?.type === 'ai') {
              await get().processAITurn();
            }
          }, 1000);
          
        } catch (error) {
          set(state => {
            state.error = error instanceof Error ? error.message : 'Failed to start game';
            state.isProcessingMove = false;
          });
        }
      },

      resetGame: () => {
        set(state => {
          Object.assign(state, {
            ...initialGameState,
            settings: state.settings,
            analytics: createAIAnalytics(),
            isProcessingMove: false,
            error: null,
          });
        });
      },

      playCard: async (card: Card) => {
        try {
          const state = get();
          
          if (state.isProcessingMove) return;
          if (state.phase !== 'playing') return;
          
          const currentPlayer = state.players[state.currentPlayerIndex];
          if (!currentPlayer || currentPlayer.type !== 'human') return;
          
          set(draft => { draft.isProcessingMove = true; });
          
          // Verify card is in player's hand
          const cardIndex = currentPlayer.hand.findIndex(c => c.id === card.id);
          if (cardIndex === -1) {
            throw new InvalidMoveError('Card not found in hand');
          }
          
          // Handle draw penalty first
          if (state.drawPenalty > 0) {
            if (state.settings.allowDrawStacking && 
                (card.type === 'draw_two' || card.type === 'wild_draw_four')) {
              // Allow stacking
            } else {
              // Must draw penalty cards first
              await get().handleDrawPenalty();
              return;
            }
          }
          
          // Remove card from player's hand
          const newHand = [...currentPlayer.hand];
          newHand.splice(cardIndex, 1);
          
          set(state => {
            const updatedPlayers = [...state.players];
            updatedPlayers[state.currentPlayerIndex] = {
              ...currentPlayer,
              hand: Object.freeze(newHand),
              hasCalledUno: false,
            };
            state.players = Object.freeze(updatedPlayers);
            state.discardPile = Object.freeze([...state.discardPile, card]);
          });
          
          // Check for win condition
          if (newHand.length === 0) {
            set(state => {
              state.winner = currentPlayer;
              state.phase = 'game_over';
              state.lastAction = `${currentPlayer.name} wins!`;
              state.isProcessingMove = false;
            });
            return;
          }
          
          // Handle wild cards
          if (isWildCard(card)) {
            set(state => {
              state.phase = 'wild_color_selection';
              state.pendingWildCard = card;
              state.isProcessingMove = false;
            });
            return;
          }
          
          // Apply card effects
          const cardEffects = applyCardEffect(card, state);
          const newCurrentColor = isWildCard(card) ? state.currentColor : card.color;
          
          // Check if player should call UNO
          if (newHand.length === 1) {
            set(state => {
              state.currentColor = newCurrentColor;
              state.phase = 'uno_call_window';
              state.unoCallTimeLeft = GAME_CONSTANTS.UNO_CALL_TIME_LIMIT;
              state.isProcessingMove = false;
              Object.assign(state, cardEffects);
            });
            
            // Auto-penalty after timeout
            setTimeout(() => {
              const currentState = get();
              if (currentState.phase === 'uno_call_window') {
                get().handleUnoMissed();
              }
            }, GAME_CONSTANTS.UNO_CALL_TIME_LIMIT);
            
            return;
          }
          
          // Normal card play
          set(state => {
            state.currentColor = newCurrentColor;
            state.isProcessingMove = false;
            Object.assign(state, cardEffects);
          });
          
          // Continue with AI turns
          setTimeout(async () => {
            const state = get();
            if (state.players[state.currentPlayerIndex]?.type === 'ai') {
              await get().processAITurn();
            }
          }, 500);
          
        } catch (error) {
          set(state => {
            state.error = error instanceof Error ? error.message : 'Failed to play card';
            state.isProcessingMove = false;
          });
        }
      },

      drawCard: async () => {
        try {
          const state = get();
          
          if (state.isProcessingMove) return;
          if (state.phase !== 'playing') return;
          
          const currentPlayer = state.players[state.currentPlayerIndex];
          if (!currentPlayer || currentPlayer.type !== 'human') return;
          
          set(draft => { draft.isProcessingMove = true; });
          
          // Handle draw penalty
          if (state.drawPenalty > 0) {
            await get().handleDrawPenalty();
            return;
          }
          
          get().checkForReshuffle();
          
          const { drawnCards, remainingDeck } = drawCards(state.drawPile, 1);
          const drawnCard = drawnCards[0];
          
          const nextPlayerIndex = getNextPlayerIndex(
            state.currentPlayerIndex,
            state.players.length,
            state.direction
          );
          
          set(state => {
            const updatedPlayers = [...state.players];
            updatedPlayers[state.currentPlayerIndex] = {
              ...currentPlayer,
              hand: Object.freeze([...currentPlayer.hand, drawnCard]),
            };
            state.players = Object.freeze(updatedPlayers);
            state.drawPile = Object.freeze(remainingDeck);
            state.currentPlayerIndex = nextPlayerIndex;
            state.lastAction = `${currentPlayer.name} drew a card`;
            state.turnStartTime = Date.now();
            state.isProcessingMove = false;
          });
          
          // Continue with AI turns
          setTimeout(async () => {
            const newState = get();
            if (newState.players[newState.currentPlayerIndex]?.type === 'ai') {
              await get().processAITurn();
            }
          }, 500);
          
        } catch (error) {
          set(state => {
            state.error = error instanceof Error ? error.message : 'Failed to draw card';
            state.isProcessingMove = false;
          });
        }
      },

      callUno: () => {
        const state = get();
        
        if (state.phase !== 'uno_call_window') return;
        
        const currentPlayer = state.players[state.currentPlayerIndex];
        if (!currentPlayer || currentPlayer.type !== 'human') return;
        
        set(state => {
          const updatedPlayers = [...state.players];
          updatedPlayers[state.currentPlayerIndex] = {
            ...currentPlayer,
            hasCalledUno: true,
          };
          state.players = Object.freeze(updatedPlayers);
          state.phase = 'playing';
          state.lastAction = `${currentPlayer.name} called UNO!`;
        });
        
        // Continue with AI turns
        setTimeout(async () => {
          const state = get();
          if (state.players[state.currentPlayerIndex]?.type === 'ai') {
            await get().processAITurn();
          }
        }, 500);
      },

      selectWildColor: (color: Exclude<Card['color'], 'wild'>) => {
        const state = get();
        
        if (state.phase !== 'wild_color_selection' || !state.pendingWildCard) return;
        
        if (!isValidNonWildColor(color)) {
          set(state => {
            state.error = `Invalid color selection: ${color}`;
          });
          return;
        }
        
        const cardEffects = applyCardEffect(state.pendingWildCard, state);
        
        set(state => {
          state.currentColor = color;
          state.phase = 'playing';
          state.pendingWildCard = null;
          state.lastAction = `Wild color changed to ${color}`;
          Object.assign(state, cardEffects);
        });
        
        // Continue with AI turns
        setTimeout(async () => {
          const state = get();
          if (state.players[state.currentPlayerIndex]?.type === 'ai') {
            await get().processAITurn();
          }
        }, 500);
      },

      updateSettings: (newSettings: Partial<GameSettings>) => {
        set(state => {
          state.settings = { ...state.settings, ...newSettings };
        });
      },

      clearError: () => {
        set(state => {
          state.error = null;
        });
      },

      processAITurn: async () => {
        try {
          const state = get();
          
          if (state.phase !== 'playing') return;
          
          const currentPlayer = state.players[state.currentPlayerIndex];
          if (!currentPlayer || currentPlayer.type !== 'ai') return;
          
          // Handle draw penalty
          if (state.drawPenalty > 0) {
            await get().handleDrawPenalty();
            return;
          }
          
          const move = chooseAIMove(currentPlayer, state, state.settings.strictWildDrawFour);
          
          if (!validateAIMove(move, currentPlayer, state)) {
            console.error('Invalid AI move detected, forcing draw');
            await get().forceAIDraw(currentPlayer);
            return;
          }
          
          // Update analytics
          set(state => {
            state.analytics.movesPlayed++;
            state.analytics.averageConfidence = 
              (state.analytics.averageConfidence * (state.analytics.movesPlayed - 1) + move.confidence) / 
              state.analytics.movesPlayed;
          });
          
          if (move.type === 'DRAW_CARD') {
            await get().executeAIDraw(currentPlayer);
          } else if (move.type === 'PLAY_CARD' && move.card) {
            await get().executeAIPlay(currentPlayer, move.card);
          }
          
        } catch (error) {
          console.error('Error in AI turn:', error);
          const currentPlayer = get().players[get().currentPlayerIndex];
          if (currentPlayer) {
            await get().forceAIDraw(currentPlayer);
          }
        }
      },

      handleDrawPenalty: async () => {
        const state = get();
        const currentPlayer = state.players[state.currentPlayerIndex];
        
        if (state.drawPenalty === 0 || !currentPlayer) return;
        
        get().checkForReshuffle();
        const { drawnCards, remainingDeck } = drawCards(state.drawPile, state.drawPenalty);
        
        const nextPlayerIndex = getNextPlayerIndex(
          state.currentPlayerIndex,
          state.players.length,
          state.direction
        );
        
        set(state => {
          const updatedPlayers = [...state.players];
          updatedPlayers[state.currentPlayerIndex] = {
            ...currentPlayer,
            hand: Object.freeze([...currentPlayer.hand, ...drawnCards]),
          };
          state.players = Object.freeze(updatedPlayers);
          state.drawPile = Object.freeze(remainingDeck);
          state.currentPlayerIndex = nextPlayerIndex;
          state.drawPenalty = 0;
          state.lastAction = `${currentPlayer.name} drew ${state.drawPenalty} penalty cards`;
          state.turnStartTime = Date.now();
        });
        
        // Continue with next player
        setTimeout(async () => {
          const newState = get();
          if (newState.players[newState.currentPlayerIndex]?.type === 'ai') {
            await get().processAITurn();
          }
        }, 1000);
      },

      checkForReshuffle: () => {
        const state = get();
        
        if (needsReshuffle(state.drawPile, Math.max(1, state.drawPenalty))) {
          if (state.discardPile.length <= 1) {
            throw new GameStateError('Cannot reshuffle: not enough cards');
          }
          
          const reshuffledCards = reshuffleDiscardPile(state.discardPile);
          const topCard = state.discardPile[state.discardPile.length - 1];
          
          set(state => {
            state.drawPile = Object.freeze([...state.drawPile, ...reshuffledCards]);
            state.discardPile = Object.freeze([topCard]);
            state.lastAction = 'Deck reshuffled';
          });
        }
      },

      // Helper methods
      executeAIDraw: async (player: Player) => {
        get().checkForReshuffle();
        const state = get();
        const { drawnCards, remainingDeck } = drawCards(state.drawPile, 1);
        
        const nextPlayerIndex = getNextPlayerIndex(
          state.currentPlayerIndex,
          state.players.length,
          state.direction
        );
        
        set(state => {
          const updatedPlayers = [...state.players];
          const playerIndex = updatedPlayers.findIndex(p => p.id === player.id);
          if (playerIndex !== -1) {
            updatedPlayers[playerIndex] = {
              ...player,
              hand: Object.freeze([...player.hand, ...drawnCards]),
            };
          }
          state.players = Object.freeze(updatedPlayers);
          state.drawPile = Object.freeze(remainingDeck);
          state.currentPlayerIndex = nextPlayerIndex;
          state.lastAction = `${player.name} drew a card`;
          state.turnStartTime = Date.now();
        });
        
        // Continue AI chain
        setTimeout(async () => {
          const newState = get();
          if (newState.players[newState.currentPlayerIndex]?.type === 'ai') {
            await get().processAITurn();
          }
        }, 1000);
      },

      executeAIPlay: async (player: Player, card: Card) => {
        const state = get();
        const cardIndex = player.hand.findIndex(c => c.id === card.id);
        const newHand = [...player.hand];
        newHand.splice(cardIndex, 1);
        
        set(state => {
          const updatedPlayers = [...state.players];
          const playerIndex = updatedPlayers.findIndex(p => p.id === player.id);
          if (playerIndex !== -1) {
            updatedPlayers[playerIndex] = {
              ...player,
              hand: Object.freeze(newHand),
              hasCalledUno: newHand.length === 1, // AI auto-calls UNO
            };
          }
          state.players = Object.freeze(updatedPlayers);
          state.discardPile = Object.freeze([...state.discardPile, card]);
        });
        
        // Check for win
        if (newHand.length === 0) {
          set(state => {
            state.winner = player;
            state.phase = 'game_over';
            state.lastAction = `${player.name} wins!`;
          });
          return;
        }
        
        // Handle wild cards
        if (isWildCard(card)) {
          const chosenColor = chooseWildColor(player.hand, state);
          const cardEffects = applyCardEffect(card, state);
          
          set(state => {
            state.currentColor = chosenColor;
            state.lastAction = `${player.name} played ${card.type} and chose ${chosenColor}`;
            state.analytics.wildCardsPlayed++;
            Object.assign(state, cardEffects);
          });
        } else {
          const cardEffects = applyCardEffect(card, state);
          
          set(state => {
            state.currentColor = card.color;
            Object.assign(state, cardEffects);
          });
        }
        
        // Continue AI chain
        setTimeout(async () => {
          const newState = get();
          if (newState.players[newState.currentPlayerIndex]?.type === 'ai') {
            await get().processAITurn();
          }
        }, 1000);
      },

      forceAIDraw: async (player: Player) => {
        await get().executeAIDraw(player);
      },

      handleUnoMissed: () => {
        const state = get();
        const currentPlayer = state.players[state.currentPlayerIndex];
        if (!currentPlayer) return;
        
        get().checkForReshuffle();
        const { drawnCards, remainingDeck } = drawCards(state.drawPile, 2);
        
        set(state => {
          const updatedPlayers = [...state.players];
          const playerIndex = updatedPlayers.findIndex(p => p.id === currentPlayer.id);
          if (playerIndex !== -1) {
            updatedPlayers[playerIndex] = {
              ...currentPlayer,
              hand: Object.freeze([...currentPlayer.hand, ...drawnCards]),
            };
          }
          state.players = Object.freeze(updatedPlayers);
          state.drawPile = Object.freeze(remainingDeck);
          state.phase = 'playing';
          state.lastAction = `${currentPlayer.name} failed to call UNO and drew 2 cards`;
        });
        
        // Continue with AI turns
        setTimeout(async () => {
          const state = get();
          if (state.players[state.currentPlayerIndex]?.type === 'ai') {
            await get().processAITurn();
          }
        }, 500);
      },

      // Utility getters
      getCurrentPlayer: () => {
        const state = get();
        return state.players[state.currentPlayerIndex] || null;
      },

      getPlayableCards: () => {
        const state = get();
        const currentPlayer = state.getCurrentPlayer();
        if (!currentPlayer || currentPlayer.type !== 'human') return [];
        
        const topCard = state.discardPile[state.discardPile.length - 1];
        if (!topCard) return [];
        
        return getPlayableCards(
          currentPlayer.hand,
          topCard,
          state.currentColor,
          state.settings.strictWildDrawFour
        );
      },

      canCurrentPlayerPlay: () => {
        const state = get();
        return state.getPlayableCards().length > 0;
      },
    }))
  )
);

// Validate game state on every update (dev only)
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  useGameStore.subscribe((state) => {
    if (state.phase === 'playing' && canGameContinue(state)) {
      const errors = validateGameState(state);
      if (errors.length > 0) {
        console.error('Game state validation errors:', errors);
      }
    }
  });
}