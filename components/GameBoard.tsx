
import React from 'react';
import { Card as CardType, Player, GameState, Action, ActionType, PointNote } from '../types';
import Card from './Card';
import { useLocalization } from '../context/LocalizationContext';

interface GameBoardProps {
  gameState: GameState;
  dispatch: React.Dispatch<Action>;
}

const Crown = () => (
    <div className="absolute -top-6 -right-4 text-5xl lg:text-6xl text-yellow-400 z-20 drop-shadow-lg animate-bounce-slow" style={{ filter: 'drop-shadow(0 0 10px rgba(234, 179, 8, 0.8))' }}>
        👑
    </div>
);

interface CardPileProps {
    cards: (CardType | null)[];
    trickWinners: (Player | 'tie' | null)[];
    owner: Player;
    label: string;
}

const CardPile: React.FC<CardPileProps> = ({ cards, trickWinners, owner, label }) => {
    const { t } = useLocalization();
    const playedCards = cards.map((card, index) => ({ card, index })).filter(item => item.card !== null);
    const renderPlaceholder = playedCards.length === 0;
    const cardSizeClasses = "!w-20 !h-[124px] lg:!w-28 lg:!h-[174px]";

    return (
        <div className="relative w-full h-44 lg:h-64 flex items-center justify-center">
             {/* Zone Marker */}
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-32 border-2 border-dashed border-white/5 rounded-xl pointer-events-none" />
            
             {/* Label */}
            <div className={`absolute ${owner === 'ai' ? 'top-0' : 'bottom-0'} left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-sm px-4 py-1 rounded-full border border-white/10 shadow-sm z-0`}>
                 <p className="text-center text-[10px] lg:text-xs text-white/50 font-bold tracking-[0.2em] uppercase">{label}</p>
            </div>
           
            {renderPlaceholder && (
                 <div className={`rounded-lg border-2 border-dashed border-white/10 bg-white/5 ${cardSizeClasses} flex items-center justify-center rotate-6 opacity-50`}>
                    <span className="text-white/20 text-xs font-cinzel">{t('gameBoard.empty_pile')}</span>
                 </div>
            )}
            {playedCards.map(({ card, index }) => {
                if (!card) return null;
                const isWinner = trickWinners[index] === owner;
                
                // Stabilized "Messy Pile" Logic
                // Using fixed values instead of Math.random() prevents jitter on re-renders
                // and ensures the drop animation plays smoothly to a target destination.
                let rotation = 0;
                let translateX = 0;
                let translateY = 0;

                if (index === 0) {
                    rotation = -3;
                    translateX = -5;
                } else if (index === 1) {
                    rotation = 8;
                    translateX = 25;
                    translateY = -5;
                } else if (index === 2) {
                    rotation = -8;
                    translateX = -25;
                    translateY = 5;
                }
                
                return (
                    <div 
                        key={`${owner}-card-${index}`} 
                        className="absolute"
                        style={{ 
                            transform: `translate(${translateX}px, ${translateY}px) rotate(${rotation}deg)`,
                            zIndex: index + 10
                        }}
                    >
                        <div className="animate-drop-in">
                            <div className="relative group">
                                <Card card={card} className={`${cardSizeClasses} shadow-2xl ring-1 ring-black/20`} />
                                {isWinner && <Crown />}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


const GameBoard: React.FC<GameBoardProps> = ({ gameState, dispatch }) => {
  const { t, translatePlayerName } = useLocalization();
  const { playerTricks, aiTricks, trickWinners, lastRoundWinner, gamePhase, round, roundHistory, playerScore, aiScore } = gameState;
  const isRoundOver = gamePhase === 'round_end' && lastRoundWinner;

  const handleDismiss = () => {
    dispatch({ type: ActionType.PROCEED_TO_NEXT_ROUND });
  };

  const currentRoundSummary = roundHistory.find(r => r.round === round);
  const pointsData = currentRoundSummary?.pointsAwarded?.by;

  const renderRoundSummary = () => {
    const getWinnerText = () => {
        if (lastRoundWinner === 'player') return t('gameBoard.round_over_win');
        if (lastRoundWinner === 'ai') return t('gameBoard.round_over_lose');
        return t('gameBoard.round_over_tie');
    };

    if (!pointsData) {
        return (
            <h3 className="text-xl lg:text-3xl font-cinzel text-white font-bold tracking-wider" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
              {getWinnerText()}
            </h3>
        );
    }
    
    const renderNote = (note: PointNote) => {
        if (!note || !note.key) return null;
        let finalOptions = { ...note.options };
        if (note.options?.decliner) {
            const declinerName = translatePlayerName(note.options.decliner as string);
            finalOptions = { ...note.options, decliner: declinerName };
        }
        return `(${t(note.key, finalOptions)})`;
    };

    return (
        <div className="text-white font-mono text-sm lg:text-base w-full max-w-sm">
            <h3 className="text-center text-xl lg:text-2xl font-cinzel text-yellow-300 font-bold tracking-wider mb-4">
                {t('gameBoard.round_over_title')}
            </h3>
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 text-left mb-2 border-b border-yellow-300/30 pb-2">
                <span className="font-bold">{t('gameBoard.points_summary_title')}</span>
                <span className="font-bold text-center w-16">{t('common.you')}</span>
                <span className="font-bold text-center w-16">{t('common.ai')}</span>
            </div>
            <div className="space-y-2">
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-center text-left">
                    <span>{t('gameBoard.flor')}</span>
                    <span className="text-center w-16">{pointsData.flor.player}</span>
                    <span className="text-center w-16">{pointsData.flor.ai}</span>
                    <span className="col-start-1 col-span-3 text-xs text-gray-400 italic pl-2">{renderNote(pointsData.flor.note)}</span>
                </div>
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-center text-left">
                    <span>{t('gameBoard.envido')}</span>
                    <span className="text-center w-16">{pointsData.envido.player}</span>
                    <span className="text-center w-16">{pointsData.envido.ai}</span>
                    <span className="col-start-1 col-span-3 text-xs text-gray-400 italic pl-2">{renderNote(pointsData.envido.note)}</span>
                </div>
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-center text-left">
                    <span>{t('gameBoard.truco')}</span>
                    <span className="text-center w-16">{pointsData.truco.player}</span>
                    <span className="text-center w-16">{pointsData.truco.ai}</span>
                    <span className="col-start-1 col-span-3 text-xs text-gray-400 italic pl-2">{renderNote(pointsData.truco.note)}</span>
                </div>
            </div>
            <div className="text-center mt-4 pt-2 border-t border-yellow-300/30 font-bold text-lg">
                {t('gameBoard.score_is', { playerScore, aiScore })}
            </div>
             <p className="text-center text-xs text-yellow-200/80 italic mt-4 animate-pulse">
                {t('gameBoard.click_to_continue')}
            </p>
        </div>
    );
  };
  
  return (
    <div className="relative w-full max-w-4xl mx-auto px-2">
        {/* The Mat - Defines the play area */}
        <div className="bg-green-900/80 rounded-[3rem] border-[16px] border-yellow-950 shadow-[inset_0_0_80px_rgba(0,0,0,0.8),0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
            {/* Mat Texture Overlay */}
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/felt.png')" }} />
            
            {/* Center Divider Line */}
            <div className="absolute top-1/2 left-8 right-8 h-px bg-white/10 border-t border-dashed border-white/20"></div>
            
            {/* Table Logo / Decoration */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-4 border-white/5 flex items-center justify-center pointer-events-none">
                 <div className="text-white/5 font-cinzel text-4xl font-bold">TRUCO</div>
            </div>

            <div className="relative z-10 flex flex-col py-4 gap-2 lg:gap-8 min-h-[360px] lg:min-h-[450px] justify-center">
                <CardPile 
                    cards={aiTricks}
                    trickWinners={trickWinners}
                    owner="ai"
                    label={t('gameBoard.ai_cards')}
                />
                <CardPile 
                    cards={playerTricks}
                    trickWinners={trickWinners}
                    owner="player"
                    label={t('gameBoard.player_cards')}
                />
            </div>
        </div>

      {isRoundOver && (
        <div 
          className="absolute inset-0 flex items-center justify-center z-30 cursor-pointer animate-fade-in-scale backdrop-blur-sm"
          onClick={handleDismiss}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleDismiss()}
          role="button"
          tabIndex={0}
        >
          <div className="text-center p-6 lg:p-8 rounded-xl bg-gradient-to-br from-stone-900 to-black border-4 border-yellow-600 shadow-2xl transform scale-105 max-w-md w-full mx-4">
            {renderRoundSummary()}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
