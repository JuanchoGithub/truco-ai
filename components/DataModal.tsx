import React, { useState, useRef } from 'react';
import { Action, ActionType, GameState, CardCategory, CardPlayStats, RoundSummary, Card as CardType } from '../types';
import { useLocalization } from '../context/LocalizationContext';
import Card from './Card';
import { decodeCardFromCode } from '../services/trucoLogic';

// --- SVG Icon Components ---

const ChartBarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const DocumentChartBarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-8.625 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m1.5 1.5v-2.25m14.25-8.625c0-1.242-1.008-2.25-2.25-2.25s-2.25 1.008-2.25 2.25c0 1.242 1.008 2.25 2.25 2.25s2.25-1.008 2.25-2.25z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 9.75a2.25 2.25 0 012.25-2.25c1.242 0 2.25 1.008 2.25 2.25s-1.008 2.25-2.25 2.25A2.25 2.25 0 0115 9.75z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 9.75c-.092 0-.183.004-.274.012M13.875 3.375c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125-1.125h-1.5c-.621 0-1.125-.504-1.125-1.125v-4.5c0-.621.504-1.125 1.125-1.125h1.5z" />
    </svg>
);

const BeakerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5v-2.25c0-.621-.504-1.125-1.125-1.125h-2.25c-.621 0-1.125.504-1.125 1.125v2.25M19 14.5H9.75M5 14.5H3.375c-.621 0-1.125.504-1.125 1.125V19.5c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.875c0-.621-.504-1.125-1.125-1.125H19M5 14.5v2.25c0 .621.504 1.125 1.125 1.125h2.25c.621 0 1.125-.504 1.125-1.125V14.5" />
    </svg>
);

const ListBulletIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12M8.25 17.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 17.25h.007v.008H3.75v-1.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
);

const ArrowUturnLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
    </svg>
);

const UserCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

// --- UI Components ---

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; onClick?: () => void; }> = ({ title, value, icon, onClick }) => (
    <div 
        className={`bg-gray-800 p-6 rounded-xl border border-gray-700 ${onClick ? 'cursor-pointer hover:bg-gray-700/50 transition-colors' : ''}`}
        onClick={onClick}
        onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : -1}
    >
        <div className="flex justify-between items-start">
            <h3 className="text-gray-400 font-semibold">{title}</h3>
            <div className="text-gray-500">{icon}</div>
        </div>
        <p className="text-4xl font-bold mt-2">{value}</p>
    </div>
);

const GaugeChart: React.FC<{ value: number; label: string }> = ({ value, label }) => {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center">
            <svg className="transform -rotate-90" width="160" height="160" viewBox="0 0 120 120">
                <circle
                    className="text-gray-700"
                    strokeWidth="10"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="60"
                    cy="60"
                />
                <circle
                    className="text-teal-400"
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="60"
                    cy="60"
                    style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
                />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white">{value.toFixed(0)}%</span>
                <span className="text-sm text-gray-400">{label}</span>
            </div>
        </div>
    );
};

const BarChart: React.FC<{ data: { label: string; value: number }[]; title: string }> = ({ data, title }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    return (
        <div>
            <h4 className="font-semibold text-white mb-4">{title}</h4>
            <div className="flex justify-between items-end h-48 gap-2">
                {data.map((item, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="w-full h-full flex items-end">
                            <div
                                className="w-full bg-gray-700 rounded-t-md group-hover:bg-teal-500 transition-colors"
                                style={{ height: `${(item.value / maxValue) * 100}%` }}
                                title={`${item.value} plays`}
                            />
                        </div>
                        <span className="text-xs text-gray-400">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const DashboardSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <div className="flex items-center gap-3 mb-4">
            <div className="text-gray-400">{icon}</div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        {children}
    </div>
);

const RoundDetail: React.FC<{ round: RoundSummary, translatePlayerName: (p: string) => string, t: (k: string, o?: any) => string }> = ({ round, translatePlayerName, t }) => {
    const winnerText = round.roundWinner ? translatePlayerName(round.roundWinner) : t('common.tie');
    const winnerClass = round.roundWinner === 'player' ? 'text-teal-400' : round.roundWinner === 'ai' ? 'text-red-400' : 'text-gray-400';

    const playerInitialHandCards = round.playerInitialHand.map(decodeCardFromCode);
    const aiInitialHandCards = round.aiInitialHand.map(decodeCardFromCode);

    return (
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
            <h4 className="text-xl font-bold mb-3 border-b border-gray-700 pb-2">
                <span className="text-gray-300">{t('dataModal.history_header_round')} {round.round}</span> - 
                <span className={`ml-2 ${winnerClass}`}>{t('dataModal.round_history_winner', { winner: winnerText })}</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-4">
                    <div>
                        <p className="font-semibold text-gray-400 mb-2">{t('dataModal.history_initial_hands')}</p>
                        <div className="bg-black/20 p-3 rounded-md space-y-3">
                            <div>
                                <p className="text-xs text-gray-300">{translatePlayerName('player')}:</p>
                                <div className="flex gap-1 mt-1">{playerInitialHandCards.map((c, i) => <Card key={`p-init-${i}`} card={c} size="small" />)}</div>
                            </div>
                            <div>
                                <p className="text-xs text-gray-300">{translatePlayerName('ai')}:</p>
                                <div className="flex gap-1 mt-1">{aiInitialHandCards.map((c, i) => <Card key={`ai-init-${i}`} card={c} size="small" />)}</div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <p className="font-semibold text-gray-400 mb-2">{t('dataModal.history_header_calls')}</p>
                        <div className="bg-black/20 p-3 rounded-md">
                            <ul className="list-disc list-inside text-gray-300 text-xs space-y-1">
                                {round.calls.length > 0 ? round.calls.map((call, i) => <li key={i}>{call}</li>) : <li>{t('dataModal.round_history_calls_none')}</li>}
                            </ul>
                        </div>
                    </div>
                     <div>
                        <p className="font-semibold text-gray-400 mb-2">{t('dataModal.history_key_decisions')}</p>
                        <div className="bg-black/20 p-3 rounded-md text-xs text-gray-300">
                             {round.playerTrucoCall ? (
                                <p>{t('dataModal.history_player_truco_call', { strength: round.playerTrucoCall.handStrength, type: round.playerTrucoCall.isBluff ? t('dataModal.history_truco_call_bluff') : t('dataModal.history_truco_call_value') })}</p>
                            ) : (
                                <p>{t('dataModal.history_no_truco_call')}</p>
                            )}
                        </div>
                    </div>
                </div>
                <div>
                    <p className="font-semibold text-gray-400 mb-2">{t('dataModal.history_tricks_played')}</p>
                    <div className="space-y-3">
                        {[0, 1, 2].map(trickIndex => {
                            const playerCard = round.playerTricks[trickIndex] ? decodeCardFromCode(round.playerTricks[trickIndex]!) : undefined;
                            const aiCard = round.aiTricks[trickIndex] ? decodeCardFromCode(round.aiTricks[trickIndex]!) : undefined;
                            const trickWinner = round.trickWinners[trickIndex];
                            if (!playerCard && !aiCard) return null;
                            const trickWinnerClass = trickWinner === 'player' ? 'text-teal-400' : trickWinner === 'ai' ? 'text-red-400' : 'text-gray-400';
                            return (
                                <div key={trickIndex} className="bg-black/20 p-2 rounded-md">
                                    <p className="text-xs font-bold text-gray-400 mb-2">{t('dataModal.history_trick_number', { number: trickIndex + 1 })} - <span className={trickWinnerClass}>{t('dataModal.round_history_winner', { winner: translatePlayerName(trickWinner || 'tie') })}</span></p>
                                    <div className="flex justify-around items-center">
                                        <div>
                                            <p className="text-center text-xs mb-1">{translatePlayerName('player')}</p>
                                            <Card card={playerCard} size="small" />
                                        </div>
                                        <span className="font-bold text-gray-500">vs</span>
                                        <div>
                                            <p className="text-center text-xs mb-1">{translatePlayerName('ai')}</p>
                                            <Card card={aiCard} size="small" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

type DataModalView = 'dashboard' | 'history' | 'winRateDetails' | 'envidoDetails';


const DataModal: React.FC<{ gameState: GameState, dispatch: React.Dispatch<Action> }> = ({ gameState, dispatch }) => {
  const { t, translatePlayerName } = useLocalization();
  const [view, setView] = useState<DataModalView>('dashboard');
  const { roundHistory, playerCardPlayStats } = gameState;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Data Calculations for Dashboard ---
  const totalRounds = roundHistory.length;
  const playerWins = roundHistory.filter(r => r.roundWinner === 'player').length;
  const winRate = totalRounds > 0 ? (playerWins / totalRounds) * 100 : 0;
  
  const envidoCalls = gameState.playerEnvidoHistory.filter(e => e.action === 'called' || e.action.startsWith('escalated'));
  const avgEnvidoCallPoints = envidoCalls.length > 0
    ? envidoCalls.reduce((sum, entry) => sum + entry.envidoPoints, 0) / envidoCalls.length
    : 0;
  
  const liveBluffStats = roundHistory.reduce(
    (acc, round) => {
        if (round.playerTrucoCall?.isBluff) {
            acc.attempts++;
            if (round.roundWinner === 'player') {
                acc.successes++;
            }
        }
        return acc;
    },
    { attempts: 0, successes: 0 }
  );
  const bluffSuccessRate = liveBluffStats.attempts > 0 ? (liveBluffStats.successes / liveBluffStats.attempts) * 100 : 0;

  const cardPlayFrequency = (Object.entries(playerCardPlayStats) as [CardCategory, CardPlayStats][])
    .filter(([, stats]) => stats.plays > 0)
    .sort(([, a], [, b]) => b.plays - a.plays)
    .slice(0, 7)
    .map(([category, stats]) => ({
      label: t(`dataModal.card_categories.${category}`),
      value: stats.plays,
    }));
    
  const cardPlayDetails = (Object.entries(playerCardPlayStats) as [CardCategory, CardPlayStats][])
    .filter(([, stats]) => stats.plays > 0)
    .sort(([, a], [, b]) => b.plays - a.plays);
    
  const envidoCallRounds = roundHistory.filter(r => r.calls.some(c => c.toLowerCase().includes('envido')));

  // --- Profile Management Handlers ---

  const handleExport = () => {
    const profileData = {
        opponentModel: gameState.opponentModel,
        aiCases: gameState.aiCases,
        playerEnvidoHistory: gameState.playerEnvidoHistory,
        playerPlayOrderHistory: gameState.playerPlayOrderHistory,
        playerCardPlayStats: gameState.playerCardPlayStats,
        roundHistory: gameState.roundHistory,
        playerEnvidoFoldHistory: gameState.playerEnvidoFoldHistory,
        playerTrucoCallHistory: gameState.playerTrucoCallHistory,
        playerTrucoFoldHistory: gameState.playerTrucoFoldHistory,
        envidoPrimeroOpportunities: gameState.envidoPrimeroOpportunities,
        envidoPrimeroCalls: gameState.envidoPrimeroCalls,
        aiReasoningLog: gameState.aiReasoningLog,
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(profileData, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `truco-ai-profile-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const text = e.target?.result as string;
              const data = JSON.parse(text);
              if (data && data.opponentModel && data.playerCardPlayStats) {
                  dispatch({ type: ActionType.LOAD_IMPORTED_DATA, payload: data });
                  alert(t('dataModal.import_success'));
                  dispatch({ type: ActionType.TOGGLE_DATA_MODAL });
              } else {
                  throw new Error("Invalid format");
              }
          } catch (error) {
              console.error("Failed to import profile", error);
              alert(t('dataModal.import_error_format'));
          }
      };
      reader.readAsText(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
  };
  
  const handleReset = () => {
      if (window.confirm(t('dataModal.reset_confirm_message'))) {
          dispatch({ type: ActionType.RESET_OPPONENT_MODEL });
      }
  };
    
    
  const renderDashboard = () => (
    <>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
        <header className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-white">{t('dataModal.dashboard_title')}</h2>
            <button 
                onClick={() => dispatch({ type: ActionType.TOGGLE_DATA_MODAL })} 
                className="text-gray-400 hover:text-white transition-colors"
                aria-label={t('common.close')}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </header>

        <main className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title={t('dataModal.total_rounds')} value={totalRounds} icon={<DocumentChartBarIcon />} onClick={() => setView('history')}/>
                <StatCard 
                    title={t('dataModal.win_rate')} 
                    value={`${winRate.toFixed(0)}%`} 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>}
                    onClick={() => setView('winRateDetails')}
                />
                <StatCard 
                    title={t('dataModal.avg_envido_call')} 
                    value={avgEnvidoCallPoints.toFixed(1)} 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>} 
                    onClick={() => setView('envidoDetails')}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <DashboardSection title={t('dataModal.bluff_analysis')} icon={<BeakerIcon />}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                        <GaugeChart value={bluffSuccessRate} label={t('dataModal.bluff_success_rate')} />
                        <div className="space-y-4">
                            <div className="bg-gray-900/50 p-4 rounded-lg">
                                <p className="text-sm text-gray-400">{t('dataModal.total_bluffs')}</p>
                                <p className="text-2xl font-bold">{liveBluffStats.attempts}</p>
                            </div>
                            <div className="bg-gray-900/50 p-4 rounded-lg">
                                <p className="text-sm text-gray-400">{t('dataModal.successful_bluffs')}</p>
                                <p className="text-2xl font-bold">{liveBluffStats.successes}</p>
                            </div>
                        </div>
                    </div>
                </DashboardSection>

                <div className="lg:col-span-2">
                    <DashboardSection title={t('dataModal.card_play_frequency')} icon={<ChartBarIcon />}>
                       {cardPlayFrequency.length > 0 ? (
                         <BarChart data={cardPlayFrequency} title={t('dataModal.most_played_cards')} />
                       ) : (
                          <div className="flex items-center justify-center h-48 text-gray-500">
                            {t('dataModal.no_data_message')}
                          </div>
                       )}
                    </DashboardSection>
                </div>
            </div>

             <DashboardSection title={t('dataModal.card_play_details')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-gray-400">
                            <tr>
                                <th className="p-2">{t('dataModal.header_card_type')}</th>
                                <th className="p-2 text-center">{t('dataModal.header_plays')}</th>
                                <th className="p-2 text-center">{t('dataModal.header_win_rate')}</th>
                                <th className="p-2 text-center">{t('dataModal.header_lead_response')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {cardPlayDetails.map(([category, stats]) => {
                                const winRate = stats.plays > 0 ? (stats.wins / stats.plays) * 100 : 0;
                                return (
                                    <tr key={category}>
                                        <td className="p-3 font-semibold text-white">{t(`dataModal.card_categories.${category}`)}</td>
                                        <td className="p-3 text-center">{stats.plays}</td>
                                        <td className="p-3 text-center">
                                            <div className="w-full bg-gray-700 rounded-full h-2.5">
                                                <div className="bg-teal-500 h-2.5 rounded-full" style={{ width: `${winRate}%` }} title={`${winRate.toFixed(0)}%`}></div>
                                            </div>
                                        </td>
                                        <td className="p-3 text-center">{stats.asLead} / {stats.asResponse}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </DashboardSection>

             <DashboardSection title={t('dataModal.profile_management_title')} icon={<UserCircleIcon />}>
                <div className="flex flex-wrap items-center gap-4">
                    <button onClick={handleImportClick} className="px-4 py-2 text-sm rounded-lg font-semibold text-cyan-200 bg-black/40 border-2 border-cyan-800/80 shadow-md hover:bg-black/60 hover:border-cyan-600 transition-colors">
                        {t('dataModal.button_import')}
                    </button>
                    <button onClick={handleExport} className="px-4 py-2 text-sm rounded-lg font-semibold text-yellow-200 bg-black/40 border-2 border-yellow-800/80 shadow-md hover:bg-black/60 hover:border-yellow-600 transition-colors">
                        {t('dataModal.button_export')}
                    </button>
                    <button onClick={handleReset} className="px-4 py-2 text-sm rounded-lg font-semibold text-red-300 bg-black/40 border-2 border-red-800/80 shadow-md hover:bg-black/60 hover:border-red-600 transition-colors">
                        {t('dataModal.button_reset')}
                    </button>
                </div>
            </DashboardSection>
        </main>
    </>
  );

  const BackButtonHeader = ({ titleKey }: { titleKey: string }) => (
    <header className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-white">{t(titleKey)}</h2>
        <button 
            onClick={() => setView('dashboard')} 
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-semibold"
            aria-label={t('dataModal.back_to_dashboard')}
        >
            <ArrowUturnLeftIcon />
            <span>{t('dataModal.back_to_dashboard')}</span>
        </button>
    </header>
  );

  const renderHistory = () => (
    <>
        <BackButtonHeader titleKey="dataModal.total_rounds_history_title" />
        <main>
            <DashboardSection title={t('dataModal.round_details')} icon={<ListBulletIcon />}>
                 <div className="overflow-auto max-h-[70vh] space-y-4 pr-2">
                    {roundHistory.length > 0 ? roundHistory.slice().reverse().map((round) => (
                        <RoundDetail key={round.round} round={round} translatePlayerName={translatePlayerName} t={t} />
                    )) : (
                        <div className="text-center p-8 text-gray-500">{t('dataModal.no_data_message')}</div>
                    )}
                </div>
            </DashboardSection>
        </main>
    </>
  );
  
  const renderWinRateDetails = () => (
    <>
        <BackButtonHeader titleKey="dataModal.win_rate_details_title" />
        <main>
             <div className="overflow-auto max-h-[80vh] space-y-3 pr-2 bg-gray-800 p-4 rounded-xl border border-gray-700">
                {roundHistory.length > 0 ? roundHistory.slice().reverse().map((round) => {
                    const by = round.pointsAwarded.by;
                    const winnerText = round.roundWinner ? translatePlayerName(round.roundWinner) : t('common.tie');
                    const winnerClass = round.roundWinner === 'player' ? 'text-teal-400' : round.roundWinner === 'ai' ? 'text-red-400' : 'text-gray-400';
                    return (
                        <div key={round.round} className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                            <h4 className="font-bold text-lg mb-2"><span className="text-gray-400">{t('dataModal.history_header_round')} {round.round}</span> - <span className={winnerClass}>{winnerText}</span></h4>
                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                <div className="bg-black/20 p-2 rounded"><p className="font-semibold text-gray-300">{t('gameBoard.truco')}</p><p>{by?.truco.player || 0} / {by?.truco.ai || 0}</p></div>
                                <div className="bg-black/20 p-2 rounded"><p className="font-semibold text-gray-300">{t('gameBoard.envido')}</p><p>{by?.envido.player || 0} / {by?.envido.ai || 0}</p></div>
                                <div className="bg-black/20 p-2 rounded"><p className="font-semibold text-gray-300">{t('gameBoard.flor')}</p><p>{by?.flor.player || 0} / {by?.flor.ai || 0}</p></div>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="text-center p-8 text-gray-500">{t('dataModal.no_data_message')}</div>
                )}
            </div>
        </main>
    </>
  );
  
  const renderEnvidoDetails = () => (
    <>
      <BackButtonHeader titleKey="dataModal.envido_details_title" />
        <main>
             <div className="overflow-auto max-h-[80vh] space-y-4 pr-2 bg-gray-800 p-4 rounded-xl border border-gray-700">
                {envidoCallRounds.length > 0 ? envidoCallRounds.slice().reverse().map((round) => {
                    const playerInitialHandCards = round.playerInitialHand.map(decodeCardFromCode);
                    const envidoCalls = round.calls.filter(c => c.toLowerCase().includes('envido'));
                    const outcome = round.pointsAwarded.by?.envido;
                    let outcomeText = '';
                    if (outcome) {
                        if (outcome.player > 0) outcomeText = t('dataModal.envido_outcome_win', { count: outcome.player });
                        else if (outcome.ai > 0) outcomeText = t('dataModal.envido_outcome_lose', { count: outcome.ai });
                        else outcomeText = t('dataModal.envido_outcome_tie');
                    }
                    
                    return (
                        <div key={round.round} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                             <h4 className="font-bold text-lg mb-2 text-gray-300">{t('dataModal.history_header_round')} {round.round}</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="font-semibold text-sm text-gray-400 mb-1">{t('dataModal.envido_your_hand')}</p>
                                    <div className="flex gap-1">{playerInitialHandCards.map((c,i) => <Card key={`env-hand-${i}`} card={c} size="small" />)}</div>
                                    <p className="text-sm mt-2">{t('dataModal.envido_your_points', { count: round.playerEnvidoPoints })}</p>
                                </div>
                                <div className="text-sm">
                                    <p className="font-semibold text-gray-400 mb-1">{t('dataModal.envido_call_sequence')}</p>
                                    <ul className="list-disc list-inside text-gray-300 text-xs bg-black/20 p-2 rounded-md space-y-1">
                                      {envidoCalls.map((c, i) => <li key={i}>{c}</li>)}
                                    </ul>
                                    <p className="font-semibold text-gray-400 mt-3 mb-1">{t('dataModal.envido_outcome')}</p>
                                    <p className="text-gray-200">{outcomeText}</p>
                                </div>
                             </div>
                        </div>
                    );
                }) : (
                    <div className="text-center p-8 text-gray-500">{t('dataModal.no_envido_data')}</div>
                )}
            </div>
        </main>
    </>
  );

  const renderContent = () => {
    switch(view) {
        case 'history': return renderHistory();
        case 'winRateDetails': return renderWinRateDetails();
        case 'envidoDetails': return renderEnvidoDetails();
        case 'dashboard':
        default:
            return renderDashboard();
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-900 font-sans overflow-y-auto p-4 lg:p-8 animate-fade-in-scale z-[101]">
        <div className="w-full max-w-7xl mx-auto">
            {renderContent()}
        </div>
    </div>
  );
};

export default DataModal;