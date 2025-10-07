
import React from 'react';
import { Card as CardType, Suit } from '../types';

interface CardProps {
  card?: CardType;
  isFaceDown?: boolean;
  isPlayable?: boolean;
  onClick?: () => void;
  className?: string;
}

const SuitIcon: React.FC<{ suit: Suit; className?: string; style?: React.CSSProperties }> = ({ suit, className, style }) => {
    const suitData: Record<Suit, { emoji: string; color: string }> = {
        espadas: { emoji: '⚔️', color: 'text-gray-800' },
        bastos: { emoji: '🪵', color: 'text-stone-700' },
        oros: { emoji: '🪙', color: 'text-yellow-600' },
        copas: { emoji: '🍷', color: 'text-red-700' },
    };

    const { emoji, color } = suitData[suit];
    
    const goldFilter = suit === 'oros' 
      ? { filter: 'sepia(1) saturate(5) hue-rotate(-20deg) brightness(1.2)' } 
      : {};

    return <span className={`${color} ${className}`} style={{ ...style, ...goldFilter }}>{emoji}</span>;
}

const Card: React.FC<CardProps> = ({ card, isFaceDown = false, isPlayable = false, onClick, className = '' }) => {
  let rankDisplay: string | number | undefined;
  if (card) {
      switch (card.rank) {
          case 1: rankDisplay = 'As'; break;
          case 10: rankDisplay = 'Sota'; break;
          case 11: rankDisplay = 'Caballo'; break;
          case 12: rankDisplay = 'Rey'; break;
          default: rankDisplay = card.rank;
      }
  }

  const cardBaseClasses = "w-20 h-28 md:w-28 md:h-40 rounded-xl shadow-lg border-2 flex items-center justify-center transition-all duration-300 transform relative select-none";
  const playableClasses = isPlayable ? "cursor-pointer hover:shadow-2xl hover:border-yellow-400" : "";
  
  if (isFaceDown) {
    return (
      <div className={`${cardBaseClasses} bg-red-800 border-red-900 ${className}`}>
        <div className="w-full h-full rounded-lg border-4 border-red-600/50 flex items-center justify-center bg-red-900/50">
           <div className="w-12 h-12 md:w-16 md:h-16 text-yellow-300/50">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,2L1,9H4V14H2V16H4V21H6V16H18V21H20V16H22V14H20V9H23L12,2M12,5.69L15,8H9L12,5.69M6,14V9H18V14H6Z" />
            </svg>
           </div>
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className={`${cardBaseClasses} bg-black/20 border-gray-400/30 border-dashed ${className}`} />
    );
  }

  const cardBgColor = 'bg-amber-50';

  return (
    <div
      onClick={onClick}
      className={`${cardBaseClasses} ${cardBgColor} border-gray-400 shadow-inner shadow-black/20 ${playableClasses} ${className}`}
    >
        <div className="absolute top-1 left-2 md:top-2 md:left-3 text-center leading-none">
            <div className="text-lg md:text-xl font-bold text-gray-800">{rankDisplay}</div>
            <SuitIcon suit={card.suit} className="text-lg md:text-xl mx-auto"/>
        </div>

        <div className="flex items-center justify-center">
            <SuitIcon suit={card.suit} className="text-5xl md:text-6xl opacity-90" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }} />
        </div>
        
        <div className="absolute bottom-1 right-2 md:bottom-2 md:right-3 text-center leading-none transform rotate-180">
            <div className="text-lg md:text-xl font-bold text-gray-800">{rankDisplay}</div>
            <SuitIcon suit={card.suit} className="text-lg md:text-xl mx-auto"/>
        </div>
    </div>
  );
};

export default Card;
