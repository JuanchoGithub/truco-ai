import React, { useRef } from 'react';
import { Action, ActionType, OpponentModel, Case, PlayerTrucoCallEntry, GameState, Card, Player, RoundSummary, PlayerCardPlayStatistics, CardCategory } from '../types';
import { getCardName } from '../services/trucoLogic';

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

const DataModal: React.FC<DataModalProps> = ({ gameState, dispatch }) => {
  const { opponentModel, aiCases, playerTrucoCallHistory, playerCardPlayStats, roundHistory } = gameState;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const trucoCalls = aiCases.length;
  const trucoBluffs = aiCases.filter(c => c.isBluff).length;
  const bluffWins = aiCases.filter(c => c.isBluff && c.outcome === 'win').length;
  const bluffSuccessRate = trucoBluffs > 0 ? (bluffWins / trucoBluffs) * 100 : 0;

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
          // Basic validation
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
    // Reset file input value to allow re-importing the same file
    event.target.value = '';
  };

  const getTrucoStyleInference = (strength: number) => {
    if (playerTrucoCallHistory.length < 3) return "No hay suficientes datos para un análisis de estilo de Truco.";
    if (strength > 28) return "Eres muy conservador, solo cantas Truco con manos muy fuertes. La IA puede respetarte más cuando lo haces.";
    if (strength < 22) return "Eres muy agresivo, cantas Truco con una amplia variedad de manos. La IA podría dudar de tus llamadas y aceptar más a menudo.";
    return "Tu estilo para cantar Truco es equilibrado, lo que te hace impredecible. La IA debe basarse más en las cartas que en tu comportamiento.";
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
          
          {/* Section 1: Behavioral Profile */}
          <div>
            <h3 className="text-lg md:text-xl font-bold text-amber-200 mb-2 border-b border-amber-200/20 pb-1">Perfil de Comportamiento</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-black/30 p-3 rounded-md space-y-1">
                    <p><span className="font-semibold text-white">Umbral de Truco (promedio):</span> {avgTrucoStrength > 0 ? avgTrucoStrength.toFixed(1) : 'N/A'}</p>
                    <p className="text-xs text-gray-300 italic"><span className="font-bold text-amber-300">Inferencia:</span> {getTrucoStyleInference(avgTrucoStrength)}</p>
                </div>
                <div className="bg-black/30 p-3 rounded-md space-y-1">
                    <p><span className="font-semibold text-white">Umbral de Envido (promedio):</span> ~{opponentModel.envidoBehavior.callThreshold.toFixed(1)}</p>
                     <p><span className="font-semibold text-white">Tasa de Abandono Envido (vs IA):</span> {(opponentModel.envidoBehavior.foldRate * 100).toFixed(1)}%</p>
                </div>
            </div>
          </div>

          {/* Section 2: Card Play Patterns */}
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
                  {Object.entries(playerCardPlayStats)
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

          {/* Section 3: Round History */}
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