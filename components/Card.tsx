
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
  displayMode?: 'image' | 'local-image' | 'fallback';
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

const Card: React.FC<CardProps> = ({ card, isFaceDown = false, isPlayable = false, onClick, className = '', size = 'normal', displayMode = 'image' }) => {
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  useEffect(() => {
    if (displayMode === 'fallback' || !card || isFaceDown) {
        setCardImageUrl(null);
        setImageStatus('loading');
        return;
    }

    if (displayMode === 'image' || displayMode === 'local-image') {
        let isMounted = true;
        setImageStatus('loading');
        
        getCardImageDataUrl(card, displayMode)
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
    }
  }, [card, isFaceDown, displayMode]);

  const isSmall = size === 'small';

  // Adjusted sizes for new aspect ratio (approx 1:1.54)
  const cardBaseClasses = `rounded-lg shadow-lg border-2 flex items-center justify-center transition-all duration-300 transform relative select-none ${isSmall ? 'w-20 h-[124px]' : 'w-28 h-[174px] lg:w-36 lg:h-[222px]'}`;
  const playableClasses = isPlayable ? "cursor-pointer hover:shadow-2xl hover:border-yellow-400" : "";
  
  if (isFaceDown) {
    return (
      <div className={`${cardBaseClasses} bg-slate-900 border-slate-700 p-1 ${className}`}>
        <svg width="100%" height="100%" viewBox="0 0 100 154" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-md">
          {/* Background pattern definition */}
          <defs>
            <pattern id="arg-pattern" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
              <path d="M 0,4 l 8,0" stroke="#1e293b" strokeWidth="1"/>
              <path d="M 4,0 l 0,8" stroke="#1e293b" strokeWidth="1"/>
            </pattern>
          </defs>

          {/* Base and pattern fill */}
          <rect width="100" height="154" rx="6" fill="#0f172a" />
          <rect width="100" height="154" rx="6" fill="url(#arg-pattern)" />
          
          {/* Ornate Frame */}
          <rect x="4" y="4" width="92" height="146" rx="3" stroke="#facc15" strokeOpacity="0.5" strokeWidth="1" />
          <g stroke="#facc15" strokeWidth="1.5">
            {/* Top-left corner */}
            <path d="M 15,5 L 5,5 L 5,15" />
            <path d="M 12,8 C 10,10 10,10 8,12" />
            
            {/* Top-right corner */}
            <path d="M 85,5 L 95,5 L 95,15" />
            <path d="M 88,8 C 90,10 90,10 92,12" />
            
            {/* Bottom-left corner */}
            <path d="M 15,149 L 5,149 L 5,139" />
            <path d="M 12,146 C 10,144 10,144 8,142" />
            
            {/* Bottom-right corner */}
            <path d="M 85,149 L 95,149 L 95,139" />
            <path d="M 88,146 C 90,144 90,144 92,142" />
          </g>
          
          {/* Sol de Mayo */}
          <g transform="translate(50 77)">
            {/* Rays */}
            <g fill="#fde047">
              {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
                <g key={`rays-${angle}`} transform={`rotate(${angle})`}>
                  {/* Straight Ray */}
                  <path d="M -3, -25 l 6,0 l -3, -18 z" />
                  {/* Wavy Ray */}
                  <path d="M 0, -24 c 4,-3 2,-8 -2,-10 c -4,-2 -6,3 -2,6 c 4,3 2,8 -2,10" transform="rotate(22.5)" />
                </g>
              ))}
            </g>

            {/* Face */}
            <circle r="22" fill="#fde047" stroke="#b45309" strokeWidth="1.5" />
            <g stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" fill="none">
              {/* Eyes */}
              <path d="M -11, -5 C -9, -9 -5,-9 -3,-5" />
              <path d="M 11, -5 C 9, -9 5,-9 3,-5" />
              {/* Nose */}
              <path d="M -2, -2 L 0,2 L 2,-2" />
              {/* Mouth */}
              <path d="M -7, 6 Q 0,10 7,6" />
            </g>
          </g>
        </svg>
      </div>
    );
  }

  if (!card) {
    return (
      <div className={`${cardBaseClasses} bg-black/20 border-gray-400/30 border-dashed ${className}`} />
    );
  }

  const useImage = displayMode === 'image' || displayMode === 'local-image';

  if (useImage && imageStatus === 'loaded' && cardImageUrl) {
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
  
  if (useImage && imageStatus === 'loading') {
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
    const baseFigureClass = isSmall ? 'text-5xl' : 'text-7xl lg:text-8xl';
    const heldSuitClass = `absolute ${isSmall ? 'text-2xl' : 'text-4xl lg:text-5xl'}`;
    const shadowStyle = { textShadow: '1px 1px 2px rgba(0,0,0,0.3)' };

    switch (card.rank) {
      case 10: // Sota (Jack)
        return (
          <div className="relative flex items-center justify-center">
            <span className={baseFigureClass} style={shadowStyle}>🧑</span>
            <SuitIcon suit={card.suit} className={`${heldSuitClass} ${isSmall ? 'top-2 -right-1' : 'top-5 -right-2 lg:top-7 lg:-right-3'}`} style={shadowStyle} />
          </div>
        );
      case 11: // Caballo (Knight/Horse)
        return (
          <div className="relative flex items-center justify-center">
            <span className={baseFigureClass} style={shadowStyle}>🐎</span>
            <SuitIcon suit={card.suit} className={`${heldSuitClass} ${isSmall ? '-top-2 right-0' : '-top-2 right-0 lg:-top-3 lg:right-1'}`} style={shadowStyle} />
          </div>
        );
      case 12: // Rey (King)
        return (
          <div className="relative flex items-center justify-center">
            <span className={baseFigureClass} style={shadowStyle}>🤴</span>
            <SuitIcon suit={card.suit} className={`${heldSuitClass} ${isSmall ? 'top-0 -right-1' : 'top-1 -right-3 lg:top-1 lg:-right-4'}`} style={shadowStyle} />
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
        <div className={`absolute text-center leading-none ${isSmall ? 'top-1 left-1.5' : 'top-2 left-2.5 lg:top-3 lg:left-3'}`}>
            <div className={`font-bold text-gray-800 ${isSmall ? 'text-lg' : 'text-2xl lg:text-3xl'}`}>{rankDisplay}</div>
            <SuitIcon suit={card.suit} className={`${isSmall ? 'text-lg' : 'text-2xl lg:text-3xl'} mx-auto`}/>
        </div>

        <div className="flex items-center justify-center">
            {renderCenterArt()}
        </div>
        
        <div className={`absolute text-center leading-none transform rotate-180 ${isSmall ? 'bottom-1 right-1.5' : 'bottom-2 right-2.5 lg:bottom-3 lg:right-3'}`}>
            <div className={`font-bold text-gray-800 ${isSmall ? 'text-lg' : 'text-2xl lg:text-3xl'}`}>{rankDisplay}</div>
            <SuitIcon suit={card.suit} className={`${isSmall ? 'text-lg' : 'text-2xl lg:text-3xl'} mx-auto`}/>
        </div>
    </div>
  );
};

export default Card;
