import React, { useState, useEffect, useMemo } from 'react';
import { AiReasoningEntry, Action, ActionType, MessageObject, Card, RoundSummary, MatchLog } from '../types';
import { useLocalization } from '../context/LocalizationContext';
import { getCardName } from '../services/trucoLogic';
import { loadMatchLogs } from '../services/storageService';

interface AiLogPanelProps {
  log: AiReasoningEntry[];
  dispatch: React.Dispatch<Action>;
  isModal: boolean;
  roundHistory: RoundSummary[];
  currentRound: number;
}

const getTopicStyling = (topic: string) => {
    switch (topic) {
        case 'truco':
            return {
                bg: 'bg-yellow-900/30',
                border: 'border-yellow-600/50',
                title: 'text-yellow-300',
                text: 'text-yellow-200'
            };
        case 'envido':
            return {
                bg: 'bg-blue-900/30',
                border: 'border-blue-600/50',
                title: 'text-blue-300',
                text: 'text-blue-200'
            };
        case 'flor':
            return {
                bg: 'bg-purple-900/30',
                border: 'border-purple-600/50',
                title: 'text-purple-300',
                text: 'text-purple-200'
            };
        case 'play_card':
        default:
            return {
                bg: 'bg-black/30',
                border: 'border-cyan-800/50',
                title: 'text-cyan-300',
                text: 'text-cyan-100'
            };
    }
};

const getReasoningTopic = (reasoning: (string | MessageObject)[]): string => {
    const topicKeywords: { [key: string]: string } = {
        'truco': 'truco',
        'envido': 'envido',
        'flor': 'flor',
        'contraflor': 'flor',
        'play_card': 'play_card'
    };

    for (const reason of reasoning) {
        if (typeof reason === 'object' && reason.key) {
            for (const keyword in topicKeywords) {
                if (reason.key.includes(keyword)) {
                    return topicKeywords[keyword];
                }
            }
        }
    }
    return 'default'; // Fallback
};

const AiLogPanel: React.FC<AiLogPanelProps> = ({ log, dispatch, isModal, roundHistory, currentRound }) => {
  const { t } = useLocalization();
  
  const [historicalLogs, setHistoricalLogs] = useState<MatchLog[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('current');
  const [selectedRound, setSelectedRound] = useState(currentRound);

  useEffect(() => {
    // Load historical logs when the panel is shown or a new round/game starts.
    const storedLogs = loadMatchLogs();
    if (storedLogs) {
        setHistoricalLogs(storedLogs);
    }
  }, [isModal, currentRound]); // Reload when panel is opened or when the current round changes (a new game will reset round to 1).

  const handleMatchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMatchId = e.target.value;
    setSelectedMatchId(newMatchId);
    // Reset round selection to the latest round of the selected match
    if (newMatchId === 'current') {
        setSelectedRound(currentRound);
    } else {
        const match = historicalLogs.find(m => String(m.matchId) === newMatchId);
        if (match && match.roundHistory.length > 0) {
            // Select the last round of that match
            setSelectedRound(match.roundHistory[match.roundHistory.length - 1].round);
        } else if (match) {
            setSelectedRound(match.aiReasoningLog[match.aiReasoningLog.length - 1]?.round || 0);
        }
    }
  };

  const handleRoundChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRound(Number(e.target.value));
  };

  useEffect(() => {
    // This effect ensures the dropdown for rounds follows the current game when active
    if (selectedMatchId === 'current') {
        setSelectedRound(currentRound);
    }
  }, [currentRound, selectedMatchId]);

  const selectedMatchData = useMemo(() => {
    if (selectedMatchId === 'current') {
        return {
            aiReasoningLog: log,
            roundHistory: roundHistory
        };
    }
    return historicalLogs.find(m => String(m.matchId) === selectedMatchId);
  }, [selectedMatchId, log, roundHistory, historicalLogs]);

  const roundLog = selectedMatchData?.aiReasoningLog.filter(entry => entry.round === selectedRound);

  const displayRounds = useMemo(() => {
    const roundsFromHistory = selectedMatchData?.roundHistory.map(r => r.round) || [];
    const roundsFromLog = selectedMatchData?.aiReasoningLog.map(l => l.round) || [];
    return Array.from(new Set([...roundsFromHistory, ...roundsFromLog]))
      .filter(r => r > 0)
      .sort((a, b) => b - a)
  }, [selectedMatchData]);
  
  // Fix: Changed return type from `(JSX.Element | null)[]` to `React.ReactNode[]` to resolve TypeScript error.
  const renderReasoningJsx = (reasoningArray: (string | MessageObject)[], styling: ReturnType<typeof getTopicStyling>): React.ReactNode[] => {
    return reasoningArray.map((reason, index) => {
        let text: string;
        let className = styling.text; // Use topic-based text color
        let key: string | undefined;

        if (typeof reason === 'string') {
            text = reason;
        } else {
            const options: { [key: string]: any } = { ...reason.options };
            if (options.statusKey) { options.status = t(`ai_logic.statuses.${options.statusKey}`); }
            if (options.player) { options.player = options.player === 'ai' ? t('common.ai') : t('common.player'); }
            for (const optKey in options) {
                if (options[optKey] && typeof options[optKey] === 'object') {
                    if (Array.isArray(options[optKey])) { options[optKey] = options[optKey].map((c: any) => getCardName(c)).join(', '); } 
                    else if ('rank' in options[optKey] && 'suit' in options[optKey]) { options[optKey] = getCardName(options[optKey] as Card); }
                } else if (optKey === 'suit' && typeof options[optKey] === 'string') {
                    options[optKey] = t(`common.card_suits.${options[optKey]}`);
                }
            }
            text = t(reason.key, options);
            key = reason.key;
        }
        
        // Apply styles based on key
        if (key) {
             if (key.includes('separator')) {
                return <hr key={index} className={`border-t border-dashed ${styling.border}/50 my-2`} />;
            }
            if (key.includes('strategic_analysis') || key.includes('response_logic') || key.includes('play_card_logic') || key.includes('envido_call_logic') || key.includes('truco_call_logic') || key.includes('evaluation') || key.includes('_title') || key.includes('header')) {
                className = `${styling.title} font-bold mt-2 pt-2 border-t ${styling.border}/70`;
            } else if (key.includes('_called')) {
                className = 'text-orange-400 italic';
            } else if (key.includes('decision_')) {
                className = 'text-green-300 font-bold';
            } else if (key.includes('penalty') || key.includes('error')) {
                className = 'text-red-400';
            }
        }
        
        return <p key={index} className={className}>{text}</p>;
    });
  };

  const wrapperClasses = isModal ? "fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" : "h-full w-full";
  const containerClasses = "bg-blue-900/95 border-4 border-cyan-400/50 rounded-xl shadow-2xl w-full h-full flex flex-col" + (isModal ? " max-w-2xl max-h-[90vh]" : "");

  return (
    <div className={wrapperClasses}>
      <div className={containerClasses}>
        <div className="p-3 border-b-2 border-cyan-400/30 flex justify-between items-center flex-shrink-0 gap-2 flex-wrap">
          <h2 className="text-xl lg:text-2xl font-bold text-cyan-300 font-cinzel tracking-widest flex-shrink-0" style={{ textShadow: '2px 2px 3px rgba(0,0,0,0.7)' }}>
            {t('logPanel.ai_log_title')}
          </h2>
          <div className="flex-grow flex items-center gap-2 min-w-[200px]">
            <select value={selectedMatchId} onChange={handleMatchChange} className="bg-blue-900/80 border border-cyan-400/50 text-white text-xs rounded-md p-1 w-full">
                <option value="current">{t('logPanel.current_match')}</option>
                {historicalLogs.map(match => (
                    <option key={match.matchId} value={match.matchId}>
                        {t('logPanel.match_from', { date: match.date, score: `${match.playerScore}-${match.aiScore}` })}
                    </option>
                ))}
            </select>
             {displayRounds.length > 0 && (
                <select value={selectedRound} onChange={handleRoundChange} className="bg-blue-900/80 border border-cyan-400/50 text-white text-xs rounded-md p-1 w-28">
                    {displayRounds.map(roundNumber => ( <option key={roundNumber} value={roundNumber}>{t('common.round')} {roundNumber}</option> ))}
                </select>
            )}
          </div>
          <button
            onClick={() => dispatch({ type: ActionType.TOGGLE_AI_LOG_EXPAND })}
            className="text-cyan-200 font-bold hover:text-white transition-colors p-1 rounded-md hover:bg-white/10"
            aria-label={isModal ? t('common.close') : t('logPanel.hide_ai_log')}
          >
            {isModal ? (
              <span className="text-2xl lg:text-3xl">&times;</span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
        <div className="p-4 flex-grow overflow-y-auto">
          {roundLog && roundLog.length > 0 ? (
            <div className="space-y-4">
              {roundLog.map((entry, index) => {
                const topic = getReasoningTopic(entry.reasoning);
                const styling = getTopicStyling(topic);
                return (
                  <div key={index} className={`p-3 rounded-md font-mono text-xs lg:text-sm border ${styling.bg} ${styling.border}`}>
                    {renderReasoningJsx(entry.reasoning, styling)}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-center">{t('logPanel.no_log_for_round')}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AiLogPanel;