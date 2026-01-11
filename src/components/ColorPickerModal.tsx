// src/components/ColorPickerModal.tsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

interface ColorPickerModalProps {
  isOpen: boolean;
  onColorSelect: (color: 'red' | 'yellow' | 'green' | 'blue') => void;
  onClose: () => void;
}

const colorOptions = [
  { color: 'red' as const, label: 'Red', bgClass: 'bg-uno-red', icon: '●' },
  { color: 'yellow' as const, label: 'Yellow', bgClass: 'bg-uno-yellow', icon: '▲' },
  { color: 'green' as const, label: 'Green', bgClass: 'bg-uno-green', icon: '■' },
  { color: 'blue' as const, label: 'Blue', bgClass: 'bg-uno-blue', icon: '♦' },
];

export const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  isOpen,
  onColorSelect,
  onClose,
}) => {
  const handleColorSelect = (color: 'red' | 'yellow' | 'green' | 'blue') => {
    onColorSelect(color);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
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
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-center mb-4 text-gray-800">
              Choose Wild Color
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              {colorOptions.map(({ color, label, bgClass, icon }) => (
                <motion.button
                  key={color}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleColorSelect(color)}
                  className={clsx(
                    'p-4 rounded-lg text-white font-bold text-lg flex flex-col items-center gap-2 transition-all duration-200 hover:shadow-lg',
                    bgClass,
                    {
                      'text-black': color === 'yellow',
                    }
                  )}
                  aria-label={`Select ${label} color`}
                >
                  <span className="text-2xl">{icon}</span>
                  <span>{label}</span>
                </motion.button>
              ))}
            </div>
            
            <div className="mt-4 text-center">
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-sm underline"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};