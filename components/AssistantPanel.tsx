
import React, { useState, useEffect, useRef } from 'react';
import { AiMove, Card } from '../types';
import { useLocalization } from '../context/LocalizationContext';

interface AssistantPanelProps {
  suggestion: AiMove | null;
  playerHand: Card[];
}

const StrategyOptionCard: React.FC<{ move: AiMove; isPrimary: boolean; }> = ({ move, isPrimary }) => {
    const { t } = useLocalization();
    const [isLogicVisible, setIsLogicVisible] = useState(false);

    const { summary, confidence, strategyCategory = 'safe', reasoning } = move;

    const categoryStyles = {
        safe: {
            title: t('assistantPanel.strategy_safe_title'),
            borderColor: 'border-green-400',
            bgColor: 'bg-green-900/20',
            titleColor: 'text-green-300',
            risk: t('assistantPanel.risk_low'),
            reward: t('assistantPanel.reward_moderate'),
        },
        aggressive: {
            title: t('assistantPanel.strategy_aggressive_title'),
            borderColor: 'border-yellow-400',
            bgColor: 'bg-yellow-900/20',
            titleColor: 'text-yellow-300',
            risk: t('assistantPanel.risk_moderate'),
            reward: t('assistantPanel.reward_high'),
        },
        deceptive: {
            title: t('assistantPanel.strategy_deceptive_title'),
            borderColor: 'border-purple-400',
            bgColor: 'bg-purple-900/20',
            titleColor: 'text-purple-300',
            risk: t('assistantPanel.risk_high'),
            reward: t('assistantPanel.reward_very_high'),
        },
    };

    const styles = categoryStyles[strategyCategory];

    const reasoningText = Array.isArray(reasoning)
        ? reasoning.map(r => typeof r === 'string' ? r : t(r.key, r.options || {})).join('\n')
        : String(reasoning || '');

    return (
        <div className={`p-3 rounded-lg border-2 ${styles.borderColor} ${styles.bgColor}`}>
            <div className="flex justify-between items-start gap-2">
                <h4 className={`font-bold text-base ${styles.titleColor}`}>{styles.title}</h4>
                {confidence && (
                    <div className="flex flex-col items-center flex-shrink-0">
                        <span className="text-sm font-mono text-yellow-200 bg-yellow-900/50 px-2 py-0.5 rounded">
                            {(confidence * 100).toFixed(0)}%
                        </span>
                        <span className="text-xs text-yellow-400">{t('assistantPanel.confidence')}</span>
                    </div>
                )}
            </div>
            <p className="text-lg font-semibold text-white my-2">{summary}</p>
            <div className="text-xs text-gray-400 flex justify-between">
                <span>{t('assistantPanel.risk')}: <span className="font-semibold">{styles.risk}</span></span>
                <span>{t('assistantPanel.reward')}: <span className="font-semibold">{styles.reward}</span></span>
            </div>
            {isPrimary && (
                 <div className="mt-3 border-t border-gray-700 pt-2">
                    <button
                      onClick={() => setIsLogicVisible(!isLogicVisible)}
                      className="text-xs px-2 py-1 rounded-md font-semibold text-gray-300 bg-black/40 border border-gray-600 shadow-sm hover:bg-black/60 hover:border-gray-500 transition-colors"
                    >
                      {isLogicVisible ? t('assistantPanel.hide_logic') : t('assistantPanel.show_logic')}
                    </button>
                    {isLogicVisible && (
                      <div className="mt-2 p-2 bg-black/50 rounded max-h-32 overflow-y-auto">
                        <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono">{reasoningText}</pre>
                      </div>
                    )}
                </div>
            )}
        </div>
    );
};


const AssistantPanel: React.FC<AssistantPanelProps> = ({ suggestion, playerHand }) => {
  const { t } = useLocalization();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isManuallyClosed, setIsManuallyClosed] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousSuggestionRef = useRef<AiMove | null>(null);

  useEffect(() => {
    if (suggestion && suggestion !== previousSuggestionRef.current) {
      if (!isManuallyClosed) {
        setIsExpanded(true);
      }
    }
    
    if (!suggestion) {
      setIsExpanded(false);
      setIsManuallyClosed(false);
    }

    previousSuggestionRef.current = suggestion;
  }, [suggestion, isManuallyClosed]);
  
  useEffect(() => {
    if (isExpanded) {
      const handleClickOutside = (event: MouseEvent) => {
        if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
          setIsExpanded(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isExpanded]);

  useEffect(() => {
    if (toastMessage) {
        const timer = setTimeout(() => {
            setToastMessage(null);
        }, 4000);
        return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleManualClose = () => {
    setIsExpanded(false);
    setIsManuallyClosed(true);
    setToastMessage(t('assistantPanel.summon_message'));
  };

  const handleOpenFromButton = () => {
    setIsExpanded(true);
    setIsManuallyClosed(false);
  };

  if (!suggestion) return null;

  const allSuggestions = [suggestion, ...(suggestion.alternatives || [])]
    .filter((value, index, self) => 
        index === self.findIndex((t) => (
            JSON.stringify(t.action) === JSON.stringify(value.action)
        ))
    );

  if (!isExpanded) {
    return (
      <>
        <button
          onClick={handleOpenFromButton}
          className="fixed bottom-20 right-4 w-16 h-16 bg-green-600 rounded-full shadow-lg flex items-center justify-center text-3xl text-white transform hover:scale-110 transition-transform z-50 animate-fade-in-scale border-4 border-green-400"
          aria-label={t('assistantPanel.open_aria_label')}
        >
          🤖
        </button>
        {toastMessage && (
            <div className="fixed bottom-40 right-4 p-3 bg-blue-800 text-white text-sm rounded-lg shadow-lg z-50 animate-fade-in-scale">
                {toastMessage}
            </div>
        )}
      </>
    );
  }

  return (
    <div ref={panelRef} className="fixed bottom-20 right-4 w-80 lg:w-96 bg-gray-900/95 border-2 border-cyan-400 rounded-lg shadow-2xl shadow-cyan-500/20 z-50 text-white animate-fade-in-scale flex flex-col max-h-[70vh]">
      <div className="p-3 border-b border-cyan-400/30 flex justify-between items-center flex-shrink-0">
        <h3 className="font-bold text-cyan-300 font-cinzel tracking-wider flex items-center gap-2">
          <span className="text-xl">🤖</span> {t('assistantPanel.title')}
        </h3>
        <button
          onClick={handleManualClose}
          className="text-gray-400 text-2xl font-bold hover:text-white transition-colors"
          aria-label={t('assistantPanel.close_aria_label')}
        >
          &times;
        </button>
      </div>
      <div className="p-3 space-y-3 overflow-y-auto">
        {allSuggestions.map((move, index) => (
            <StrategyOptionCard key={index} move={move} isPrimary={index === 0} />
        ))}
      </div>
    </div>
  );
};

export default AssistantPanel;
