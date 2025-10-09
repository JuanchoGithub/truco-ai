import React, { useState, useEffect, useRef } from 'react';
import { AiMove, Card } from '../types';
import { getSimpleSuggestionText } from '../services/suggestionService';

interface AssistantPanelProps {
  suggestion: AiMove | null;
  playerHand: Card[];
}

const AssistantPanel: React.FC<AssistantPanelProps> = ({ suggestion, playerHand }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLogic, setShowLogic] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState<AiMove | null>(suggestion);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (suggestion) {
      setCurrentSuggestion(suggestion);
      setShowLogic(false); // Collapse logic view on new suggestion
    }
  }, [suggestion]);
  
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


  if (!currentSuggestion) return null;

  const suggestionText = currentSuggestion.summary || getSimpleSuggestionText(currentSuggestion, playerHand);

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-4 right-4 w-16 h-16 bg-green-600 rounded-full shadow-lg flex items-center justify-center text-3xl text-white transform hover:scale-110 transition-transform z-50 animate-fade-in-scale border-4 border-green-400"
        aria-label="Abrir Asistente de IA"
      >
        🤖
      </button>
    );
  }

  return (
    <div ref={panelRef} className="fixed bottom-4 right-4 w-80 md:w-96 bg-gray-900/95 border-2 border-green-400 rounded-lg shadow-2xl shadow-green-500/20 z-50 text-white animate-fade-in-scale">
      <div className="p-3 border-b border-green-400/30 flex justify-between items-center">
        <h3 className="font-bold text-green-300 font-cinzel tracking-wider flex items-center gap-2">
          <span className="text-xl">🤖</span> Asistente de IA
        </h3>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-400 text-2xl font-bold hover:text-white transition-colors"
          aria-label="Cerrar Asistente de IA"
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
          {showLogic ? 'Ocultar Lógica' : 'Ver Lógica Detallada'}
        </button>
        {showLogic && (
          <div className="mt-2 p-2 bg-black/50 rounded max-h-48 overflow-y-auto">
            <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
              {currentSuggestion.reasoning}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssistantPanel;