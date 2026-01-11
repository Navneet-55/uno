// src/components/Pile.tsx

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardColor } from '../game/types';
import { CardView } from './CardView';
import { clsx } from 'clsx';

interface PileProps {
  type: 'draw' | 'discard';
  cards: Card[];
  currentColor?: CardColor;
  onDrawClick?: () => void;
  className?: string;
}

export const Pile: React.FC<PileProps> = ({
  type,
  cards,
  currentColor,
  onDrawClick,
  className,
}) => {
  const topCard = cards[cards.length - 1];
  const cardCount = cards.length;

  if (type === 'draw') {
    return (
      <div className={clsx('flex flex-col items-center', className)}>
        <div className="text-sm font-medium text-gray-600 mb-2">
          Draw Pile ({cardCount})
        </div>
        <motion.div
          whileHover={onDrawClick ? { scale: 1.05 } : undefined}
          whileTap={onDrawClick ? { scale: 0.95 } : undefined}
          className="relative"
        >
          {/* Stack effect with multiple card backs */}
          <div className="relative">
            {cardCount > 0 && (
              <>
                {cardCount > 2 && (
                  <div className="absolute -top-1 -left-1 opacity-30">
                    <CardView
                      card={{ id: 'stack-3', color: 'red' as any, type: 'number' as any }}
                      showBack={true}
                      size="medium"
                      animate={false}
                    />
                  </div>
                )}
                {cardCount > 1 && (
                  <div className="absolute -top-0.5 -left-0.5 opacity-60">
                    <CardView
                      card={{ id: 'stack-2', color: 'red' as any, type: 'number' as any }}
                      showBack={true}
                      size="medium"
                      animate={false}
                    />
                  </div>
                )}
                <CardView
                  card={{ id: 'stack-1', color: 'red' as any, type: 'number' as any }}
                  showBack={true}
                  size="medium"
                  onClick={onDrawClick}
                  className={clsx({
                    'cursor-pointer hover:shadow-lg': onDrawClick,
                    'cursor-not-allowed opacity-50': !onDrawClick && cardCount === 0,
                  })}
                />
              </>
            )}
            {cardCount === 0 && (
              <div className="w-16 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                Empty
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // Discard pile
  return (
    <div className={clsx('flex flex-col items-center', className)}>
      <div className="text-sm font-medium text-gray-600 mb-2">
        Discard Pile
      </div>
      
      {/* Current color indicator */}
      {currentColor && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-600">Current Color:</span>
          <div
            className={clsx(
              'w-4 h-4 rounded-full border-2 border-gray-300',
              {
                'bg-uno-red': currentColor === CardColor.RED,
                'bg-uno-yellow': currentColor === CardColor.YELLOW,
                'bg-uno-green': currentColor === CardColor.GREEN,
                'bg-uno-blue': currentColor === CardColor.BLUE,
                'bg-gradient-to-r from-uno-red via-uno-yellow via-uno-green to-uno-blue': currentColor === CardColor.WILD,
              }
            )}
            aria-label={`Current color: ${currentColor}`}
          />
          <span className="text-xs font-medium capitalize">{currentColor}</span>
        </div>
      )}

      <div className="relative">
        {topCard ? (
          <motion.div
            key={topCard.id}
            initial={{ scale: 0, rotate: 180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CardView
              card={topCard}
              size="medium"
              className="shadow-lg"
            />
          </motion.div>
        ) : (
          <div className="w-16 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-xs">
            Empty
          </div>
        )}
        
        {/* Stack effect for discard pile */}
        {cardCount > 1 && (
          <>
            <div className="absolute -bottom-1 -right-1 opacity-30 -z-10">
              <CardView
                card={{ id: 'discard-stack-1', color: 'red' as any, type: 'number' as any }}
                showBack={true}
                size="medium"
                animate={false}
              />
            </div>
            {cardCount > 2 && (
              <div className="absolute -bottom-2 -right-2 opacity-15 -z-20">
                <CardView
                  card={{ id: 'discard-stack-2', color: 'red' as any, type: 'number' as any }}
                  showBack={true}
                  size="medium"
                  animate={false}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};