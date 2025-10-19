
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, GameState, AiMove, Player, GamePhase, MessageObject, Action, ActionType } from '../types';
import { hasFlor } from '../services/trucoLogic';
import { initialState } from '../hooks/useGameReducer';
import { getLocalAIMove } from '../services/localAiService';
import { predefinedScenarios, PredefinedScenario } from '../services/scenarioService';
import { useLocalization } from '../context/LocalizationContext';

// Helper types for this component
interface ScenarioResult {
    nameKey: string;
    results: Record<string, number>;
    totalRuns: number;
}
interface ExpectedScenarioResult {
    scenario: string;
    totalRuns: number;
    actionDistribution: Record<string, number>;
}
type ValidationStatus = 'ok' | 'warn' | 'fail' | 'pending';


// --- DEFAULT BASELINE ---

const defaultExpectedResultsData = {
  "scenarios": [
    { "scenario": "scenario_tester.scenario_names.parda_y_gano", "totalRuns": 10000, "actionDistribution": { "call_truco_value": 4073, "call_truco_parda_y_gano": 2223, "secure_hand": 3580, "call_truco_post_parda_bluff": 97, "call_truco_bluff": 27 } },
    { "scenario": "scenario_tester.scenario_names.do_or_die", "totalRuns": 1000, "actionDistribution": { "call_falta_win_game": 161, "accept_truco_do_or_die": 502, "call_envido_bluff": 131, "call_falta_defensive": 101, "call_real_dominant": 55, "call_envido_strong": 32, "call_envido_marginal": 18 } },
    { "scenario": "scenario_tester.scenario_names.lopsided_bait", "totalRuns": 1000, "actionDistribution": { "probe_low_value": 685, "bait_lopsided_hand": 172, "call_real_dominant": 143 } },
    { "scenario": "scenario_tester.scenario_names.envido_primero", "totalRuns": 1000, "actionDistribution": { "call_falta_win_game": 769, "call_real_dominant": 231 } },
    { "scenario": "scenario_tester.scenario_names.flor_vs_envido", "totalRuns": 1000, "actionDistribution": { "respond_with_flor": 1000 } },
    { "scenario": "scenario_tester.scenario_names.endgame_pressure_truco", "totalRuns": 1000, "actionDistribution": { "secure_hand": 498, "call_envido_strong": 105, "call_envido_bluff": 89, "call_real_dominant": 18, "call_falta_defensive": 59, "call_falta_win_game": 61, "call_truco_bluff": 81, "probe_mid_value": 52, "call_envido_marginal": 37 } },
    { "scenario": "scenario_tester.scenario_names.dual_brava_probe", "totalRuns": 1000, "actionDistribution": { "feint_pre_truco": 502, "call_envido_strong": 361, "call_truco_value": 108, "call_envido_marginal": 29 } },
    { "scenario": "scenario_tester.scenario_names.ancho_feint_chain", "totalRuns": 1000, "actionDistribution": { "probe_mid_value": 896, "call_truco_value": 103, "secure_hand": 1 } },
    { "scenario": "scenario_tester.scenario_names.false_ace_bait", "totalRuns": 1000, "actionDistribution": { "secure_hand": 933, "probe_low_value": 67 } },
    { "scenario": "scenario_tester.scenario_names.tie_breaker_low", "totalRuns": 1000, "actionDistribution": { "secure_hand": 307, "call_truco_parda_y_gano": 241, "call_truco_value": 440, "call_truco_post_parda_bluff": 11, "call_truco_bluff": 1 } },
    { "scenario": "scenario_tester.scenario_names.signal_masked_depletion", "totalRuns": 1000, "actionDistribution": { "feint_pre_truco": 845, "call_truco_value": 155 } },
    { "scenario": "scenario_tester.scenario_names.post_envido_low_shift", "totalRuns": 1000, "actionDistribution": { "probe_low_value": 900, "call_truco_value": 100 } },
    { "scenario": "scenario_tester.scenario_names.triple_brava_figure_probe", "totalRuns": 1000, "actionDistribution": { "feint_pre_truco": 846, "call_truco_value": 154 } },
    { "scenario": "scenario_tester.scenario_names.post_tie_retruco_response", "totalRuns": 1000, "actionDistribution": { "secure_hand": 1000 } },
    { "scenario": "scenario_tester.scenario_names.false_7_deplete", "totalRuns": 1000, "actionDistribution": { "accept_truco_decent_equity": 659, "escalate_truco_mixed_bluff": 30, "decline_truco_low_equity": 284, "decline_truco_mixed": 27 } },
    { "scenario": "scenario_tester.scenario_names.envido_suit_misdirect", "totalRuns": 1000, "actionDistribution": { "secure_hand": 890, "probe_mid_value": 99, "call_truco_value": 10, "call_truco_bluff": 1 } },
    { "scenario": "scenario_tester.scenario_names.brava_kiss_signal", "totalRuns": 1000, "actionDistribution": { "call_truco_value": 853, "probe_low_value": 68, "call_envido_marginal": 79 } },
    { "scenario": "scenario_tester.scenario_names.mid_game_figure_low", "totalRuns": 1000, "actionDistribution": { "call_truco_won_trick1": 553, "secure_hand": 447 } },
    { "scenario": "scenario_tester.scenario_names.late_false_ace_chain", "totalRuns": 1000, "actionDistribution": { "feint_pre_truco": 859, "call_truco_value": 141 } },
    { "scenario": "scenario_tester.scenario_names.parda_false_7", "totalRuns": 1000, "actionDistribution": { "secure_hand": 736, "call_truco_post_parda_bluff": 58, "call_truco_value": 129, "call_truco_bluff": 47, "call_truco_parda_y_gano": 30 } },
    { "scenario": "scenario_tester.scenario_names.tie_ancho_glimpse", "totalRuns": 1000, "actionDistribution": { "secure_hand": 239, "call_truco_value": 761 } },
    { "scenario": "scenario_tester.scenario_names.banter_low_glimpse", "totalRuns": 1000, "actionDistribution": { "secure_hand": 920, "probe_envido_hide": 80 } },
    { "scenario": "scenario_tester.scenario_names.ancho_deplete_post_tie", "totalRuns": 1000, "actionDistribution": { "play_last_card": 602, "call_truco_certain_win": 239, "call_truco_value": 159 } },
    { "scenario": "scenario_tester.scenario_names.dual_false_bait", "totalRuns": 1000, "actionDistribution": { "probe_low_value": 910, "call_truco_value": 85, "secure_hand": 5 } },
    { "scenario": "scenario_tester.scenario_names.mid_low_signal_mask", "totalRuns": 1000, "actionDistribution": { "call_envido_strong": 411, "secure_hand": 304, "probe_mid_value": 141, "call_envido_bluff": 77, "call_real_dominant": 55, "call_truco_value": 10, "call_truco_bluff": 2 } },
    { "scenario": "scenario_tester.scenario_names.figure_ancho_shift", "totalRuns": 1000, "actionDistribution": { "call_truco_won_trick1": 776, "secure_hand": 224 } },
    { "scenario": "scenario_tester.scenario_names.endgame_low_balance", "totalRuns": 1000, "actionDistribution": { "probe_mid_value": 373, "call_envido_strong": 252, "call_envido_bluff": 143, "call_truco_bluff": 89, "secure_hand": 76, "call_falta_win_game": 49, "call_truco_value": 9, "call_real_dominant": 9 } },
    { "scenario": "scenario_tester.scenario_names.retruco_response_with_ace", "totalRuns": 1000, "actionDistribution": { "accept_truco_decent_equity": 784, "escalate_truco_mixed_bluff": 50, "decline_truco_mixed": 48, "decline_truco_low_equity": 118 } },
    { "scenario": "scenario_tester.scenario_names.tie_ancho_glimpse", "totalRuns": 1000, "actionDistribution": { "secure_hand": 239, "call_truco_value": 761 } },
    { "scenario": "scenario_tester.scenario_names.brava_mid_chain", "totalRuns": 1000, "actionDistribution": { "probe_low_value": 900, "call_truco_value": 100 } },
    { "scenario": "scenario_tester.scenario_names.signal_false_low", "totalRuns": 1000, "actionDistribution": { "call_envido_bluff": 104, "probe_mid_value": 534, "secure_hand": 185, "call_envido_marginal": 56, "call_truco_bluff": 121 } },
    { "scenario": "scenario_tester.scenario_names.post_parda_figure", "totalRuns": 1000, "actionDistribution": { "call_truco_value": 233, "secure_hand": 578, "call_truco_bluff": 36, "call_truco_post_parda_bluff": 39, "call_truco_parda_y_gano": 114 } },
    { "scenario": "scenario_tester.scenario_names.dual_ancho_bait", "totalRuns": 1000, "actionDistribution": { "feint_pre_truco": 715, "call_truco_value": 221, "call_envido_marginal": 64 } },
    { "scenario": "scenario_tester.scenario_names.false_brava_probe", "totalRuns": 1000, "actionDistribution": { "call_real_dominant": 126, "call_falta_win_game": 367, "accept_truco_solid": 277, "call_envido_bluff": 107, "escalate_truco_strong": 123 } },
    { "scenario": "scenario_tester.scenario_names.envido_low_unrelated", "totalRuns": 1000, "actionDistribution": { "probe_mid_value": 545, "secure_hand": 362, "call_truco_value": 64, "probe_envido_hide": 29 } },
    { "scenario": "scenario_tester.scenario_names.all_tie_mid_hint", "totalRuns": 1000, "actionDistribution": { "play_last_card": 863, "call_truco_value": 45, "call_truco_certain_win": 65, "call_truco_bluff": 27 } },
    { "scenario": "scenario_tester.scenario_names.clutch_false_deplete", "totalRuns": 1000, "actionDistribution": { "feint_active_truco": 780, "secure_hand": 220 } }
  ]
};

// --- ICON COMPONENTS ---
const StatusIcon: React.FC<{ status: ValidationStatus }> = ({ status }) => {
    const iconMap = {
        ok: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
        warn: <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />,
        fail: <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />,
        pending: <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    };
    const colorMap = {
        ok: 'text-green-500',
        warn: 'text-yellow-500',
        fail: 'text-red-500',
        pending: 'text-gray-500'
    };
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${colorMap[status]}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {iconMap[status]}
        </svg>
    );
};

const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


// --- RESULT ROW COMPONENT ---

const ScenarioResultRow: React.FC<{
    result: ScenarioResult;
    expected: ExpectedScenarioResult | undefined;
    deviation: number;
    isCompleted: boolean;
}> = ({ result, expected, deviation, isCompleted }) => {
    const { t } = useLocalization();
    const [isExpanded, setIsExpanded] = useState(false);

    const validation = useMemo(() => {
        if (!isCompleted || !expected) return { status: 'pending' as ValidationStatus };
        if (result.totalRuns === 0) return { status: 'pending' as ValidationStatus };

        // Fix: Explicitly cast values from Object.entries to Number to satisfy TypeScript's strict arithmetic operation rules.
        const getTopAction = (dist: Record<string, number>) => Object.entries(dist).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0];

        const expectedTopAction = getTopAction(expected.actionDistribution);
        const actualTopAction = getTopAction(result.results);
        
        if (expectedTopAction !== actualTopAction) {
            return { status: 'fail' as ValidationStatus, expectedTopAction, actualTopAction };
        }

        let hasDeviation = false;
        
        for (const [action, expectedCount] of Object.entries(expected.actionDistribution)) {
            // Fix: Explicitly cast `expectedCount` to a Number for the division operation.
            const expectedFreq = Number(expectedCount) / expected.totalRuns;
            const actualCount = result.results[action] || 0;
            const actualFreq = actualCount / result.totalRuns;

            const absoluteDeviation = Math.abs((actualFreq - expectedFreq) * 100);
            if (absoluteDeviation > deviation) {
                hasDeviation = true;
                break;
            }
        }
        
        return { status: (hasDeviation ? 'warn' : 'ok') as ValidationStatus, expectedTopAction, actualTopAction };

    }, [isCompleted, result, expected, deviation]);

    const statusMap: Record<ValidationStatus, { color: string; labelKey: string }> = {
        ok: { color: 'bg-green-900/40 border-green-700/50', labelKey: 'scenario_runner.status_ok' },
        warn: { color: 'bg-yellow-900/40 border-yellow-700/50', labelKey: 'scenario_runner.status_warn' },
        fail: { color: 'bg-red-900/40 border-red-700/50', labelKey: 'scenario_runner.status_fail' },
        pending: { color: 'bg-gray-800/40 border-gray-700/50', labelKey: 'scenario_runner.status_pending' },
    };

    const topActionFreq = result.totalRuns > 0 && validation.actualTopAction ? ((Number(result.results[validation.actualTopAction]) / result.totalRuns) * 100).toFixed(1) + '%' : '0%';
    const expectedTopActionFreq = expected && validation.expectedTopAction ? ((Number(expected.actionDistribution[validation.expectedTopAction]) / expected.totalRuns) * 100).toFixed(1) + '%' : 'N/A';
    
    const allActions = new Set([...Object.keys(result.results), ...(expected ? Object.keys(expected.actionDistribution) : [])]);
    // FIX: Add explicit Number casting to sort function to prevent type errors. This resolves errors on line 308.
    const sortedActions = Array.from(allActions).sort((a, b) => Number(result.results[b] || 0) - Number(result.results[a] || 0));

    return (
        <details onToggle={(e) => setIsExpanded((e.target as HTMLDetailsElement).open)} className={`rounded-lg overflow-hidden border ${statusMap[validation.status].color} transition-colors`}>
            <summary className="grid grid-cols-[auto_1fr_1fr_auto] items-center p-2 cursor-pointer hover:bg-white/10">
                <div className="px-2"><StatusIcon status={validation.status} /></div>
                <div className="font-semibold text-white">{t(result.nameKey)}</div>
                <div className="text-sm">
                    {validation.actualTopAction && (
                        <span>{t(`ai_reason_keys.${validation.actualTopAction}`, { defaultValue: validation.actualTopAction })} <span className="font-mono text-gray-300">({topActionFreq})</span></span>
                    )}
                </div>
                <div className="px-2 text-green-400 group relative">
                    {isCompleted && <CheckCircleIcon />}
                    {isCompleted && <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">{t('scenario_runner.completed_tooltip')}</div>}
                </div>
            </summary>
            <div className="bg-black/30 p-4">
                <table className="w-full text-xs">
                    <thead className="text-cyan-200">
                        <tr>
                            <th className="py-1 text-left">{t('scenario_runner.table_header_action')}</th>
                            <th className="py-1 text-right">{t('scenario_runner.table_header_expected')}</th>
                            <th className="py-1 text-right">{t('scenario_runner.table_header_frequency')}</th>
                            <th className="py-1 text-right">{t('scenario_runner.table_header_deviation')}</th>
                        </tr>
                    </thead>
                    <tbody>
                    {sortedActions.map(key => {
                        const actualCount = result.results[key] || 0;
                        const actualFreq = result.totalRuns > 0 ? actualCount / result.totalRuns : 0;
                        const expectedCount = expected?.actionDistribution[key] || 0;
                        const expectedFreq = expected ? expectedCount / expected.totalRuns : 0;
                        
                        const absoluteDeviation = (actualFreq - expectedFreq) * 100;
                        const isOutlier = Math.abs(absoluteDeviation) > deviation;

                        const deviationColor = isOutlier ? 'text-red-400' : 'text-gray-400';

                        return (
                            <tr key={key} className="border-t border-cyan-900/50">
                                <td className="py-1 text-gray-300">{t(`ai_reason_keys.${key}`, { defaultValue: key })}</td>
                                <td className="py-1 text-right font-mono">{(expectedFreq * 100).toFixed(1)}%</td>
                                <td className={`py-1 text-right font-mono ${isOutlier ? 'font-bold' : ''}`}>{(actualFreq * 100).toFixed(1)}%</td>
                                <td className={`py-1 text-right font-mono ${deviationColor}`}>
                                    {absoluteDeviation > 0 ? '+' : ''}
                                    {absoluteDeviation.toFixed(1)}%
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>
        </details>
    );
};


// --- MAIN COMPONENT ---

const ScenarioRunner: React.FC = () => {
    const { t } = useLocalization();
    const [iterations, setIterations] = useState(100);
    const [deviation, setDeviation] = useState(10);
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState({ currentScenario: 0, totalScenarios: 0, overallProgress: 0, scenarioName: '' });
    const [results, setResults] = useState<ScenarioResult[] | null>(null);
    const [importStatus, setImportStatus] = useState<string | null>(null);
    const [expectedResults, setExpectedResults] = useState<ExpectedScenarioResult[]>(defaultExpectedResultsData.scenarios);
    const cancelRef = useRef(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleRun = async () => {
        setIsRunning(true);
        const initialResults = predefinedScenarios.map(s => ({ nameKey: s.nameKey, results: {}, totalRuns: 0 }));
        setResults(initialResults);
        setProgress({ currentScenario: 0, totalScenarios: predefinedScenarios.length, overallProgress: 0, scenarioName: '' });
        cancelRef.current = false;
        
        let accumulatedResults = [...initialResults];

        for (let i = 0; i < predefinedScenarios.length; i++) {
            if (cancelRef.current) break;

            const scenario = predefinedScenarios[i];
            const currentScenarioResult = { results: {}, totalRuns: 0 };
            
            for (let j = 0; j < iterations; j++) {
                if (cancelRef.current) break;

                const hands = scenario.generateHands();
                if (hands) {
                    const { aiHand, playerHand } = hands;
                    const baseState = scenario.baseState;
                    const isRespondingToTruco = (baseState.gamePhase || '').includes('truco_called');
                    const envidoWindowClosed = (baseState.trucoLevel || 0) > 0 && !isRespondingToTruco;

                    const scenarioState: GameState = {
                        ...initialState, ...baseState,
                        aiScore: baseState.aiScore || 0, playerScore: baseState.playerScore || 0,
                        aiHand, initialAiHand: aiHand,
                        playerHand, initialPlayerHand: playerHand,
                        aiHasFlor: hasFlor(aiHand), playerHasFlor: hasFlor(playerHand),
                        hasEnvidoBeenCalledThisRound: baseState.hasEnvidoBeenCalledThisRound || envidoWindowClosed,
                    };

                    const aiMove = getLocalAIMove(scenarioState);
                    const reason = aiMove.reasonKey || 'unknown_action';
                    currentScenarioResult.results[reason] = (currentScenarioResult.results[reason] || 0) + 1;
                    currentScenarioResult.totalRuns++;
                }

                if (j % 50 === 0) {
                    const overallProgress = ((i * iterations + j) / (predefinedScenarios.length * iterations)) * 100;
                    setProgress({ currentScenario: i + 1, totalScenarios: predefinedScenarios.length, scenarioName: t(scenario.nameKey), overallProgress });
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
            accumulatedResults[i] = { ...accumulatedResults[i], ...currentScenarioResult };
            setResults([...accumulatedResults]);
        }
        
        setProgress(prev => ({ ...prev, overallProgress: cancelRef.current ? prev.overallProgress : 100, currentScenario: cancelRef.current ? prev.currentScenario : predefinedScenarios.length }));
        setIsRunning(false);
    };

    const handleCancel = () => { cancelRef.current = true; };
    
    const handleImportClick = () => fileInputRef.current?.click();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const data = JSON.parse(text);
                if (data && Array.isArray(data.scenarios) && data.scenarios[0]?.actionDistribution) {
                    setExpectedResults(data.scenarios);
                    setImportStatus(t('scenario_runner.import_success'));
                } else { throw new Error("Invalid format"); }
            } catch (error) {
                console.error("Failed to import thresholds", error);
                setImportStatus(t('scenario_runner.import_error'));
            } finally {
                setTimeout(() => setImportStatus(null), 3000);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const sortedResults = useMemo(() => {
        if (!results) return null;
        return Object.entries(results).sort((a, b) => Number(b[1]) - Number(a[1]));
    }, [results]);
    const totalSimsRun = sortedResults ? sortedResults.reduce((sum, [, count]) => sum + Number(count), 0) : 0;

    return (
        <div className="w-full h-full flex flex-col gap-4 text-white">
            <div className="flex-shrink-0 bg-black/30 p-4 rounded-lg border border-cyan-700/50 space-y-3">
                <h2 className="text-xl font-bold text-cyan-200">{t('scenario_runner.title')}</h2>
                <p className="text-sm text-gray-300 max-w-3xl">{t('scenario_runner.description')}</p>
                <div className="flex items-end gap-4 flex-wrap">
                    <div>
                        <label htmlFor="deviation" className="block text-sm font-medium text-gray-300">{t('scenario_runner.deviation_label')}</label>
                        <input type="number" id="deviation" value={deviation} onChange={e => setDeviation(Math.max(0, parseInt(e.target.value) || 10))} disabled={isRunning} className="w-24 p-1 bg-gray-800 border border-gray-600 rounded-md" step="1" min="0" max="100"/>
                    </div>
                    <div>
                        <label htmlFor="iterations" className="block text-sm font-medium text-gray-300">{t('scenario_runner.iterations_label')}</label>
                        <input type="number" id="iterations" value={iterations} onChange={e => setIterations(Math.max(1, parseInt(e.target.value) || 1000))} disabled={isRunning} className="w-28 p-1 bg-gray-800 border border-gray-600 rounded-md" step="100"/>
                    </div>
                    {!isRunning ? (
                        <button onClick={handleRun} className="px-6 py-2 rounded-lg font-bold text-white bg-green-600 border-b-4 border-green-800 hover:bg-green-500 transition-colors">{t('scenario_runner.run_button')}</button>
                    ) : (
                        <button onClick={handleCancel} className="px-6 py-2 rounded-lg font-bold text-white bg-red-600 border-b-4 border-red-800 hover:bg-red-500 transition-colors">{t('scenario_runner.cancel_button')}</button>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                    <button onClick={handleImportClick} disabled={isRunning} className="px-6 py-2 rounded-lg font-bold text-white bg-blue-600 border-b-4 border-blue-800 hover:bg-blue-500 transition-colors disabled:bg-gray-500">{t('scenario_runner.import_button')}</button>
                    {importStatus && <span className={`text-sm ${importStatus.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>{importStatus}</span>}
                </div>
            </div>

            {isRunning && (
                 <div className="flex-shrink-0 bg-black/30 p-4 rounded-lg border border-cyan-700/50">
                    <p className="text-sm text-cyan-200 mb-1">{t('scenario_runner.running_scenario', { current: progress.currentScenario, total: progress.totalScenarios, name: progress.scenarioName })}</p>
                    <div className="w-full bg-gray-700 rounded-full h-4 relative overflow-hidden">
                        <div className="bg-cyan-500 h-4 rounded-full" style={{ width: `${progress.overallProgress}%`, transition: 'width 0.2s' }} />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{t('scenario_runner.running_progress', { progress: Math.floor(progress.overallProgress) })}</span>
                    </div>
                </div>
            )}
            
            <div className="flex-grow bg-black/40 p-4 rounded-lg border border-cyan-700/50 overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-cyan-200">{t('scenario_runner.results_title')}</h3>
                </div>
                {!results ? (
                    <div className="flex items-center justify-center h-full text-gray-400">{t('scenario_runner.no_results')}</div>
                ) : (
                    <div className="space-y-2">
                        {results.map((result) => (
                            <ScenarioResultRow 
                                key={result.nameKey} 
                                result={result} 
                                expected={expectedResults.find(e => e.scenario === result.nameKey)}
                                deviation={deviation}
                                isCompleted={result.totalRuns > 0}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScenarioRunner;
