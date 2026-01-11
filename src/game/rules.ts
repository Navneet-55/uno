// src/game/rules.ts

import { Card, CardColor, CardType, GameState, Player, GameDirection } from './types';

export function isPlayable(card: Card, topCard: Card, currentColor: CardColor, playerHand?: Card[]): boolean {
  // Wild cards are always playable
  if (card.type === CardType.WILD) {
    return true;
  }
  
  // Wild Draw Four has special rules
  if (card.type === CardType.WILD_DRAW_FOUR) {
    // If strict mode and player hand provided, check if player has matching color
    if (playerHand) {
      const hasMatchingColor = playerHand.some(handCard => 
        handCard.id !== card.id && 
        handCard.color === currentColor && 
        handCard.color !== CardColor.WILD
      );
      // In strict mode, Wild Draw Four is only legal if no matching color
      return !hasMatchingColor;
    }
    return true; // Allow in non-strict mode
  }
  
  // Regular cards: match color or value/type
  if (card.color === currentColor) {
    return true;
  }
  
  // Number cards match by value
  if (card.type === CardType.NUMBER && topCard.type === CardType.NUMBER) {
    return card.value === topCard.value;
  }
  
  // Action cards match by type
  if (card.type === topCard.type && card.type !== CardType.NUMBER) {
    return true;
  }
  
  return false;
}

export function getPlayableCards(hand: Card[], topCard: Card, currentColor: CardColor, strictWildDrawFour: boolean = false): Card[] {
  return hand.filter(card => {
    if (strictWildDrawFour && card.type === CardType.WILD_DRAW_FOUR) {
      return isPlayable(card, topCard, currentColor, hand);
    }
    return isPlayable(card, topCard, currentColor);
  });
}

export function applyCardEffect(card: Card, gameState: GameState): Partial<GameState> {
  const updates: Partial<GameState> = {};
  
  switch (card.type) {
    case CardType.SKIP:
      // Skip next player
      updates.currentPlayerIndex = getNextPlayerIndex(
        getNextPlayerIndex(gameState.currentPlayerIndex, gameState.players.length, gameState.direction),
        gameState.players.length,
        gameState.direction
      );
      updates.lastAction = `${gameState.players[gameState.currentPlayerIndex].name} played Skip`;
      break;
      
    case CardType.REVERSE:
      // Reverse direction
      updates.direction = gameState.direction === GameDirection.CLOCKWISE 
        ? GameDirection.COUNTERCLOCKWISE 
        : GameDirection.CLOCKWISE;
      
      // In 2-player game, reverse acts like skip
      if (gameState.players.length === 2) {
        updates.currentPlayerIndex = gameState.currentPlayerIndex; // Stay on same player
      } else {
        updates.currentPlayerIndex = getNextPlayerIndex(
          gameState.currentPlayerIndex,
          gameState.players.length,
          updates.direction
        );
      }
      updates.lastAction = `${gameState.players[gameState.currentPlayerIndex].name} played Reverse`;
      break;
      
    case CardType.DRAW_TWO:
      updates.drawPenalty = (gameState.drawPenalty || 0) + 2;
      updates.currentPlayerIndex = getNextPlayerIndex(
        gameState.currentPlayerIndex,
        gameState.players.length,
        gameState.direction
      );
      updates.lastAction = `${gameState.players[gameState.currentPlayerIndex].name} played Draw Two`;
      break;
      
    case CardType.WILD_DRAW_FOUR:
      updates.drawPenalty = (gameState.drawPenalty || 0) + 4;
      updates.currentPlayerIndex = getNextPlayerIndex(
        gameState.currentPlayerIndex,
        gameState.players.length,
        gameState.direction
      );
      updates.lastAction = `${gameState.players[gameState.currentPlayerIndex].name} played Wild Draw Four`;
      break;
      
    case CardType.WILD:
      updates.currentPlayerIndex = getNextPlayerIndex(
        gameState.currentPlayerIndex,
        gameState.players.length,
        gameState.direction
      );
      updates.lastAction = `${gameState.players[gameState.currentPlayerIndex].name} played Wild`;
      break;
      
    case CardType.NUMBER:
      updates.currentPlayerIndex = getNextPlayerIndex(
        gameState.currentPlayerIndex,
        gameState.players.length,
        gameState.direction
      );
      updates.lastAction = `${gameState.players[gameState.currentPlayerIndex].name} played ${card.color} ${card.value}`;
      break;
  }
  
  return updates;
}

export function getNextPlayerIndex(currentIndex: number, playerCount: number, direction: GameDirection): number {
  if (direction === GameDirection.CLOCKWISE) {
    return (currentIndex + 1) % playerCount;
  } else {
    return (currentIndex - 1 + playerCount) % playerCount;
  }
}

export function shouldCallUno(player: Player): boolean {
  return player.hand.length === 1;
}

export function canWin(player: Player): boolean {
  return player.hand.length === 0;
}

export function needsReshuffle(drawPile: Card[], cardsNeeded: number): boolean {
  return drawPile.length < cardsNeeded;
}

export function isValidColorSelection(color: CardColor): boolean {
  return [CardColor.RED, CardColor.YELLOW, CardColor.GREEN, CardColor.BLUE].includes(color);
}

// Defensive checks for game state integrity
export function validateGameState(gameState: GameState): string[] {
  const errors: string[] = [];
  
  if (gameState.players.length < 2) {
    errors.push('Game must have at least 2 players');
  }
  
  if (gameState.currentPlayerIndex >= gameState.players.length) {
    errors.push('Current player index out of bounds');
  }
  
  if (gameState.discardPile.length === 0) {
    errors.push('Discard pile cannot be empty during play');
  }
  
  if (gameState.drawPile.length === 0 && gameState.discardPile.length <= 1) {
    errors.push('Not enough cards to continue game');
  }
  
  // Check for duplicate card IDs
  const allCards = [
    ...gameState.drawPile,
    ...gameState.discardPile,
    ...gameState.players.flatMap(p => p.hand)
  ];
  const cardIds = allCards.map(c => c.id);
  const uniqueIds = new Set(cardIds);
  if (cardIds.length !== uniqueIds.size) {
    errors.push('Duplicate cards detected in game state');
  }
  
  return errors;
}