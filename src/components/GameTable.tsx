// src/components/GameTable.tsx

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../game/store';
import { getPlayableCards } from '../game/rules';
import { Card, GamePhase, PlayerType } from '../game/types';
import { Hand } from './Hand';
import { Pile } from './Pile';
import { ColorPickerModal } from './ColorPickerModal';
import { HUD } from './HUD';
import { SettingsDrawer } from './SettingsDrawer';
import { clsx } from 'clsx';

export const GameTable: React.FC = () => {
  const {
    players,
    currentPlayerIndex,
    phase,
    drawPile,
    discardPile,
    currentColor,
    settings,
    playCard,
    drawCard,
    callUno,
    selectWildColor,
    startGame,
    resetGame,
    updateSettings,
  } = useGameStore();

  const [showSettings, setShowSettings] = useState(false);
  const [invalidCardShake, setInvalidCardShake] = useState<string | null>(null);

  const humanPlayer = players.find(p => p.type === PlayerType.HUMAN);
  const aiPlayers = players.filter(p => p.type === PlayerType.AI);
  const topCard = discardPile[discardPile.length - 1];
  
  const playableCards = humanPlayer && topCard 
    ? getPlayableCards(humanPlayer.hand, topCard, currentColor, settings.strictWildDrawFour)
    : [];

  const isHumanTurn = players[currentPlayerIndex]?.type === PlayerType.HUMAN;

  // Handle card click
  const handleCardClick = (card: Card) => {
    if (!isHumanTurn || phase !== GamePhase.PLAYING) return;
    
    const isPlayable = playableCards.some(pc => pc.id === card.id);
    
    if (isPlayable) {
      playCard(card);
    } else {
      // Show shake animation for invalid card
      setInvalidCardShake(card.id);
      setTimeout(() => setInvalidCardShake(null), 500);
    }
  };

  // Auto-start game on mount if no players
  useEffect(() => {
    if (players.length === 0) {
      startGame();
    }
  }, [players.length, startGame]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSettings(false);
      }
      
      if (phase === GamePhase.UNO_CALL_WINDOW && (e.key === 'u' || e.key === 'U')) {
        callUno();
      }
      
      if (isHumanTurn && phase === GamePhase.PLAYING && e.key === 'd') {
        drawCard();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, isHumanTurn, callUno, drawCard]);

  if (phase === GamePhase.SETUP || players.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-lg shadow-xl p-8 text-center"
        >
          <h1 className="text-3xl font-bold text-gray-800 mb-4">UNO Game</h1>
          <p className="text-gray-600 mb-6">Setting up your game...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </motion.div>
      </div>
    );
  }

  if (phase === GamePhase.GAME_OVER) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-lg shadow-xl p-8 text-center max-w-md w-full mx-4"
        >
          <motion.h1
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="text-3xl font-bold text-gray-800 mb-4"
          >
            🎉 Game Over! 🎉
          </motion.h1>
          
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <div className="text-xl font-bold text-green-600 mb-2">
              Winner: {useGameStore.getState().winner?.name}
            </div>
            <div className="text-gray-600">
              Congratulations on a great game!
            </div>
          </motion.div>

          <div className="flex gap-3">
            <button
              onClick={startGame}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              Play Again
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              Settings
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-white">UNO Game</h1>
          <button
            onClick={() => setShowSettings(true)}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200"
          >
            ⚙️ Settings
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-120px)]">
          {/* Left Side - AI Players */}
          <div className="lg:col-span-1 space-y-4">
            {aiPlayers.slice(0, 2).map((player, index) => (
              <Hand
                key={player.id}
                cards={player.hand}
                playableCards={[]}
                playerName={player.name}
                showCards={false}
                isCurrentPlayer={players[currentPlayerIndex]?.id === player.id}
                className="bg-white bg-opacity-10 rounded-lg p-3"
              />
            ))}
          </div>

          {/* Center - Game Area */}
          <div className="lg:col-span-2 flex flex-col">
            {/* Top AI Player */}
            {aiPlayers[2] && (
              <Hand
                cards={aiPlayers[2].hand}
                playableCards={[]}
                playerName={aiPlayers[2].name}
                showCards={false}
                isCurrentPlayer={players[currentPlayerIndex]?.id === aiPlayers[2].id}
                className="bg-white bg-opacity-10 rounded-lg p-3 mb-4"
              />
            )}

            {/* Game Piles */}
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-8">
                <Pile
                  type="draw"
                  cards={drawPile}
                  onDrawClick={isHumanTurn && phase === GamePhase.PLAYING ? drawCard : undefined}
                />
                <Pile
                  type="discard"
                  cards={discardPile}
                  currentColor={currentColor}
                />
              </div>
            </div>

            {/* Human Player Hand */}
            {humanPlayer && (
              <Hand
                cards={humanPlayer.hand}
                playableCards={playableCards}
                onCardClick={handleCardClick}
                playerName={humanPlayer.name}
                isCurrentPlayer={players[currentPlayerIndex]?.id === humanPlayer.id}
                className="bg-white bg-opacity-10 rounded-lg p-3 mt-4"
              />
            )}
          </div>

          {/* Right Side - HUD */}
          <div className="lg:col-span-1">
            <HUD
              gameState={useGameStore.getState()}
              onUnoCall={callUno}
              onDrawCard={drawCard}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <ColorPickerModal
        isOpen={phase === GamePhase.WILD_COLOR_SELECTION}
        onColorSelect={selectWildColor}
        onClose={() => {}} // Color selection is required
      />

      <SettingsDrawer
        isOpen={showSettings}
        settings={settings}
        onSettingsChange={updateSettings}
        onClose={() => setShowSettings(false)}
        onNewGame={startGame}
      />

      {/* Invalid Card Shake Animation */}
      <AnimatePresence>
        {invalidCardShake && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-40"
          >
            Card not playable!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Help */}
      <div className="fixed bottom-4 right-4 bg-black bg-opacity-50 text-white text-xs p-2 rounded opacity-50 hover:opacity-100 transition-opacity">
        <div>ESC: Settings</div>
        <div>D: Draw Card</div>
        <div>U: Call UNO</div>
      </div>
    </div>
  );
};