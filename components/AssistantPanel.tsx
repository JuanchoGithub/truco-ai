import React, { useState, useEffect, useRef } from 'react';
import { AiMove, Card, MessageObject } from '../types';
import { getSimpleSuggestionText } from '../services/suggestionService';
import { useLocalization } from '../context/LocalizationContext';
import { getCardName } from '../services/trucoLogic';

interface AssistantPanelProps {
  suggestion: AiMove | null;
  playerHand: Card[];
}

const AssistantPanel: React.FC<AssistantPanelProps> = ({ suggestion, playerHand }) => {
  const { t } = useLocalization();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLogic, setShowLogic] = useState(false);
  const [isManuallyClosed, setIsManuallyClosed] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousSuggestionRef = useRef<AiMove | null>(null);

  useEffect(() => {
    // If a new suggestion arrives and it's different from the last one
    if (suggestion && suggestion !== previousSuggestionRef.current) {
      if (!isManuallyClosed) {
        setIsExpanded(true);
      }
      setShowLogic(false); // Always collapse logic view on new suggestion
    }
    
    // If suggestion disappears (e.g., end of turn)
    if (!suggestion) {
      setIsExpanded(false);
      setIsManuallyClosed(false); // Reset for the next turn
    }

    previousSuggestionRef.current = suggestion;
  }, [suggestion, isManuallyClosed]);
  
  // Effect for handling clicks outside the panel
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

  // Toast message timer
  useEffect(() => {
    if (toastMessage) {
        const timer = setTimeout(() => {
            setToastMessage(null);
        }, 4000); // Show for 4 seconds
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
    setIsManuallyClosed(false); // Re-enable auto-opening
  };

  if (!suggestion) return null;

  const suggestionText = suggestion.summary || getSimpleSuggestionText(suggestion, playerHand);

  // Fix: Process the reasoning array into a displayable string.
  const reasoningText = Array.isArray(suggestion.reasoning)
    ? suggestion.reasoning.map(r => {
        if (typeof r === 'string') return r;
        
        const options: { [key: string]: any } = { ...r.options };

        // Handle card objects, arrays of cards, and suits
        for (const key in options) {
            if (options[key] && typeof options[key] === 'object') {
                if (Array.isArray(options[key])) { // Handle hand: Card[]
                    options[key] = options[key].map((c: any) => getCardName(c)).join(', ');
                } else if ('rank' in options[key] && 'suit' in options[key]) { // Handle card: Card
                    options[key] = getCardName(options[key] as Card);
                }
            } else if (key === 'suit' && typeof options[key] === 'string') {
                options[key] = t(`common.card_suits.${options[key]}`);
            }
        }
        
        return t(r.key, options || {});
      }).join('\n')
    : String(suggestion.reasoning || '');

  if (!isExpanded) {
    return (
      <>
        <button
          onClick={handleOpenFromButton}
          className="fixed bottom-4 right-4 w-16 h-16 bg-green-600 rounded-full shadow-lg flex items-center justify-center text-3xl text-white transform hover:scale-110 transition-transform z-50 animate-fade-in-scale border-4 border-green-400"
          aria-label={t('assistantPanel.open_aria_label')}
        >
          🤖
        </button>
        {toastMessage && (
            <div className="fixed bottom-24 right-4 p-3 bg-blue-800 text-white text-sm rounded-lg shadow-lg z-50 animate-fade-in-scale">
                {toastMessage}
            </div>
        )}
      </>
    );
  }

  return (
    <div ref={panelRef} className="fixed bottom-4 right-4 w-80 lg:w-96 bg-gray-900/95 border-2 border-green-400 rounded-lg shadow-2xl shadow-green-500/20 z-50 text-white animate-fade-in-scale">
      <div className="p-3 border-b border-green-400/30 flex justify-between items-center">
        <h3 className="font-bold text-green-300 font-cinzel tracking-wider flex items-center gap-2">
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
      <div className="p-3">
        <p className="font-semibold text-lg text-yellow-200">
          {suggestionText}
        </p>
        <button
          onClick={() => setShowLogic(!showLogic)}
          className="text-xs mt-2 px-3 py-1 rounded-md font-semibold text-green-200 bg-black/40 border border-green-700/80 shadow-sm hover:bg-black/60 hover:border-green-600 transition-colors"
        >
          {showLogic ? t('assistantPanel.hide_logic') : t('assistantPanel.show_logic')}
        </button>
        {showLogic && (
          <div className="mt-2 p-2 bg-black/50 rounded max-h-48 overflow-y-auto">
            <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
              {reasoningText}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssistantPanel;