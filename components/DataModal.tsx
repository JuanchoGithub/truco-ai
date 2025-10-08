import React, { useRef } from 'react';
// Fix: Imported `CardPlayStats` to use in type assertions.
import { Action, ActionType, OpponentModel, Case, PlayerTrucoCallEntry, GameState, Card, Player, RoundSummary, PlayerCardPlayStatistics, CardCategory, CardPlayStats } from '../types';
import { getCardName, decodeCardFromCode } from '../services/trucoLogic';

interface DataModalProps {
  // Pass the whole state for exporting
  gameState: GameState;
  dispatch: React.Dispatch<Action>;
}

const categoryDisplayNames: Record<CardCategory, string> = {
    'ancho_espada': 'As de Espadas',
    'ancho_basto': 'As de Bastos',
    'siete_espada': 'Siete de Espadas',
    'siete_oro': 'Siete de Oros',
    'tres': 'Los Tres',
    'dos': 'Los Dos',
    'anchos_falsos': 'Anchos Falsos',
    'reyes': 'Los Reyes',
    'caballos': 'Los Caballos',
    'sotas': 'Las Sotas',
    'sietes_malos': 'Sietes Malos',
    'seis': 'Los Seis',
    'cincos': 'Los Cincos',
    'cuatros': 'Los Cuatros',
};

// New helper function to generate the AI's analysis of the player's style
const generateProfileAnalysis = (state: GameState): React.ReactNode[] => {
    const insights: React.ReactNode[] = [];
    const { opponentModel, roundHistory, playerTrucoCallHistory, playerCardPlayStats, playerEnvidoHistory } = state;

    if (roundHistory.length < 3) {
        insights.push(<li key="nodata">Juega algunas rondas más para que la IA pueda generar un perfil detallado de tu estilo de juego.</li>);
        return insights;
    }

    // Envido Analysis
    const { callThreshold, foldRate } = opponentModel.envidoBehavior;
    let envidoInsight = "Analizando tu estilo de Envido... ";
    if (callThreshold > 28) {
        envidoInsight += "Eres un jugador de Envido 'Puntual', tiendes a cantar solo cuando tienes 29 o más, lo que te hace muy creíble. ";
    } else if (callThreshold < 26) {
        envidoInsight += "Muestras agresividad en el Envido, a menudo cantando con 26 o más para presionar. ";
    } else {
        envidoInsight += "Tu umbral de Envido es equilibrado y difícil de predecir. ";
    }
    if (foldRate > 0.5) {
        envidoInsight += "Además, eres cauteloso, prefiriendo no aceptar si no tienes un buen presentimiento.";
    } else if (foldRate < 0.3) {
        envidoInsight += "Rara vez te retiras del Envido, demostrando que estás dispuesto a ver las cartas de la IA.";
    }
    insights.push(<li key="envido">{envidoInsight}</li>);
    
    // Truco Analysis
    const avgTrucoStrength = playerTrucoCallHistory.length > 0
        ? playerTrucoCallHistory.reduce((sum, entry) => sum + entry.strength, 0) / playerTrucoCallHistory.length
        : 0;
    
    let trucoInsight = "En el Truco, ";
    if (playerTrucoCallHistory.length < 3) {
        trucoInsight += "aún estoy recopilando datos sobre tu estilo de apuesta.";
    } else if (avgTrucoStrength > 28) {
        trucoInsight += "eres extremadamente conservador, solo apostando con manos de élite. He aprendido a respetar mucho tus llamadas.";
    } else if (avgTrucoStrength < 22) {
        trucoInsight += "eres un jugador agresivo, no dudas en cantar Truco para meter presión, incluso con manos modestas. Esto te hace peligroso pero vulnerable a un contraataque.";
    } else {
        trucoInsight += "mantienes un estilo balanceado, haciendo que tus intenciones sean difíciles de leer.";
    }
    insights.push(<li key="truco">{trucoInsight}</li>);
    
    // Bluff Analysis
    const bluffs = roundHistory.reduce((acc, r) => {
        if (r.playerTrucoCall?.isBluff) {
            acc.attempts++;
            if (r.roundWinner === 'player') acc.successes++;
        }
        return acc;
    }, { attempts: 0, successes: 0 });

    if (bluffs.attempts > 2) {
        const rate = bluffs.successes / bluffs.attempts;
        let bluffInsight = "Tu juego de farol (bluff) ";
        if (rate > 0.6) {
            bluffInsight += "es muy efectivo. He notado que tus apuestas sin cartas fuertes a menudo me hacen dudar y retirarme.";
        } else if (rate < 0.3) {
            bluffInsight += "está siendo leído por mí. Parece que he detectado un patrón y no me estoy retirando ante tus apuestas arriesgadas.";
        } else {
            bluffInsight += "es moderado, manteniéndome en un estado de incertidumbre.";
        }
        insights.push(<li key="bluff">{bluffInsight}</li>);
    }
    
    // Card Play Analysis
    const tresStats = playerCardPlayStats.tres;
    if (tresStats.plays > 2 && tresStats.asResponse > tresStats.asLead) {
         insights.push(<li key="cards">Muestras una tendencia a usar tus 'Tres' como cartas de respuesta, sugiriendo un estilo de contraataque en lugar de liderar con tu máxima fuerza.</li>);
    }

    return insights;
};


const DataModal: React.FC<DataModalProps> = ({ gameState, dispatch }) => {
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
            alert("¡Perfil importado con éxito!");
          } else {
            throw new Error("El archivo no tiene el formato esperado.");
          }
        }
      } catch (error) {
        console.error("Error al importar el archivo:", error);
        alert("Error: El archivo seleccionado no es un perfil válido.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const avgTrucoStrength = playerTrucoCallHistory.length > 0
    ? playerTrucoCallHistory.reduce((sum, entry) => sum + entry.strength, 0) / playerTrucoCallHistory.length
    : 0;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-stone-800/95 border-4 border-amber-700/50 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b-2 border-amber-700/30 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl md:text-2xl font-bold text-amber-300 font-cinzel tracking-widest" style={{ textShadow: '2px 2px 3px rgba(0,0,0,0.7)' }}>
            Análisis de Comportamiento
          </h2>
          <button onClick={() => dispatch({ type: ActionType.TOGGLE_DATA_MODAL })} className="text-amber-200 text-2xl md:text-3xl font-bold hover:text-white transition-colors">&times;</button>
        </div>
        <div className="p-4 md:p-6 flex-grow overflow-y-auto text-amber-50 space-y-6">
          
          {/* Section: AI Style Analysis */}
          <div>
            <h3 className="text-lg md:text-xl font-bold text-amber-200 mb-2 border-b border-amber-200/20 pb-1">Análisis de Estilo por la IA</h3>
            <div className="bg-black/30 p-3 rounded-md space-y-2 text-sm">
                <ul className="list-disc list-inside text-gray-300 italic space-y-1">
                    {profileAnalysis}
                </ul>
            </div>
          </div>
          
          {/* Section: Behavioral Profile */}
          <div>
            <h3 className="text-lg md:text-xl font-bold text-amber-200 mb-2 border-b border-amber-200/20 pb-1">Perfil de Comportamiento</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-black/30 p-3 rounded-md space-y-1">
                    <p><span className="font-semibold text-white">Umbral de Truco (promedio):</span> {avgTrucoStrength > 0 ? avgTrucoStrength.toFixed(1) : 'N/A'}</p>
                    <p><span className="font-semibold text-white">Éxito de Farol en Truco:</span> {liveBluffStats.attempts > 0 ? `${((liveBluffStats.successes / liveBluffStats.attempts) * 100).toFixed(0)}%` : 'N/A'} <span className="text-gray-400">({liveBluffStats.successes}/{liveBluffStats.attempts})</span></p>
                </div>
                <div className="bg-black/30 p-3 rounded-md space-y-1">
                     <p><span className="font-semibold text-white">Umbral de Envido (promedio):</span> ~{opponentModel.envidoBehavior.callThreshold.toFixed(1)}</p>
                     <p><span className="font-semibold text-white">Tasa de Abandono Envido (vs IA):</span> {(opponentModel.envidoBehavior.foldRate * 100).toFixed(1)}%</p>
                     <p><span className="font-semibold text-white">Preferencia Envido (Mano/Respuesta):</span> {totalCalls > 0 ? `${manoCallRate.toFixed(0)}% / ${(100 - manoCallRate).toFixed(0)}%` : 'N/A'}</p>
                </div>
            </div>
          </div>

          {/* Section: Card Play Patterns */}
          <div>
            <h3 className="text-lg md:text-xl font-bold text-amber-200 mb-2 border-b border-amber-200/20 pb-1">Patrones de Juego de Cartas</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead className="bg-black/40 text-amber-100">
                  <tr>
                    <th className="p-2">Tipo de Carta</th>
                    <th>Jugadas</th>
                    <th>% Victoria</th>
                    <th>Mano 1</th>
                    <th>Mano 2</th>
                    <th>Mano 3</th>
                    <th>Liderando</th>
                    <th>Respuesta</th>
                  </tr>
                </thead>
                <tbody className="bg-black/20">
                  {/* Fix: Added type assertion to `Object.entries` to correctly type the stats object in the chain. */}
                  {(Object.entries(playerCardPlayStats) as [string, CardPlayStats][])
                    .filter(([, stats]) => stats.plays > 0)
                    .sort(([, a], [, b]) => b.plays - a.plays)
                    .map(([category, stats]) => (
                    <tr key={category} className="border-b border-stone-700">
                      <td className="p-2 font-semibold">{categoryDisplayNames[category as CardCategory]}</td>
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
            <h3 className="text-lg md:text-xl font-bold text-amber-200 mb-2 border-b border-amber-200/20 pb-1">Historial de Rondas</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {[...roundHistory].reverse().map(summary => (
                <details key={summary.round} className="bg-black/30 p-2 rounded-md text-xs">
                  <summary className="cursor-pointer font-semibold">
                    Ronda {summary.round} - {summary.roundWinner ? `Ganador: ${summary.roundWinner.toUpperCase()}` : 'En curso...'} ({summary.pointsAwarded.player} - {summary.pointsAwarded.ai})
                  </summary>
                  <div className="mt-2 pl-4 border-l-2 border-amber-600/50 space-y-1">
                    <p><span className="font-semibold">Fuerza / Envido:</span> Tú {summary.playerHandStrength} / {summary.playerEnvidoPoints} vs IA {summary.aiHandStrength} / {summary.aiEnvidoPoints}</p>
                    <p><span className="font-semibold">Llamadas:</span> {summary.calls.join(', ') || 'Ninguna'}</p>
                    <p><span className="font-semibold">Ganadores de Manos:</span> {summary.trickWinners.map((w, i) => `M${i+1}: ${w ? w.toUpperCase() : 'N/A'}`).join(' | ')}</p>
                    {summary.playerTricks && summary.aiTricks && (
                      <div>
                        <span className="font-semibold">Cartas Jugadas:</span>
                        <ul className="list-disc list-inside text-gray-300">
                          {summary.playerTricks.map((pCardCode, i) => {
                            const aCardCode = summary.aiTricks[i];
                            if (!pCardCode && !aCardCode) return null;
                            const playerCardName = pCardCode ? getCardName(decodeCardFromCode(pCardCode)) : '---';
                            const aiCardName = aCardCode ? getCardName(decodeCardFromCode(aCardCode)) : '---';
                            return <li key={i}>Mano {i+1}: Tú ({playerCardName}) vs IA ({aiCardName})</li>
                          }).filter(Boolean)}
                        </ul>
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </div>

        </div>
        <div className="p-3 border-t-2 border-amber-700/30 flex-shrink-0 flex justify-end items-center gap-4">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" style={{ display: 'none' }} />
          <button onClick={handleImportClick} className="px-3 py-1.5 text-xs md:text-sm rounded-lg font-semibold text-cyan-200 bg-black/40 border-2 border-cyan-800/80 shadow-md hover:bg-black/60 hover:border-cyan-600 transition-colors">Importar Perfil</button>
          <button onClick={handleExport} className="px-3 py-1.5 text-xs md:text-sm rounded-lg font-semibold text-yellow-200 bg-black/40 border-2 border-yellow-800/80 shadow-md hover:bg-black/60 hover:border-yellow-600 transition-colors">Exportar Perfil</button>
        </div>
      </div>
    </div>
  );
};

export default DataModal;