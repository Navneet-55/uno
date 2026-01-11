// src/game/deck.ts

import { Card, CardColor, CardType } from './types';

let cardIdCounter = 0;

function generateCardId(): string {
  return `card_${++cardIdCounter}`;
}

export function createDeck(): Card[] {
  const deck: Card[] = [];

  // Number cards (0-9) for each color
  const colors = [CardColor.RED, CardColor.YELLOW, CardColor.GREEN, CardColor.BLUE];
  
  colors.forEach(color => {
    // One 0 card per color
    deck.push({
      id: generateCardId(),
      color,
      type: CardType.NUMBER,
      value: 0
    });

    // Two of each number 1-9 per color
    for (let value = 1; value <= 9; value++) {
      for (let i = 0; i < 2; i++) {
        deck.push({
          id: generateCardId(),
          color,
          type: CardType.NUMBER,
          value
        });
      }
    }

    // Two of each action card per color
    const actionTypes = [CardType.SKIP, CardType.REVERSE, CardType.DRAW_TWO];
    actionTypes.forEach(type => {
      for (let i = 0; i < 2; i++) {
        deck.push({
          id: generateCardId(),
          color,
          type
        });
      }
    });
  });

  // Wild cards (4 of each)
  for (let i = 0; i < 4; i++) {
    deck.push({
      id: generateCardId(),
      color: CardColor.WILD,
      type: CardType.WILD
    });

    deck.push({
      id: generateCardId(),
      color: CardColor.WILD,
      type: CardType.WILD_DRAW_FOUR
    });
  }

  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function drawCards(deck: Card[], count: number): { drawnCards: Card[], remainingDeck: Card[] } {
  if (count > deck.length) {
    throw new Error(`Cannot draw ${count} cards from deck of ${deck.length}`);
  }
  
  const drawnCards = deck.slice(0, count);
  const remainingDeck = deck.slice(count);
  
  return { drawnCards, remainingDeck };
}

export function reshuffleDiscardPile(discardPile: Card[]): Card[] {
  if (discardPile.length === 0) {
    throw new Error('Cannot reshuffle empty discard pile');
  }
  
  // Keep the top card, reshuffle the rest
  const topCard = discardPile[discardPile.length - 1];
  const cardsToReshuffle = discardPile.slice(0, -1);
  
  // Reset wild cards to their original wild color when reshuffling
  const resetCards = cardsToReshuffle.map(card => {
    if (card.type === CardType.WILD || card.type === CardType.WILD_DRAW_FOUR) {
      return { ...card, color: CardColor.WILD };
    }
    return card;
  });
  
  return shuffleDeck(resetCards);
}

export function dealInitialHands(deck: Card[], playerCount: number, handSize: number = 7): {
  hands: Card[][];
  remainingDeck: Card[];
} {
  const hands: Card[][] = [];
  let currentDeck = [...deck];
  
  for (let player = 0; player < playerCount; player++) {
    const { drawnCards, remainingDeck } = drawCards(currentDeck, handSize);
    hands.push(drawnCards);
    currentDeck = remainingDeck;
  }
  
  return { hands, remainingDeck: currentDeck };
}