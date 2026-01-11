// src/game/engine.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { Card, CardColor, CardType, GameDirection, Player, PlayerType, GameState, GamePhase } from './types';
import { isPlayable, getPlayableCards, applyCardEffect, getNextPlayerIndex, shouldCallUno, canWin, needsReshuffle, validateGameState } from './rules';
import { createDeck, shuffleDeck, drawCards, reshuffleDiscardPile, dealInitialHands } from './deck';
import { chooseAIMove, chooseWildColor, validateAIMove } from './ai';

describe('Card Rules', () => {
  const redFive: Card = { id: '1', color: CardColor.RED, type: CardType.NUMBER, value: 5 };
  const blueFive: Card = { id: '2', color: CardColor.BLUE, type: CardType.NUMBER, value: 5 };
  const redSkip: Card = { id: '3', color: CardColor.RED, type: CardType.SKIP };
  const blueSkip: Card = { id: '4', color: CardColor.BLUE, type: CardType.SKIP };
  const wild: Card = { id: '5', color: CardColor.WILD, type: CardType.WILD };
  const wildDrawFour: Card = { id: '6', color: CardColor.WILD, type: CardType.WILD_DRAW_FOUR };

  it('should allow same color cards', () => {
    expect(isPlayable(redFive, redSkip, CardColor.RED)).toBe(true);
  });

  it('should allow same value cards', () => {
    expect(isPlayable(blueFive, redFive, CardColor.RED)).toBe(true);
  });

  it('should allow same action type cards', () => {
    expect(isPlayable(blueSkip, redSkip, CardColor.RED)).toBe(true);
  });

  it('should allow wild cards always', () => {
    expect(isPlayable(wild, redFive, CardColor.RED)).toBe(true);
    expect(isPlayable(wildDrawFour, redFive, CardColor.RED)).toBe(true);
  });

  it('should reject unmatched cards', () => {
    const greenSeven: Card = { id: '7', color: CardColor.GREEN, type: CardType.NUMBER, value: 7 };
    expect(isPlayable(greenSeven, redFive, CardColor.RED)).toBe(false);
  });

  it('should enforce strict Wild Draw Four rules', () => {
    const hand = [redFive, blueFive, wild];
    expect(isPlayable(wildDrawFour, redSkip, CardColor.RED, hand)).toBe(false); // Has red card
    
    const handWithoutRed = [blueFive, wild];
    expect(isPlayable(wildDrawFour, redSkip, CardColor.RED, handWithoutRed)).toBe(true); // No red card
  });
});

describe('Game Flow', () => {
  let gameState: GameState;
  let players: Player[];

  beforeEach(() => {
    players = [
      { id: '1', name: 'Player 1', type: PlayerType.HUMAN, hand: [], hasCalledUno: false },
      { id: '2', name: 'Player 2', type: PlayerType.AI, hand: [], hasCalledUno: false },
      { id: '3', name: 'Player 3', type: PlayerType.AI, hand: [], hasCalledUno: false },
    ];

    gameState = {
      players,
      currentPlayerIndex: 0,
      direction: GameDirection.CLOCKWISE,
      phase: GamePhase.PLAYING,
      drawPile: [],
      discardPile: [{ id: 'top', color: CardColor.RED, type: CardType.NUMBER, value: 5 }],
      currentColor: CardColor.RED,
      drawPenalty: 0,
      lastAction: '',
      winner: null,
      unoCallTimeLeft: 0,
      pendingWildCard: null,
    };
  });

  it('should advance to next player clockwise', () => {
    const nextIndex = getNextPlayerIndex(0, 3, GameDirection.CLOCKWISE);
    expect(nextIndex).toBe(1);
    
    const wrapIndex = getNextPlayerIndex(2, 3, GameDirection.CLOCKWISE);
    expect(wrapIndex).toBe(0);
  });

  it('should advance to next player counterclockwise', () => {
    const nextIndex = getNextPlayerIndex(1, 3, GameDirection.COUNTERCLOCKWISE);
    expect(nextIndex).toBe(0);
    
    const wrapIndex = getNextPlayerIndex(0, 3, GameDirection.COUNTERCLOCKWISE);
    expect(wrapIndex).toBe(2);
  });

  it('should handle Skip card correctly', () => {
    const skipCard: Card = { id: 'skip', color: CardColor.RED, type: CardType.SKIP };
    const effects = applyCardEffect(skipCard, gameState);
    
    expect(effects.currentPlayerIndex).toBe(2); // Skip player 1, go to player 2
  });

  it('should handle Reverse card correctly', () => {
    const reverseCard: Card = { id: 'reverse', color: CardColor.RED, type: CardType.REVERSE };
    const effects = applyCardEffect(reverseCard, gameState);
    
    expect(effects.direction).toBe(GameDirection.COUNTERCLOCKWISE);
    expect(effects.currentPlayerIndex).toBe(2); // Next player in reverse direction
  });

  it('should handle Reverse in 2-player game as Skip', () => {
    const twoPlayerState = { ...gameState, players: players.slice(0, 2) };
    const reverseCard: Card = { id: 'reverse', color: CardColor.RED, type: CardType.REVERSE };
    const effects = applyCardEffect(reverseCard, twoPlayerState);
    
    expect(effects.direction).toBe(GameDirection.COUNTERCLOCKWISE);
    expect(effects.currentPlayerIndex).toBe(0); // Stay on same player (skip effect)
  });

  it('should handle Draw Two card correctly', () => {
    const drawTwoCard: Card = { id: 'draw2', color: CardColor.RED, type: CardType.DRAW_TWO };
    const effects = applyCardEffect(drawTwoCard, gameState);
    
    expect(effects.drawPenalty).toBe(2);
    expect(effects.currentPlayerIndex).toBe(1);
  });

  it('should handle Wild Draw Four card correctly', () => {
    const wildDrawFourCard: Card = { id: 'wild4', color: CardColor.WILD, type: CardType.WILD_DRAW_FOUR };
    const effects = applyCardEffect(wildDrawFourCard, gameState);
    
    expect(effects.drawPenalty).toBe(4);
    expect(effects.currentPlayerIndex).toBe(1);
  });
});

describe('UNO Call Logic', () => {
  it('should require UNO call with one card', () => {
    const player: Player = {
      id: '1',
      name: 'Test',
      type: PlayerType.HUMAN,
      hand: [{ id: 'last', color: CardColor.RED, type: CardType.NUMBER, value: 1 }],
      hasCalledUno: false,
    };
    
    expect(shouldCallUno(player)).toBe(true);
  });

  it('should not require UNO call with multiple cards', () => {
    const player: Player = {
      id: '1',
      name: 'Test',
      type: PlayerType.HUMAN,
      hand: [
        { id: '1', color: CardColor.RED, type: CardType.NUMBER, value: 1 },
        { id: '2', color: CardColor.BLUE, type: CardType.NUMBER, value: 2 },
      ],
      hasCalledUno: false,
    };
    
    expect(shouldCallUno(player)).toBe(false);
  });

  it('should detect win condition', () => {
    const winner: Player = {
      id: '1',
      name: 'Winner',
      type: PlayerType.HUMAN,
      hand: [],
      hasCalledUno: true,
    };
    
    expect(canWin(winner)).toBe(true);
  });
});

describe('Deck Management', () => {
  it('should create a valid UNO deck', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(108); // Standard UNO deck size
    
    // Count card types
    const numberCards = deck.filter(c => c.type === CardType.NUMBER);
    const skipCards = deck.filter(c => c.type === CardType.SKIP);
    const reverseCards = deck.filter(c => c.type === CardType.REVERSE);
    const drawTwoCards = deck.filter(c => c.type === CardType.DRAW_TWO);
    const wildCards = deck.filter(c => c.type === CardType.WILD);
    const wildDrawFourCards = deck.filter(c => c.type === CardType.WILD_DRAW_FOUR);
    
    expect(numberCards).toHaveLength(76); // 19 per color * 4 colors
    expect(skipCards).toHaveLength(8); // 2 per color * 4 colors
    expect(reverseCards).toHaveLength(8);
    expect(drawTwoCards).toHaveLength(8);
    expect(wildCards).toHaveLength(4);
    expect(wildDrawFourCards).toHaveLength(4);
  });

  it('should shuffle deck randomly', () => {
    const deck = createDeck();
    const shuffled1 = shuffleDeck(deck);
    const shuffled2 = shuffleDeck(deck);
    
    // Shuffled decks should be different (very high probability)
    expect(shuffled1).not.toEqual(shuffled2);
    expect(shuffled1).toHaveLength(deck.length);
  });

  it('should draw cards correctly', () => {
    const deck = createDeck();
    const { drawnCards, remainingDeck } = drawCards(deck, 7);
    
    expect(drawnCards).toHaveLength(7);
    expect(remainingDeck).toHaveLength(deck.length - 7);
    expect([...drawnCards, ...remainingDeck]).toHaveLength(deck.length);
  });

  it('should deal initial hands correctly', () => {
    const deck = shuffleDeck(createDeck());
    const { hands, remainingDeck } = dealInitialHands(deck, 4, 7);
    
    expect(hands).toHaveLength(4);
    hands.forEach(hand => expect(hand).toHaveLength(7));
    expect(remainingDeck).toHaveLength(deck.length - 28);
  });

  it('should detect when reshuffle is needed', () => {
    expect(needsReshuffle([], 1)).toBe(true);
    expect(needsReshuffle([{ id: '1', color: CardColor.RED, type: CardType.NUMBER, value: 1 }], 2)).toBe(true);
    expect(needsReshuffle([{ id: '1', color: CardColor.RED, type: CardType.NUMBER, value: 1 }], 1)).toBe(false);
  });

  it('should reshuffle discard pile correctly', () => {
    const discardPile: Card[] = [
      { id: '1', color: CardColor.RED, type: CardType.NUMBER, value: 1 },
      { id: '2', color: CardColor.BLUE, type: CardType.NUMBER, value: 2 },
      { id: '3', color: CardColor.GREEN, type: CardType.SKIP },
      { id: 'wild', color: CardColor.BLUE, type: CardType.WILD }, // Wild that was played as blue
    ];
    
    const reshuffled = reshuffleDiscardPile(discardPile);
    
    expect(reshuffled).toHaveLength(3); // All except top card
    
    // Wild card should be reset to WILD color
    const wildCard = reshuffled.find(c => c.type === CardType.WILD);
    expect(wildCard?.color).toBe(CardColor.WILD);
  });
});

describe('AI Logic', () => {
  let player: Player;
  let gameState: GameState;

  beforeEach(() => {
    player = {
      id: 'ai',
      name: 'AI',
      type: PlayerType.AI,
      hand: [
        { id: '1', color: CardColor.RED, type: CardType.NUMBER, value: 5 },
        { id: '2', color: CardColor.BLUE, type: CardType.SKIP },
        { id: '3', color: CardColor.WILD, type: CardType.WILD },
      ],
      hasCalledUno: false,
    };

    gameState = {
      players: [player, { id: 'human', name: 'Human', type: PlayerType.HUMAN, hand: [{ id: 'h1', color: CardColor.RED, type: CardType.NUMBER, value: 1 }], hasCalledUno: false }],
      currentPlayerIndex: 0,
      direction: GameDirection.CLOCKWISE,
      phase: GamePhase.PLAYING,
      drawPile: createDeck().slice(0, 50),
      discardPile: [{ id: 'top', color: CardColor.RED, type: CardType.NUMBER, value: 3 }],
      currentColor: CardColor.RED,
      drawPenalty: 0,
      lastAction: '',
      winner: null,
      unoCallTimeLeft: 0,
      pendingWildCard: null,
    };
  });

  it('should choose playable card when available', () => {
    const move = chooseAIMove(player, gameState);
    expect(move.type).toBe('PLAY_CARD');
    expect(move.card).toBeDefined();
    
    // Should be a valid card from hand
    expect(player.hand.some(c => c.id === move.card!.id)).toBe(true);
  });

  it('should draw card when no playable cards', () => {
    const playerWithNoPlayableCards: Player = {
      ...player,
      hand: [{ id: '1', color: CardColor.GREEN, type: CardType.NUMBER, value: 7 }],
    };
    
    const move = chooseAIMove(playerWithNoPlayableCards, gameState);
    expect(move.type).toBe('DRAW_CARD');
  });

  it('should choose wild color based on hand composition', () => {
    const handWithMostlyRed: Card[] = [
      { id: '1', color: CardColor.RED, type: CardType.NUMBER, value: 1 },
      { id: '2', color: CardColor.RED, type: CardType.NUMBER, value: 2 },
      { id: '3', color: CardColor.BLUE, type: CardType.NUMBER, value: 3 },
    ];
    
    const color = chooseWildColor(handWithMostlyRed);
    expect(color).toBe(CardColor.RED);
  });

  it('should validate AI moves correctly', () => {
    const validMove = { type: 'PLAY_CARD' as const, card: player.hand[0] };
    expect(validateAIMove(validMove, player, gameState)).toBe(true);
    
    const invalidMove = { type: 'PLAY_CARD' as const, card: { id: 'fake', color: CardColor.RED, type: CardType.NUMBER, value: 1 } };
    expect(validateAIMove(invalidMove, player, gameState)).toBe(false);
    
    const drawMove = { type: 'DRAW_CARD' as const };
    expect(validateAIMove(drawMove, player, gameState)).toBe(true);
  });

  it('should never return illegal moves', () => {
    // Test with various game states
    for (let i = 0; i < 10; i++) {
      const randomGameState = {
        ...gameState,
        currentColor: [CardColor.RED, CardColor.BLUE, CardColor.GREEN, CardColor.YELLOW][i % 4],
        discardPile: [{ id: `top${i}`, color: CardColor.GREEN, type: CardType.NUMBER, value: i % 10 }],
      };
      
      const move = chooseAIMove(player, randomGameState);
      expect(validateAIMove(move, player, randomGameState)).toBe(true);
    }
  });
});

describe('Game State Validation', () => {
  it('should validate correct game state', () => {
    const validState: GameState = {
      players: [
        { id: '1', name: 'P1', type: PlayerType.HUMAN, hand: [{ id: 'h1', color: CardColor.RED, type: CardType.NUMBER, value: 1 }], hasCalledUno: false },
        { id: '2', name: 'P2', type: PlayerType.AI, hand: [{ id: 'h2', color: CardColor.BLUE, type: CardType.NUMBER, value: 2 }], hasCalledUno: false },
      ],
      currentPlayerIndex: 0,
      direction: GameDirection.CLOCKWISE,
      phase: GamePhase.PLAYING,
      drawPile: [{ id: 'd1', color: CardColor.GREEN, type: CardType.NUMBER, value: 3 }],
      discardPile: [{ id: 'disc1', color: CardColor.YELLOW, type: CardType.NUMBER, value: 4 }],
      currentColor: CardColor.YELLOW,
      drawPenalty: 0,
      lastAction: '',
      winner: null,
      unoCallTimeLeft: 0,
      pendingWildCard: null,
    };
    
    const errors = validateGameState(validState);
    expect(errors).toHaveLength(0);
  });

  it('should detect invalid player count', () => {
    const invalidState: GameState = {
      players: [{ id: '1', name: 'P1', type: PlayerType.HUMAN, hand: [], hasCalledUno: false }],
      currentPlayerIndex: 0,
      direction: GameDirection.CLOCKWISE,
      phase: GamePhase.PLAYING,
      drawPile: [],
      discardPile: [{ id: 'disc1', color: CardColor.RED, type: CardType.NUMBER, value: 1 }],
      currentColor: CardColor.RED,
      drawPenalty: 0,
      lastAction: '',
      winner: null,
      unoCallTimeLeft: 0,
      pendingWildCard: null,
    };
    
    const errors = validateGameState(invalidState);
    expect(errors.some(e => e.includes('at least 2 players'))).toBe(true);
  });

  it('should detect empty discard pile', () => {
    const invalidState: GameState = {
      players: [
        { id: '1', name: 'P1', type: PlayerType.HUMAN, hand: [], hasCalledUno: false },
        { id: '2', name: 'P2', type: PlayerType.AI, hand: [], hasCalledUno: false },
      ],
      currentPlayerIndex: 0,
      direction: GameDirection.CLOCKWISE,
      phase: GamePhase.PLAYING,
      drawPile: [],
      discardPile: [],
      currentColor: CardColor.RED,
      drawPenalty: 0,
      lastAction: '',
      winner: null,
      unoCallTimeLeft: 0,
      pendingWildCard: null,
    };
    
    const errors = validateGameState(invalidState);
    expect(errors.some(e => e.includes('Discard pile cannot be empty'))).toBe(true);
  });
});