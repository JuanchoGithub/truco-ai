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
                
                <h4 className="text-base font-bold text-cyan-200 mt-4 mb-2 pt-2 border-t border-cyan-800/50">{t('scenario_runner.results_by_archetype_title')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(result.byArchetype).map(([archetype, archResults]) => {
                        const totalForArch = Object.values(archResults).reduce((s, c) => s + c, 0);
                        if (totalForArch === 0) return null;

                        const sortedArchResults = Object.entries(archResults).sort((a, b) => b[1] - a[1]);

                        return (
                            <div key={archetype} className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                                <h5 className="font-semibold text-cyan-300 mb-2">{t(`ai_logic.archetypes.${archetype}`)}</h5>
                                <ul className="text-xs space-y-1">
                                    {sortedArchResults.map(([reason, count]) => {
                                        const freq = (count / totalForArch) * 100;
                                        return (
                                            <li key={reason} className="flex justify-between items-center gap-2">
                                                <span className="truncate text-gray-300" title={t(`ai_reason_keys.${reason}`, { defaultValue: reason })}>{t(`ai_reason_keys.${reason}`, { defaultValue: reason })}</span>
                                                <div className="flex-shrink-0 font-mono text-gray-100">{freq.toFixed(1)}% <span className="text-gray-400">({count})</span></div>
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
            
            const byArchetype: Record<string, Record<string, number>> = {};
            archetypesToRun.forEach(arch => { byArchetype[arch] = {}; });
            const currentScenarioResult = { results: {}, byArchetype, totalRuns: 0 };

            for (const archetype of archetypesToRun) {
                for (let j = 0; j < iterationsPerArchetype; j++) {
                    if (cancelRef.current) break;

                    const hands = scenario.generateHands();
                    if (hands) {
                        const { aiHand, playerHand } = hands;
                        const baseState = scenario.baseState;
                        const isRespondingToTruco = (baseState.gamePhase || '').includes('truco_called');
                        const envidoWindowClosed = (baseState.trucoLevel || 0) > 0 && !isRespondingToTruco;

                        const scenarioState: GameState = {
                            ...initialState, ...baseState,
                            aiArchetype: archetype,
                            aiScore: baseState.aiScore || 0, playerScore: baseState.playerScore || 0,
                            aiHand, initialAiHand: aiHand,
                            playerHand, initialPlayerHand: playerHand,
                            aiHasFlor: hasFlor(aiHand), playerHasFlor: hasFlor(playerHand),
                            hasEnvidoBeenCalledThisRound: baseState.hasEnvidoBeenCalledThisRound || envidoWindowClosed,
                        };

                        const aiMove = getLocalAIMove(scenarioState);
                        const reason = aiMove.reasonKey || 'unknown_action';
                        
                        currentScenarioResult.results[reason] = (currentScenarioResult.results[reason] || 0) + 1;
                        currentScenarioResult.byArchetype[archetype][reason] = (currentScenarioResult.byArchetype[archetype][reason] || 0) + 1;
                        currentScenarioResult.totalRuns++;
                    }

                    simsCompleted++;
                }
                if (cancelRef.current) break;
            }

            const overallProgress = (simsCompleted / totalSims) * 100;
            setProgress({ 
                currentScenario: i + 1, 
                totalScenarios: predefinedScenarios.length, 
                scenarioName: t(scenario.nameKey), 
                overallProgress 
            });

            accumulatedResults[i] = { ...accumulatedResults[i], ...currentScenarioResult };
            setResults([...accumulatedResults]);
            await new Promise(resolve => setTimeout(resolve, 0));
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <button onClick={handleExport} disabled={!results || isRunning} className="px-6 py-2 rounded-lg font-bold text-white bg-yellow-600 border-b-4 border-yellow-800 hover:bg-yellow-500 transition-colors disabled:bg-gray-500">{t('scenario_runner.export_button')}</button>
                        {importStatus && <span className={`text-sm ${importStatus.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>{importStatus}</span>}
                    </div>
                     <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-2">{t('scenario_runner.archetypes_title')}</h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                            {(Object.keys(archetypesToInclude) as AiArchetype[]).map(arch => (
                                <label key={arch} className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={archetypesToInclude[arch]}
                                        onChange={e => setArchetypesToInclude(prev => ({ ...prev, [arch]: e.target.checked }))}
                                        disabled={isRunning}
                                        className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-cyan-500 focus:ring-cyan-600"
                                    />
                                    {t(`ai_logic.archetypes.${arch}`)}
                                </label>
                            ))}
                        </div>
                    </div>
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