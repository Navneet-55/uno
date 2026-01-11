// src/game/deck.ts

import { 
  Card, 
  NumberCard, 
  ActionCard, 
  WildCard, 
  GAME_CONSTANTS,
  GameError 
} from './types';

// Card ID generation with better uniqueness
let cardIdCounter = 0;
const generateCardId = (): string => `card_${Date.now()}_${++cardIdCounter}`;

// Optimized deck creation with pre-allocated arrays
export function createDeck(): readonly Card[] {
  const deck: Card[] = [];
  deck.length = GAME_CONSTANTS.DECK_SIZE; // Pre-allocate for performance
  let index = 0;

  const colors = ['red', 'yellow', 'green', 'blue'] as const;
  
  // Number cards (76 total)
  for (const color of colors) {
    // One 0 card per color
    deck[index++] = createNumberCard(color, 0);

    // Two of each number 1-9 per color
    for (let value = 1; value <= 9; value++) {
      deck[index++] = createNumberCard(color, value as any);
      deck[index++] = createNumberCard(color, value as any);
    }
  }

  // Action cards (24 total: 8 each of Skip, Reverse, Draw Two)
  const actionTypes = ['skip', 'reverse', 'draw_two'] as const;
  for (const color of colors) {
    for (const type of actionTypes) {
      deck[index++] = createActionCard(color, type);
      deck[index++] = createActionCard(color, type);
    }
  }

  // Wild cards (8 total: 4 Wild, 4 Wild Draw Four)
  for (let i = 0; i < 4; i++) {
    deck[index++] = createWildCard('wild');
    deck[index++] = createWildCard('wild_draw_four');
  }

  if (index !== GAME_CONSTANTS.DECK_SIZE) {
    throw new GameError(
      `Deck creation error: expected ${GAME_CONSTANTS.DECK_SIZE} cards, got ${index}`,
      'DECK_CREATION_ERROR'
    );
  }

  return Object.freeze(deck);
}

// Factory functions for type-safe card creation
function createNumberCard(
  color: Exclude<Card['color'], 'wild'>, 
  value: NumberCard['value']
): NumberCard {
  return Object.freeze({
    id: generateCardId(),
    color,
    type: 'number',
    value,
  });
}

function createActionCard(
  color: Exclude<Card['color'], 'wild'>, 
  type: ActionCard['type']
): ActionCard {
  return Object.freeze({
    id: generateCardId(),
    color,
    type,
  });
}

function createWildCard(type: WildCard['type']): WildCard {
  return Object.freeze({
    id: generateCardId(),
    color: 'wild',
    type,
  });
}

// Fisher-Yates shuffle with crypto-secure randomness when available
export function shuffleDeck(deck: readonly Card[]): readonly Card[] {
  const shuffled = [...deck];
  const random = getSecureRandom();
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return Object.freeze(shuffled);
}

// Secure random number generation
function getSecureRandom(): () => number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return () => {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      return array[0] / (0xffffffff + 1);
    };
  }
  return Math.random;
}

// Optimized card drawing with validation
export function drawCards(
  deck: readonly Card[], 
  count: number
): { drawnCards: readonly Card[]; remainingDeck: readonly Card[] } {
  if (count < 0) {
    throw new GameError('Cannot draw negative number of cards', 'INVALID_DRAW_COUNT');
  }
  
  if (count > deck.length) {
    throw new GameError(
      `Cannot draw ${count} cards from deck of ${deck.length}`,
      'INSUFFICIENT_CARDS',
      { requestedCount: count, availableCount: deck.length }
    );
  }
  
  if (count === 0) {
    return { drawnCards: Object.freeze([]), remainingDeck: deck };
  }
  
  const drawnCards = Object.freeze(deck.slice(0, count));
  const remainingDeck = Object.freeze(deck.slice(count));
  
  return { drawnCards, remainingDeck };
}

// Enhanced reshuffle with wild card reset
export function reshuffleDiscardPile(discardPile: readonly Card[]): readonly Card[] {
  if (discardPile.length === 0) {
    throw new GameError('Cannot reshuffle empty discard pile', 'EMPTY_DISCARD_PILE');
  }
  
  if (discardPile.length === 1) {
    throw new GameError(
      'Cannot reshuffle discard pile with only one card',
      'INSUFFICIENT_DISCARD_CARDS'
    );
  }
  
  // Keep the top card, reshuffle the rest
  const cardsToReshuffle = discardPile.slice(0, -1);
  
  // Reset wild cards to their original wild color and freeze them
  const resetCards = cardsToReshuffle.map(card => {
    if (card.type === 'wild' || card.type === 'wild_draw_four') {
      return Object.freeze({ ...card, color: 'wild' as const });
    }
    return card;
  });
  
  return shuffleDeck(resetCards);
}

// Optimized initial hand dealing
export function dealInitialHands(
  deck: readonly Card[], 
  playerCount: number, 
  handSize: number = GAME_CONSTANTS.INITIAL_HAND_SIZE
): { hands: readonly (readonly Card[])[]; remainingDeck: readonly Card[] } {
  const totalCardsNeeded = playerCount * handSize;
  
  if (totalCardsNeeded > deck.length) {
    throw new GameError(
      `Not enough cards to deal ${handSize} cards to ${playerCount} players`,
      'INSUFFICIENT_CARDS_FOR_DEALING',
      { playersCount: playerCount, handSize, totalNeeded: totalCardsNeeded, available: deck.length }
    );
  }
  
  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  let currentDeck = [...deck];
  
  // Deal cards round-robin style for fairness
  for (let cardIndex = 0; cardIndex < handSize; cardIndex++) {
    for (let playerIndex = 0; playerIndex < playerCount; playerIndex++) {
      const { drawnCards, remainingDeck } = drawCards(currentDeck, 1);
      hands[playerIndex].push(drawnCards[0]);
      currentDeck = [...remainingDeck];
    }
  }
  
  // Freeze all hands for immutability
  const frozenHands = hands.map(hand => Object.freeze(hand));
  
  return { 
    hands: Object.freeze(frozenHands), 
    remainingDeck: Object.freeze(currentDeck) 
  };
}

// Find suitable starting card (non-wild, non-action for fair start)
export function findStartingCard(deck: readonly Card[]): { 
  startingCard: Card; 
  remainingDeck: readonly Card[] 
} {
  // Prefer number cards for starting
  let startCardIndex = deck.findIndex(card => 
    card.type === 'number' && card.color !== 'wild'
  );
  
  // Fallback to any non-wild card
  if (startCardIndex === -1) {
    startCardIndex = deck.findIndex(card => card.color !== 'wild');
  }
  
  // Last resort: use any card (shouldn't happen with proper deck)
  if (startCardIndex === -1) {
    startCardIndex = 0;
  }
  
  if (startCardIndex >= deck.length) {
    throw new GameError('No suitable starting card found', 'NO_STARTING_CARD');
  }
  
  const startingCard = deck[startCardIndex];
  const remainingDeck = [
    ...deck.slice(0, startCardIndex),
    ...deck.slice(startCardIndex + 1)
  ];
  
  return { 
    startingCard, 
    remainingDeck: Object.freeze(remainingDeck) 
  };
}

// Deck validation for integrity checks
export function validateDeck(deck: readonly Card[]): string[] {
  const errors: string[] = [];
  
  if (deck.length !== GAME_CONSTANTS.DECK_SIZE) {
    errors.push(`Invalid deck size: expected ${GAME_CONSTANTS.DECK_SIZE}, got ${deck.length}`);
  }
  
  // Check for duplicate IDs
  const ids = new Set(deck.map(card => card.id));
  if (ids.size !== deck.length) {
    errors.push('Duplicate card IDs found in deck');
  }
  
  // Validate card counts by type
  const cardCounts = {
    number: deck.filter(c => c.type === 'number').length,
    skip: deck.filter(c => c.type === 'skip').length,
    reverse: deck.filter(c => c.type === 'reverse').length,
    draw_two: deck.filter(c => c.type === 'draw_two').length,
    wild: deck.filter(c => c.type === 'wild').length,
    wild_draw_four: deck.filter(c => c.type === 'wild_draw_four').length,
  };
  
  const expectedCounts = {
    number: 76,
    skip: 8,
    reverse: 8,
    draw_two: 8,
    wild: 4,
    wild_draw_four: 4,
  };
  
  for (const [type, expected] of Object.entries(expectedCounts)) {
    const actual = cardCounts[type as keyof typeof cardCounts];
    if (actual !== expected) {
      errors.push(`Invalid ${type} card count: expected ${expected}, got ${actual}`);
    }
  }
  
  return errors;
}