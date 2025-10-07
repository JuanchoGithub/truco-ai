
import React, { useState } from 'react';
import { Card as CardType } from '../types';
import Card from './Card';

interface PlayerHandProps {
  cards: CardType[];
  playerType: 'player' | 'ai';
  onCardPlay?: (cardIndex: number) => void;
  isMyTurn?: boolean;
  isThinking?: boolean;
  isDebugMode?: boolean;
}

const PlayerHand: React.FC<PlayerHandProps> = ({ cards, playerType, onCardPlay, isMyTurn = false, isThinking = false, isDebugMode = false }) => {
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
  const isPlayer = playerType === 'player';

  if (isPlayer) {
    return (
      <div className="flex justify-center items-end relative h-[180px] md:h-[200px] w-[300px] md:w-[400px]">
        {cards.map((card, index) => {
          const middleIndex = (cards.length - 1) / 2;
          const offset = index - middleIndex;

          // Card positioning logic for a wider, clearer fan
          const rotation = offset * 15;
          const initialTranslateY = Math.abs(offset) * 25;
          const translateX = offset * 50;
          
          const isHovered = hoveredCardIndex === index;

          // Dynamic transform string handles both base position and hover animation
          const transform = `
            translateX(${translateX}px) 
            rotate(${isHovered && isMyTurn ? 0 : rotation}deg) 
            translateY(${isHovered && isMyTurn ? -40 : -initialTranslateY}px)
          `;

          return (
            <div
              key={`${card.rank}-${card.suit}`}
              className="absolute transition-all duration-300 ease-out"
              style={{
                transform,
                transformOrigin: 'bottom center',
                zIndex: isHovered ? 100 : index,
              }}
              onMouseEnter={() => isMyTurn && setHoveredCardIndex(index)}
              onMouseLeave={() => isMyTurn && setHoveredCardIndex(null)}
              onClick={() => isPlayer && isMyTurn && onCardPlay && onCardPlay(index)}
            >
              <Card
                card={card}
                isPlayable={isPlayer && isMyTurn}
              />
            </div>
          );
        })}
      </div>
    );
  }

  // AI Hand
  return (
    <div className="flex flex-col items-center justify-center relative h-[100px] md:h-[140px] w-full">
      {isThinking && (
        <div className="absolute -top-5 md:-top-6 text-base md:text-lg animate-pulse z-30" style={{ textShadow: '2px 2px 3px rgba(0,0,0,0.7)' }}>AI is thinking...</div>
      )}
      <div className="flex justify-center space-x-[-50px] md:space-x-[-60px]">
        {cards.map((card, index) => (
            <Card
              key={`${card.rank}-${card.suit}-${index}`}
              card={card}
              isFaceDown={!isDebugMode}
              className="shadow-lg"
            />
        ))}
      </div>
    </div>
  );
};

export default PlayerHand;
