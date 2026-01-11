// src/game/types.ts

export enum CardColor {
  RED = 'red',
  YELLOW = 'yellow',
  GREEN = 'green',
  BLUE = 'blue',
  WILD = 'wild'
}

export enum CardType {
  NUMBER = 'number',
  SKIP = 'skip',
  REVERSE = 'reverse',
  DRAW_TWO = 'draw_two',
  WILD = 'wild',
  WILD_DRAW_FOUR = 'wild_draw_four'
}

export interface Card {
  id: string;
  color: CardColor;
  type: CardType;
  value?: number; // 0-9 for number cards
}

export enum PlayerType {
  HUMAN = 'human',
  AI = 'ai'
}

export interface Player {
  id: string;
  name: string;
  type: PlayerType;
  hand: Card[];
  hasCalledUno: boolean;
}

export enum GameDirection {
  CLOCKWISE = 'clockwise',
  COUNTERCLOCKWISE = 'counterclockwise'
}

export enum GamePhase {
  SETUP = 'setup',
  PLAYING = 'playing',
  WILD_COLOR_SELECTION = 'wild_color_selection',
  UNO_CALL_WINDOW = 'uno_call_window',
  GAME_OVER = 'game_over'
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  direction: GameDirection;
  phase: GamePhase;
  drawPile: Card[];
  discardPile: Card[];
  currentColor: CardColor;
  drawPenalty: number; // accumulated draw penalty
  lastAction: string;
  winner: Player | null;
  unoCallTimeLeft: number; // milliseconds
  pendingWildCard: Card | null; // card waiting for color selection
}

export interface GameSettings {
  allowDrawStacking: boolean;
  strictWildDrawFour: boolean;
  aiOpponents: number; // 1-3
  animationIntensity: 'full' | 'reduced';
}

export interface GameAction {
  type: 'PLAY_CARD' | 'DRAW_CARD' | 'CALL_UNO' | 'SELECT_WILD_COLOR' | 'START_GAME' | 'RESET_GAME';
  payload?: any;
}

// Utility types for better type safety
export type PlayableCard = Card;
export type ColorCard = Card & { color: Exclude<CardColor, CardColor.WILD> };
export type WildCard = Card & { color: CardColor.WILD };