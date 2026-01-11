// src/game/store.ts

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  GameState, 
  GameSettings, 
  Player, 
  PlayerType, 
  GamePhase, 
  GameDirection, 
  CardColor,
  Card,
  CardType
} from './types';
import { createDeck, shuffleDeck, dealInitialHands, drawCards, reshuffleDiscardPile } from './deck';
import { applyCardEffect, getNextPlayerIndex, validateGameState, needsReshuffle } from './rules';
import { chooseAIMove, chooseWildColor, validateAIMove } from './ai';

interface GameStore extends GameState {
  settings: GameSettings;
  
  // Actions
  startGame: () => void;
  resetGame: () => void;
  playCard: (card: Card) => void;
  drawCard: () => void;
  callUno: () => void;
  selectWildColor: (color: CardColor) => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  
  // Internal actions
  processAITurn: () => void;
  handleDrawPenalty: () => void;
  checkForReshuffle: () => void;
}

const initialGameState: GameState = {
  players: [],
  currentPlayerIndex: 0,
  direction: GameDirection.CLOCKWISE,
  phase: GamePhase.SETUP,
  drawPile: [],
  discardPile: [],
  currentColor: CardColor.RED,
  drawPenalty: 0,
  lastAction: '',
  winner: null,
  unoCallTimeLeft: 0,
  pendingWildCard: null,
};

const defaultSettings: GameSettings = {
  allowDrawStacking: false,
  strictWildDrawFour: false,
  aiOpponents: 3,
  animationIntensity: 'full',
};

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialGameState,
    settings: defaultSettings,

    startGame: () => {
      const { settings } = get();
      const deck = shuffleDeck(createDeck());
      const playerCount = settings.aiOpponents + 1; // +1 for human player
      
      // Create players
      const players: Player[] = [
        {
          id: 'human',
          name: 'You',
          type: PlayerType.HUMAN,
          hand: [],
          hasCalledUno: false,
        }
      ];
      
      for (let i = 0; i < settings.aiOpponents; i++) {
        players.push({
          id: `ai_${i}`,
          name: `AI ${i + 1}`,
          type: PlayerType.AI,
          hand: [],
          hasCalledUno: false,
        });
      }
      
      // Deal initial hands
      const { hands, remainingDeck } = dealInitialHands(deck, playerCount);
      players.forEach((player, index) => {
        player.hand = hands[index];
      });
      
      // Find first non-wild card for initial discard
      let startCardIndex = 0;
      while (startCardIndex < remainingDeck.length && 
             (remainingDeck[startCardIndex].type === CardType.WILD || 
              remainingDeck[startCardIndex].type === CardType.WILD_DRAW_FOUR)) {
        startCardIndex++;
      }
      
      if (startCardIndex >= remainingDeck.length) {
        // Fallback: use a red 0 if no suitable card found
        const fallbackCard: Card = {
          id: 'fallback_start',
          color: CardColor.RED,
          type: CardType.NUMBER,
          value: 0
        };
        set({
          players,
          drawPile: remainingDeck,
          discardPile: [fallbackCard],
          currentColor: CardColor.RED,
          phase: GamePhase.PLAYING,
          lastAction: 'Game started!',
          currentPlayerIndex: 0,
          direction: GameDirection.CLOCKWISE,
          drawPenalty: 0,
          winner: null,
          unoCallTimeLeft: 0,
          pendingWildCard: null,
        });
      } else {
        const startCard = remainingDeck[startCardIndex];
        const newDrawPile = [...remainingDeck];
        newDrawPile.splice(startCardIndex, 1);
        
        set({
          players,
          drawPile: newDrawPile,
          discardPile: [startCard],
          currentColor: startCard.color,
          phase: GamePhase.PLAYING,
          lastAction: 'Game started!',
          currentPlayerIndex: 0,
          direction: GameDirection.CLOCKWISE,
          drawPenalty: 0,
          winner: null,
          unoCallTimeLeft: 0,
          pendingWildCard: null,
        });
      }
      
      // Process AI turn if AI goes first
      setTimeout(() => {
        const state = get();
        if (state.players[state.currentPlayerIndex]?.type === PlayerType.AI) {
          get().processAITurn();
        }
      }, 1000);
    },

    resetGame: () => {
      set({
        ...initialGameState,
        settings: get().settings,
      });
    },

    playCard: (card: Card) => {
      const state = get();
      
      if (state.phase !== GamePhase.PLAYING) return;
      
      const currentPlayer = state.players[state.currentPlayerIndex];
      if (!currentPlayer || currentPlayer.type !== PlayerType.HUMAN) return;
      
      // Verify card is in player's hand
      const cardIndex = currentPlayer.hand.findIndex(c => c.id === card.id);
      if (cardIndex === -1) return;
      
      // Handle draw penalty first
      if (state.drawPenalty > 0) {
        // Only allow Draw Two or Wild Draw Four to stack (if enabled)
        if (state.settings.allowDrawStacking && 
            (card.type === CardType.DRAW_TWO || card.type === CardType.WILD_DRAW_FOUR)) {
          // Allow stacking
        } else {
          // Must draw penalty cards first
          get().handleDrawPenalty();
          return;
        }
      }
      
      // Remove card from player's hand
      const newHand = [...currentPlayer.hand];
      newHand.splice(cardIndex, 1);
      
      const updatedPlayers = [...state.players];
      updatedPlayers[state.currentPlayerIndex] = {
        ...currentPlayer,
        hand: newHand,
        hasCalledUno: false, // Reset UNO call status
      };
      
      // Add card to discard pile
      const newDiscardPile = [...state.discardPile, card];
      
      // Check for win condition
      if (newHand.length === 0) {
        set({
          players: updatedPlayers,
          discardPile: newDiscardPile,
          winner: currentPlayer,
          phase: GamePhase.GAME_OVER,
          lastAction: `${currentPlayer.name} wins!`,
        });
        return;
      }
      
      // Handle wild cards
      if (card.type === CardType.WILD || card.type === CardType.WILD_DRAW_FOUR) {
        set({
          players: updatedPlayers,
          discardPile: newDiscardPile,
          phase: GamePhase.WILD_COLOR_SELECTION,
          pendingWildCard: card,
        });
        return;
      }
      
      // Apply card effects
      const cardEffects = applyCardEffect(card, state);
      const newCurrentColor = card.color;
      
      // Check if player should call UNO
      if (newHand.length === 1) {
        set({
          players: updatedPlayers,
          discardPile: newDiscardPile,
          currentColor: newCurrentColor,
          phase: GamePhase.UNO_CALL_WINDOW,
          unoCallTimeLeft: 2000, // 2 seconds to call UNO
          ...cardEffects,
        });
        
        // Auto-penalty after timeout
        setTimeout(() => {
          const currentState = get();
          if (currentState.phase === GamePhase.UNO_CALL_WINDOW) {
            // Player failed to call UNO, apply penalty
            get().checkForReshuffle();
            const { drawnCards, remainingDeck } = drawCards(currentState.drawPile, 2);
            
            const penalizedPlayers = [...currentState.players];
            const playerIndex = penalizedPlayers.findIndex(p => p.id === currentPlayer.id);
            if (playerIndex !== -1) {
              penalizedPlayers[playerIndex] = {
                ...penalizedPlayers[playerIndex],
                hand: [...penalizedPlayers[playerIndex].hand, ...drawnCards],
              };
            }
            
            set({
              players: penalizedPlayers,
              drawPile: remainingDeck,
              phase: GamePhase.PLAYING,
              lastAction: `${currentPlayer.name} failed to call UNO and drew 2 cards`,
            });
            
            // Continue with AI turns
            setTimeout(() => {
              const state = get();
              if (state.players[state.currentPlayerIndex]?.type === PlayerType.AI) {
                get().processAITurn();
              }
            }, 500);
          }
        }, 2000);
        
        return;
      }
      
      // Normal card play
      set({
        players: updatedPlayers,
        discardPile: newDiscardPile,
        currentColor: newCurrentColor,
        ...cardEffects,
      });
      
      // Continue with AI turns
      setTimeout(() => {
        const state = get();
        if (state.players[state.currentPlayerIndex]?.type === PlayerType.AI) {
          get().processAITurn();
        }
      }, 500);
    },

    drawCard: () => {
      const state = get();
      
      if (state.phase !== GamePhase.PLAYING) return;
      
      const currentPlayer = state.players[state.currentPlayerIndex];
      if (!currentPlayer || currentPlayer.type !== PlayerType.HUMAN) return;
      
      // Handle draw penalty
      if (state.drawPenalty > 0) {
        get().handleDrawPenalty();
        return;
      }
      
      get().checkForReshuffle();
      
      const { drawnCards, remainingDeck } = drawCards(state.drawPile, 1);
      const drawnCard = drawnCards[0];
      
      const updatedPlayers = [...state.players];
      updatedPlayers[state.currentPlayerIndex] = {
        ...currentPlayer,
        hand: [...currentPlayer.hand, drawnCard],
      };
      
      // Move to next player
      const nextPlayerIndex = getNextPlayerIndex(
        state.currentPlayerIndex,
        state.players.length,
        state.direction
      );
      
      set({
        players: updatedPlayers,
        drawPile: remainingDeck,
        currentPlayerIndex: nextPlayerIndex,
        lastAction: `${currentPlayer.name} drew a card`,
      });
      
      // Continue with AI turns
      setTimeout(() => {
        const newState = get();
        if (newState.players[newState.currentPlayerIndex]?.type === PlayerType.AI) {
          get().processAITurn();
        }
      }, 500);
    },

    callUno: () => {
      const state = get();
      
      if (state.phase !== GamePhase.UNO_CALL_WINDOW) return;
      
      const currentPlayer = state.players[state.currentPlayerIndex];
      if (!currentPlayer || currentPlayer.type !== PlayerType.HUMAN) return;
      
      const updatedPlayers = [...state.players];
      updatedPlayers[state.currentPlayerIndex] = {
        ...currentPlayer,
        hasCalledUno: true,
      };
      
      set({
        players: updatedPlayers,
        phase: GamePhase.PLAYING,
        lastAction: `${currentPlayer.name} called UNO!`,
      });
      
      // Continue with AI turns
      setTimeout(() => {
        const state = get();
        if (state.players[state.currentPlayerIndex]?.type === PlayerType.AI) {
          get().processAITurn();
        }
      }, 500);
    },

    selectWildColor: (color: CardColor) => {
      const state = get();
      
      if (state.phase !== GamePhase.WILD_COLOR_SELECTION || !state.pendingWildCard) return;
      
      const cardEffects = applyCardEffect(state.pendingWildCard, state);
      
      set({
        currentColor: color,
        phase: GamePhase.PLAYING,
        pendingWildCard: null,
        lastAction: `Wild color changed to ${color}`,
        ...cardEffects,
      });
      
      // Continue with AI turns
      setTimeout(() => {
        const state = get();
        if (state.players[state.currentPlayerIndex]?.type === PlayerType.AI) {
          get().processAITurn();
        }
      }, 500);
    },

    updateSettings: (newSettings: Partial<GameSettings>) => {
      set({
        settings: { ...get().settings, ...newSettings },
      });
    },

    processAITurn: () => {
      const state = get();
      
      if (state.phase !== GamePhase.PLAYING) return;
      
      const currentPlayer = state.players[state.currentPlayerIndex];
      if (!currentPlayer || currentPlayer.type !== PlayerType.AI) return;
      
      // Handle draw penalty
      if (state.drawPenalty > 0) {
        get().handleDrawPenalty();
        return;
      }
      
      const move = chooseAIMove(currentPlayer, state, state.settings.strictWildDrawFour);
      
      if (!validateAIMove(move, currentPlayer, state)) {
        console.error('Invalid AI move detected, forcing draw');
        get().checkForReshuffle();
        const { drawnCards, remainingDeck } = drawCards(state.drawPile, 1);
        
        const updatedPlayers = [...state.players];
        updatedPlayers[state.currentPlayerIndex] = {
          ...currentPlayer,
          hand: [...currentPlayer.hand, ...drawnCards],
        };
        
        const nextPlayerIndex = getNextPlayerIndex(
          state.currentPlayerIndex,
          state.players.length,
          state.direction
        );
        
        set({
          players: updatedPlayers,
          drawPile: remainingDeck,
          currentPlayerIndex: nextPlayerIndex,
          lastAction: `${currentPlayer.name} drew a card`,
        });
        return;
      }
      
      if (move.type === 'DRAW_CARD') {
        get().checkForReshuffle();
        const { drawnCards, remainingDeck } = drawCards(state.drawPile, 1);
        
        const updatedPlayers = [...state.players];
        updatedPlayers[state.currentPlayerIndex] = {
          ...currentPlayer,
          hand: [...currentPlayer.hand, ...drawnCards],
        };
        
        const nextPlayerIndex = getNextPlayerIndex(
          state.currentPlayerIndex,
          state.players.length,
          state.direction
        );
        
        set({
          players: updatedPlayers,
          drawPile: remainingDeck,
          currentPlayerIndex: nextPlayerIndex,
          lastAction: `${currentPlayer.name} drew a card`,
        });
        
        // Continue AI chain
        setTimeout(() => {
          const newState = get();
          if (newState.players[newState.currentPlayerIndex]?.type === PlayerType.AI) {
            get().processAITurn();
          }
        }, 1000);
        
      } else if (move.type === 'PLAY_CARD' && move.card) {
        // AI plays card
        const cardIndex = currentPlayer.hand.findIndex(c => c.id === move.card!.id);
        const newHand = [...currentPlayer.hand];
        newHand.splice(cardIndex, 1);
        
        const updatedPlayers = [...state.players];
        updatedPlayers[state.currentPlayerIndex] = {
          ...currentPlayer,
          hand: newHand,
          hasCalledUno: newHand.length === 1, // AI auto-calls UNO
        };
        
        const newDiscardPile = [...state.discardPile, move.card];
        
        // Check for win
        if (newHand.length === 0) {
          set({
            players: updatedPlayers,
            discardPile: newDiscardPile,
            winner: currentPlayer,
            phase: GamePhase.GAME_OVER,
            lastAction: `${currentPlayer.name} wins!`,
          });
          return;
        }
        
        // Handle wild cards
        if (move.card.type === CardType.WILD || move.card.type === CardType.WILD_DRAW_FOUR) {
          const chosenColor = chooseWildColor(currentPlayer.hand);
          const cardEffects = applyCardEffect(move.card, state);
          
          set({
            players: updatedPlayers,
            discardPile: newDiscardPile,
            currentColor: chosenColor,
            lastAction: `${currentPlayer.name} played ${move.card.type} and chose ${chosenColor}`,
            ...cardEffects,
          });
        } else {
          const cardEffects = applyCardEffect(move.card, state);
          
          set({
            players: updatedPlayers,
            discardPile: newDiscardPile,
            currentColor: move.card.color,
            ...cardEffects,
          });
        }
        
        // Continue AI chain
        setTimeout(() => {
          const newState = get();
          if (newState.players[newState.currentPlayerIndex]?.type === PlayerType.AI) {
            get().processAITurn();
          }
        }, 1000);
      }
    },

    handleDrawPenalty: () => {
      const state = get();
      const currentPlayer = state.players[state.currentPlayerIndex];
      
      if (state.drawPenalty === 0 || !currentPlayer) return;
      
      get().checkForReshuffle();
      const { drawnCards, remainingDeck } = drawCards(state.drawPile, state.drawPenalty);
      
      const updatedPlayers = [...state.players];
      updatedPlayers[state.currentPlayerIndex] = {
        ...currentPlayer,
        hand: [...currentPlayer.hand, ...drawnCards],
      };
      
      const nextPlayerIndex = getNextPlayerIndex(
        state.currentPlayerIndex,
        state.players.length,
        state.direction
      );
      
      set({
        players: updatedPlayers,
        drawPile: remainingDeck,
        currentPlayerIndex: nextPlayerIndex,
        drawPenalty: 0,
        lastAction: `${currentPlayer.name} drew ${state.drawPenalty} penalty cards`,
      });
      
      // Continue with next player
      setTimeout(() => {
        const newState = get();
        if (newState.players[newState.currentPlayerIndex]?.type === PlayerType.AI) {
          get().processAITurn();
        }
      }, 1000);
    },

    checkForReshuffle: () => {
      const state = get();
      
      if (needsReshuffle(state.drawPile, Math.max(1, state.drawPenalty))) {
        if (state.discardPile.length <= 1) {
          console.error('Cannot reshuffle: not enough cards');
          return;
        }
        
        const reshuffledCards = reshuffleDiscardPile(state.discardPile);
        const topCard = state.discardPile[state.discardPile.length - 1];
        
        set({
          drawPile: [...state.drawPile, ...reshuffledCards],
          discardPile: [topCard],
          lastAction: 'Deck reshuffled',
        });
      }
    },
  }))
);

// Validate game state on every update (dev only)
if (process.env.NODE_ENV === 'development') {
  useGameStore.subscribe((state) => {
    if (state.phase === GamePhase.PLAYING) {
      const errors = validateGameState(state);
      if (errors.length > 0) {
        console.error('Game state validation errors:', errors);
      }
    }
  });
}