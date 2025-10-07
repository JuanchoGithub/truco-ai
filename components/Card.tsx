
import React, { useState, useEffect } from 'react';
import { Card as CardType, Suit } from '../types';
import { getCardImageDataUrl } from '../services/cardImageService';
import { getCardName } from '../services/trucoLogic';

interface CardProps {
  card?: CardType;
  isFaceDown?: boolean;
  isPlayable?: boolean;
  onClick?: () => void;
  className?: string;
  size?: 'normal' | 'small';
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

const Card: React.FC<CardProps> = ({ card, isFaceDown = false, isPlayable = false, onClick, className = '', size = 'normal' }) => {
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  useEffect(() => {
    if (!card || isFaceDown) {
        setCardImageUrl(null);
        setImageStatus('loading');
        return;
    }

    let isMounted = true;
    setImageStatus('loading');
    
    getCardImageDataUrl(card)
      .then(url => {
        if (isMounted) {
          setCardImageUrl(url);
          setImageStatus('loaded');
        }
      })
      .catch(err => {
        console.error(`Failed to load sprite for card ${getCardName(card)}:`, err);
        if (isMounted) {
          setImageStatus('error');
        }
      });
      
    return () => { isMounted = false; };
  }, [card, isFaceDown]);

  const isSmall = size === 'small';

  // Adjusted sizes for new aspect ratio (approx 1:1.54)
  const cardBaseClasses = `rounded-lg shadow-lg border-2 flex items-center justify-center transition-all duration-300 transform relative select-none ${isSmall ? 'w-20 h-[124px]' : 'w-40 h-[248px] md:w-52 md:h-[322px]'}`;
  const playableClasses = isPlayable ? "cursor-pointer hover:shadow-2xl hover:border-yellow-400" : "";
  
  if (isFaceDown) {
    return (
      <div className={`${cardBaseClasses} bg-red-800 border-red-900 ${className}`}>
        <div className="w-full h-full rounded-md border-4 border-red-600/50 flex items-center justify-center bg-red-900/50">
           <div className={`text-yellow-300/50 ${isSmall ? 'w-10 h-10' : 'w-16 h-16 md:w-24 md:h-24'}`}>
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

  if (imageStatus === 'loaded' && cardImageUrl) {
    return (
      <div
        onClick={onClick}
        className={`${cardBaseClasses} ${playableClasses} ${className} overflow-hidden bg-amber-50 border-gray-400`}
        aria-label={getCardName(card)}
      >
        <img src={cardImageUrl} alt={getCardName(card)} className="w-full h-full object-cover" />
      </div>
    );
  }
  
  if (imageStatus === 'loading') {
    return (
      <div className={`${cardBaseClasses} bg-gray-200 border-gray-300 animate-pulse ${className}`} />
    );
  }

  // --- Fallback to original emoji card on error ---
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

  const cardBgColor = 'bg-amber-50';

  const renderCenterArt = () => {
    const baseFigureClass = isSmall ? 'text-5xl' : 'text-8xl md:text-9xl';
    const heldSuitClass = `absolute ${isSmall ? 'text-2xl' : 'text-5xl md:text-6xl'}`;
    const shadowStyle = { textShadow: '1px 1px 2px rgba(0,0,0,0.3)' };

    switch (card.rank) {
      case 10: // Sota (Jack)
        return (
          <div className="relative flex items-center justify-center">
            <span className={baseFigureClass} style={shadowStyle}>🧑</span>
            <SuitIcon suit={card.suit} className={`${heldSuitClass} ${isSmall ? 'top-2 -right-1' : 'top-6 -right-2 md:top-9 md:-right-3'}`} style={shadowStyle} />
          </div>
        );
      case 11: // Caballo (Knight/Horse)
        return (
          <div className="relative flex items-center justify-center">
            <span className={baseFigureClass} style={shadowStyle}>🐎</span>
            <SuitIcon suit={card.suit} className={`${heldSuitClass} ${isSmall ? '-top-2 right-0' : '-top-2 right-0 md:-top-3 md:right-1'}`} style={shadowStyle} />
          </div>
        );
      case 12: // Rey (King)
        return (
          <div className="relative flex items-center justify-center">
            <span className={baseFigureClass} style={shadowStyle}>🤴</span>
            <SuitIcon suit={card.suit} className={`${heldSuitClass} ${isSmall ? 'top-0 -right-1' : 'top-1 -right-3 md:top-1 md:-right-4'}`} style={shadowStyle} />
          </div>
        );
      default:
        return <SuitIcon suit={card.suit} className={`${baseFigureClass} opacity-90`} style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }} />;
    }
  };

  return (
    <div
      onClick={onClick}
      className={`${cardBaseClasses} ${cardBgColor} border-gray-400 shadow-inner shadow-black/20 ${playableClasses} ${className}`}
      aria-label={getCardName(card)}
    >
        <div className={`absolute text-center leading-none ${isSmall ? 'top-1 left-1.5' : 'top-2 left-3 md:top-3 md:left-4'}`}>
            <div className={`font-bold text-gray-800 ${isSmall ? 'text-lg' : 'text-3xl md:text-4xl'}`}>{rankDisplay}</div>
            <SuitIcon suit={card.suit} className={`${isSmall ? 'text-lg' : 'text-3xl md:text-4xl'} mx-auto`}/>
        </div>

        <div className="flex items-center justify-center">
            {renderCenterArt()}
        </div>
        
        <div className={`absolute text-center leading-none transform rotate-180 ${isSmall ? 'bottom-1 right-1.5' : 'bottom-2 right-3 md:bottom-3 md:right-4'}`}>
            <div className={`font-bold text-gray-800 ${isSmall ? 'text-lg' : 'text-3xl md:text-4xl'}`}>{rankDisplay}</div>
            <SuitIcon suit={card.suit} className={`${isSmall ? 'text-lg' : 'text-3xl md:text-4xl'} mx-auto`}/>
        </div>
    </div>
  );
};

export default Card;
