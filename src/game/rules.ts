// src/game/rules.ts

import { 
  Card, 
  GameState, 
  Player, 
  GameDirection, 
  isNumberCard, 
  isActionCard, 
  isWildCard,
  isColoredCard,
  InvalidMoveError,
  GameStateError,
  GAME_CONSTANTS
} from './types';

// Enhanced card playability check with detailed validation
export function isPlayable(
  card: Card, 
  topCard: Card, 
  currentColor: Exclude<Card['color'], 'wild'>, 
  playerHand?: readonly Card[],
  strictWildDrawFour: boolean = false
): boolean {
  try {
    validateCardPlayability(card, topCard, currentColor, playerHand, strictWildDrawFour);
    return true;
  } catch {
    return false;
  }
}

// Detailed validation with specific error messages
export function validateCardPlayability(
  card: Card, 
  topCard: Card, 
  currentColor: Exclude<Card['color'], 'wild'>, 
  playerHand?: readonly Card[],
  strictWildDrawFour: boolean = false
): void {
  // Wild cards are always playable (except Wild Draw Four in strict mode)
  if (isWildCard(card)) {
    if (card.type === 'wild') {
      return; // Always valid
    }
    
    if (card.type === 'wild_draw_four') {
      if (!strictWildDrawFour) {
        return; // Valid in non-strict mode
      }
      
      // In strict mode, check if player has matching color
      if (playerHand) {
        const hasMatchingColor = playerHand.some(handCard => 
          handCard.id !== card.id && 
          isColoredCard(handCard) && 
          handCard.color === currentColor
        );
        
        if (hasMatchingColor) {
          throw new InvalidMoveError(
            'Wild Draw Four is not legal when you have a matching color card',
            { card, currentColor, hasMatchingColor }
          );
        }
      }
      return; // Valid in strict mode when no matching color
    }
  }
  
  // For colored cards, check color or value/type match
  if (isColoredCard(card)) {
    // Color match
    if (card.color === currentColor) {
      return; // Valid color match
    }
    
    // Value/type match
    if (isNumberCard(card) && isNumberCard(topCard)) {
      if (card.value === topCard.value) {
        return; // Valid number match
      }
    }
    
    // Action card type match
    if (isActionCard(card) && card.type === topCard.type) {
      return; // Valid action type match
    }
  }
  
  // If we get here, the card is not playable
  throw new InvalidMoveError(
    'Card does not match current color, number, or action type',
    { card, topCard, currentColor }
  );
}

// Get all playable cards with performance optimization
export function getPlayableCards(
  hand: readonly Card[], 
  topCard: Card, 
  currentColor: Exclude<Card['color'], 'wild'>, 
  strictWildDrawFour: boolean = false
): readonly Card[] {
  const playableCards: Card[] = [];
  
  for (const card of hand) {
    if (isPlayable(card, topCard, currentColor, hand, strictWildDrawFour)) {
      playableCards.push(card);
    }
  }
  
  return Object.freeze(playableCards);
}

// Enhanced card effect application with immutable updates
export function applyCardEffect(
  card: Card, 
  gameState: GameState
): Partial<GameState> {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (!currentPlayer) {
    throw new GameStateError('No current player found');
  }
  
  const updates: Partial<GameState> = {
    turnStartTime: Date.now(),
  };
  
  switch (card.type) {
    case 'skip':
      updates.currentPlayerIndex = getNextPlayerIndex(
        getNextPlayerIndex(gameState.currentPlayerIndex, gameState.players.length, gameState.direction),
        gameState.players.length,
        gameState.direction
      );
      updates.lastAction = `${currentPlayer.name} played Skip - next player skipped`;
      break;
      
    case 'reverse':
      const newDirection: GameDirection = gameState.direction === 'clockwise' 
        ? 'counterclockwise' 
        : 'clockwise';
      updates.direction = newDirection;
      
      // In 2-player game, reverse acts like skip
      if (gameState.players.length === 2) {
        updates.currentPlayerIndex = gameState.currentPlayerIndex; // Stay on same player
        updates.lastAction = `${currentPlayer.name} played Reverse - acts as Skip in 2-player game`;
      } else {
        updates.currentPlayerIndex = getNextPlayerIndex(
          gameState.currentPlayerIndex,
          gameState.players.length,
          newDirection
        );
        updates.lastAction = `${currentPlayer.name} played Reverse - direction changed to ${newDirection}`;
      }
      break;
      
    case 'draw_two':
      updates.drawPenalty = (gameState.drawPenalty || 0) + 2;
      updates.currentPlayerIndex = getNextPlayerIndex(
        gameState.currentPlayerIndex,
        gameState.players.length,
        gameState.direction
      );
      updates.lastAction = `${currentPlayer.name} played Draw Two - next player draws 2 cards`;
      break;
      
    case 'wild_draw_four':
      updates.drawPenalty = (gameState.drawPenalty || 0) + 4;
      updates.currentPlayerIndex = getNextPlayerIndex(
        gameState.currentPlayerIndex,
        gameState.players.length,
        gameState.direction
      );
      updates.lastAction = `${currentPlayer.name} played Wild Draw Four - next player draws 4 cards`;
      break;
      
    case 'wild':
      updates.currentPlayerIndex = getNextPlayerIndex(
        gameState.currentPlayerIndex,
        gameState.players.length,
        gameState.direction
      );
      updates.lastAction = `${currentPlayer.name} played Wild card`;
      break;
      
    case 'number':
      updates.currentPlayerIndex = getNextPlayerIndex(
        gameState.currentPlayerIndex,
        gameState.players.length,
        gameState.direction
      );
      updates.lastAction = `${currentPlayer.name} played ${card.color} ${card.value}`;
      break;
      
    default:
      throw new InvalidMoveError(`Unknown card type: ${(card as any).type}`);
  }
  
  return updates;
}

// Safe player index calculation with bounds checking
export function getNextPlayerIndex(
  currentIndex: number, 
  playerCount: number, 
  direction: GameDirection
): number {
  if (currentIndex < 0 || currentIndex >= playerCount) {
    throw new GameStateError(
      `Invalid current player index: ${currentIndex} (player count: ${playerCount})`
    );
  }
  
  if (playerCount < GAME_CONSTANTS.MIN_PLAYERS) {
    throw new GameStateError(`Invalid player count: ${playerCount}`);
  }
  
  if (direction === 'clockwise') {
    return (currentIndex + 1) % playerCount;
  } else {
    return (currentIndex - 1 + playerCount) % playerCount;
  }
}

// Enhanced UNO call validation
export function shouldCallUno(player: Player): boolean {
  return player.hand.length === 1;
}

export function canWin(player: Player): boolean {
  return player.hand.length === 0;
}

// Deck management helpers
export function needsReshuffle(drawPile: readonly Card[], cardsNeeded: number): boolean {
  return drawPile.length < cardsNeeded;
}

// Color validation with type safety
export function isValidColorSelection(color: string): color is Exclude<Card['color'], 'wild'> {
  return ['red', 'yellow', 'green', 'blue'].includes(color);
}

// Comprehensive game state validation
export function validateGameState(gameState: GameState): string[] {
  const errors: string[] = [];
  
  // Player validation
  if (gameState.players.length < GAME_CONSTANTS.MIN_PLAYERS) {
    errors.push(`Game must have at least ${GAME_CONSTANTS.MIN_PLAYERS} players`);
  }
  
  if (gameState.players.length > GAME_CONSTANTS.MAX_PLAYERS) {
    errors.push(`Game cannot have more than ${GAME_CONSTANTS.MAX_PLAYERS} players`);
  }
  
  // Current player validation
  if (gameState.currentPlayerIndex < 0 || gameState.currentPlayerIndex >= gameState.players.length) {
    errors.push(`Current player index ${gameState.currentPlayerIndex} is out of bounds (0-${gameState.players.length - 1})`);
  }
  
  // Discard pile validation
  if (gameState.discardPile.length === 0) {
    errors.push('Discard pile cannot be empty during play');
  }
  
  // Card availability validation
  const totalCardsNeeded = Math.max(1, gameState.drawPenalty);
  if (gameState.drawPile.length === 0 && gameState.discardPile.length <= 1 && totalCardsNeeded > 0) {
    errors.push('Not enough cards available to continue game');
  }
  
  // Card uniqueness validation
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
  
  // Phase-specific validation
  if (gameState.phase === 'wild_color_selection' && !gameState.pendingWildCard) {
    errors.push('Wild color selection phase requires a pending wild card');
  }
  
  if (gameState.phase === 'uno_call_window' && gameState.unoCallTimeLeft <= 0) {
    errors.push('UNO call window phase requires positive time remaining');
  }
  
  // Current color validation
  if (!isValidColorSelection(gameState.currentColor)) {
    errors.push(`Invalid current color: ${gameState.currentColor}`);
  }
  
  // Draw penalty validation
  if (gameState.drawPenalty < 0) {
    errors.push(`Draw penalty cannot be negative: ${gameState.drawPenalty}`);
  }
  
  return errors;
}

// Calculate game score for analytics
export function calculatePlayerScore(hand: readonly Card[]): number {
  return hand.reduce((score, card) => {
    if (isNumberCard(card)) {
      return score + card.value;
    }
    if (isActionCard(card)) {
      return score + 20;
    }
    if (isWildCard(card)) {
      return score + 50;
    }
    return score;
  }, 0);
}

// Check if game can continue
export function canGameContinue(gameState: GameState): boolean {
  const errors = validateGameState(gameState);
  return errors.length === 0 && gameState.phase !== 'game_over';
}

// Get game statistics
export function getGameDuration(gameState: GameState): number {
  return Date.now() - gameState.gameStartTime;
}

export function getTurnDuration(gameState: GameState): number {
  return Date.now() - gameState.turnStartTime;
}