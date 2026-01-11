// src/game/ai.ts

import { 
  Card, 
  Player, 
  GameState, 
  isNumberCard, 
  isActionCard, 
  isWildCard,
  isValidNonWildColor,
  InvalidMoveError,
  GAME_CONSTANTS
} from './types';
import { getPlayableCards, isValidColorSelection } from './rules';

// AI difficulty levels for future expansion
export type AIDifficulty = 'easy' | 'medium' | 'hard';

export interface AIMove {
  readonly type: 'PLAY_CARD' | 'DRAW_CARD';
  readonly card?: Card;
  readonly confidence: number; // 0-1, how confident the AI is in this move
  readonly reasoning?: string; // For debugging/analytics
}

// Enhanced AI strategy with multiple difficulty levels
export function chooseAIMove(
  player: Player, 
  gameState: GameState, 
  strictWildDrawFour: boolean = false,
  difficulty: AIDifficulty = 'medium'
): AIMove {
  const topCard = gameState.discardPile[gameState.discardPile.length - 1];
  if (!topCard) {
    throw new InvalidMoveError('No top card in discard pile');
  }
  
  const playableCards = getPlayableCards(
    player.hand, 
    topCard, 
    gameState.currentColor, 
    strictWildDrawFour
  );
  
  if (playableCards.length === 0) {
    return { 
      type: 'DRAW_CARD', 
      confidence: 1.0,
      reasoning: 'No playable cards available'
    };
  }
  
  // Choose strategy based on difficulty
  const bestCard = selectBestCard(playableCards, player.hand, gameState, difficulty);
  
  return { 
    type: 'PLAY_CARD', 
    card: bestCard.card,
    confidence: bestCard.confidence,
    reasoning: bestCard.reasoning
  };
}

interface CardChoice {
  card: Card;
  confidence: number;
  reasoning: string;
}

// Enhanced card selection with strategic thinking
function selectBestCard(
  playableCards: readonly Card[], 
  hand: readonly Card[], 
  gameState: GameState,
  difficulty: AIDifficulty
): CardChoice {
  const gameAnalysis = analyzeGameState(gameState, hand);
  const cardScores = playableCards.map(card => scoreCard(card, hand, gameAnalysis, difficulty));
  
  // Sort by score (highest first)
  cardScores.sort((a, b) => b.score - a.score);
  
  const bestChoice = cardScores[0];
  
  return {
    card: bestChoice.card,
    confidence: Math.min(bestChoice.score / 100, 1.0), // Normalize to 0-1
    reasoning: bestChoice.reasoning
  };
}

interface GameAnalysis {
  opponentMinCards: number;
  opponentThreat: boolean;
  myCardCount: number;
  dominantColor: Exclude<Card['color'], 'wild'> | null;
  colorDistribution: Record<Exclude<Card['color'], 'wild'>, number>;
  hasWildCards: boolean;
  gamePhase: 'early' | 'mid' | 'late';
}

// Analyze current game state for strategic decisions
function analyzeGameState(gameState: GameState, myHand: readonly Card[]): GameAnalysis {
  const opponents = gameState.players.filter((_, index) => index !== gameState.currentPlayerIndex);
  const opponentMinCards = Math.min(...opponents.map(p => p.hand.length));
  
  const colorDistribution = getColorDistribution(myHand);
  const dominantColor = getDominantColor(colorDistribution);
  
  const totalCards = gameState.players.reduce((sum, p) => sum + p.hand.length, 0);
  const averageCards = totalCards / gameState.players.length;
  
  return {
    opponentMinCards,
    opponentThreat: opponentMinCards <= 2,
    myCardCount: myHand.length,
    dominantColor,
    colorDistribution,
    hasWildCards: myHand.some(isWildCard),
    gamePhase: averageCards > 5 ? 'early' : averageCards > 3 ? 'mid' : 'late'
  };
}

interface CardScore {
  card: Card;
  score: number;
  reasoning: string;
}

// Advanced card scoring system
function scoreCard(
  card: Card, 
  hand: readonly Card[], 
  analysis: GameAnalysis,
  difficulty: AIDifficulty
): CardScore {
  let score = 0;
  const reasons: string[] = [];
  
  // Base scores by card type
  if (isNumberCard(card)) {
    score += 10;
    reasons.push('number card');
  } else if (isActionCard(card)) {
    score += 30;
    reasons.push('action card');
  } else if (isWildCard(card)) {
    score += 20;
    reasons.push('wild card');
  }
  
  // Threat response (higher priority when opponents are close to winning)
  if (analysis.opponentThreat) {
    if (card.type === 'wild_draw_four') {
      score += 50;
      reasons.push('wild draw four vs threat');
    } else if (card.type === 'draw_two') {
      score += 40;
      reasons.push('draw two vs threat');
    } else if (card.type === 'skip' || card.type === 'reverse') {
      score += 35;
      reasons.push('skip/reverse vs threat');
    }
  }
  
  // Color strategy
  if (!isWildCard(card) && analysis.dominantColor) {
    if (card.color === analysis.dominantColor) {
      // Prefer to keep dominant color unless we have too many
      const dominantCount = analysis.colorDistribution[analysis.dominantColor];
      if (dominantCount > 3) {
        score += 15;
        reasons.push('reduce dominant color');
      } else {
        score -= 5;
        reasons.push('keep dominant color');
      }
    }
  }
  
  // Wild card strategy
  if (isWildCard(card)) {
    if (analysis.dominantColor && analysis.colorDistribution[analysis.dominantColor] >= 3) {
      score += 25;
      reasons.push('wild to change to dominant color');
    }
    
    // Save wilds for later in the game unless necessary
    if (analysis.gamePhase === 'early' && !analysis.opponentThreat) {
      score -= 10;
      reasons.push('save wild for later');
    }
  }
  
  // High-value card disposal (get rid of high-point cards)
  if (isNumberCard(card) && card.value >= 7) {
    score += card.value;
    reasons.push(`dispose high value (${card.value})`);
  }
  
  // End-game strategy
  if (analysis.myCardCount <= 3) {
    if (isWildCard(card)) {
      score += 20;
      reasons.push('wild for endgame flexibility');
    }
    
    // Prefer cards that match current game state
    if (!isWildCard(card)) {
      score += 10;
      reasons.push('colored card for endgame');
    }
  }
  
  // Difficulty adjustments
  if (difficulty === 'easy') {
    // Add some randomness for easier AI
    score += Math.random() * 20 - 10;
    reasons.push('easy mode randomness');
  } else if (difficulty === 'hard') {
    // More sophisticated strategy for hard AI
    score += calculateAdvancedStrategy(card, hand, analysis);
    reasons.push('advanced strategy');
  }
  
  return {
    card,
    score: Math.max(0, score),
    reasoning: reasons.join(', ')
  };
}

// Advanced strategy calculations for hard difficulty
function calculateAdvancedStrategy(
  card: Card, 
  hand: readonly Card[], 
  analysis: GameAnalysis
): number {
  let bonus = 0;
  
  // Card counting strategy
  const remainingCards = estimateRemainingCards(card, analysis);
  if (remainingCards < 2) {
    bonus += 15; // Prefer rare cards
  }
  
  // Combo potential
  const comboValue = calculateComboValue(card, hand);
  bonus += comboValue;
  
  // Defensive play
  if (analysis.opponentThreat && isActionCard(card)) {
    bonus += 20; // Prioritize disruption
  }
  
  return bonus;
}

// Estimate how many of this card type remain in play
function estimateRemainingCards(card: Card, analysis: GameAnalysis): number {
  // This is a simplified estimation - in a real implementation,
  // we'd track played cards more carefully
  if (isNumberCard(card)) {
    return card.value === 0 ? 1 : 2; // 0s have 1 per color, others have 2
  }
  if (isActionCard(card)) {
    return 2; // 2 per color
  }
  if (isWildCard(card)) {
    return 1; // 4 total, but we don't know how many are left
  }
  return 1;
}

// Calculate potential for card combinations
function calculateComboValue(card: Card, hand: readonly Card[]): number {
  let value = 0;
  
  if (isNumberCard(card)) {
    // Check for number sequences or matches
    const sameNumbers = hand.filter(c => 
      isNumberCard(c) && c.value === card.value && c.id !== card.id
    ).length;
    value += sameNumbers * 5;
  }
  
  if (!isWildCard(card)) {
    // Check for same color cards
    const sameColor = hand.filter(c => 
      !isWildCard(c) && c.color === card.color && c.id !== card.id
    ).length;
    value += sameColor * 2;
  }
  
  return value;
}

// Enhanced wild color selection with strategic thinking
export function chooseWildColor(
  hand: readonly Card[], 
  gameState?: GameState,
  difficulty: AIDifficulty = 'medium'
): Exclude<Card['color'], 'wild'> {
  const colorDistribution = getColorDistribution(hand);
  
  // Remove cards we're about to play from consideration
  const availableColors = Object.entries(colorDistribution)
    .filter(([color, count]) => count > 0 && isValidNonWildColor(color))
    .sort(([, a], [, b]) => b - a) as [Exclude<Card['color'], 'wild'>, number][];
  
  if (availableColors.length === 0) {
    // No colored cards, choose strategically or randomly
    const colors: Exclude<Card['color'], 'wild'>[] = ['red', 'yellow', 'green', 'blue'];
    
    if (difficulty === 'hard' && gameState) {
      // Choose color that opponents are least likely to have
      return chooseStrategicColor(gameState, colors);
    }
    
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  const chosenColor = availableColors[0][0];
  
  // Validate the choice
  if (!isValidColorSelection(chosenColor)) {
    return 'red'; // Safe fallback
  }
  
  return chosenColor;
}

// Choose color strategically based on game state
function chooseStrategicColor(
  gameState: GameState, 
  colors: Exclude<Card['color'], 'wild'>[]
): Exclude<Card['color'], 'wild'> {
  // Simple heuristic: choose the color that was played least recently
  const recentCards = gameState.discardPile.slice(-5);
  const recentColors = recentCards
    .filter(card => !isWildCard(card))
    .map(card => card.color);
  
  const colorFrequency = colors.reduce((freq, color) => {
    freq[color] = recentColors.filter(c => c === color).length;
    return freq;
  }, {} as Record<string, number>);
  
  // Choose least frequent color
  const sortedColors = colors.sort((a, b) => 
    (colorFrequency[a] || 0) - (colorFrequency[b] || 0)
  );
  
  return sortedColors[0];
}

// Get color distribution in hand
function getColorDistribution(hand: readonly Card[]): Record<Exclude<Card['color'], 'wild'>, number> {
  const distribution: Record<Exclude<Card['color'], 'wild'>, number> = {
    red: 0,
    yellow: 0,
    green: 0,
    blue: 0,
  };
  
  for (const card of hand) {
    if (!isWildCard(card)) {
      distribution[card.color]++;
    }
  }
  
  return distribution;
}

// Get the most common color in hand
function getDominantColor(
  distribution: Record<Exclude<Card['color'], 'wild'>, number>
): Exclude<Card['color'], 'wild'> | null {
  const entries = Object.entries(distribution) as [Exclude<Card['color'], 'wild'>, number][];
  const sorted = entries.sort(([, a], [, b]) => b - a);
  
  return sorted[0][1] > 0 ? sorted[0][0] : null;
}

// Enhanced move validation with detailed error reporting
export function validateAIMove(
  move: AIMove, 
  player: Player, 
  gameState: GameState
): boolean {
  try {
    if (move.type === 'DRAW_CARD') {
      return true; // Drawing is always legal when no playable cards
    }
    
    if (move.type === 'PLAY_CARD' && move.card) {
      // Verify card is in player's hand
      const hasCard = player.hand.some(c => c.id === move.card!.id);
      if (!hasCard) {
        console.error('AI attempted to play card not in hand:', {
          card: move.card,
          playerId: player.id,
          hand: player.hand.map(c => ({ id: c.id, type: c.type, color: c.color }))
        });
        return false;
      }
      
      // Verify card is playable
      const topCard = gameState.discardPile[gameState.discardPile.length - 1];
      if (!topCard) {
        console.error('AI attempted to play card with no top card');
        return false;
      }
      
      const playableCards = getPlayableCards(
        player.hand, 
        topCard, 
        gameState.currentColor
      );
      
      const isPlayable = playableCards.some(c => c.id === move.card!.id);
      if (!isPlayable) {
        console.error('AI attempted to play unplayable card:', {
          card: move.card,
          topCard,
          currentColor: gameState.currentColor,
          playableCards: playableCards.map(c => ({ id: c.id, type: c.type, color: c.color }))
        });
        return false;
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error validating AI move:', error);
    return false;
  }
}

// AI performance analytics
export interface AIAnalytics {
  movesPlayed: number;
  averageConfidence: number;
  strategicMoves: number;
  defensiveMoves: number;
  wildCardsPlayed: number;
}

export function createAIAnalytics(): AIAnalytics {
  return {
    movesPlayed: 0,
    averageConfidence: 0,
    strategicMoves: 0,
    defensiveMoves: 0,
    wildCardsPlayed: 0,
  };
}