
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

// Helper to render the AI's reasoning log
const renderReasoning = (reasoningArray: (string | MessageObject)[], t: (key: string, options?: any) => string): string => {
    if (!reasoningArray) return "";
    return reasoningArray.map(reason => {
        if (typeof reason === 'string') return reason;

        const options: { [key: string]: any } = { ...reason.options };

        if (options.statusKey) {
            options.status = t(`ai_logic.statuses.${options.statusKey}`);
        }
        if (options.player) {
            options.player = options.player === 'ai' ? t('common.ai') : t('common.opponent');
        }

        for (const key in options) {
            if (options[key] && typeof options[key] === 'object') {
                if (Array.isArray(options[key])) {
                    options[key] = options[key].map((c: any) => getCardName(c)).join(', ');
                } else if ('rank' in options[key] && 'suit' in options[key]) {
                    options[key] = getCardName(options[key] as Card);
                }
            } else if (key === 'suit' && typeof options[key] === 'string') {
                options[key] = t(`common.card_suits.${options[key]}`);
            }
        }

        return t(reason.key, options);
    }).join('\n');
};

// A helper to describe an action
const getActionDescription = (action: Action, state: Partial<GameState>, t: (key: string, options?: any) => string): string => {
    const player = (action as any)?.payload?.player || state.currentTurn;
    const playerName = player === 'ai' ? t('common.ai') : t('common.opponent');

    switch (action.type) {
        case ActionType.PLAY_CARD:
            const hand = player === 'ai' ? state.aiHand : state.playerHand;
            if (!hand) return t('simulation_actions.play_card_no_hand_data', { playerName });
            const card = hand[(action.payload as any).cardIndex];
            return t('simulation_actions.play_card', { playerName, cardName: card ? getCardName(card) : 'a card' });
        case ActionType.CALL_ENVIDO: return t('simulation_actions.call_envido', { playerName });
        case ActionType.CALL_REAL_ENVIDO: return t('simulation_actions.call_real_envido', { playerName });
        case ActionType.CALL_FALTA_ENVIDO: return t('simulation_actions.call_falta_envido', { playerName });
        case ActionType.DECLARE_FLOR: return t('simulation_actions.declare_flor', { playerName });
        case ActionType.CALL_TRUCO: return t('simulation_actions.call_truco', { playerName });
        case ActionType.CALL_RETRUCO: return t('simulation_actions.call_retruco', { playerName });
        case ActionType.CALL_VALE_CUATRO: return t('simulation_actions.call_vale_cuatro', { playerName });
        case ActionType.ACCEPT: return t('simulation_actions.accept', { playerName });
        case ActionType.DECLINE: return t('simulation_actions.decline', { playerName });
        default: return t('simulation_actions.default', { playerName, actionType: action.type });
    }
}


// Card Picker Modal (internal component)
const CardPickerModal: React.FC<{
    availableCards: Card[];
    onSelect: (card: Card) => void;
    onExit: () => void;
}> = ({ availableCards, onSelect, onExit }) => {
    const { t } = useLocalization();
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
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

const ScenarioDescriptionsModal: React.FC<{ onExit: () => void }> = ({ onExit }) => {
    const { t } = useLocalization();
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-stone-900 border-2 border-indigo-700/50 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-indigo-700/30 flex justify-between items-center bg-stone-950">
                    <h2 className="text-xl font-bold text-indigo-300 font-cinzel">{t('scenario_tester.descriptions.title')}</h2>
                    <button onClick={onExit} className="text-indigo-200 text-2xl font-bold">&times;</button>
                </div>
                <div className="p-6 flex-grow overflow-y-auto space-y-6 text-gray-200">
                    {predefinedScenarios.map(scenario => {
                        const scenarioKey = scenario.nameKey.split('.').pop();
                        if (!scenarioKey) return null;
                        return (
                            <div key={scenario.nameKey}>
                                <h3 className="text-lg font-bold text-yellow-300">{t(`scenario_tester.descriptions.${scenarioKey}.title`)}</h3>
                                <p className="mt-1 text-sm text-gray-300 whitespace-pre-wrap">{t(`scenario_tester.descriptions.${scenarioKey}.description`)}</p>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

type MultiArchetypeResult = { archetype: AiArchetype; result: AiMove };

const ScenarioTester: React.FC = () => {
    const { t } = useLocalization();

    const [isWideLayout, setIsWideLayout] = useState(window.innerWidth / window.innerHeight > 1);

    useEffect(() => {
        const handleResize = () => {
            setIsWideLayout(window.innerWidth / window.innerHeight > 1);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    // Scenario state
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
    
    // UI state
    const [pickerState, setPickerState] = useState<{ open: boolean, hand: 'ai' | 'opponent', index: number }>({ open: false, hand: 'ai', index: 0 });
    const [testResult, setTestResult] = useState<AiMove | null>(null);
    const [multiArchetypeResults, setMultiArchetypeResults] = useState<MultiArchetypeResult[] | null>(null);
    const [selectedScenario, setSelectedScenario] = useState<PredefinedScenario | null>(null);
    const [isDescriptionVisible, setIsDescriptionVisible] = useState(false);
    const [iterations, setIterations] = useState(1000);
    const [expandedResult, setExpandedResult] = useState<string | null>(null);

    // Simulation state
    const [simulationResults, setSimulationResults] = useState<Record<string, Record<string, number>> | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [simulationProgress, setSimulationProgress] = useState(0);
    const simulationCancelled = useRef(false);

    // Automatically calculate Envido points whenever hands change.
    useEffect(() => {
        const finalAiHand = aiHand.filter((c): c is Card => c !== null);
        const finalOpponentHand = opponentHand.filter((c): c is Card => c !== null);

        if (finalAiHand.length === 3) {
            setAiEnvidoValue(getEnvidoValue(finalAiHand));
        }
        if (finalOpponentHand.length === 3) {
            setOpponentEnvidoValue(getEnvidoValue(finalOpponentHand));
        }
    }, [aiHand, opponentHand]);


    const availableCards = useMemo(() => {
        const selected = [...aiHand, ...opponentHand].filter(c => c !== null);
        return FULL_DECK.filter(deckCard => 
            !selected.some(sel => sel && sel.rank === deckCard.rank && sel.suit === deckCard.suit)
        );
    }, [aiHand, opponentHand]);

    const handleOpenPicker = (hand: 'ai' | 'opponent', index: number) => {
        setPickerState({ open: true, hand, index });
        setSelectedScenario(null); // Customizing breaks link to predefined scenario
    };

    const handleCardSelect = (card: Card) => {
        if (pickerState.hand === 'ai') {
            const newHand = [...aiHand];
            newHand[pickerState.index] = card;
            setAiHand(newHand);
        } else {
            const newHand = [...opponentHand];
            newHand[pickerState.index] = card;
            setOpponentHand(newHand);
        }
        setPickerState({ open: false, hand: 'ai', index: 0 });
    };
    
    const handleClearHand = (hand: 'ai' | 'opponent') => {
        const emptyHand = [null, null, null];
        if (hand === 'ai') setAiHand(emptyHand);
        else setOpponentHand(emptyHand);
        setSelectedScenario(null);
    };

    const regenerateAndApplyHands = (scenario: PredefinedScenario) => {
        const hands = scenario.generateHands();
        if (hands) {
            const { aiHand: newAiHand, playerHand: newPlayerHand } = hands;
            setAiHand([...newAiHand, null, null, null].slice(0, 3));
            setOpponentHand([...newPlayerHand, null, null, null].slice(0, 3));
        } else {
            alert('Could not generate hands for this scenario. Please try again.');
        }
    };

    const handleLoadScenario = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const scenarioKey = e.target.value;
        const scenario = predefinedScenarios.find(s => s.nameKey === scenarioKey);
        if (!scenario) {
            setSelectedScenario(null);
            return;
        }

        setSelectedScenario(scenario);
        
        // Set base state from scenario
        const { baseState } = scenario;
        setAiScore(baseState.aiScore || 0);
        setOpponentScore(baseState.playerScore || 0);
        setMano(baseState.mano || 'ai');
        setCurrentTurn(baseState.currentTurn || 'ai');
        setGamePhase(baseState.gamePhase || 'trick_1');
        setTrucoLevel(baseState.trucoLevel || 0);
        setLastCaller(baseState.lastCaller || null);
        
        // FIX: Correctly determine if envido window is closed
        const isRespondingToTruco = (baseState.gamePhase || '').includes('truco_called');
        const envidoWindowClosed = (baseState.trucoLevel || 0) > 0 && !isRespondingToTruco;
        setHasEnvidoBeenCalled(baseState.hasEnvidoBeenCalledThisRound || envidoWindowClosed);

        setAiEnvidoValue(baseState.aiEnvidoValue || 0);
        setOpponentEnvidoValue(baseState.playerEnvidoValue || 0);
        
        // Generate and set hands
        regenerateAndApplyHands(scenario);
        setTestResult(null); // Clear previous results
        setSimulationResults(null);
        setMultiArchetypeResults(null);
    };

    const createScenarioState = (forcedArchetype?: AiArchetype): GameState | null => {
        const finalAiHand = aiHand.filter(c => c !== null) as Card[];
        const finalOpponentHand = opponentHand.filter(c => c !== null) as Card[];
        
        if (finalAiHand.length === 0) {
            alert("AI Hand cannot be empty for a test.");
            return null;
        }

        let calculatedArchetype: AiArchetype;
        if (forcedArchetype) {
            calculatedArchetype = forcedArchetype;
        } else if (archetype === 'Dynamic') {
            calculatedArchetype = selectArchetype(opponentScore, aiScore);
        } else {
            // 'All' is handled by the calling function, this will be one of the concrete types.
            calculatedArchetype = archetype as AiArchetype;
        }

        return {
            ...initialState,
            aiScore,
            playerScore: opponentScore,
            mano,
            currentTurn,
            gamePhase,
            trucoLevel,
            lastCaller,
            aiArchetype: calculatedArchetype,
            aiHand: finalAiHand,
            initialAiHand: finalAiHand,
            playerHand: finalOpponentHand,
            initialPlayerHand: finalOpponentHand,
            aiHasFlor: hasFlor(finalAiHand),
            playerHasFlor: hasFlor(finalOpponentHand),
            aiTricks: selectedScenario?.baseState.aiTricks || initialState.aiTricks,
            playerTricks: selectedScenario?.baseState.playerTricks || initialState.playerTricks,
            trickWinners: selectedScenario?.baseState.trickWinners || initialState.trickWinners,
            currentTrick: selectedScenario?.baseState.currentTrick || 0,
            hasEnvidoBeenCalledThisRound: hasEnvidoBeenCalled,
            aiEnvidoValue: hasEnvidoBeenCalled ? aiEnvidoValue : null,
            playerEnvidoValue: hasEnvidoBeenCalled ? opponentEnvidoValue : null,
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
                const result = getLocalAIMove(scenarioState);
                results.push({ archetype: arch, result });
            }
            setMultiArchetypeResults(results);
        } else {
            setMultiArchetypeResults(null);
            const scenarioState = createScenarioState();
            if (!scenarioState) return;
            
            const aiMove = getLocalAIMove(scenarioState);
            setTestResult(aiMove);
        }
    };

    const handleRunSimulations = () => {
        if (!selectedScenario) {
            alert(t('scenario_tester.run_simulations_no_scenario_error'));
            return;
        }

        setIsSimulating(true);
        setSimulationProgress(0);
        setSimulationResults(null);
        setTestResult(null);
        setMultiArchetypeResults(null);
        simulationCancelled.current = false;

        const archetypesToRun: (AiArchetype | 'Dynamic')[] = archetype === 'All'
            ? ['Balanced', 'Aggressive', 'Cautious', 'Deceptive']
            : [archetype];

        const iterationsPerArchetype = Math.floor(iterations / archetypesToRun.length);
        if (iterationsPerArchetype < 1) {
            alert('Iterations must be at least the number of archetypes being tested.');
            setIsSimulating(false);
            return;
        }
        const totalSims = iterationsPerArchetype * archetypesToRun.length;

        const newResults: Record<string, Record<string, number>> = {};

        const processSims = async () => {
            let archIndex = 0;
            let iterIndex = 0;
            let totalCompleted = 0;

            while (archIndex < archetypesToRun.length && !simulationCancelled.current) {
                const batchStartTime = performance.now();
                const TIME_BUDGET_MS = 40; // Target ~25fps budget
                
                const currentArch = archetypesToRun[archIndex];
                if (!newResults[currentArch]) {
                    newResults[currentArch] = {};
                }
                
                // Pre-calculate the base state for this archetype once per chunk/archetype switch
                // to avoid recreating the entire object graph 1000s of times.
                // Note: 'createScenarioState' uses current UI state variables (aiScore, etc.)
                // We must ensure we pass the specific archetype if it's 'All'.
                const baseStateForArch = createScenarioState(currentArch === 'Dynamic' ? undefined : currentArch as AiArchetype);
                
                if (!baseStateForArch) {
                    console.error("Failed to create base state for simulation");
                    break;
                }

                // Inner loop for time-sliced batch
                while (archIndex < archetypesToRun.length && !simulationCancelled.current) {
                    
                    // Generate hands - this is the random part
                    const hands = selectedScenario.generateHands();
                    if (hands) {
                         const { aiHand: newAiHand, playerHand: newPlayerHand } = hands;
                         
                         // Optimization: Clone and mutate instead of deep spread for speed in tight loop
                         const scenarioState = { ...baseStateForArch };
                         
                         scenarioState.aiHand = newAiHand;
                         scenarioState.initialAiHand = newAiHand;
                         scenarioState.playerHand = newPlayerHand;
                         scenarioState.initialPlayerHand = newPlayerHand;
                         scenarioState.aiHasFlor = hasFlor(newAiHand);
                         scenarioState.playerHasFlor = hasFlor(newPlayerHand);

                         const aiMove = getLocalAIMove(scenarioState);
                         const reason = aiMove.reasonKey || 'unknown_action';
                         newResults[currentArch][reason] = (newResults[currentArch][reason] || 0) + 1;
                    }

                    iterIndex++;
                    totalCompleted++;

                    if (iterIndex >= iterationsPerArchetype) {
                        iterIndex = 0;
                        archIndex++;
                        // Break inner loop to re-init base state for next archetype or finish
                        break;
                    }

                    // Check time budget every 20 iterations to minimize overhead
                    if (iterIndex % 20 === 0) {
                        if (performance.now() - batchStartTime > TIME_BUDGET_MS) {
                            break; // Break inner loop to yield
                        }
                    }
                }

                // Update UI
                setSimulationResults({ ...newResults });
                setSimulationProgress(Math.round((totalCompleted / totalSims) * 100));

                // Yield to main thread
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            
            setIsSimulating(false);
            if (simulationCancelled.current) setSimulationResults(null);
        };

        processSims();
    };

    const handleCancelSimulation = () => {
        simulationCancelled.current = true;
    };

    const finalAiHand = aiHand.filter(c => c !== null) as Card[];
    const finalOpponentHand = opponentHand.filter(c => c !== null) as Card[];
    
    const totalSimsRun = useMemo(() => {
        if (!simulationResults) return 0;
        return Object.values(simulationResults).reduce((total, archResults) => 
            total + Object.values(archResults).reduce((sum, count) => sum + count, 0), 0);
    }, [simulationResults]);
    
    return (
        <div className="w-full h-full flex flex-col animate-fade-in-scale">
            <div className="p-4 bg-stone-900/80 border border-indigo-700/30 rounded-lg shadow-lg flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-indigo-300 font-cinzel tracking-widest">{t('scenario_tester.title')}</h2>
            </div>
            <div className={`flex-grow gap-6 overflow-hidden ${isWideLayout ? 'grid grid-cols-[1fr_2fr]' : 'flex flex-col'}`}>
                
                {/* Setup Panel */}
                <div className="space-y-4 flex flex-col overflow-y-auto custom-scrollbar pr-2">
                     <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">{t('scenario_tester.setup')}</h3>
                         <button 
                            onClick={() => setIsDescriptionVisible(true)}
                            className="px-2 py-1 text-[10px] uppercase font-bold text-indigo-300 border border-indigo-500/50 rounded hover:bg-indigo-900/30 transition-colors"
                        >
                            {t('scenario_tester.describe_button')}
                        </button>
                    </div>
                    
                    <select onChange={handleLoadScenario} value={selectedScenario ? selectedScenario.nameKey : ''} className="w-full p-3 bg-black/30 border border-stone-600 rounded-lg text-white text-sm focus:border-indigo-500 outline-none">
                        <option value="">{t('scenario_tester.select_scenario')}</option>
                        {predefinedScenarios.map(s => <option key={s.nameKey} value={s.nameKey}>{t(s.nameKey)}</option>)}
                    </select>

                    {selectedScenario && (
                        <div className="p-3 bg-indigo-900/20 border border-indigo-500/30 rounded-lg text-xs">
                            <p className="text-indigo-200 leading-relaxed">
                                {t(`scenario_tester.descriptions.${selectedScenario.nameKey.split('.').pop()}.description`)}
                            </p>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 bg-stone-900/50 p-4 rounded-lg border border-white/5">
                         <div className="space-y-3">
                            <div><label className="block text-xs text-stone-500 uppercase font-bold mb-1">{t('scenario_tester.ai_score')}</label><input type="number" value={aiScore} onChange={e => {setAiScore(parseInt(e.target.value)); setSelectedScenario(null);}} className="w-full p-2 bg-black/40 border border-stone-600 rounded text-white text-sm"/></div>
                            <div><label className="block text-xs text-stone-500 uppercase font-bold mb-1">{t('scenario_tester.mano')}</label><select value={mano} onChange={e => {setMano(e.target.value as Player); setSelectedScenario(null);}} className="w-full p-2 bg-black/40 border border-stone-600 rounded text-white text-sm"><option value="ai">{t('common.ai')}</option><option value="player">{t('common.opponent')}</option></select></div>
                            <div><label className="block text-xs text-stone-500 uppercase font-bold mb-1">{t('scenario_tester.phase')}</label><select value={gamePhase} onChange={e => {setGamePhase(e.target.value as GamePhase); setSelectedScenario(null);}} className="w-full p-2 bg-black/40 border border-stone-600 rounded text-white text-sm">
                                    <option value="trick_1">{t('scenario_tester.phases.trick_1')}</option>
                                    <option value="trick_2">{t('scenario_tester.phases.trick_2')}</option>
                                    <option value="trick_3">{t('scenario_tester.phases.trick_3')}</option>
                                    <option value="envido_called">{t('scenario_tester.phases.envido_called')}</option>
                                    <option value="truco_called">{t('scenario_tester.phases.truco_called')}</option>
                                    <option value="retruco_called">{t('scenario_tester.phases.retruco_called')}</option>
                                    <option value="flor_called">{t('scenario_tester.phases.flor_called')}</option>
                                </select>
                            </div>
                        </div>
                         <div className="space-y-3">
                            <div><label className="block text-xs text-stone-500 uppercase font-bold mb-1">{t('scenario_tester.opponent_score')}</label><input type="number" value={opponentScore} onChange={e => {setOpponentScore(parseInt(e.target.value)); setSelectedScenario(null);}} className="w-full p-2 bg-black/40 border border-stone-600 rounded text-white text-sm"/></div>
                            <div><label className="block text-xs text-stone-500 uppercase font-bold mb-1">{t('scenario_tester.turn')}</label><select value={currentTurn} onChange={e => {setCurrentTurn(e.target.value as Player); setSelectedScenario(null);}} className="w-full p-2 bg-black/40 border border-stone-600 rounded text-white text-sm"><option value="ai">{t('common.ai')}</option><option value="player">{t('common.opponent')}</option></select></div>
                             <div><label className="block text-xs text-stone-500 uppercase font-bold mb-1">{t('scenario_tester.truco_level')}</label><select value={trucoLevel} onChange={e => {setTrucoLevel(parseInt(e.target.value) as 0|1|2|3); setSelectedScenario(null);}} className="w-full p-2 bg-black/40 border border-stone-600 rounded text-white text-sm">
                                    <option value={0}>0 (None)</option>
                                    <option value={1}>1 (Truco)</option>
                                    <option value={2}>2 (Retruco)</option>
                                    <option value={3}>3 (Vale Cuatro)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-3 bg-stone-900/50 p-4 rounded-lg border border-white/5">
                        <div>
                            <label className="block text-xs text-stone-500 uppercase font-bold mb-1">{t('scenario_tester.archetype_label')}</label>
                            <select value={archetype} onChange={e => setArchetype(e.target.value as AiArchetype | 'Dynamic' | 'All')} className="w-full p-2 bg-black/40 border border-stone-600 rounded text-white text-sm focus:border-indigo-500">
                                <option value="Dynamic">{t('scenario_tester.archetype_dynamic')}</option>
                                <option value="All">{t('scenario_tester.archetype_all')}</option>
                                <option value="Balanced">{t('ai_logic.archetypes.Balanced')}</option>
                                <option value="Aggressive">{t('ai_logic.archetypes.Aggressive')}</option>
                                <option value="Cautious">{t('ai_logic.archetypes.Cautious')}</option>
                                <option value="Deceptive">{t('ai_logic.archetypes.Deceptive')}</option>
                            </select>
                        </div>
                         <div className="flex items-center gap-2">
                            <input type="checkbox" id="envido-called" checked={hasEnvidoBeenCalled} onChange={e => {setHasEnvidoBeenCalled(e.target.checked); setSelectedScenario(null);}} className="rounded bg-stone-700 border-stone-600 text-indigo-500 focus:ring-indigo-500/50"/>
                            <label htmlFor="envido-called" className="text-sm text-stone-300">{t('scenario_tester.envido_called')}</label>
                          </div>
                          {hasEnvidoBeenCalled && (
                            <div className="grid grid-cols-2 gap-2 animate-fade-in-scale">
                              <input type="number" value={aiEnvidoValue} onChange={e => {setAiEnvidoValue(parseInt(e.target.value)); setSelectedScenario(null);}} className="w-full p-2 bg-black/40 border border-stone-600 rounded text-white text-sm" placeholder="AI Envido"/>
                              <input type="number" value={opponentEnvidoValue} onChange={e => {setOpponentEnvidoValue(parseInt(e.target.value)); setSelectedScenario(null);}} className="w-full p-2 bg-black/40 border border-stone-600 rounded text-white text-sm" placeholder="Opp Envido"/>
                            </div>
                          )}
                    </div>
                    
                    <div className="space-y-4">
                         <div className="bg-stone-900/50 p-3 rounded-lg border border-white/5 relative">
                            <button onClick={() => handleClearHand('ai')} className="absolute top-2 right-2 text-[10px] text-red-400 hover:text-red-300 uppercase font-bold">Clear</button>
                            <h4 className="text-xs font-bold text-stone-500 uppercase mb-2">{t('scenario_tester.ai_hand')}</h4>
                            <div className="flex justify-center space-x-[-53px] min-h-[124px] items-center">
                              {aiHand.map((c, i) => <button key={i} onClick={() => handleOpenPicker('ai', i)} className="transition-transform duration-200 ease-out hover:-translate-y-4 hover:z-20"><CardComponent card={c || undefined} size="small" /></button>)}
                            </div>
                        </div>
                        <div className="bg-stone-900/50 p-3 rounded-lg border border-white/5 relative">
                             <button onClick={() => handleClearHand('opponent')} className="absolute top-2 right-2 text-[10px] text-red-400 hover:text-red-300 uppercase font-bold">Clear</button>
                            <h4 className="text-xs font-bold text-stone-500 uppercase mb-2">{t('scenario_tester.opponent_hand')}</h4>
                            <div className="flex justify-center space-x-[-53px] min-h-[124px] items-center">
                              {opponentHand.map((c, i) => <button key={i} onClick={() => handleOpenPicker('opponent', i)} className="transition-transform duration-200 ease-out hover:-translate-y-4 hover:z-20"><CardComponent card={c || undefined} size="small" /></button>)}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                     <div className="grid grid-cols-1 gap-3 pt-2">
                        <div className="flex gap-2">
                             <button onClick={handleRunTest} disabled={isSimulating} className="flex-1 px-4 py-3 rounded-lg font-bold text-white bg-gradient-to-b from-green-600 to-green-700 border-b-4 border-green-900 hover:from-green-500 hover:to-green-600 transition-all shadow-lg disabled:opacity-50">{t('scenario_tester.run_test')}</button>
                             <button onClick={() => selectedScenario && regenerateAndApplyHands(selectedScenario)} disabled={!selectedScenario || isSimulating} className="flex-1 px-4 py-3 rounded-lg font-bold text-white bg-stone-700 border-b-4 border-stone-900 hover:bg-stone-600 transition-all shadow-lg disabled:opacity-50 text-sm">{t('scenario_tester.regenerate_hands')}</button>
                        </div>
                        
                        <div className="pt-4 border-t border-white/10">
                             <div className="flex items-center gap-2 mb-2">
                                <label className="text-xs font-bold text-stone-500 uppercase">{t('scenario_runner.iterations_label')}</label>
                                <input type="number" value={iterations} onChange={e => setIterations(Math.max(1, parseInt(e.target.value) || 1000))} disabled={isSimulating} className="w-20 p-1 bg-black/40 border border-stone-600 rounded text-white text-xs"/>
                             </div>
                            {!isSimulating ? (
                                <button onClick={handleRunSimulations} disabled={!selectedScenario} className="w-full px-4 py-3 rounded-lg font-bold text-white bg-gradient-to-b from-purple-600 to-purple-700 border-b-4 border-purple-900 hover:from-purple-500 hover:to-purple-600 disabled:opacity-50 transition-all shadow-lg">{t('scenario_tester.run_simulations', { count: iterations })}</button>
                            ) : (
                                <div className="w-full flex flex-col gap-2">
                                    <div className="w-full bg-stone-800 rounded-full h-4 relative overflow-hidden border border-stone-600">
                                        <div className="bg-purple-500 h-4 rounded-full" style={{ width: `${simulationProgress}%`, transition: 'width 0.1s' }}></div>
                                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">{t('scenario_tester.simulating', { progress: simulationProgress })}</span>
                                    </div>
                                    <button onClick={handleCancelSimulation} className="w-full px-4 py-2 rounded-lg font-bold text-white bg-red-700 border-b-4 border-red-900 hover:bg-red-600 transition-colors shadow-lg text-xs uppercase tracking-wider">{t('scenario_tester.cancel')}</button>
                                </div>
                            )}
                        </div>
                     </div>
                </div>

                {/* Result Panel */}
                <div className="bg-stone-900/40 p-6 rounded-xl border border-indigo-500/30 flex flex-col overflow-hidden relative shadow-inner">
                     <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
                     <div className="relative z-10 flex flex-col h-full">
                        <h3 className="text-lg font-bold text-indigo-300 mb-4 flex items-center gap-2">
                            <span className="text-2xl">📊</span> {t('scenario_tester.result')}
                        </h3>
                        
                        <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
                            {testResult ? (
                                <div className="space-y-4 animate-fade-in-scale">
                                    <div className="bg-black/40 p-4 rounded-lg border border-yellow-500/30">
                                        <h4 className="text-xs font-bold text-stone-500 uppercase mb-2">{t('scenario_tester.chosen_action')}</h4>
                                        <p className="font-cinzel text-xl text-yellow-400">{getActionDescription(testResult.action, { currentTurn, aiHand: finalAiHand, playerHand: finalOpponentHand }, t)}</p>
                                    </div>
                                    <div className="bg-black/40 p-4 rounded-lg border border-cyan-500/30">
                                        <h4 className="text-xs font-bold text-stone-500 uppercase mb-2">{t('scenario_tester.reasoning')}</h4>
                                        <pre className="whitespace-pre-wrap font-mono text-sm text-cyan-200 leading-relaxed">{renderReasoning(testResult.reasoning, t)}</pre>
                                    </div>
                                </div>
                            ) : multiArchetypeResults ? (
                                <div className="space-y-3 animate-fade-in-scale">
                                    {multiArchetypeResults.map(({ archetype, result }) => (
                                        <details key={archetype} className="bg-black/30 rounded-lg border border-white/5 group">
                                            <summary className="cursor-pointer p-3 flex justify-between items-center select-none hover:bg-white/5 transition-colors rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-stone-400 text-sm font-bold uppercase">{t(`ai_logic.archetypes.${archetype}`)}</span>
                                                </div>
                                                <span className="font-cinzel text-yellow-300 text-sm">{getActionDescription(result.action, { currentTurn, aiHand: finalAiHand, playerHand: finalOpponentHand }, t)}</span>
                                            </summary>
                                            <div className="p-3 border-t border-white/10 bg-black/20">
                                                <pre className="whitespace-pre-wrap font-mono text-xs text-cyan-200/80">{renderReasoning(result.reasoning, t)}</pre>
                                            </div>
                                        </details>
                                    ))}
                                </div>
                            ) : simulationResults ? (
                                <div className="space-y-4 animate-fade-in-scale">
                                    <div className="flex justify-between items-center pb-2 border-b border-white/10">
                                        <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider">{t('scenario_tester.simulation_results', { count: totalSimsRun })}</h3>
                                        <button onClick={() => setSimulationResults(null)} className="text-[10px] uppercase font-bold text-red-400 hover:text-red-300 transition-colors">{t('scenario_tester.clear_results')}</button>
                                    </div>
                                    {Object.entries(simulationResults).map(([arch, results]) => {
                                        const sorted = Object.entries(results).sort((a, b) => b[1] - a[1]);
                                        const totalForArch = sorted.reduce((sum, [, count]) => sum + count, 0);
                                        if (totalForArch === 0) return null;

                                        return (
                                            <div key={arch} className="bg-black/30 p-3 rounded-lg border border-white/5">
                                                <h4 className="font-bold text-stone-300 text-xs uppercase mb-2 border-b border-white/5 pb-1">{t(`ai_logic.archetypes.${arch}`, { defaultValue: arch })}</h4>
                                                <div className="space-y-1">
                                                    {sorted.map(([reason, count]) => {
                                                        const percentage = totalForArch > 0 ? (count / totalForArch) * 100 : 0;
                                                        const reasonText = t(`ai_reason_keys.${reason}`, { defaultValue: reason });
                                                        const isExpanded = expandedResult === `${arch}-${reason}`;
                                                        return (
                                                            <div key={reason}>
                                                                <button 
                                                                    onClick={() => setExpandedResult(isExpanded ? null : `${arch}-${reason}`)}
                                                                    className="w-full grid grid-cols-[1fr_auto] lg:grid-cols-[1fr_50px_auto] items-center gap-3 text-xs p-2 rounded hover:bg-indigo-900/30 transition-colors text-left"
                                                                    aria-expanded={isExpanded}
                                                                >
                                                                    <span className="truncate text-gray-300" title={reasonText}>{reasonText}</span>
                                                                    <div className="w-full bg-stone-800 rounded-full h-1.5 hidden lg:block">
                                                                        <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${percentage}%` }} />
                                                                    </div>
                                                                    <span className="font-mono text-white text-right w-12">{percentage.toFixed(1)}%</span>
                                                                </button>
                                                                {isExpanded && (
                                                                    <div className="p-2 mt-1 ml-2 pl-3 border-l-2 border-indigo-500/50 text-xs text-stone-400 italic bg-black/20 rounded-r">
                                                                        {t(`scenario_tester.explanations.${reason}`, { defaultValue: "No explanation available." })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-stone-600 opacity-50">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                    <p>{t('scenario_tester.no_result')}</p>
                                </div>
                            )}
                        </div>
                     </div>
                </div>
            </div>

            {pickerState.open && <CardPickerModal availableCards={availableCards} onSelect={handleCardSelect} onExit={() => setPickerState({ ...pickerState, open: false })} />}
            {isDescriptionVisible && <ScenarioDescriptionsModal onExit={() => setIsDescriptionVisible(false)} />}
        </div>
    );
};

export default ScenarioTester;
