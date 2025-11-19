
import React, { useState, useEffect } from 'react';
import { Card as CardType, Suit } from '../types';
import { getCardImageDataUrl } from '../services/cardImageService';
import { getCardName } from '../services/trucoLogic';
import { useLocalization } from '../context/LocalizationContext';

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
  const { t } = useLocalization();
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

  // Size Classes
  // Normal: Player Hand (Large on desktop, med on mobile)
  // Small: AI Hand, Logs, Piles
  const sizeClasses = isSmall 
    ? 'w-20 h-[124px] lg:w-24 lg:h-[149px]' 
    : 'w-[110px] h-[170px] lg:w-40 lg:h-[248px]';
    
  // Base styles including 3D perspective hints
  const cardBaseClasses = `rounded-lg shadow-lg border border-gray-300 flex items-center justify-center select-none relative bg-white transition-all duration-200 transform-style-3d`;
  const playableClasses = isPlayable ? "cursor-pointer" : "";
  
  // Back of card pattern - Modernized
  const backPattern = (
      <div className={`${sizeClasses} bg-gradient-to-br from-slate-800 to-black border-2 border-slate-700 p-1 rounded-lg shadow-md ${className}`}>
        <div className="w-full h-full rounded border border-white/10 bg-[url('/assets/pattern.png')] bg-repeat opacity-80 flex items-center justify-center relative overflow-hidden">
            {/* Geometric Pattern Fallback if image fails */}
             <svg width="100%" height="100%" viewBox="0 0 100 154" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 opacity-30">
                <pattern id="arg-pattern" patternUnits="userSpaceOnUse" width="20" height="20" patternTransform="rotate(45)">
                    <rect width="10" height="10" fill="#ffffff" fillOpacity="0.1"/>
                </pattern>
                <rect width="100%" height="100%" fill="url(#arg-pattern)" />
             </svg>

             <div className="w-12 h-12 rounded-full border-2 border-yellow-500/50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                 <span className="text-xl">🌞</span>
             </div>
        </div>
      </div>
  );

  if (isFaceDown) return backPattern;

  if (!card) {
    return (
      <div className={`${sizeClasses} bg-white/5 border-2 border-dashed border-white/20 rounded-lg ${className}`} />
    );
  }

  const useImage = displayMode === 'image' || displayMode === 'local-image';

  if (useImage && imageStatus === 'loaded' && cardImageUrl) {
    return (
      <div
        onClick={onClick}
        className={`${sizeClasses} ${cardBaseClasses} ${playableClasses} ${className} overflow-hidden`}
        aria-label={getCardName(card)}
      >
        <img src={cardImageUrl} alt={getCardName(card)} className="w-full h-full object-cover" />
        {/* Glossy sheen */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/30 pointer-events-none mix-blend-overlay"></div>
        {/* Inner border for depth */}
        <div className="absolute inset-0 border border-black/10 rounded-lg pointer-events-none"></div>
      </div>
    );
  }
  
  if (useImage && imageStatus === 'loading') {
    return (
      <div className={`${sizeClasses} bg-gray-300 border-gray-400 animate-pulse rounded-lg ${className}`} />
    );
  }

  // Fallback Rendering
  let rankDisplay: string | number | undefined;
  if (card) {
      const rankKey = `common.card_ranks.${card.rank}`;
      const translatedRank = t(rankKey);
      rankDisplay = translatedRank === rankKey ? card.rank : translatedRank;
  }

  const renderCenterArt = () => {
    const baseFigureClass = isSmall ? 'text-5xl' : 'text-6xl lg:text-8xl';
    const heldSuitClass = `absolute ${isSmall ? 'text-2xl' : 'text-4xl lg:text-5xl'}`;
    const shadowStyle = { textShadow: '1px 1px 2px rgba(0,0,0,0.3)' };

    switch (card.rank) {
      case 10:
        return (
          <div className="relative flex items-center justify-center">
            <span className={baseFigureClass} style={shadowStyle}>🧑</span>
            <SuitIcon suit={card.suit} className={`${heldSuitClass} top-5 -right-2`} style={shadowStyle} />
          </div>
        );
      case 11:
        return (
          <div className="relative flex items-center justify-center">
            <span className={baseFigureClass} style={shadowStyle}>🐎</span>
            <SuitIcon suit={card.suit} className={`${heldSuitClass} -top-2 right-0`} style={shadowStyle} />
          </div>
        );
      case 12:
        return (
          <div className="relative flex items-center justify-center">
            <span className={baseFigureClass} style={shadowStyle}>🤴</span>
            <SuitIcon suit={card.suit} className={`${heldSuitClass} top-0 -right-1`} style={shadowStyle} />
          </div>
        );
      default:
        return <SuitIcon suit={card.suit} className={`${baseFigureClass} opacity-90`} style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }} />;
    }
  };

  return (
    <div
      onClick={onClick}
      className={`${sizeClasses} ${cardBaseClasses} ${playableClasses} ${className} bg-amber-50`}
      aria-label={getCardName(card)}
    >
        <div className={`absolute text-center leading-none ${isSmall ? 'top-1 left-1.5' : 'top-2 left-2.5 lg:top-3 lg:left-3'}`}>
            <div className={`font-bold text-gray-800 ${isSmall ? 'text-lg' : 'text-2xl lg:text-3xl'}`}>{rankDisplay}</div>
            <SuitIcon suit={card.suit} className={`${isSmall ? 'text-lg' : 'text-2xl lg:text-3xl'} mx-auto`}/>
        </div>

        <div className="flex items-center justify-center w-full h-full">
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