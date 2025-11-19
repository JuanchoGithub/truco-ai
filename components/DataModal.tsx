
import React, { useState, useRef } from 'react';
import { Action, ActionType, GameState, CardCategory, CardPlayStats, RoundSummary, Card as CardType } from '../types';
import { useLocalization } from '../context/LocalizationContext';
import Card from './Card';
import { decodeCardFromCode } from '../services/trucoLogic';

// --- SVG Icon Components ---

const ChartBarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const DocumentChartBarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-8.625 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m1.5 1.5v-2.25m14.25-8.625c0-1.242-1.008-2.25-2.25-2.25s-2.25 1.008-2.25 2.25c0 1.242 1.008 2.25 2.25 2.25s2.25-1.008 2.25-2.25z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 9.75a2.25 2.25 0 012.25-2.25c1.242 0 2.25 1.008 2.25 2.25s-1.008 2.25-2.25 2.25A2.25 2.25 0 0115 9.75z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 9.75c-.092 0-.183.004-.274.012M13.875 3.375c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125-1.125h-1.5c-.621 0-1.125-.504-1.125-1.125v-4.5c0-.621.504-1.125 1.125-1.125h1.5z" />
    </svg>
);

const BeakerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5v-2.25c0-.621-.504-1.125-1.125-1.125h-2.25c-.621 0-1.125.504-1.125 1.125v2.25M19 14.5H9.75M5 14.5H3.375c-.621 0-1.125.504-1.125 1.125V19.5c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.875c0-.621-.504-1.125-1.125-1.125H19M5 14.5v2.25c0 .621.504 1.125 1.125 1.125h2.25c.621 0 1.125-.504 1.125-1.125V14.5" />
    </svg>
);

const ListBulletIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12M8.25 17.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 17.25h.007v.008H3.75v-1.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
);

const ArrowUturnLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
    </svg>
);

const UserCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

// --- UI Components ---

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; onClick?: () => void; }> = ({ title, value, icon, onClick }) => (
    <div 
        className={`bg-gradient-to-br from-stone-800 to-stone-900 p-5 rounded-xl border border-white/10 shadow-lg relative overflow-hidden group ${onClick ? 'cursor-pointer hover:border-amber-500/50 transition-all' : ''}`}
        onClick={onClick}
        onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : -1}
    >
        {/* Decoration */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-colors"></div>
        
        <div className="flex justify-between items-start relative z-10">
            <h3 className="text-stone-400 text-xs font-bold uppercase tracking-widest">{title}</h3>
            <div className="text-stone-500 group-hover:text-amber-500 transition-colors">{icon}</div>
        </div>
        <p className="text-3xl font-bold mt-2 text-white relative z-10 tracking-tight">{value}</p>
        {onClick && <div className="absolute bottom-3 right-3 text-xs text-stone-600 group-hover:text-amber-500 transition-colors">Ver más &rarr;</div>}
    </div>
);

const GaugeChart: React.FC<{ value: number; label: string }> = ({ value, label }) => {
    return (
        <div className="relative w-40 h-40 flex flex-col items-center justify-center">
             {/* Background Circle */}
             <div className="absolute inset-0 rounded-full border-[8px] border-stone-800"></div>
             {/* Value Arc - CSS Conic Gradient */}
             <div 
                className="absolute inset-0 rounded-full border-[8px] border-transparent"
                style={{
                    background: `conic-gradient(from 180deg, #14b8a6 ${value / 100 * 360}deg, transparent 0)`,
                    mask: 'radial-gradient(closest-side, transparent 78%, black 80%)',
                    WebkitMask: 'radial-gradient(closest-side, transparent 78%, black 80%)'
                }}
             ></div>
             
            <div className="absolute flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-white">{value.toFixed(0)}%</span>
                <span className="text-[10px] uppercase tracking-wider text-stone-500 mt-1">{label}</span>
            </div>
        </div>
    );
};

const BarChart: React.FC<{ data: { label: string; value: number }[]; title: string }> = ({ data, title }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="w-full">
            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 text-center">{title}</h4>
            <div className="flex justify-between items-end h-32 gap-2">
                {data.map((item, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1 group">
                        <div className="w-full h-full flex items-end relative">
                            <div
                                className="w-full bg-stone-700/50 rounded-t-sm group-hover:bg-teal-500 transition-all duration-300"
                                style={{ height: `${(item.value / maxValue) * 100}%` }}
                            >
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black px-1 rounded">{item.value}</div>
                            </div>
                        </div>
                        <span className="text-[9px] lg:text-[10px] text-stone-500 text-center leading-tight h-6 flex items-center">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const DashboardSection: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-stone-900/60 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-xl">
        <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
            {icon && <div className="text-amber-500">{icon}</div>}
            <h3 className="text-lg font-cinzel font-bold text-amber-100 tracking-wider">{title}</h3>
        </div>
        {children}
    </div>
);

const RoundDetail: React.FC<{ round: RoundSummary, translatePlayerName: (p: string) => string, t: (k: string, o?: any) => string }> = ({ round, translatePlayerName, t }) => {
    const winnerText = round.roundWinner ? translatePlayerName(round.roundWinner) : t('common.tie');
    const winnerColor = round.roundWinner === 'player' ? 'text-green-400' : round.roundWinner === 'ai' ? 'text-red-400' : 'text-gray-400';
    const borderColor = round.roundWinner === 'player' ? 'border-green-900/30' : round.roundWinner === 'ai' ? 'border-red-900/30' : 'border-gray-700/30';

    const playerInitialHandCards = round.playerInitialHand.map(decodeCardFromCode);
    const aiInitialHandCards = round.aiInitialHand.map(decodeCardFromCode);

    return (
        <div className={`bg-stone-900 p-0 rounded-lg border-l-4 ${borderColor} shadow-md overflow-hidden`}>
            <div className="p-3 bg-black/20 flex justify-between items-center">
                 <h4 className="font-bold text-stone-300 text-sm">
                    {t('dataModal.history_header_round')} {round.round}
                </h4>
                <span className={`text-sm font-bold ${winnerColor}`}>{winnerText}</span>
            </div>
            
            <div className="p-4 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
                {/* Hands */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                         <span className="text-xs text-stone-500 uppercase tracking-wider">{translatePlayerName('player')}</span>
                         <div className="flex gap-1 transform scale-75 origin-right">
                            {playerInitialHandCards.map((c, i) => <Card key={`p-init-${i}`} card={c} size="small" />)}
                         </div>
                    </div>
                    <div className="flex items-center justify-between">
                         <span className="text-xs text-stone-500 uppercase tracking-wider">{translatePlayerName('ai')}</span>
                         <div className="flex gap-1 transform scale-75 origin-right">
                            {aiInitialHandCards.map((c, i) => <Card key={`ai-init-${i}`} card={c} size="small" />)}
                         </div>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="flex flex-col justify-center space-y-2 border-t lg:border-t-0 lg:border-l border-white/5 pt-3 lg:pt-0 lg:pl-4">
                    <div className="text-xs text-stone-400">
                        <span className="block font-bold text-stone-500 uppercase mb-1">{t('dataModal.history_header_calls')}</span>
                        {round.calls.length > 0 ? (
                            <ul className="list-disc list-inside space-y-0.5">
                                {round.calls.slice(0, 3).map((call, i) => <li key={i} className="truncate max-w-[150px]">{call}</li>)}
                                {round.calls.length > 3 && <li className="italic text-stone-600">...</li>}
                            </ul>
                        ) : (
                             <span className="italic opacity-50">{t('dataModal.round_history_calls_none')}</span>
                        )}
                    </div>
                    {round.playerTrucoCall && (
                        <div className="text-xs mt-2 pt-2 border-t border-white/5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${round.playerTrucoCall.isBluff ? 'bg-purple-900/50 text-purple-300' : 'bg-blue-900/50 text-blue-300'}`}>
                                {round.playerTrucoCall.isBluff ? t('dataModal.history_truco_call_bluff') : t('dataModal.history_truco_call_value')}
                            </span>
                        </div>
                    )}
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
            <div>
                <h2 className="text-3xl lg:text-4xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 drop-shadow-sm">{t('dataModal.dashboard_title')}</h2>
                <p className="text-stone-400 text-sm mt-1 font-lora italic">Informe Confidencial de Jugador</p>
            </div>
            <button 
                onClick={() => dispatch({ type: ActionType.TOGGLE_DATA_MODAL })} 
                className="text-stone-500 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                aria-label={t('common.close')}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </header>

        <main className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title={t('dataModal.total_rounds')} value={totalRounds} icon={<DocumentChartBarIcon />} onClick={() => setView('history')}/>
                <StatCard 
                    title={t('dataModal.win_rate')} 
                    value={`${winRate.toFixed(0)}%`} 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>}
                    onClick={() => setView('winRateDetails')}
                />
                <StatCard 
                    title={t('dataModal.avg_envido_call')} 
                    value={avgEnvidoCallPoints.toFixed(1)} 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>} 
                    onClick={() => setView('envidoDetails')}
                />
            </div>

            {/* Analysis Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <DashboardSection title={t('dataModal.bluff_analysis')} icon={<BeakerIcon />}>
                    <div className="flex flex-col items-center justify-center h-full pb-4">
                        <GaugeChart value={bluffSuccessRate} label={t('dataModal.bluff_success_rate')} />
                        <div className="grid grid-cols-2 w-full mt-6 gap-4">
                            <div className="text-center p-2 bg-black/20 rounded border border-white/5">
                                <p className="text-xs text-stone-500 uppercase tracking-wider">{t('dataModal.total_bluffs')}</p>
                                <p className="text-xl font-bold text-white">{liveBluffStats.attempts}</p>
                            </div>
                            <div className="text-center p-2 bg-black/20 rounded border border-white/5">
                                <p className="text-xs text-stone-500 uppercase tracking-wider">{t('dataModal.successful_bluffs')}</p>
                                <p className="text-xl font-bold text-white">{liveBluffStats.successes}</p>
                            </div>
                        </div>
                    </div>
                </DashboardSection>

                <div className="lg:col-span-2">
                    <DashboardSection title={t('dataModal.card_play_frequency')} icon={<ChartBarIcon />}>
                       {cardPlayFrequency.length > 0 ? (
                         <BarChart data={cardPlayFrequency} title={t('dataModal.most_played_cards')} />
                       ) : (
                          <div className="flex items-center justify-center h-48 text-stone-600 italic text-sm">
                            {t('dataModal.no_data_message')}
                          </div>
                       )}
                    </DashboardSection>
                </div>
            </div>

            {/* Data Table */}
             <DashboardSection title={t('dataModal.card_play_details')}>
                <div className="overflow-x-auto max-h-60 custom-scrollbar">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="text-stone-500 text-xs uppercase tracking-wider bg-black/20 sticky top-0 z-10 backdrop-blur-sm">
                            <tr>
                                <th className="p-3 font-medium">{t('dataModal.header_card_type')}</th>
                                <th className="p-3 text-center font-medium">{t('dataModal.header_plays')}</th>
                                <th className="p-3 text-center font-medium">{t('dataModal.header_win_rate')}</th>
                                <th className="p-3 text-center font-medium">{t('dataModal.header_lead_response')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-stone-300">
                            {cardPlayDetails.map(([category, stats]) => {
                                const winRate = stats.plays > 0 ? (stats.wins / stats.plays) * 100 : 0;
                                return (
                                    <tr key={category} className="hover:bg-white/5 transition-colors">
                                        <td className="p-3 font-semibold text-amber-50/90">{t(`dataModal.card_categories.${category}`)}</td>
                                        <td className="p-3 text-center font-mono">{stats.plays}</td>
                                        <td className="p-3 text-center">
                                            <div className="w-24 mx-auto bg-stone-800 rounded-full h-1.5 flex items-center">
                                                <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${winRate}%` }}></div>
                                            </div>
                                            <span className="text-[10px] text-stone-500 mt-1 block">{winRate.toFixed(0)}%</span>
                                        </td>
                                        <td className="p-3 text-center font-mono text-xs text-stone-400">{stats.asLead} / {stats.asResponse}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </DashboardSection>

            {/* Footer Actions */}
             <div className="border-t border-white/10 pt-6 flex flex-wrap items-center justify-between gap-4">
                <h3 className="text-sm font-bold text-stone-500 uppercase tracking-widest">{t('dataModal.profile_management_title')}</h3>
                <div className="flex gap-3">
                    <button onClick={handleImportClick} className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white transition-colors">
                        {t('dataModal.button_import')}
                    </button>
                    <button onClick={handleExport} className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white transition-colors">
                        {t('dataModal.button_export')}
                    </button>
                    <button onClick={handleReset} className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded border border-red-900/50 text-red-400 hover:bg-red-900/20 transition-colors">
                        {t('dataModal.button_reset')}
                    </button>
                </div>
            </div>
        </main>
    </>
  );

  const BackButtonHeader = ({ titleKey }: { titleKey: string }) => (
    <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
            <button 
                onClick={() => setView('dashboard')} 
                className="p-2 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors"
                aria-label={t('dataModal.back_to_dashboard')}
            >
                <ArrowUturnLeftIcon />
            </button>
            <h2 className="text-2xl lg:text-3xl font-cinzel font-bold text-amber-100">{t(titleKey)}</h2>
        </div>
    </header>
  );

  const renderHistory = () => (
    <>
        <BackButtonHeader titleKey="dataModal.total_rounds_history_title" />
        <main>
            <DashboardSection title={t('dataModal.round_details')} icon={<ListBulletIcon />}>
                 <div className="overflow-auto max-h-[70vh] space-y-3 pr-2 custom-scrollbar">
                    {roundHistory.length > 0 ? roundHistory.slice().reverse().map((round) => (
                        <RoundDetail key={round.round} round={round} translatePlayerName={translatePlayerName} t={t} />
                    )) : (
                        <div className="text-center p-8 text-stone-600 italic">{t('dataModal.no_data_message')}</div>
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
             <div className="overflow-auto max-h-[80vh] space-y-3 pr-2 bg-stone-900/40 p-4 rounded-xl border border-white/5">
                {roundHistory.length > 0 ? roundHistory.slice().reverse().map((round) => {
                    const by = round.pointsAwarded.by;
                    const winnerText = round.roundWinner ? translatePlayerName(round.roundWinner) : t('common.tie');
                    const winnerClass = round.roundWinner === 'player' ? 'text-green-400' : round.roundWinner === 'ai' ? 'text-red-400' : 'text-gray-400';
                    return (
                        <div key={round.round} className="bg-black/30 p-4 rounded-lg border border-white/5 flex justify-between items-center">
                            <div>
                                <h4 className="font-bold text-base text-stone-300 mb-1"><span className="text-stone-500 text-xs uppercase tracking-wide mr-2">{t('dataModal.history_header_round')} {round.round}</span> <span className={winnerClass}>{winnerText}</span></h4>
                                <div className="flex gap-4 text-xs text-stone-400 font-mono mt-2">
                                    <span>TRUCO: {by?.truco.player || 0}-{by?.truco.ai || 0}</span>
                                    <span className="text-stone-600">|</span>
                                    <span>ENVIDO: {by?.envido.player || 0}-{by?.envido.ai || 0}</span>
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-stone-600 opacity-20">#{round.round}</div>
                        </div>
                    );
                }) : (
                    <div className="text-center p-8 text-stone-500">{t('dataModal.no_data_message')}</div>
                )}
            </div>
        </main>
    </>
  );
  
  const renderEnvidoDetails = () => (
    <>
      <BackButtonHeader titleKey="dataModal.envido_details_title" />
        <main>
             <div className="overflow-auto max-h-[80vh] space-y-4 pr-2 bg-stone-900/40 p-4 rounded-xl border border-white/5">
                {envidoCallRounds.length > 0 ? envidoCallRounds.slice().reverse().map((round) => {
                    const playerInitialHandCards = round.playerInitialHand.map(decodeCardFromCode);
                    const envidoCalls = round.calls.filter(c => c.toLowerCase().includes('envido'));
                    const outcome = round.pointsAwarded.by?.envido;
                    let outcomeText = '';
                    let outcomeClass = 'text-stone-400';

                    if (outcome) {
                        if (outcome.player > 0) { outcomeText = t('dataModal.envido_outcome_win', { count: outcome.player }); outcomeClass = 'text-green-400'; }
                        else if (outcome.ai > 0) { outcomeText = t('dataModal.envido_outcome_lose', { count: outcome.ai }); outcomeClass = 'text-red-400'; }
                        else outcomeText = t('dataModal.envido_outcome_tie');
                    }
                    
                    return (
                        <div key={round.round} className="bg-black/30 p-5 rounded-lg border border-white/5">
                             <div className="flex justify-between items-start mb-4">
                                <h4 className="font-bold text-amber-500 text-sm uppercase tracking-widest">{t('dataModal.history_header_round')} {round.round}</h4>
                                <span className={`text-sm font-bold ${outcomeClass}`}>{outcomeText}</span>
                             </div>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-stone-900/50 p-3 rounded border border-white/5">
                                    <p className="text-[10px] font-bold text-stone-500 uppercase mb-2">{t('dataModal.envido_your_hand')}</p>
                                    <div className="flex gap-2 justify-center">{playerInitialHandCards.map((c,i) => <Card key={`env-hand-${i}`} card={c} size="small" />)}</div>
                                    <p className="text-center text-lg font-bold text-white mt-2">{round.playerEnvidoPoints} <span className="text-xs font-normal text-stone-500">pts</span></p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-stone-500 uppercase mb-2">{t('dataModal.envido_call_sequence')}</p>
                                    <ul className="space-y-1">
                                      {envidoCalls.map((c, i) => (
                                        <li key={i} className="text-xs text-stone-300 py-1 border-b border-dashed border-stone-700 last:border-0">{c}</li>
                                      ))}
                                    </ul>
                                </div>
                             </div>
                        </div>
                    );
                }) : (
                    <div className="text-center p-8 text-stone-500 italic">{t('dataModal.no_envido_data')}</div>
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
    <div className="fixed inset-0 bg-black/90 font-sans overflow-y-auto p-4 lg:p-8 animate-fade-in-scale z-[101] backdrop-blur-sm">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-10 pointer-events-none"></div>
        <div className="w-full max-w-6xl mx-auto relative z-10">
            {renderContent()}
        </div>
    </div>
  );
};

export default DataModal;
