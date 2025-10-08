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
  className?: string;
}

const PlayerHand: React.FC<PlayerHandProps> = ({ cards, playerType, onCardPlay, isMyTurn = false, isThinking = false, isDebugMode = false, className = '' }) => {
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
  const isPlayer = playerType === 'player';

  if (isPlayer) {
    return (
      <div className={`flex justify-center items-center relative h-[280px] md:h-[360px] ${className}`}>
        {cards.map((card, index) => {
          const middleIndex = (cards.length - 1) / 2;
          const offset = index - middleIndex;

          const rotation = offset * 12;
          const initialTranslateY = Math.abs(offset) * 30;
          const translateX = offset * 110;
          
          const isHovered = hoveredCardIndex === index;

          const transform = `
            translateX(${translateX}px) 
            rotate(${isHovered && isMyTurn ? 0 : rotation}deg) 
            translateY(${isHovered && isMyTurn ? -60 : initialTranslateY}px)
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
  const handSpacingClasses = isDebugMode 
    ? 'space-x-[-20px]' // Spread out in debug mode
    : 'space-x-[-50px]'; // Tightly packed in normal mode

  return (
    <div className="flex flex-col items-center justify-center relative w-full py-2 md:py-4 min-h-[140px] md:min-h-[156px]">
      {isThinking && (
        <div className="absolute -top-1 md:-top-2 text-base animate-pulse z-30" style={{ textShadow: '2px 2px 3px rgba(0,0,0,0.7)' }}>IA está pensando...</div>
      )}
      <div className={`flex justify-center ${handSpacingClasses}`}>
        {cards.map((card, index) => (
            <Card
              key={`${card.rank}-${card.suit}-${index}`}
              card={card}
              size="small"
              isFaceDown={!isDebugMode}
              className="shadow-lg"
            />
        ))}
      </div>
    </div>
  );
};

export default PlayerHand;