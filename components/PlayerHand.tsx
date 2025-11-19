
import React, { useState, useEffect } from 'react';
import { Card as CardType } from '../types';
import Card from './Card';
import { useLocalization } from '../context/LocalizationContext';

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
  const { t } = useLocalization();
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const isPlayer = playerType === 'player';
  const isMobile = windowWidth < 1024;

  if (isPlayer) {
    // Layout metrics
    // Cards are closer on mobile, and stick up more when active
    const cardSpacing = isMobile ? 70 : 100;
    const yOffsetUnselected = isMobile ? 40 : 20; 
    const hoverLift = isMobile ? -70 : -80;
    const baseRotation = isMobile ? 6 : 4;
    
    return (
      <div className={`flex justify-center items-end relative h-[180px] lg:h-[260px] ${className}`}>
        {cards.map((card, index) => {
          const middleIndex = (cards.length - 1) / 2;
          const offset = index - middleIndex;

          const rotation = offset * baseRotation;
          // On mobile, cards act like a fan at bottom of screen
          const translateY = Math.abs(offset) * (isMobile ? 12 : 15) + yOffsetUnselected;
          const translateX = offset * cardSpacing;
          
          const isHovered = hoveredCardIndex === index;
          const isActive = isMyTurn && isPlayer;

          const finalTranslateY = (isHovered && isActive) ? translateY + hoverLift : translateY;
          const finalScale = (isHovered && isActive) ? 1.15 : 1;
          const finalRotation = (isHovered && isActive) ? 0 : rotation;
          const zIndex = isHovered ? 50 : index;

          const transform = `
            translateX(${translateX}px) 
            translateY(${finalTranslateY}px)
            rotate(${finalRotation}deg) 
            scale(${finalScale})
          `;

          return (
            <div
              key={`${card.rank}-${card.suit}`}
              className={`absolute bottom-0 transition-all duration-200 cubic-bezier(0.2, 0.8, 0.2, 1) origin-bottom-center`}
              style={{
                transform,
                zIndex,
                marginBottom: '10px',
                cursor: isActive ? 'pointer' : 'default'
              }}
              onMouseEnter={() => isActive && !isMobile && setHoveredCardIndex(index)}
              onMouseLeave={() => !isMobile && setHoveredCardIndex(null)}
              onClick={() => {
                 if (isActive) {
                     if (isMobile && hoveredCardIndex !== index) {
                         setHoveredCardIndex(index); // First tap selects/lifts
                     } else {
                         onCardPlay && onCardPlay(index); // Second tap plays
                         setHoveredCardIndex(null);
                     }
                 }
              }}
            >
              <Card
                card={card}
                isPlayable={isActive}
                size={isMobile ? 'normal' : 'normal'} 
                className={`shadow-2xl ${isHovered && isActive ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-black/50' : ''}`}
              />
            </div>
          );
        })}
      </div>
    );
  }

  // AI Hand
  const handSpacingClasses = isDebugMode 
    ? 'space-x-2' // Spread out in debug mode
    : 'space-x-[-55px] lg:space-x-[-60px]'; // Tightly packed in normal mode

  return (
    <div className="flex flex-col items-center justify-start relative w-full h-[120px] lg:h-[160px]">
      {isThinking && (
        <div className="absolute top-16 lg:top-20 text-sm lg:text-base bg-black/80 px-4 py-1 rounded-full text-yellow-200 animate-pulse z-30 border border-yellow-500/50 shadow-lg">
            {t('game.ai_thinking')}
        </div>
      )}
      <div className={`flex justify-center items-start pt-4 ${handSpacingClasses}`}>
        {cards.map((card, index) => {
             const middleIndex = (cards.length - 1) / 2;
             const offset = index - middleIndex;
             const rotation = isDebugMode ? 0 : offset * -4; // Inverse fan for AI
             const translateY = isDebugMode ? 0 : Math.abs(offset) * 4;
             
             return (
                <div 
                  key={`${card.rank}-${card.suit}-${index}`} 
                  style={{ 
                    transform: `rotate(${rotation}deg) translateY(${translateY}px)`,
                    zIndex: index
                  }}
                  className="transition-transform duration-500"
                >
                    <Card
                    card={card}
                    size="small"
                    isFaceDown={!isDebugMode}
                    className="shadow-xl"
                    />
                </div>
             )
        })}
      </div>
    </div>
  );
};

export default PlayerHand;