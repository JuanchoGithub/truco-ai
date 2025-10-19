import React, { useRef } from 'react';
// Fix: Imported `CardPlayStats` to use in type assertions.
import { Action, ActionType, OpponentModel, Case, PlayerTrucoCallEntry, GameState, Card, Player, RoundSummary, PlayerCardPlayStatistics, CardCategory, CardPlayStats } from '../types';
import { getCardName, decodeCardFromCode } from '../services/trucoLogic';
import { useLocalization } from '../context/LocalizationContext';
import { generateProfileAnalysis } from '../services/profileAnalysisService';


const DataModal: React.FC<{ gameState: GameState, dispatch: React.Dispatch<Action> }> = ({ gameState, dispatch }) => {
  const { t } = useLocalization();
  const { opponentModel, aiCases, playerTrucoCallHistory, playerCardPlayStats, roundHistory, playerEnvidoHistory } = gameState;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate live stats from round history for immediate user feedback.
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

  const envidoCalls = playerEnvidoHistory.filter(
    e => e.action === 'called' || e.action.startsWith('escalated')
  );
  const callsAsMano = envidoCalls.filter(e => e.wasMano).length;
  const totalCalls = envidoCalls.length;
  const manoCallRate = totalCalls > 0 ? (callsAsMano / totalCalls) * 100 : 0;
  
  const profileAnalysis = generateProfileAnalysis(gameState);

  const handleExport = () => {
    const dataToExport: Partial<GameState> = {
      opponentModel: gameState.opponentModel,
      aiCases: gameState.aiCases,
      playerEnvidoFoldHistory: gameState.playerEnvidoFoldHistory,
      playerTrucoCallHistory: gameState.playerTrucoCallHistory,
      playerEnvidoHistory: gameState.playerEnvidoHistory,
      playerPlayOrderHistory: gameState.playerPlayOrderHistory,
      playerCardPlayStats: gameState.playerCardPlayStats,
      roundHistory: gameState.roundHistory,
      envidoPrimeroOpportunities: gameState.envidoPrimeroOpportunities,
      envidoPrimeroCalls: gameState.envidoPrimeroCalls,
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dataToExport, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = "truco-ai-profile.json";
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
        const text = e.target?.result;
        if (typeof text === 'string') {
          const importedData = JSON.parse(text);
          if (importedData.opponentModel && importedData.aiCases) {
            dispatch({ type: ActionType.LOAD_IMPORTED_DATA, payload: importedData });
            alert(t('dataModal.import_success'));
          } else {
            throw new Error(t('dataModal.import_error_format'));
          }
        }
      } catch (error) {
        console.error("Error al importar el archivo:", error);
        alert(t('dataModal.import_error'));
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const avgTrucoStrength = playerTrucoCallHistory.length > 0
    ? playerTrucoCallHistory.reduce((sum, entry) => sum + entry.strength, 0) / playerTrucoCallHistory.length
    : 0;
    
  const renderCalls = (calls: string[]) => {
      if (!calls || calls.length === 0) return <span className="text-gray-400">{t('dataModal.round_history_calls_none')}</span>;
      
      const getCallStyle = (callText: string): string => {
          const lowerCall = callText.toLowerCase();
          if (lowerCall.includes('truco') || lowerCall.includes('retruco') || lowerCall.includes('vale cuatro')) return 'text-yellow-300 font-semibold';
          if (lowerCall.includes('envido')) return 'text-blue-300 font-semibold';
          if (lowerCall.includes('flor') || lowerCall.includes('contraflor')) return 'text-purple-300 font-semibold';
          if (lowerCall.includes('quiero')) return 'text-green-300';
          if (lowerCall.includes('no quiero')) return 'text-red-400';
          return 'text-gray-200';
      };

      return (
          <>
              {calls.map((call, index) => (
                  <span key={index}>
                      <span className={getCallStyle(call)}>{call}</span>
                      {index < calls.length - 1 && ', '}
                  </span>
              ))}
          </>
      )
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-stone-800/95 border-4 border-amber-700/50 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b-2 border-amber-700/30 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl lg:text-2xl font-bold text-amber-300 font-cinzel tracking-widest" style={{ textShadow: '2px 2px 3px rgba(0,0,0,0.7)' }}>
            {t('dataModal.title')}
          </h2>
          <button onClick={() => dispatch({ type: ActionType.TOGGLE_DATA_MODAL })} className="text-amber-200 text-2xl lg:text-3xl font-bold hover:text-white transition-colors">&times;</button>
        </div>
        <div className="p-4 lg:p-6 flex-grow overflow-y-auto text-amber-50 space-y-6">
          
          {/* Section: AI Personality Profile of You */}
          <div>
            <h3 className="text-lg lg:text-xl font-bold text-amber-200 mb-2 border-b border-amber-200/20 pb-1">{t('dataModal.style_analysis_title')}</h3>
            <div className="bg-black/30 p-4 rounded-md space-y-4">
              {profileAnalysis.map((obs, index) => (
                <div key={index}>
                  <p className="font-bold text-white">{t(obs.titleKey)}</p>
                  <div className="w-full bg-gray-700 rounded-full h-2.5 my-1" title={`${t('dataModal.confidence_level')}: ${(obs.confidence * 100).toFixed(0)}%`}>
                    <div 
                      className="bg-gradient-to-r from-yellow-500 to-amber-400 h-2.5 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.max(5, obs.confidence * 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-gray-300 italic text-sm">{t(obs.descriptionKey)}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Section: Behavioral Profile */}
          <div>
            <h3 className="text-lg lg:text-xl font-bold text-amber-200 mb-2 border-b border-amber-200/20 pb-1">{t('dataModal.behavior_profile_title')}</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
                <div className="bg-black/30 p-3 rounded-md space-y-1">
                    <p><span className="font-semibold text-white">{t('dataModal.truco_threshold')}:</span> {avgTrucoStrength > 0 ? avgTrucoStrength.toFixed(1) : t('common.na')}</p>
                    <p><span className="font-semibold text-white">{t('dataModal.bluff_success')}:</span> {liveBluffStats.attempts > 0 ? `${((liveBluffStats.successes / liveBluffStats.attempts) * 100).toFixed(0)}%` : t('common.na')} <span className="text-gray-400">({liveBluffStats.successes}/{liveBluffStats.attempts})</span></p>
                    <p><span className="font-semibold text-white">{t('dataModal.envido_primero_rate')}:</span> {(opponentModel.playStyle.envidoPrimeroRate * 100).toFixed(0)}%</p>
                </div>
                <div className="bg-black/30 p-3 rounded-md space-y-1">
                     <p><span className="font-semibold text-white">{t('dataModal.envido_threshold')}:</span> ~{((opponentModel.envidoBehavior.mano.callThreshold + opponentModel.envidoBehavior.pie.callThreshold) / 2).toFixed(1)}</p>
                     <p><span className="font-semibold text-white">{t('dataModal.envido_fold_rate')}:</span> {(((opponentModel.envidoBehavior.mano.foldRate + opponentModel.envidoBehavior.pie.foldRate) / 2) * 100).toFixed(1)}%</p>
                     <p><span className="font-semibold text-white">{t('dataModal.envido_preference')}:</span> {totalCalls > 0 ? `${manoCallRate.toFixed(0)}% / ${(100 - manoCallRate).toFixed(0)}%` : t('common.na')}</p>
                </div>
            </div>
          </div>

          {/* Section: Card Play Patterns */}
          <div>
            <h3 className="text-lg lg:text-xl font-bold text-amber-200 mb-2 border-b border-amber-200/20 pb-1">{t('dataModal.card_play_patterns_title')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs lg:text-sm">
                <thead className="bg-black/40 text-amber-100">
                  <tr>
                    <th className="p-2">{t('dataModal.card_play_header_type')}</th>
                    <th>{t('dataModal.card_play_header_plays')}</th>
                    <th>{t('dataModal.card_play_header_win_rate')}</th>
                    <th>{t('dataModal.card_play_header_trick1')}</th>
                    <th>{t('dataModal.card_play_header_trick2')}</th>
                    <th>{t('dataModal.card_play_header_trick3')}</th>
                    <th>{t('dataModal.card_play_header_lead')}</th>
                    <th>{t('dataModal.card_play_header_response')}</th>
                  </tr>
                </thead>
                <tbody className="bg-black/20">
                  {(Object.entries(playerCardPlayStats) as [string, CardPlayStats][])
                    .filter(([, stats]) => stats.plays > 0)
                    .sort(([, a], [, b]) => b.plays - a.plays)
                    .map(([category, stats]) => (
                    <tr key={category} className="border-b border-stone-700">
                      <td className="p-2 font-semibold">{t(`dataModal.card_categories.${category}`)}</td>
                      <td>{stats.plays}</td>
                      <td>{stats.plays > 0 ? ((stats.wins / stats.plays) * 100).toFixed(0) : '0'}%</td>
                      <td>{stats.byTrick[0]}</td>
                      <td>{stats.byTrick[1]}</td>
                      <td>{stats.byTrick[2]}</td>
                      <td>{stats.asLead}</td>
                      <td>{stats.asResponse}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Round History */}
          <div>
            <h3 className="text-lg lg:text-xl font-bold text-amber-200 mb-2 border-b border-amber-200/20 pb-1">{t('dataModal.round_history_title')}</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {[...roundHistory].reverse().map(summary => {
                  const winnerStatus = summary.roundWinner ? t('dataModal.round_history_winner', { winner: t(`common.${summary.roundWinner}`)}) : t('dataModal.round_history_in_progress');
                  return (
                    <details key={summary.round} className="bg-black/30 p-2 rounded-md text-xs">
                      <summary className="cursor-pointer font-semibold">
                        {t('dataModal.round_history_summary', { round: summary.round, winnerStatus, playerScore: summary.pointsAwarded.player, aiScore: summary.pointsAwarded.ai })}
                      </summary>
                      <div className="mt-2 pl-4 border-l-2 border-amber-600/50 space-y-1">
                        <p><span className="font-semibold">{t('dataModal.round_history_strength_envido')}:</span> {t('common.you')} {summary.playerHandStrength} / {summary.playerEnvidoPoints} vs {t('common.ai')} {summary.aiHandStrength} / {summary.aiEnvidoPoints}</p>
                        <p><span className="font-semibold">{t('dataModal.round_history_calls')}:</span> {renderCalls(summary.calls)}</p>
                        <p><span className="font-semibold">{t('dataModal.round_history_trick_winners')}:</span> {summary.trickWinners.map((w, i) => t('dataModal.round_history_trick_winner_pattern', { trick: i + 1, winner: w ? t(`common.${w}`) : t('common.na') })).join(' | ')}</p>
                        {summary.playerTricks && summary.aiTricks && (
                          <div>
                            <span className="font-semibold">{t('dataModal.round_history_played_cards')}:</span>
                            <ul className="list-disc list-inside text-gray-300">
                              {summary.playerTricks.map((pCardCode, i) => {
                                const aCardCode = summary.aiTricks[i];
                                if (!pCardCode && !aCardCode) return null;
                                const playerCardName = pCardCode ? getCardName(decodeCardFromCode(pCardCode)) : '---';
                                const aiCardName = aCardCode ? getCardName(decodeCardFromCode(aCardCode)) : '---';
                                return <li key={i}>{t('dataModal.round_history_played_cards_pattern', { trick: i + 1, playerCard: playerCardName, aiCard: aiCardName })}</li>
                              }).filter(Boolean)}
                            </ul>
                          </div>
                        )}
                      </div>
                    </details>
                  )
              })}
            </div>
          </div>

        </div>
        <div className="p-3 border-t-2 border-amber-700/30 flex-shrink-0 flex justify-end items-center gap-4">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" style={{ display: 'none' }} />
          <button onClick={handleImportClick} className="px-3 py-1.5 text-xs lg:text-sm rounded-lg font-semibold text-cyan-200 bg-black/40 border-2 border-cyan-800/80 shadow-md hover:bg-black/60 hover:border-cyan-600 transition-colors">{t('dataModal.button_import')}</button>
          <button onClick={handleExport} className="px-3 py-1.5 text-xs lg:text-sm rounded-lg font-semibold text-yellow-200 bg-black/40 border-2 border-yellow-800/80 shadow-md hover:bg-black/60 hover:border-yellow-600 transition-colors">{t('dataModal.button_export')}</button>
        </div>
      </div>
    </div>
  );
};

export default DataModal;