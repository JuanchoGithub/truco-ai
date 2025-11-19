
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, GameState, AiMove, Player, GamePhase, MessageObject, Action, ActionType, AiArchetype } from '../types';
import { hasFlor } from '../services/trucoLogic';
import { initialState } from '../hooks/useGameReducer';
import { getLocalAIMove } from '../services/localAiService';
import { predefinedScenarios, PredefinedScenario } from '../services/scenarioService';
import { useLocalization } from '../context/LocalizationContext';
import { defaultExpectedResultsData } from '../services/baselineData';

// Helper types for this component
interface ScenarioResult {
    nameKey: string;
    results: Record<string, number>;
    byArchetype: Record<string, Record<string, number>>;
    totalRuns: number;
}
interface ExpectedScenarioResult {
    scenario: string;
    totalRuns: number;
    actionDistribution: Record<string, number>;
}
type ValidationStatus = 'ok' | 'warn' | 'fail' | 'pending';


// --- ICON COMPONENTS ---
const StatusIcon: React.FC<{ status: ValidationStatus }> = ({ status }) => {
    const iconMap = {
        ok: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
        warn: <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />,
        fail: <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />,
        pending: <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    };
    const colorMap = {
        ok: 'text-green-400',
        warn: 'text-yellow-400',
        fail: 'text-red-400',
        pending: 'text-stone-600'
    };
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${colorMap[status]}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
        ok: { color: 'bg-green-900/10 border-green-700/30 hover:bg-green-900/20', labelKey: 'scenario_runner.status_ok' },
        warn: { color: 'bg-yellow-900/10 border-yellow-700/30 hover:bg-yellow-900/20', labelKey: 'scenario_runner.status_warn' },
        fail: { color: 'bg-red-900/10 border-red-700/30 hover:bg-red-900/20', labelKey: 'scenario_runner.status_fail' },
        pending: { color: 'bg-stone-800/50 border-stone-700/30 hover:bg-stone-800', labelKey: 'scenario_runner.status_pending' },
    };

    const topActionFreq = result.totalRuns > 0 && validation.actualTopAction ? ((Number(result.results[validation.actualTopAction]) / result.totalRuns) * 100).toFixed(1) + '%' : '0%';
    
    const allActions = new Set([...Object.keys(result.results), ...(expected ? Object.keys(expected.actionDistribution) : [])]);
    const sortedActions = Array.from(allActions).sort((a, b) => Number(result.results[b] || 0) - Number(result.results[a] || 0));

    return (
        <details onToggle={(e) => setIsExpanded((e.target as HTMLDetailsElement).open)} className={`rounded-lg overflow-hidden border transition-colors mb-2 ${statusMap[validation.status].color}`}>
            <summary className="grid grid-cols-[auto_1fr_1fr_auto] items-center p-3 cursor-pointer outline-none select-none">
                <div className="px-2"><StatusIcon status={validation.status} /></div>
                <div className="font-semibold text-stone-200 text-sm">{t(result.nameKey)}</div>
                <div className="text-xs text-stone-400">
                    {validation.actualTopAction && (
                        <span>{t(`ai_reason_keys.${validation.actualTopAction}`, { defaultValue: validation.actualTopAction })} <span className="font-mono text-stone-500 ml-1">({topActionFreq})</span></span>
                    )}
                </div>
                <div className="px-2 text-green-400 group relative">
                    {isCompleted && <CheckCircleIcon />}
                </div>
            </summary>
            <div className="bg-black/40 p-4 border-t border-white/5">
                <table className="w-full text-xs">
                    <thead className="text-cyan-500 uppercase font-bold border-b border-white/10">
                        <tr>
                            <th className="py-2 text-left">{t('scenario_runner.table_header_action')}</th>
                            <th className="py-2 text-right">{t('scenario_runner.table_header_expected')}</th>
                            <th className="py-2 text-right">{t('scenario_runner.table_header_frequency')}</th>
                            <th className="py-2 text-right">{t('scenario_runner.table_header_deviation')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                    {sortedActions.map(key => {
                        const actualCount = result.results[key] || 0;
                        const actualFreq = result.totalRuns > 0 ? actualCount / result.totalRuns : 0;
                        const expectedCount = expected?.actionDistribution[key] || 0;
                        const expectedFreq = expected ? expectedCount / expected.totalRuns : 0;
                        
                        const absoluteDeviation = (actualFreq - expectedFreq) * 100;
                        const isOutlier = Math.abs(absoluteDeviation) > deviation;

                        const deviationColor = isOutlier ? 'text-red-400 font-bold' : 'text-stone-500';

                        return (
                            <tr key={key} className="hover:bg-white/5">
                                <td className="py-2 text-stone-300">{t(`ai_reason_keys.${key}`, { defaultValue: key })}</td>
                                <td className="py-2 text-right font-mono text-stone-500">{(expectedFreq * 100).toFixed(1)}%</td>
                                <td className={`py-2 text-right font-mono ${isOutlier ? 'text-yellow-200' : 'text-stone-300'}`}>{(actualFreq * 100).toFixed(1)}%</td>
                                <td className={`py-2 text-right font-mono ${deviationColor}`}>
                                    {absoluteDeviation > 0 ? '+' : ''}
                                    {absoluteDeviation.toFixed(1)}%
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
                
                <h4 className="text-xs font-bold text-cyan-600 uppercase tracking-widest mt-4 mb-2">{t('scenario_runner.results_by_archetype_title')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(result.byArchetype).map(([archetype, archResults]) => {
                        const totalForArch = Object.values(archResults).reduce((s, c) => s + c, 0);
                        if (totalForArch === 0) return null;

                        const sortedArchResults = Object.entries(archResults).sort((a, b) => b[1] - a[1]);

                        return (
                            <div key={archetype} className="bg-stone-900/50 p-2 rounded border border-white/5">
                                <h5 className="font-semibold text-stone-400 text-xs mb-1">{t(`ai_logic.archetypes.${archetype}`)}</h5>
                                <ul className="text-[10px] space-y-1">
                                    {sortedArchResults.map(([reason, count]) => {
                                        const freq = (count / totalForArch) * 100;
                                        return (
                                            <li key={reason} className="flex justify-between items-center">
                                                <span className="truncate text-stone-300 pr-2" title={t(`ai_reason_keys.${reason}`, { defaultValue: reason })}>{t(`ai_reason_keys.${reason}`, { defaultValue: reason })}</span>
                                                <div className="flex-shrink-0 font-mono text-cyan-200">{freq.toFixed(1)}%</div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        );
                    })}
                </div>
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

    const [archetypesToInclude, setArchetypesToInclude] = useState<Record<AiArchetype, boolean>>({
        Balanced: true,
        Aggressive: true,
        Cautious: true,
        Deceptive: true,
    });

    const handleRun = async () => {
        setIsRunning(true);
        const archetypesToRun = (Object.keys(archetypesToInclude) as AiArchetype[]).filter(
            arch => archetypesToInclude[arch]
        );

        if (archetypesToRun.length === 0) {
            alert("Please select at least one archetype to run.");
            setIsRunning(false);
            return;
        }
    
        const iterationsPerArchetype = Math.floor(iterations / archetypesToRun.length);
        if (iterationsPerArchetype < 1) {
            alert(`Iterations must be at least the number of archetypes selected (${archetypesToRun.length}).`);
            setIsRunning(false);
            return;
        }

        const totalSims = iterationsPerArchetype * archetypesToRun.length * predefinedScenarios.length;
        let simsCompleted = 0;

        const initialResults: ScenarioResult[] = predefinedScenarios.map(s => {
            const byArchetype: Record<string, Record<string, number>> = {};
            archetypesToRun.forEach(arch => {
                byArchetype[arch] = {};
            });
            return { nameKey: s.nameKey, results: {}, byArchetype, totalRuns: 0 };
        });

        setResults(initialResults);
        setProgress({ currentScenario: 0, totalScenarios: predefinedScenarios.length, overallProgress: 0, scenarioName: '' });
        cancelRef.current = false;
        
        let accumulatedResults = [...initialResults];

        for (let i = 0; i < predefinedScenarios.length; i++) {
            if (cancelRef.current) break;

            const scenario = predefinedScenarios[i];
            
            // Update progress text for scenario start
            setProgress(prev => ({ ...prev, currentScenario: i + 1, scenarioName: t(scenario.nameKey) }));
            
            // Optimization: Pre-calculate static parts of state
            const baseState = scenario.baseState;
            const isRespondingToTruco = (baseState.gamePhase || '').includes('truco_called');
            const envidoWindowClosed = (baseState.trucoLevel || 0) > 0 && !isRespondingToTruco;
            const hasEnvidoBeenCalled = baseState.hasEnvidoBeenCalledThisRound || envidoWindowClosed;

            let sIndex = 0; // archetype index
            let iter = 0;
            
            while (sIndex < archetypesToRun.length && !cancelRef.current) {
                const batchStartTime = performance.now();
                const TIME_BUDGET_MS = 40;
                
                // Inner loop for time-slicing
                while (sIndex < archetypesToRun.length && !cancelRef.current) {
                    const archetype = archetypesToRun[sIndex];
                    
                    // Run Sim
                    const hands = scenario.generateHands();
                    if (hands) {
                        // Optimization: Construct new object explicitly for speed
                         const scenarioState: GameState = {
                            ...initialState, ...baseState,
                            aiArchetype: archetype,
                            aiScore: baseState.aiScore || 0, playerScore: baseState.playerScore || 0,
                            aiHand: hands.aiHand, initialAiHand: hands.aiHand,
                            playerHand: hands.playerHand, initialPlayerHand: hands.playerHand,
                            aiHasFlor: hasFlor(hands.aiHand), playerHasFlor: hasFlor(hands.playerHand),
                            hasEnvidoBeenCalledThisRound: hasEnvidoBeenCalled,
                        };
                        
                        const aiMove = getLocalAIMove(scenarioState);
                        const reason = aiMove.reasonKey || 'unknown_action';
                        
                        // Update accumulated results in place
                        const res = accumulatedResults[i];
                        res.results[reason] = (res.results[reason] || 0) + 1;
                        res.byArchetype[archetype][reason] = (res.byArchetype[archetype][reason] || 0) + 1;
                        res.totalRuns++;
                    }
                    
                    iter++;
                    simsCompleted++;
                    
                    if (iter >= iterationsPerArchetype) {
                        iter = 0;
                        sIndex++;
                    }
                    
                    // Check time budget every 50 iterations to minimize overhead of performance.now()
                    if (iter % 50 === 0) {
                         if (performance.now() - batchStartTime > TIME_BUDGET_MS) {
                             break; // Break inner loop to yield
                         }
                    }
                }
                
                // Yield update
                const overallProgress = (simsCompleted / totalSims) * 100;
                setProgress(prev => ({ ...prev, overallProgress }));
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            
            // Update results view after scenario finishes
            setResults([...accumulatedResults]);
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        
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

    const handleExport = () => {
        if (!results) return;

        const dataToExport = {
            date: new Date().toISOString(),
            settings: {
                iterations,
                allowedDeviation: deviation,
            },
            baselineUsedForValidation: expectedResults,
            results,
        };

        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dataToExport, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = `truco-ai-scenario-results-${new Date().toISOString().split('T')[0]}.json`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="w-full h-full flex flex-col gap-6 text-white animate-fade-in-scale">
            <div className="bg-stone-900/80 p-6 rounded-lg border border-cyan-800/30 shadow-lg">
                <h2 className="text-xl font-bold text-cyan-300 font-cinzel tracking-widest border-b border-cyan-800/50 pb-2 mb-4">{t('scenario_runner.title')}</h2>
                <p className="text-sm text-stone-400 mb-6 max-w-3xl">{t('scenario_runner.description')}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex items-end gap-4">
                            <div>
                                <label htmlFor="deviation" className="block text-xs font-bold text-stone-500 uppercase mb-1">{t('scenario_runner.deviation_label')}</label>
                                <input type="number" id="deviation" value={deviation} onChange={e => setDeviation(Math.max(0, parseInt(e.target.value) || 10))} disabled={isRunning} className="w-24 p-2 bg-black/30 border border-stone-600 rounded-md text-white focus:border-cyan-500 transition-colors" step="1" min="0" max="100"/>
                            </div>
                            <div>
                                <label htmlFor="iterations" className="block text-xs font-bold text-stone-500 uppercase mb-1">{t('scenario_runner.iterations_label')}</label>
                                <input type="number" id="iterations" value={iterations} onChange={e => setIterations(Math.max(1, parseInt(e.target.value) || 1000))} disabled={isRunning} className="w-32 p-2 bg-black/30 border border-stone-600 rounded-md text-white focus:border-cyan-500 transition-colors" step="100"/>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                            {!isRunning ? (
                                <button onClick={handleRun} className="px-6 py-2 rounded-lg font-bold text-white bg-gradient-to-b from-green-600 to-green-700 border-b-4 border-green-900 hover:from-green-500 hover:to-green-600 transition-all shadow-md">{t('scenario_runner.run_button')}</button>
                            ) : (
                                <button onClick={handleCancel} className="px-6 py-2 rounded-lg font-bold text-white bg-red-700 border-b-4 border-red-900 hover:bg-red-600 transition-colors shadow-md animate-pulse">{t('scenario_runner.cancel_button')}</button>
                            )}
                            
                            <div className="h-8 w-[1px] bg-white/10 mx-2"></div>

                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                            <button onClick={handleImportClick} disabled={isRunning} className="px-4 py-2 rounded bg-stone-800 text-stone-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50">{t('scenario_runner.import_button')}</button>
                            <button onClick={handleExport} disabled={!results || isRunning} className="px-4 py-2 rounded bg-stone-800 text-stone-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50">{t('scenario_runner.export_button')}</button>
                        </div>
                        {importStatus && <div className={`text-xs font-bold ${importStatus.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>{importStatus}</div>}
                    </div>
                    
                     <div className="bg-black/20 p-3 rounded border border-white/5">
                        <h4 className="text-xs font-bold text-stone-500 uppercase mb-2">{t('scenario_runner.archetypes_title')}</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {(Object.keys(archetypesToInclude) as AiArchetype[]).map(arch => (
                                <label key={arch} className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer hover:text-white">
                                    <input
                                        type="checkbox"
                                        checked={archetypesToInclude[arch]}
                                        onChange={e => setArchetypesToInclude(prev => ({ ...prev, [arch]: e.target.checked }))}
                                        disabled={isRunning}
                                        className="rounded bg-stone-700 border-stone-600 text-cyan-500 focus:ring-cyan-600/50 focus:ring-offset-0"
                                    />
                                    {t(`ai_logic.archetypes.${arch}`)}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {isRunning && (
                 <div className="bg-black/40 p-4 rounded-lg border border-cyan-500/30 relative overflow-hidden">
                     <div className="absolute top-0 left-0 h-1 bg-cyan-500 transition-all duration-300" style={{ width: `${progress.overallProgress}%` }}></div>
                    <div className="flex justify-between items-center text-sm text-cyan-100">
                        <span>{t('scenario_runner.running_scenario', { current: progress.currentScenario, total: progress.totalScenarios, name: progress.scenarioName })}</span>
                        <span className="font-mono">{Math.floor(progress.overallProgress)}%</span>
                    </div>
                </div>
            )}
            
            <div className="flex-grow bg-stone-900/60 p-2 rounded-lg border border-white/5 overflow-y-auto custom-scrollbar">
                {!results ? (
                    <div className="flex flex-col items-center justify-center h-full text-stone-600">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                        <p>{t('scenario_runner.no_results')}</p>
                    </div>
                ) : (
                    <div>
                        <div className="flex justify-between items-center px-4 py-2 mb-2">
                            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider">{t('scenario_runner.results_title')}</h3>
                        </div>
                        <div className="space-y-1">
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
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScenarioRunner;
