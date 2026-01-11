// src/components/CardView.tsx

import React from 'react';
import { motion } from 'framer-motion';
import { Card, isNumberCard, isActionCard, isWildCard } from '../game/types';
import { clsx } from 'clsx';

interface CardViewProps {
  card: Card;
  isPlayable?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showBack?: boolean;
  animate?: boolean;
}

const colorClasses = {
  red: 'bg-uno-red text-white',
  yellow: 'bg-uno-yellow text-black',
  green: 'bg-uno-green text-white',
  blue: 'bg-uno-blue text-white',
  wild: 'bg-gradient-to-br from-uno-red via-uno-yellow via-uno-green to-uno-blue text-white',
};

const sizeClasses = {
  small: 'w-12 h-16 text-xs',
  medium: 'w-16 h-24 text-sm',
  large: 'w-20 h-32 text-base',
};

const cardTypeIcons = {
  skip: '⊘',
  reverse: '↻',
  draw_two: '+2',
  wild: 'W',
  wild_draw_four: '+4',
};

const cardTypePatterns = {
  skip: '⊘⊘⊘',
  reverse: '↻↻↻',
  draw_two: '++',
  wild: '★★★',
  wild_draw_four: '+4+4',
};

export const CardView: React.FC<CardViewProps> = ({
  card,
  isPlayable = false,
  isSelected = false,
  onClick,
  className,
  size = 'medium',
  showBack = false,
  animate = true,
}) => {
  const handleClick = () => {
    if (onClick && !showBack) {
      onClick();
    }
  };

  const cardContent = showBack ? (
    <div className="w-full h-full bg-gray-800 rounded-lg border-2 border-gray-300 flex items-center justify-center">
      <div className="text-white font-bold text-lg">UNO</div>
    </div>
  ) : (
    <div
      className={clsx(
        'rounded-lg border-2 border-gray-300 flex flex-col items-center justify-center font-bold cursor-pointer transition-all duration-200',
        colorClasses[card.color],
        sizeClasses[size],
        {
          'hover:scale-105 hover:shadow-lg': isPlayable && onClick,
          'opacity-50 cursor-not-allowed': !isPlayable && onClick,
          'ring-2 ring-yellow-400 ring-offset-2': isSelected,
          'shadow-lg transform scale-105': isSelected,
        },
        className
      )}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`${card.color} ${isNumberCard(card) ? card.value : card.type} card${isPlayable ? ', playable' : ''}`}
    >
      {/* Card content */}
      <div className="flex flex-col items-center justify-center h-full">
        {isNumberCard(card) ? (
          <>
            <div className="text-2xl font-black">{card.value}</div>
            {size === 'large' && (
              <div className="text-xs opacity-75 mt-1">
                {card.color.toUpperCase()}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="text-xl font-black">
              {cardTypeIcons[card.type]}
            </div>
            {size === 'large' && (
              <div className="text-xs opacity-75 mt-1 text-center leading-tight">
                {card.type.replace('_', ' ').toUpperCase()}
              </div>
            )}
          </>
        )}
      </div>

      {/* Color-blind support patterns */}
      {card.color !== 'wild' && size === 'large' && (
        <div className="absolute top-1 right-1 text-xs opacity-50">
          {card.color === 'red' && '●'}
          {card.color === 'yellow' && '▲'}
          {card.color === 'green' && '■'}
          {card.color === 'blue' && '♦'}
        </div>
      )}

      {/* Action card patterns for accessibility */}
      {!isNumberCard(card) && size === 'large' && (
        <div className="absolute bottom-1 left-1 text-xs opacity-30">
          {cardTypePatterns[card.type]}
        </div>
      )}
    </div>
  );

  if (!animate) {
    return cardContent;
  }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      whileHover={isPlayable && onClick ? { scale: 1.05 } : undefined}
      whileTap={isPlayable && onClick ? { scale: 0.95 } : undefined}
      transition={{ duration: 0.2 }}
    >
      {cardContent}
    </motion.div>
  );
};