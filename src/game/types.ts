// src/game/types.ts

export const CARD_COLORS = ['red', 'yellow', 'green', 'blue', 'wild'] as const;
export const CARD_TYPES = ['number', 'skip', 'reverse', 'draw_two', 'wild', 'wild_draw_four'] as const;
export const PLAYER_TYPES = ['human', 'ai'] as const;
export const GAME_DIRECTIONS = ['clockwise', 'counterclockwise'] as const;
export const GAME_PHASES = ['setup', 'playing', 'wild_color_selection', 'uno_call_window', 'game_over'] as const;
export const ANIMATION_INTENSITIES = ['full', 'reduced'] as const;

export type CardColor = typeof CARD_COLORS[number];
export type CardType = typeof CARD_TYPES[number];
export type PlayerType = typeof PLAYER_TYPES[number];
export type GameDirection = typeof GAME_DIRECTIONS[number];
export type GamePhase = typeof GAME_PHASES[number];
export type AnimationIntensity = typeof ANIMATION_INTENSITIES[number];

// Card type definitions with better type safety
export interface BaseCard {
  readonly id: string;
  readonly color: CardColor;
  readonly type: CardType;
}

export interface NumberCard extends BaseCard {
  readonly type: 'number';
  readonly color: Exclude<CardColor, 'wild'>;
  readonly value: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
}

export interface ActionCard extends BaseCard {
  readonly type: 'skip' | 'reverse' | 'draw_two';
  readonly color: Exclude<CardColor, 'wild'>;
}

export interface WildCard extends BaseCard {
  readonly type: 'wild' | 'wild_draw_four';
  readonly color: 'wild';
}

export type Card = NumberCard | ActionCard | WildCard;

// Player definitions
export interface Player {
  readonly id: string;
  readonly name: string;
  readonly type: PlayerType;
  readonly hand: readonly Card[];
  readonly hasCalledUno: boolean;
  readonly isConnected?: boolean; // For future multiplayer support
}

// Game state with immutable structure
export interface GameState {
  readonly players: readonly Player[];
  readonly currentPlayerIndex: number;
  readonly direction: GameDirection;
  readonly phase: GamePhase;
  readonly drawPile: readonly Card[];
  readonly discardPile: readonly Card[];
  readonly currentColor: Exclude<CardColor, 'wild'>;
  readonly drawPenalty: number;
  readonly lastAction: string;
  readonly winner: Player | null;
  readonly unoCallTimeLeft: number;
  readonly pendingWildCard: Card | null;
  readonly gameStartTime: number;
  readonly turnStartTime: number;
}

// Enhanced settings with validation
export interface GameSettings {
  readonly allowDrawStacking: boolean;
  readonly strictWildDrawFour: boolean;
  readonly aiOpponents: 1 | 2 | 3;
  readonly animationIntensity: AnimationIntensity;
  readonly autoCallUno: boolean;
  readonly turnTimeLimit: number; // seconds, 0 for unlimited
  readonly soundEnabled: boolean;
}

// Action types with better payload typing
export type GameAction = 
  | { type: 'PLAY_CARD'; payload: { card: Card; playerId: string } }
  | { type: 'DRAW_CARD'; payload: { playerId: string } }
  | { type: 'CALL_UNO'; payload: { playerId: string } }
  | { type: 'SELECT_WILD_COLOR'; payload: { color: Exclude<CardColor, 'wild'> } }
  | { type: 'START_GAME'; payload?: { settings?: Partial<GameSettings> } }
  | { type: 'RESET_GAME'; payload?: never }
  | { type: 'PAUSE_GAME'; payload?: never }
  | { type: 'RESUME_GAME'; payload?: never };

// Utility types for better type safety and inference
export type PlayableCard = Card;
export type ColoredCard = NumberCard | ActionCard;
export type NonWildCard = Exclude<Card, WildCard>;

// Game statistics for analytics
export interface GameStats {
  readonly gamesPlayed: number;
  readonly gamesWon: number;
  readonly averageGameDuration: number;
  readonly cardsPlayed: number;
  readonly unoCallsMissed: number;
  readonly wildCardsPlayed: number;
}

// Error types for better error handling
export class GameError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GameError';
  }
}

export class InvalidMoveError extends GameError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'INVALID_MOVE', context);
    this.name = 'InvalidMoveError';
  }
}

export class GameStateError extends GameError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'GAME_STATE_ERROR', context);
    this.name = 'GameStateError';
  }
}

// Constants for game configuration
export const GAME_CONSTANTS = {
  INITIAL_HAND_SIZE: 7,
  MAX_PLAYERS: 4,
  MIN_PLAYERS: 2,
  UNO_CALL_TIME_LIMIT: 2000, // milliseconds
  TURN_TIME_LIMIT: 30000, // milliseconds
  ANIMATION_DURATION: {
    CARD_DEAL: 500,
    CARD_PLAY: 300,
    TURN_TRANSITION: 200,
  },
  DECK_SIZE: 108,
} as const;

// Type guards for runtime type checking
export const isNumberCard = (card: Card): card is NumberCard => 
  card.type === 'number';

export const isActionCard = (card: Card): card is ActionCard => 
  ['skip', 'reverse', 'draw_two'].includes(card.type);

export const isWildCard = (card: Card): card is WildCard => 
  ['wild', 'wild_draw_four'].includes(card.type);

export const isColoredCard = (card: Card): card is ColoredCard => 
  !isWildCard(card);

export const isValidColor = (color: string): color is CardColor =>
  CARD_COLORS.includes(color as CardColor);

export const isValidNonWildColor = (color: string): color is Exclude<CardColor, 'wild'> =>
  isValidColor(color) && color !== 'wild';