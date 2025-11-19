
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
                bg: 'bg-amber-900/20',
                border: 'border-amber-600/30',
                title: 'text-amber-400',
                text: 'text-amber-100'
            };
        case 'envido':
            return {
                bg: 'bg-cyan-900/20',
                border: 'border-cyan-600/30',
                title: 'text-cyan-400',
                text: 'text-cyan-100'
            };
        case 'flor':
            return {
                bg: 'bg-purple-900/20',
                border: 'border-purple-600/30',
                title: 'text-purple-400',
                text: 'text-purple-100'
            };
        default:
            return {
                bg: 'bg-stone-800/30',
                border: 'border-stone-600/30',
                title: 'text-stone-400',
                text: 'text-stone-300'
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
    const storedLogs = loadMatchLogs();
    if (storedLogs) {
        setHistoricalLogs(storedLogs);
    }
  }, [isModal, currentRound]); 

  const handleMatchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMatchId = e.target.value;
    setSelectedMatchId(newMatchId);
    if (newMatchId === 'current') {
        setSelectedRound(currentRound);
    } else {
        const match = historicalLogs.find(m => String(m.matchId) === newMatchId);
        if (match && match.roundHistory.length > 0) {
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
    if (selectedMatchId === 'current') {
        setSelectedRound(currentRound);
    }
  }, [currentRound, selectedMatchId]);

  const selectedMatchData = useMemo(() => {
    if (selectedMatchId === 'current') {
        return { aiReasoningLog: log, roundHistory: roundHistory };
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
  
  const renderReasoningJsx = (reasoningArray: (string | MessageObject)[], styling: ReturnType<typeof getTopicStyling>): React.ReactNode[] => {
    return reasoningArray.map((reason, index) => {
        let text: string;
        let className = styling.text;
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
        
        if (key) {
             if (key.includes('separator')) return <hr key={index} className={`border-t border-dashed ${styling.border} opacity-30 my-2`} />;
            if (key.includes('strategic_analysis') || key.includes('response_logic') || key.includes('play_card_logic') || key.includes('envido_call_logic') || key.includes('truco_call_logic') || key.includes('evaluation') || key.includes('_title') || key.includes('header')) {
                className = `${styling.title} font-bold uppercase text-xs tracking-wider mt-3 mb-1 pb-1 border-b ${styling.border}`;
            } else if (key.includes('_called')) {
                className = 'text-amber-500 italic';
            } else if (key.includes('decision_') || key.includes('final_decision')) {
                className = 'text-green-400 font-bold bg-green-900/20 p-1 rounded border border-green-900/30';
            } else if (key.includes('penalty') || key.includes('error')) {
                className = 'text-red-400';
            }
        }
        
        return <p key={index} className={`${className} leading-relaxed`}>{text}</p>;
    });
  };

  const wrapperClasses = isModal ? "fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 backdrop-blur-sm" : "h-full w-full";
  const containerClasses = "bg-stone-900/95 border-l-4 border-r-4 border-cyan-900/40 shadow-2xl w-full h-full flex flex-col " + (isModal ? " max-w-2xl max-h-[80vh] rounded-xl border-t-4 border-b-4" : "");

  return (
    <div className={wrapperClasses}>
      <div className={containerClasses}>
        <div className="bg-stone-950 border-b border-cyan-900/30 flex-shrink-0">
            <div className="p-3 flex justify-between items-center">
                <h2 className="text-lg lg:text-xl font-bold text-cyan-500 font-cinzel tracking-widest uppercase flex items-center gap-2">
                    <span>🧠</span> {t('logPanel.ai_log_title')}
                </h2>
                {isModal ? (
                    <button onClick={() => dispatch({ type: ActionType.TOGGLE_AI_LOG_EXPAND })} className="text-stone-500 hover:text-cyan-400 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                ) : (
                    <button
                        onClick={() => dispatch({ type: ActionType.TOGGLE_AI_LOG_EXPAND })}
                        className="text-stone-500 hover:text-cyan-400 transition-colors p-1"
                        aria-label={t('logPanel.hide_ai_log')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                    </button>
                )}
            </div>
            <div className="px-3 pb-3 flex gap-2 w-full">
                <select value={selectedMatchId} onChange={handleMatchChange} className="flex-1 bg-stone-800 border border-stone-600 text-stone-300 text-xs rounded p-1 truncate focus:outline-none focus:border-cyan-500">
                    <option value="current">{t('logPanel.current_match')}</option>
                    {historicalLogs.map(match => (
                        <option key={match.matchId} value={match.matchId}>
                            {match.date}
                        </option>
                    ))}
                </select>
                {displayRounds.length > 0 && (
                    <select value={selectedRound} onChange={handleRoundChange} className="bg-stone-800 border border-stone-600 text-stone-300 text-xs rounded p-1 w-24 focus:outline-none focus:border-cyan-500">
                        {displayRounds.map(roundNumber => ( <option key={roundNumber} value={roundNumber}>{t('common.round')} {roundNumber}</option> ))}
                    </select>
                )}
            </div>
        </div>
        
        <div className="p-4 flex-grow overflow-y-auto font-mono text-xs lg:text-sm bg-stone-900">
          {roundLog && roundLog.length > 0 ? (
            <div className="space-y-3">
              {roundLog.map((entry, index) => {
                const topic = getReasoningTopic(entry.reasoning);
                const styling = getTopicStyling(topic);
                return (
                  <div key={index} className={`p-3 rounded border-l-2 ${styling.bg} ${styling.border}`}>
                    {renderReasoningJsx(entry.reasoning, styling)}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-stone-600 italic">
                {t('logPanel.no_log_for_round')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AiLogPanel;
