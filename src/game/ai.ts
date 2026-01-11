// src/game/ai.ts

import { Card, CardColor, CardType, Player, GameState } from './types';
import { getPlayableCards, isValidColorSelection } from './rules';

export interface AIMove {
  type: 'PLAY_CARD' | 'DRAW_CARD';
  card?: Card;
}

export function chooseAIMove(player: Player, gameState: GameState, strictWildDrawFour: boolean = false): AIMove {
  const topCard = gameState.discardPile[gameState.discardPile.length - 1];
  const playableCards = getPlayableCards(player.hand, topCard, gameState.currentColor, strictWildDrawFour);
  
  if (playableCards.length === 0) {
    return { type: 'DRAW_CARD' };
  }
  
  // AI Strategy: Play highest impact card
  const bestCard = selectBestCard(playableCards, player.hand, gameState);
  return { type: 'PLAY_CARD', card: bestCard };
}

function selectBestCard(playableCards: Card[], hand: Card[], gameState: GameState): Card {
  // Priority order:
  // 1. Wild Draw Four (if legal and opponent has few cards)
  // 2. Draw Two (if opponent has few cards)
  // 3. Skip/Reverse (if opponent has few cards)
  // 4. Wild (if it helps get rid of cards)
  // 5. Highest number card
  // 6. Any remaining card
  
  const opponentMinCards = Math.min(...gameState.players
    .filter(p => p.id !== gameState.players[gameState.currentPlayerIndex].id)
    .map(p => p.hand.length));
  
  // If opponent is close to winning, prioritize action cards
  const opponentThreat = opponentMinCards <= 2;
  
  // Wild Draw Four - highest priority if opponent is threatening
  const wildDrawFour = playableCards.find(c => c.type === CardType.WILD_DRAW_FOUR);
  if (wildDrawFour && opponentThreat) {
    return wildDrawFour;
  }
  
  // Draw Two - high priority against threatening opponents
  const drawTwo = playableCards.find(c => c.type === CardType.DRAW_TWO);
  if (drawTwo && opponentThreat) {
    return drawTwo;
  }
  
  // Skip/Reverse - good against threatening opponents
  const skipReverse = playableCards.find(c => 
    c.type === CardType.SKIP || c.type === CardType.REVERSE
  );
  if (skipReverse && opponentThreat) {
    return skipReverse;
  }
  
  // If we have many cards of one color, avoid playing that color unless necessary
  const colorCounts = getColorCounts(hand);
  const dominantColor = Object.entries(colorCounts)
    .filter(([color]) => color !== CardColor.WILD)
    .sort(([,a], [,b]) => b - a)[0]?.[0] as CardColor;
  
  // Wild cards - use strategically
  const wild = playableCards.find(c => c.type === CardType.WILD);
  if (wild && dominantColor && colorCounts[dominantColor] >= 3) {
    return wild;
  }
  
  // Wild Draw Four - use if we have it and it's beneficial
  if (wildDrawFour) {
    return wildDrawFour;
  }
  
  // Number cards - prefer higher values to get rid of points
  const numberCards = playableCards
    .filter(c => c.type === CardType.NUMBER)
    .sort((a, b) => (b.value || 0) - (a.value || 0));
  
  if (numberCards.length > 0) {
    return numberCards[0];
  }
  
  // Action cards
  if (drawTwo) return drawTwo;
  if (skipReverse) return skipReverse;
  if (wild) return wild;
  
  // Fallback to first playable card
  return playableCards[0];
}

export function chooseWildColor(hand: Card[]): CardColor {
  const colorCounts = getColorCounts(hand);
  
  // Remove wild from consideration
  delete colorCounts[CardColor.WILD];
  
  // Choose color with most cards
  const colorEntries = Object.entries(colorCounts) as [CardColor, number][];
  if (colorEntries.length === 0) {
    // No colored cards, choose randomly
    const colors = [CardColor.RED, CardColor.YELLOW, CardColor.GREEN, CardColor.BLUE];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  colorEntries.sort(([,a], [,b]) => b - a);
  const chosenColor = colorEntries[0][0];
  
  // Validate the choice
  if (!isValidColorSelection(chosenColor)) {
    return CardColor.RED; // Safe fallback
  }
  
  return chosenColor;
}

function getColorCounts(hand: Card[]): Record<CardColor, number> {
  const counts: Record<CardColor, number> = {
    [CardColor.RED]: 0,
    [CardColor.YELLOW]: 0,
    [CardColor.GREEN]: 0,
    [CardColor.BLUE]: 0,
    [CardColor.WILD]: 0,
  };
  
  hand.forEach(card => {
    counts[card.color]++;
  });
  
  return counts;
}

// Defensive check to ensure AI never makes illegal moves
export function validateAIMove(move: AIMove, player: Player, gameState: GameState): boolean {
  if (move.type === 'DRAW_CARD') {
    return true; // Drawing is always legal when no playable cards
  }
  
  if (move.type === 'PLAY_CARD' && move.card) {
    // Verify card is in player's hand
    const hasCard = player.hand.some(c => c.id === move.card!.id);
    if (!hasCard) {
      console.error('AI attempted to play card not in hand:', move.card);
      return false;
    }
    
    // Verify card is playable
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    const playableCards = getPlayableCards(player.hand, topCard, gameState.currentColor);
    const isPlayable = playableCards.some(c => c.id === move.card!.id);
    
    if (!isPlayable) {
      console.error('AI attempted to play unplayable card:', move.card);
      return false;
    }
    
    return true;
  }
  
  return false;
}