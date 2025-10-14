import React, { useState, useMemo } from 'react';
import { Card, GameState, AiMove, Player, GamePhase, MessageObject, Action, ActionType } from '../types';
import { createDeck, getCardName, decodeCardFromCode } from '../services/trucoLogic';
import { initialState } from '../hooks/useGameReducer';
import { getLocalAIMove } from '../services/localAiService';
import { predefinedScenarios, PredefinedScenario } from '../services/scenarioService';
import CardComponent from './Card';
import { useLocalization } from '../context/LocalizationContext';

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
            options.player = options.player === 'ai' ? t('common.ai') : t('common.player');
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

// Fix: Added getActionDescription function to resolve "Cannot find name" error.
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-stone-800/95 border-4 border-amber-700/50 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="p-4 border-b-2 border-amber-700/30 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-amber-300">{t('card_picker.title')}</h3>
                    <button onClick={onExit} className="text-amber-200 text-2xl font-bold">&times;</button>
                </div>
                <div className="p-4 flex-grow overflow-y-auto">
                    <div className="flex flex-wrap gap-2 justify-center">
                        {availableCards.map(card => (
                            <button key={`${card.rank}-${card.suit}`} onClick={() => onSelect(card)} className="transform transition-transform hover:scale-110">
                                <CardComponent card={card} size="small" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ScenarioTester: React.FC<{ onExit: () => void }> = ({ onExit }) => {
    const { t } = useLocalization();
    
    // Scenario state
    const [aiHand, setAiHand] = useState<(Card | null)[]>([null, null, null]);
    const [opponentHand, setOpponentHand] = useState<(Card | null)[]>([null, null, null]);
    const [aiScore, setAiScore] = useState(0);
    const [opponentScore, setOpponentScore] = useState(0);
    const [mano, setMano] = useState<Player>('ai');
    const [currentTurn, setCurrentTurn] = useState<Player>('ai');
    const [gamePhase, setGamePhase] = useState<GamePhase>('trick_1');
    
    // UI state
    const [pickerState, setPickerState] = useState<{ open: boolean, hand: 'ai' | 'opponent', index: number }>({ open: false, hand: 'ai', index: 0 });
    const [testResult, setTestResult] = useState<AiMove | null>(null);
    const [selectedScenario, setSelectedScenario] = useState<PredefinedScenario | null>(null);

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
        const scenarioName = e.target.value;
        const scenario = predefinedScenarios.find(s => t(s.nameKey) === scenarioName);
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
        
        // Generate and set hands
        regenerateAndApplyHands(scenario);
        setTestResult(null); // Clear previous results
    };
    
    const handleRunTest = () => {
        const finalAiHand = aiHand.filter(c => c !== null) as Card[];
        const finalOpponentHand = opponentHand.filter(c => c !== null) as Card[];
        
        if (finalAiHand.length === 0) {
            alert("AI Hand cannot be empty for a test.");
            return;
        }

        const scenarioState: GameState = {
            ...initialState,
            aiScore,
            playerScore: opponentScore,
            mano,
            currentTurn,
            gamePhase,
            aiHand: finalAiHand,
            initialAiHand: finalAiHand,
            playerHand: finalOpponentHand,
            initialPlayerHand: finalOpponentHand,
            aiTricks: selectedScenario?.baseState.aiTricks || initialState.aiTricks,
            playerTricks: selectedScenario?.baseState.playerTricks || initialState.playerTricks,
            trickWinners: selectedScenario?.baseState.trickWinners || initialState.trickWinners,
            currentTrick: selectedScenario?.baseState.currentTrick || 0,
            lastCaller: gamePhase.includes('_called') ? (currentTurn === 'ai' ? 'player' : 'ai') : null,
            trucoLevel: gamePhase.includes('retruco') ? 2 : gamePhase.includes('truco') ? 1 : 0,
        };
        
        const aiMove = getLocalAIMove(scenarioState);
        setTestResult(aiMove);
    };

    // Fix: Pass hand data to getActionDescription to prevent errors.
    const finalAiHand = aiHand.filter(c => c !== null) as Card[];
    const finalOpponentHand = opponentHand.filter(c => c !== null) as Card[];
    const actionDesc = testResult ? getActionDescription(testResult.action, { currentTurn, aiHand: finalAiHand, playerHand: finalOpponentHand }, t) : "";
    const reasoningDesc = testResult ? renderReasoning(testResult.reasoning, t) : "";

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-stone-800/95 border-4 border-indigo-700/50 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b-2 border-indigo-700/30 flex justify-between items-center">
                    <h2 className="text-xl lg:text-2xl font-bold text-indigo-300 font-cinzel tracking-widest">{t('scenario_tester.title')}</h2>
                    <button onClick={onExit} className="text-indigo-200 text-2xl lg:text-3xl font-bold">&times;</button>
                </div>
                <div className="flex-grow p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto">
                    {/* Setup Panel */}
                    <div className="space-y-4 lg:col-span-1 flex flex-col">
                        <h3 className="text-lg font-bold text-indigo-200">{t('scenario_tester.setup')}</h3>
                        <select onChange={handleLoadScenario} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-white">
                            <option>{t('scenario_tester.select_scenario')}</option>
                            {predefinedScenarios.map(s => <option key={s.nameKey}>{t(s.nameKey)}</option>)}
                        </select>
                        <p className="text-center text-gray-400 text-sm">{t('scenario_tester.or_create_custom')}</p>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-gray-300">{t('scenario_tester.ai_score')}</label><input type="number" value={aiScore} onChange={e => {setAiScore(parseInt(e.target.value)); setSelectedScenario(null);}} className="w-full p-1 bg-gray-800 border border-gray-600 rounded-md"/></div>
                            <div><label className="block text-sm font-medium text-gray-300">{t('scenario_tester.opponent_score')}</label><input type="number" value={opponentScore} onChange={e => {setOpponentScore(parseInt(e.target.value)); setSelectedScenario(null);}} className="w-full p-1 bg-gray-800 border border-gray-600 rounded-md"/></div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div><label className="block text-sm font-medium text-gray-300">{t('scenario_tester.mano')}</label><select value={mano} onChange={e => {setMano(e.target.value as Player); setSelectedScenario(null);}} className="w-full p-1 bg-gray-800 border border-gray-600 rounded-md"><option value="ai">{t('common.ai')}</option><option value="player">{t('common.opponent')}</option></select></div>
                            <div><label className="block text-sm font-medium text-gray-300">{t('scenario_tester.turn')}</label><select value={currentTurn} onChange={e => {setCurrentTurn(e.target.value as Player); setSelectedScenario(null);}} className="w-full p-1 bg-gray-800 border border-gray-600 rounded-md"><option value="ai">{t('common.ai')}</option><option value="player">{t('common.opponent')}</option></select></div>
                            <div><label className="block text-sm font-medium text-gray-300">{t('scenario_tester.phase')}</label><select value={gamePhase} onChange={e => {setGamePhase(e.target.value as GamePhase); setSelectedScenario(null);}} className="w-full p-1 bg-gray-800 border border-gray-600 rounded-md">
                                <option value="trick_1">{t('scenario_tester.phases.trick_1')}</option>
                                <option value="trick_2">{t('scenario_tester.phases.trick_2')}</option>
                                <option value="envido_called">{t('scenario_tester.phases.envido_called')}</option>
                                <option value="truco_called">{t('scenario_tester.phases.truco_called')}</option>
                                <option value="retruco_called">{t('scenario_tester.phases.retruco_called')}</option>
                                <option value="flor_called">{t('scenario_tester.phases.flor_called')}</option>
                            </select></div>
                        </div>
                        
                         <div className="flex items-center gap-4 mt-2">
                            <button onClick={handleRunTest} className="w-full px-4 py-2 rounded-lg font-bold text-white bg-green-600 border-b-4 border-green-800 hover:bg-green-500 transition-colors">{t('scenario_tester.run_test')}</button>
                            <div className="relative group w-full">
                                <button onClick={() => selectedScenario && regenerateAndApplyHands(selectedScenario)} disabled={!selectedScenario} className="w-full px-4 py-2 rounded-lg font-bold text-white bg-blue-600 border-b-4 border-blue-800 hover:bg-blue-500 disabled:bg-gray-500 disabled:border-gray-700 transition-colors">{t('scenario_tester.regenerate_hands')}</button>
                                {!selectedScenario && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 w-max max-w-xs bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                        {t('scenario_tester.regenerate_hands_tooltip')}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-row gap-6 items-start justify-around mt-4">
                            <div className="w-1/2">
                                <div className="flex justify-between items-center mb-1"><label className="font-semibold">{t('scenario_tester.ai_hand')}</label><button onClick={() => handleClearHand('ai')} className="text-xs text-red-400">{t('scenario_tester.clear')}</button></div>
                                <div className="flex justify-center -space-x-7 min-h-[124px] items-center">
                                  {aiHand.map((c, i) => <button key={i} onClick={() => handleOpenPicker('ai', i)} className="transition-transform duration-200 ease-out hover:-translate-y-4 hover:z-20"><CardComponent card={c || undefined} size="small" /></button>)}
                                </div>
                            </div>
                            <div className="w-1/2">
                                <div className="flex justify-between items-center mb-1"><label className="font-semibold">{t('scenario_tester.opponent_hand')}</label><button onClick={() => handleClearHand('opponent')} className="text-xs text-red-400">{t('scenario_tester.clear')}</button></div>
                                <div className="flex justify-center -space-x-7 min-h-[124px] items-center">
                                  {opponentHand.map((c, i) => <button key={i} onClick={() => handleOpenPicker('opponent', i)} className="transition-transform duration-200 ease-out hover:-translate-y-4 hover:z-20"><CardComponent card={c || undefined} size="small" /></button>)}
                                </div>
                            </div>
                        </div>
                        {/* On small screens, the result panel is below */}
                         <div className="block lg:hidden mt-4">
                            <div className="bg-black/40 p-4 rounded-lg border border-indigo-500/50 flex flex-col min-h-[300px]">
                                <h3 className="text-lg font-bold text-indigo-200 mb-2">{t('scenario_tester.result')}</h3>
                                {testResult ? (
                                    <div className="flex-grow flex flex-col gap-4 overflow-hidden">
                                        <div>
                                            <h4 className="font-semibold text-gray-300">{t('scenario_tester.chosen_action')}</h4>
                                            <p className="p-2 bg-black/50 rounded-md font-mono text-lg text-yellow-300">{actionDesc}</p>
                                        </div>
                                        <div className="flex-grow flex flex-col overflow-hidden">
                                            <h4 className="font-semibold text-gray-300">{t('scenario_tester.reasoning')}</h4>
                                            <pre className="p-2 bg-black/50 rounded-md text-xs text-cyan-200 whitespace-pre-wrap font-mono flex-grow overflow-y-auto">{reasoningDesc}</pre>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400">{t('scenario_tester.no_result')}</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Result Panel (only on large screens) */}
                    <div className="bg-black/40 p-4 rounded-lg border border-indigo-500/50 flex-col lg:col-span-2 hidden lg:flex">
                        <h3 className="text-lg font-bold text-indigo-200 mb-2">{t('scenario_tester.result')}</h3>
                        {testResult ? (
                            <div className="flex-grow flex flex-col gap-4 overflow-hidden">
                                <div>
                                    <h4 className="font-semibold text-gray-300">{t('scenario_tester.chosen_action')}</h4>
                                    <p className="p-2 bg-black/50 rounded-md font-mono text-lg text-yellow-300">{actionDesc}</p>
                                </div>
                                <div className="flex-grow flex flex-col overflow-hidden">
                                    <h4 className="font-semibold text-gray-300">{t('scenario_tester.reasoning')}</h4>
                                    <pre className="p-2 bg-black/50 rounded-md text-xs text-cyan-200 whitespace-pre-wrap font-mono flex-grow overflow-y-auto">{reasoningDesc}</pre>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">{t('scenario_tester.no_result')}</div>
                        )}
                    </div>
                </div>

                {pickerState.open && <CardPickerModal availableCards={availableCards} onSelect={handleCardSelect} onExit={() => setPickerState({ ...pickerState, open: false })} />}
            </div>
        </div>
    );
};

export default ScenarioTester;