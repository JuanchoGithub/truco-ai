
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, GameState, AiMove, Player, GamePhase, MessageObject, Action, ActionType, AiArchetype } from '../types';
import { createDeck, getCardName, decodeCardFromCode, getEnvidoValue, hasFlor } from '../services/trucoLogic';
import { initialState } from '../hooks/useGameReducer';
import { getLocalAIMove } from '../services/localAiService';
import { predefinedScenarios, PredefinedScenario } from '../services/scenarioService';
import CardComponent from './Card';
import { useLocalization } from '../context/LocalizationContext';
import { selectArchetype } from '../hooks/reducers/gameplayReducer';

const FULL_DECK = createDeck();

// Reuse mini components (in a real refactor, these would be exported from Simulation.tsx)
const MiniCard: React.FC<{ card: Card | null; onClick?: () => void }> = ({ card, onClick }) => (
    <div onClick={onClick} className="w-10 h-[65px] rounded border border-stone-600 bg-stone-800 shadow-lg flex items-center justify-center relative select-none cursor-pointer hover:-translate-y-1 hover:border-amber-500 transition-transform">
        {card ? <CardComponent card={card} size="small" className="!w-full !h-full" /> : <div className="w-full h-full bg-white/5 flex items-center justify-center"><div className="w-3 h-5 border border-dashed border-white/10 rounded-sm"></div></div>}
    </div>
);

const renderReasoning = (reasoningArray: (string | MessageObject)[], t: (key: string, options?: any) => string): string => {
    if (!reasoningArray) return "";
    return reasoningArray.map(reason => {
        if (typeof reason === 'string') return reason;
        const options: { [key: string]: any } = { ...reason.options };
        if (options.statusKey) options.status = t(`ai_logic.statuses.${options.statusKey}`);
        if (options.player) options.player = options.player === 'ai' ? t('common.ai') : t('common.opponent');
        for (const key in options) {
            if (options[key] && typeof options[key] === 'object') {
                if (Array.isArray(options[key])) options[key] = options[key].map((c: any) => getCardName(c)).join(', ');
                else if ('rank' in options[key] && 'suit' in options[key]) options[key] = getCardName(options[key] as Card);
            } else if (key === 'suit' && typeof options[key] === 'string') options[key] = t(`common.card_suits.${options[key]}`);
        }
        return t(reason.key, options);
    }).join('\n');
};

const getActionDescription = (action: Action, state: Partial<GameState>, t: (key: string, options?: any) => string): string => {
    const player = (action as any)?.payload?.player || state.currentTurn;
    const playerName = player === 'ai' ? t('common.ai') : t('common.opponent');
    // ... (switch cases same as before, omitting for brevity as logic is unchanged) ...
    switch (action.type) {
        case ActionType.PLAY_CARD:
            const hand = player === 'ai' ? state.aiHand : state.playerHand;
            if (!hand) return t('simulation_actions.play_card_no_hand_data', { playerName });
            const card = hand[(action.payload as any).cardIndex];
            return t('simulation_actions.play_card', { playerName, cardName: card ? getCardName(card) : 'a card' });
        default: return t('simulation_actions.default', { playerName, actionType: action.type });
    }
}

const CardPickerModal: React.FC<{ availableCards: Card[]; onSelect: (card: Card) => void; onExit: () => void }> = ({ availableCards, onSelect, onExit }) => {
    const { t } = useLocalization();
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
            <div className="bg-stone-900 border-2 border-amber-600/50 rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
                <div className="p-4 border-b border-amber-600/30 flex justify-between items-center bg-stone-950">
                    <h3 className="text-lg font-bold text-amber-400 font-cinzel">{t('card_picker.title')}</h3>
                    <button onClick={onExit} className="text-stone-400 hover:text-white transition-colors">&times;</button>
                </div>
                <div className="p-6 flex-grow overflow-y-auto">
                    <div className="flex flex-wrap gap-3 justify-center">
                        {availableCards.map(card => (
                            <button key={`${card.rank}-${card.suit}`} onClick={() => onSelect(card)} className="transform transition-transform hover:scale-110 hover:z-10">
                                <CardComponent card={card} size="small" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

type MultiArchetypeResult = { archetype: AiArchetype; result: AiMove; stateUsed: GameState };

const ScenarioTester: React.FC = () => {
    const { t } = useLocalization();
    const [aiHand, setAiHand] = useState<(Card | null)[]>([null, null, null]);
    const [opponentHand, setOpponentHand] = useState<(Card | null)[]>([null, null, null]);
    const [aiScore, setAiScore] = useState(0);
    const [opponentScore, setOpponentScore] = useState(0);
    const [mano, setMano] = useState<Player>('ai');
    const [currentTurn, setCurrentTurn] = useState<Player>('ai');
    const [gamePhase, setGamePhase] = useState<GamePhase>('trick_1');
    const [trucoLevel, setTrucoLevel] = useState<0 | 1 | 2 | 3>(0);
    const [lastCaller, setLastCaller] = useState<Player | null>(null);
    const [hasEnvidoBeenCalled, setHasEnvidoBeenCalled] = useState<boolean>(false);
    const [aiEnvidoValue, setAiEnvidoValue] = useState<number>(0);
    const [opponentEnvidoValue, setOpponentEnvidoValue] = useState<number>(0);
    const [archetype, setArchetype] = useState<AiArchetype | 'Dynamic' | 'All'>('Dynamic');
    const [pickerState, setPickerState] = useState<{ open: boolean, hand: 'ai' | 'opponent', index: number }>({ open: false, hand: 'ai', index: 0 });
    const [testResult, setTestResult] = useState<{result: AiMove, state: GameState} | null>(null);
    const [multiArchetypeResults, setMultiArchetypeResults] = useState<MultiArchetypeResult[] | null>(null);
    const [selectedScenario, setSelectedScenario] = useState<PredefinedScenario | null>(null);
    const [iterations, setIterations] = useState(1000);
    const [isSetupCollapsed, setIsSetupCollapsed] = useState(false); // Collapsible Setup
    const [simulationResults, setSimulationResults] = useState<Record<string, Record<string, number>> | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [simulationProgress, setSimulationProgress] = useState(0);
    const simulationCancelled = useRef(false);

    useEffect(() => {
        const finalAiHand = aiHand.filter((c): c is Card => c !== null);
        const finalOpponentHand = opponentHand.filter((c): c is Card => c !== null);
        if (finalAiHand.length === 3) setAiEnvidoValue(getEnvidoValue(finalAiHand));
        if (finalOpponentHand.length === 3) setOpponentEnvidoValue(getEnvidoValue(finalOpponentHand));
    }, [aiHand, opponentHand]);

    const availableCards = useMemo(() => {
        const selected = [...aiHand, ...opponentHand].filter(c => c !== null);
        return FULL_DECK.filter(deckCard => !selected.some(sel => sel && sel.rank === deckCard.rank && sel.suit === deckCard.suit));
    }, [aiHand, opponentHand]);

    const handleOpenPicker = (hand: 'ai' | 'opponent', index: number) => { setPickerState({ open: true, hand, index }); setSelectedScenario(null); };
    const handleCardSelect = (card: Card) => {
        if (pickerState.hand === 'ai') { const newHand = [...aiHand]; newHand[pickerState.index] = card; setAiHand(newHand); }
        else { const newHand = [...opponentHand]; newHand[pickerState.index] = card; setOpponentHand(newHand); }
        setPickerState({ open: false, hand: 'ai', index: 0 });
    };
    const handleClearHand = (hand: 'ai' | 'opponent') => { if (hand === 'ai') setAiHand([null,null,null]); else setOpponentHand([null,null,null]); setSelectedScenario(null); };
    
    const regenerateAndApplyHands = (scenario: PredefinedScenario) => {
        const hands = scenario.generateHands();
        if (hands) {
            setAiHand([...hands.aiHand, null, null, null].slice(0, 3));
            setOpponentHand([...hands.playerHand, null, null, null].slice(0, 3));
        }
    };

    const handleLoadScenario = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const scenarioKey = e.target.value;
        const scenario = predefinedScenarios.find(s => s.nameKey === scenarioKey);
        if (!scenario) { setSelectedScenario(null); return; }
        setSelectedScenario(scenario);
        const { baseState } = scenario;
        setAiScore(baseState.aiScore || 0); setOpponentScore(baseState.playerScore || 0); setMano(baseState.mano || 'ai'); setCurrentTurn(baseState.currentTurn || 'ai');
        setGamePhase(baseState.gamePhase || 'trick_1'); setTrucoLevel(baseState.trucoLevel || 0); setLastCaller(baseState.lastCaller || null);
        const isRespondingToTruco = (baseState.gamePhase || '').includes('truco_called');
        const envidoWindowClosed = (baseState.trucoLevel || 0) > 0 && !isRespondingToTruco;
        setHasEnvidoBeenCalled(baseState.hasEnvidoBeenCalledThisRound || envidoWindowClosed);
        setAiEnvidoValue(baseState.aiEnvidoValue || 0); setOpponentEnvidoValue(baseState.playerEnvidoValue || 0);
        regenerateAndApplyHands(scenario); setTestResult(null); setSimulationResults(null); setMultiArchetypeResults(null);
    };

    const createScenarioState = (forcedArchetype?: AiArchetype): GameState | null => {
        const finalAiHand = aiHand.filter(c => c !== null) as Card[];
        const finalOpponentHand = opponentHand.filter(c => c !== null) as Card[];
        if (finalAiHand.length === 0) { alert("AI Hand cannot be empty."); return null; }
        let calculatedArchetype = forcedArchetype || (archetype === 'Dynamic' ? selectArchetype(opponentScore, aiScore) : archetype as AiArchetype);
        return {
            ...initialState, aiScore, playerScore: opponentScore, mano, currentTurn, gamePhase, trucoLevel, lastCaller,
            aiArchetype: calculatedArchetype, aiHand: finalAiHand, initialAiHand: finalAiHand, playerHand: finalOpponentHand, initialPlayerHand: finalOpponentHand,
            aiHasFlor: hasFlor(finalAiHand), playerHasFlor: hasFlor(finalOpponentHand),
            aiTricks: selectedScenario?.baseState.aiTricks || initialState.aiTricks, playerTricks: selectedScenario?.baseState.playerTricks || initialState.playerTricks,
            trickWinners: selectedScenario?.baseState.trickWinners || initialState.trickWinners, currentTrick: selectedScenario?.baseState.currentTrick || 0,
            hasEnvidoBeenCalledThisRound: hasEnvidoBeenCalled, aiEnvidoValue: hasEnvidoBeenCalled ? aiEnvidoValue : null, playerEnvidoValue: hasEnvidoBeenCalled ? opponentEnvidoValue : null,
        };
    };

    const handleRunTest = () => {
        setSimulationResults(null);
        if (archetype === 'All') {
            setTestResult(null);
            const archetypes: AiArchetype[] = ['Balanced', 'Aggressive', 'Cautious', 'Deceptive'];
            const results: MultiArchetypeResult[] = [];
            for (const arch of archetypes) {
                const scenarioState = createScenarioState(arch);
                if (!scenarioState) continue;
                results.push({ archetype: arch, result: getLocalAIMove(scenarioState), stateUsed: scenarioState });
            }
            setMultiArchetypeResults(results);
        } else {
            setMultiArchetypeResults(null);
            const scenarioState = createScenarioState();
            if (scenarioState) setTestResult({ result: getLocalAIMove(scenarioState), state: scenarioState });
        }
    };

    const handleRunSimulations = () => {
         if (!selectedScenario) { alert(t('scenario_tester.run_simulations_no_scenario_error')); return; }
         setIsSimulating(true); setSimulationProgress(0); setSimulationResults(null); setTestResult(null); setMultiArchetypeResults(null); simulationCancelled.current = false;
         const archetypesToRun: (AiArchetype | 'Dynamic')[] = archetype === 'All' ? ['Balanced', 'Aggressive', 'Cautious', 'Deceptive'] : [archetype];
         const iterationsPerArchetype = Math.floor(iterations / archetypesToRun.length);
         const newResults: Record<string, Record<string, number>> = {};
         
         const processSims = async () => {
            let archIndex = 0; let iterIndex = 0; let totalCompleted = 0;
            const totalSims = iterationsPerArchetype * archetypesToRun.length;
            while (archIndex < archetypesToRun.length && !simulationCancelled.current) {
                const currentArch = archetypesToRun[archIndex];
                if (!newResults[currentArch]) newResults[currentArch] = {};
                const baseStateForArch = createScenarioState(currentArch === 'Dynamic' ? undefined : currentArch as AiArchetype);
                if (!baseStateForArch) break;
                
                const startTime = performance.now();
                while (archIndex < archetypesToRun.length && !simulationCancelled.current) {
                    const hands = selectedScenario.generateHands();
                    if (hands) {
                         const scenarioState = { ...baseStateForArch, aiHand: hands.aiHand, initialAiHand: hands.aiHand, playerHand: hands.playerHand, initialPlayerHand: hands.playerHand, aiHasFlor: hasFlor(hands.aiHand), playerHasFlor: hasFlor(hands.playerHand) };
                         const aiMove = getLocalAIMove(scenarioState);
                         const reason = aiMove.reasonKey || 'unknown_action';
                         newResults[currentArch][reason] = (newResults[currentArch][reason] || 0) + 1;
                    }
                    iterIndex++; totalCompleted++;
                    if (iterIndex >= iterationsPerArchetype) { iterIndex = 0; archIndex++; break; }
                    if (iterIndex % 20 === 0 && performance.now() - startTime > 40) break;
                }
                setSimulationResults({ ...newResults });
                setSimulationProgress(Math.round((totalCompleted / totalSims) * 100));
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            setIsSimulating(false);
            if (simulationCancelled.current) setSimulationResults(null);
         };
         processSims();
    };

    return (
        <div className="w-full h-full flex flex-col bg-stone-900">
            <div className="flex-grow flex overflow-hidden">
                {/* Left Column: Config */}
                <div className={`bg-stone-950 border-r border-stone-800 overflow-y-auto custom-scrollbar transition-all duration-300 flex flex-col ${isSetupCollapsed ? 'w-12' : 'w-80'}`}>
                     <div className="p-3 border-b border-stone-800 flex justify-between items-center bg-black/20">
                        {!isSetupCollapsed && <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{t('scenario_tester.setup')}</h3>}
                        <button onClick={() => setIsSetupCollapsed(!isSetupCollapsed)} className="text-stone-500 hover:text-white p-1 rounded hover:bg-white/10">
                             {isSetupCollapsed ? '»' : '«'}
                        </button>
                     </div>
                     
                     {!isSetupCollapsed && (
                         <div className="p-3 space-y-4">
                            <div className="space-y-2">
                                <select onChange={handleLoadScenario} value={selectedScenario ? selectedScenario.nameKey : ''} className="w-full p-2 bg-stone-900 border border-stone-700 rounded text-xs text-white focus:border-indigo-500 outline-none">
                                    <option value="">{t('scenario_tester.select_scenario')}</option>
                                    {predefinedScenarios.map(s => <option key={s.nameKey} value={s.nameKey}>{t(s.nameKey)}</option>)}
                                </select>
                                {selectedScenario && <p className="text-[10px] text-stone-400 bg-black/20 p-2 rounded">{t(`scenario_tester.descriptions.${selectedScenario.nameKey.split('.').pop()}.description`)}</p>}
                            </div>
                            
                            {/* Compact State Controls */}
                            <div className="grid grid-cols-2 gap-2 bg-stone-900 p-2 rounded border border-stone-800">
                                <div><label className="text-[10px] text-stone-500 block">AI Score</label><input type="number" value={aiScore} onChange={e => {setAiScore(parseInt(e.target.value)); setSelectedScenario(null);}} className="w-full bg-black/30 border border-stone-700 rounded p-1 text-white text-xs"/></div>
                                <div><label className="text-[10px] text-stone-500 block">Opp Score</label><input type="number" value={opponentScore} onChange={e => {setOpponentScore(parseInt(e.target.value)); setSelectedScenario(null);}} className="w-full bg-black/30 border border-stone-700 rounded p-1 text-white text-xs"/></div>
                                <div><label className="text-[10px] text-stone-500 block">Mano</label><select value={mano} onChange={e => {setMano(e.target.value as Player); setSelectedScenario(null);}} className="w-full bg-black/30 border border-stone-700 rounded p-1 text-white text-xs"><option value="ai">AI</option><option value="player">Opp</option></select></div>
                                <div><label className="text-[10px] text-stone-500 block">Turn</label><select value={currentTurn} onChange={e => {setCurrentTurn(e.target.value as Player); setSelectedScenario(null);}} className="w-full bg-black/30 border border-stone-700 rounded p-1 text-white text-xs"><option value="ai">AI</option><option value="player">Opp</option></select></div>
                            </div>
                            
                            {/* Hands */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-end"><span className="text-[10px] font-bold text-stone-500 uppercase">AI HAND</span><button onClick={() => handleClearHand('ai')} className="text-[10px] text-red-400 hover:underline">Clear</button></div>
                                <div className="flex gap-1">{aiHand.map((c, i) => <MiniCard key={i} card={c} onClick={() => handleOpenPicker('ai', i)} />)}</div>
                                <div className="flex justify-between items-end mt-2"><span className="text-[10px] font-bold text-stone-500 uppercase">OPP HAND</span><button onClick={() => handleClearHand('opponent')} className="text-[10px] text-red-400 hover:underline">Clear</button></div>
                                <div className="flex gap-1">{opponentHand.map((c, i) => <MiniCard key={i} card={c} onClick={() => handleOpenPicker('opponent', i)} />)}</div>
                            </div>
                            
                            {/* Run Controls */}
                             <div className="pt-4 border-t border-stone-800 space-y-2">
                                <select value={archetype} onChange={e => setArchetype(e.target.value as any)} className="w-full p-1 bg-stone-900 border border-stone-700 rounded text-xs text-white"><option value="Dynamic">Dynamic Archetype</option><option value="All">Test All Archetypes</option><option value="Balanced">Balanced</option><option value="Aggressive">Aggressive</option><option value="Cautious">Cautious</option><option value="Deceptive">Deceptive</option></select>
                                <div className="flex gap-2">
                                    <button onClick={handleRunTest} disabled={isSimulating} className="flex-1 py-2 rounded bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-xs uppercase shadow transition-colors disabled:opacity-50">{t('scenario_tester.run_test')}</button>
                                    <button onClick={() => selectedScenario && regenerateAndApplyHands(selectedScenario)} disabled={!selectedScenario || isSimulating} className="px-2 py-2 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold shadow transition-colors disabled:opacity-50">Reroll</button>
                                </div>
                                {!isSimulating ? (
                                    <button onClick={handleRunSimulations} disabled={!selectedScenario} className="w-full py-2 rounded bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs uppercase shadow transition-colors disabled:opacity-50">{t('scenario_tester.run_simulations', { count: iterations })}</button>
                                ) : (
                                    <div className="space-y-1">
                                        <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden"><div className="bg-purple-500 h-2 rounded-full transition-all duration-100" style={{ width: `${simulationProgress}%` }}></div></div>
                                        <button onClick={() => simulationCancelled.current = true} className="w-full py-1 bg-red-800 hover:bg-red-700 text-white text-[10px] font-bold uppercase rounded">Cancel</button>
                                    </div>
                                )}
                            </div>
                         </div>
                     )}
                </div>

                {/* Right Column: Results */}
                <div className="flex-grow bg-stone-900 p-6 overflow-y-auto custom-scrollbar relative">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none"></div>
                    
                    {testResult ? (
                        <div className="bg-stone-950 border border-stone-800 rounded-xl overflow-hidden shadow-2xl animate-fade-in-scale relative z-10">
                             <div className="p-4 bg-black/40 border-b border-stone-800 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-green-400 uppercase tracking-wider">Analysis Result</h3>
                                <div className="px-2 py-1 bg-stone-800 rounded text-[10px] text-stone-400 font-mono">Single Run</div>
                             </div>
                             <div className="p-6 space-y-6">
                                <div>
                                    <span className="text-xs font-bold text-stone-500 uppercase block mb-2">Recommended Action</span>
                                    <div className="text-2xl font-cinzel text-yellow-400">{getActionDescription(testResult.result.action, testResult.state, t)}</div>
                                </div>
                                <div>
                                     <span className="text-xs font-bold text-stone-500 uppercase block mb-2">Reasoning Engine</span>
                                     <div className="bg-black/30 p-4 rounded-lg border border-stone-800 font-mono text-xs text-cyan-200/80 leading-relaxed whitespace-pre-wrap">
                                         {renderReasoning(testResult.result.reasoning, t)}
                                     </div>
                                </div>
                             </div>
                        </div>
                    ) : multiArchetypeResults ? (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                             {multiArchetypeResults.map(({ archetype, result, stateUsed }) => (
                                 <div key={archetype} className="bg-stone-950 border border-stone-800 rounded-lg p-4 shadow-lg">
                                     <h4 className="text-xs font-bold text-stone-400 uppercase mb-2 border-b border-stone-800 pb-1">{t(`ai_logic.archetypes.${archetype}`)}</h4>
                                     <div className="font-cinzel text-yellow-400 text-sm mb-2">{getActionDescription(result.action, stateUsed, t)}</div>
                                     <pre className="text-[10px] text-stone-500 font-mono whitespace-pre-wrap line-clamp-4 hover:line-clamp-none transition-all">{renderReasoning(result.reasoning, t)}</pre>
                                 </div>
                             ))}
                         </div>
                    ) : simulationResults ? (
                        <div className="relative z-10 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-purple-300 font-cinzel">Simulation Results</h3>
                                <button onClick={() => setSimulationResults(null)} className="text-xs text-red-400 hover:text-red-300 uppercase font-bold">Clear</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(simulationResults).map(([arch, results]) => {
                                    const sorted = Object.entries(results).sort((a, b) => b[1] - a[1]);
                                    const total = sorted.reduce((s, [, c]) => s + c, 0);
                                    if (total === 0) return null;
                                    return (
                                        <div key={arch} className="bg-stone-950 border border-stone-800 rounded-lg p-4 shadow-lg">
                                            <h4 className="text-xs font-bold text-stone-400 uppercase mb-3 border-b border-stone-800 pb-1">{t(`ai_logic.archetypes.${arch}`, { defaultValue: arch })}</h4>
                                            <div className="space-y-2">
                                                {sorted.slice(0, 5).map(([reason, count]) => (
                                                    <div key={reason} className="flex items-center gap-2 text-xs">
                                                        <div className="flex-grow truncate text-stone-300" title={reason}>{t(`ai_reason_keys.${reason}`, { defaultValue: reason })}</div>
                                                        <div className="flex-shrink-0 w-24 bg-stone-900 rounded-full h-1.5 overflow-hidden"><div className="bg-purple-500 h-full rounded-full" style={{ width: `${(count / total) * 100}%` }}></div></div>
                                                        <div className="flex-shrink-0 w-8 text-right font-mono text-stone-500">{((count / total) * 100).toFixed(0)}%</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                         <div className="h-full flex items-center justify-center text-stone-700 flex-col relative z-10">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                             <p>{t('scenario_tester.no_result')}</p>
                         </div>
                    )}
                </div>
            </div>
            {pickerState.open && <CardPickerModal availableCards={availableCards} onSelect={handleCardSelect} onExit={() => setPickerState({ ...pickerState, open: false })} />}
        </div>
    );
};

export default ScenarioTester;
