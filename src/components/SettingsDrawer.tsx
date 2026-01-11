// src/components/SettingsDrawer.tsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameSettings } from '../game/types';
import { clsx } from 'clsx';

interface SettingsDrawerProps {
  isOpen: boolean;
  settings: GameSettings;
  onSettingsChange: (settings: Partial<GameSettings>) => void;
  onClose: () => void;
  onNewGame: () => void;
  className?: string;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  settings,
  onSettingsChange,
  onClose,
  onNewGame,
  className,
}) => {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleNewGame = () => {
    onNewGame();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className={clsx('bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto', className)}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">Game Settings</h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                  aria-label="Close settings"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* AI Opponents */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI Opponents: {settings.aiOpponents}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    value={settings.aiOpponents}
                    onChange={(e) => onSettingsChange({ aiOpponents: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1</span>
                    <span>2</span>
                    <span>3</span>
                  </div>
                </div>

                {/* Draw Stacking */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Allow Draw Stacking
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Allow Draw Two and Wild Draw Four cards to be stacked
                    </p>
                  </div>
                  <button
                    onClick={() => onSettingsChange({ allowDrawStacking: !settings.allowDrawStacking })}
                    className={clsx(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
                      settings.allowDrawStacking ? 'bg-blue-600' : 'bg-gray-300'
                    )}
                  >
                    <span
                      className={clsx(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200',
                        settings.allowDrawStacking ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>

                {/* Strict Wild Draw Four */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Strict Wild Draw Four
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Only allow Wild Draw Four when no matching color cards
                    </p>
                  </div>
                  <button
                    onClick={() => onSettingsChange({ strictWildDrawFour: !settings.strictWildDrawFour })}
                    className={clsx(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
                      settings.strictWildDrawFour ? 'bg-blue-600' : 'bg-gray-300'
                    )}
                  >
                    <span
                      className={clsx(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200',
                        settings.strictWildDrawFour ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>

                {/* Animation Intensity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Animation Intensity
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onSettingsChange({ animationIntensity: 'reduced' })}
                      className={clsx(
                        'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors duration-200',
                        settings.animationIntensity === 'reduced'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      Reduced
                    </button>
                    <button
                      onClick={() => onSettingsChange({ animationIntensity: 'full' })}
                      className={clsx(
                        'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors duration-200',
                        settings.animationIntensity === 'full'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      Full
                    </button>
                  </div>
                </div>

                {/* Accessibility Note */}
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-800">
                    <strong>Accessibility:</strong> This game respects your system's reduced motion preferences.
                    Color-blind support includes shape indicators on cards.
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-8">
                <button
                  onClick={handleNewGame}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200"
                >
                  New Game
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};