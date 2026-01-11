// src/components/HUD.tsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState, GamePhase, GameDirection, Player } from '../game/types';
import { clsx } from 'clsx';

interface HUDProps {
  gameState: GameState;
  onUnoCall: () => void;
  onDrawCard: () => void;
  className?: string;
}

export const HUD: React.FC<HUDProps> = ({
  gameState,
  onUnoCall,
  onDrawCard,
  className,
}) => {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isHumanTurn = currentPlayer?.type === 'human';
  const canDraw = gameState.phase === GamePhase.PLAYING && isHumanTurn && gameState.drawPenalty === 0;
  const canCallUno = gameState.phase === GamePhase.UNO_CALL_WINDOW && isHumanTurn;

  return (
    <div className={clsx('bg-white rounded-lg shadow-lg p-4', className)}>
      {/* Current Player Indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-gray-600">Current Player:</div>
          <div className={clsx(
            'px-3 py-1 rounded-full text-sm font-bold',
            isHumanTurn ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
          )}>
            {currentPlayer?.name || 'Unknown'}
          </div>
        </div>
        
        {/* Direction Indicator */}
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-gray-600">Direction:</div>
          <motion.div
            animate={{ rotate: gameState.direction === GameDirection.CLOCKWISE ? 0 : 180 }}
            transition={{ duration: 0.3 }}
            className="text-lg"
          >
            ↻
          </motion.div>
        </div>
      </div>

      {/* Game Status */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-xs text-gray-500">Cards Left</div>
          <div className="text-lg font-bold text-gray-800">{gameState.drawPile.length}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500">Draw Penalty</div>
          <div className={clsx(
            'text-lg font-bold',
            gameState.drawPenalty > 0 ? 'text-red-600' : 'text-gray-800'
          )}>
            {gameState.drawPenalty}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <AnimatePresence>
          {canDraw && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onDrawCard}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Draw Card
            </motion.button>
          )}
          
          {canCallUno && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onUnoCall}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 animate-pulse"
            >
              UNO! ({Math.ceil(gameState.unoCallTimeLeft / 1000)}s)
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Last Action */}
      {gameState.lastAction && (
        <div className="mt-4 p-2 bg-gray-50 rounded text-sm text-gray-700 text-center">
          {gameState.lastAction}
        </div>
      )}

      {/* Draw Penalty Warning */}
      {gameState.drawPenalty > 0 && isHumanTurn && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg"
        >
          <div className="text-red-800 text-sm font-medium text-center">
            You must draw {gameState.drawPenalty} penalty cards!
          </div>
          <div className="text-red-600 text-xs text-center mt-1">
            Click a card or draw to continue
          </div>
        </motion.div>
      )}

      {/* Player Scores */}
      <div className="mt-4 border-t pt-4">
        <div className="text-sm font-medium text-gray-600 mb-2">Players:</div>
        <div className="space-y-1">
          {gameState.players.map((player, index) => (
            <div
              key={player.id}
              className={clsx(
                'flex justify-between items-center text-sm p-2 rounded',
                index === gameState.currentPlayerIndex ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
              )}
            >
              <span className={clsx(
                'font-medium',
                index === gameState.currentPlayerIndex ? 'text-yellow-800' : 'text-gray-700'
              )}>
                {player.name}
                {player.hasCalledUno && player.hand.length === 1 && (
                  <span className="ml-1 text-red-600 font-bold">UNO!</span>
                )}
              </span>
              <span className={clsx(
                'font-bold',
                index === gameState.currentPlayerIndex ? 'text-yellow-800' : 'text-gray-600'
              )}>
                {player.hand.length} cards
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};