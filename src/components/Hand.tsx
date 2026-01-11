// src/components/Hand.tsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../game/types';
import { CardView } from './CardView';
import { clsx } from 'clsx';

interface HandProps {
  cards: Card[];
  playableCards: Card[];
  onCardClick?: (card: Card) => void;
  isCurrentPlayer?: boolean;
  playerName?: string;
  showCards?: boolean;
  className?: string;
}

export const Hand: React.FC<HandProps> = ({
  cards,
  playableCards,
  onCardClick,
  isCurrentPlayer = false,
  playerName,
  showCards = true,
  className,
}) => {
  const isPlayable = (card: Card) => playableCards.some(pc => pc.id === card.id);

  if (!showCards) {
    // Show card backs for opponents
    return (
      <div className={clsx('flex flex-col items-center', className)}>
        {playerName && (
          <div className={clsx(
            'text-sm font-medium mb-2 px-2 py-1 rounded',
            isCurrentPlayer ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-200 text-gray-700'
          )}>
            {playerName} ({cards.length} cards)
          </div>
        )}
        <div className="flex flex-wrap gap-1 justify-center">
          <AnimatePresence>
            {cards.map((_, index) => (
              <motion.div
                key={`back-${index}`}
                initial={{ scale: 0, rotate: 180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ delay: index * 0.05 }}
              >
                <CardView
                  card={{ id: `back-${index}`, color: 'red' as any, type: 'number' as any }}
                  showBack={true}
                  size="small"
                  animate={false}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('flex flex-col items-center', className)}>
      {playerName && (
        <div className={clsx(
          'text-sm font-medium mb-2 px-2 py-1 rounded',
          isCurrentPlayer ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-200 text-gray-700'
        )}>
          {playerName}
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 justify-center max-w-full overflow-x-auto pb-2">
        <AnimatePresence>
          {cards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ scale: 0, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0, y: -50 }}
              transition={{ delay: index * 0.05 }}
              className="flex-shrink-0"
            >
              <CardView
                card={card}
                isPlayable={isPlayable(card)}
                onClick={onCardClick ? () => onCardClick(card) : undefined}
                size={isCurrentPlayer ? 'large' : 'medium'}
                className={clsx({
                  'hover:animate-pulse': isPlayable(card) && onCardClick,
                  'animate-shake': !isPlayable(card) && onCardClick,
                })}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {cards.length === 1 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mt-2 text-red-600 font-bold text-sm animate-pulse"
        >
          UNO!
        </motion.div>
      )}
    </div>
  );
};