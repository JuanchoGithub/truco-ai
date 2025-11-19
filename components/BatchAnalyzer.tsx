
import React, { useState, useMemo } from 'react';
import { Card, GameState, Suit, Rank } from '../types';
import { calculateHandStrength, getCardHierarchy } from '../services/trucoLogic';
import { calculateTrucoStrength } from '../services/ai/trucoStrategy';
import { initialState } from '../hooks/useGameReducer';
import CardComponent from './Card';
import { useLocalization } from '../context/LocalizationContext';

interface AnalysisResult {
  hand: Card[];
  trucoValue: number;
  aiAssessment: number;
}

type SortKey = keyof AnalysisResult;

// A representative deck of all 14 unique card types to generate combinations.
const FULL_REPRESENTATIVE_DECK: Card[] = [
    { rank: 1, suit: 'espadas' }, // 1. Ancho de Espada
    { rank: 1, suit: 'bastos' },  // 2. Ancho de Basto
    { rank: 7, suit: 'espadas' }, // 3. Siete de Espada
    { rank: 7, suit: 'oros' },    // 4. Siete de Oro
    { rank: 3, suit: 'oros' },    // 5. Tres
    { rank: 2, suit: 'bastos' },  // 6. Dos
    { rank: 1, suit: 'copas' },   // 7. Ancho Falso
    { rank: 12, suit: 'espadas' },// 8. Rey
    { rank: 11, suit: 'bastos' }, // 9. Caballo
    { rank: 10, suit: 'copas' },  // 10. Sota
    { rank: 7, suit: 'bastos' },  // 11. Siete Falso
    { rank: 6, suit: 'oros' },    // 12. Seis
    { rank: 5, suit: 'espadas' }, // 13. Cinco
    { rank: 4, suit: 'copas' },   // 14. Cuatro
];

// Generates a comprehensive set of strategically distinct hands for analysis.
function generateHandsToAnalyze(): Card[][] {
    const handsMap = new Map<string, Card[]>();
    const cardTypes = FULL_REPRESENTATIVE_DECK;

    // Helper for combinations
    const combinations = <T,>(pool: T[], k: number): T[][] => {
        if (k < 0 || k > pool.length) return [];
        if (k === 0) return [[]];
        const combs: T[][] = [];
        for (let i = 0; i < pool.length - k + 1; i++) {
            const head = pool.slice(i, i + 1);
            const tailCombs = combinations(pool.slice(i + 1), k - 1);
            for (const tail of tailCombs) {
                combs.push(head.concat(tail));
            }
        }
        return combs;
    };
    
    // Helper to add a hand to the map if its strategic type (based on hierarchy) is unique.
    const addHandToMap = (hand: Card[]) => {
        const sortedHandByHierarchy = [...hand].sort((a, b) => getCardHierarchy(b) - getCardHierarchy(a));
        const key = sortedHandByHierarchy.map(c => getCardHierarchy(c)).join('-');
        if (!handsMap.has(key)) {
           handsMap.set(key, sortedHandByHierarchy);
        }
    };
    
    // 1. Hands with 3 unique types
    const uniqueTypeHands = combinations(cardTypes, 3);
    uniqueTypeHands.forEach(addHandToMap);

    const getCardsOfRank = (rank: Rank, suits: Suit[]): Card[] => {
        return suits.map(suit => ({ rank, suit: suit as Suit }));
    };

    const ALL_SUITS: Suit[] = ['espadas', 'bastos', 'oros', 'copas'];
    const ranksWith4Cards: Rank[] = [3, 2, 12, 11, 10, 6, 5, 4];
    
    // 2. Hands with three of a kind ("Piernas")
    for (const rank of ranksWith4Cards) {
        const hand = getCardsOfRank(rank, ALL_SUITS.slice(0, 3));
        addHandToMap(hand);
    }
    
    // 3. Hands with a pair ("Pares")
    // Pairs of common cards (e.g., two 4s and a 5)
    for (const rank of ranksWith4Cards) {
        const pair = getCardsOfRank(rank, ALL_SUITS.slice(0, 2));
        for (const otherCardType of cardTypes) {
            // Avoid creating a three-of-a-kind, which is already handled
            if (getCardHierarchy(otherCardType) !== getCardHierarchy(pair[0])) {
                addHandToMap([...pair, otherCardType]);
            }
        }
    }
    // Pairs of special cards (Anchos and Sietes Falsos)
    const specialPairs = [
        [{rank: 1, suit: 'oros'}, {rank: 1, suit: 'copas'}],
        [{rank: 7, suit: 'bastos'}, {rank: 7, suit: 'copas'}]
    ] as Card[][];
    for(const pair of specialPairs) {
        for (const otherCardType of cardTypes) {
             if (getCardHierarchy(otherCardType) !== getCardHierarchy(pair[0])) {
                addHandToMap([...pair, otherCardType]);
            }
        }
    }
    
    return Array.from(handsMap.values());
}


const getSimpleCardName = (card: Card, t: (key: string, options?: any) => string): string => {
    switch (card.rank) {
        case 1:
            if (card.suit === 'espadas') return t('batchAnalyzer.simple_card_names.as_de_espadas');
            if (card.suit === 'bastos') return t('batchAnalyzer.simple_card_names.as_de_bastos');
            return t('batchAnalyzer.simple_card_names.ancho_falso');
        case 7:
            if (card.suit === 'espadas') return t('batchAnalyzer.simple_card_names.siete_de_espadas');
            if (card.suit === 'oros') return t('batchAnalyzer.simple_card_names.siete_de_oros');
            return t('batchAnalyzer.simple_card_names.siete_falso');
        case 3: return t('batchAnalyzer.simple_card_names.tres');
        case 2: return t('batchAnalyzer.simple_card_names.dos');
        case 12: return t('batchAnalyzer.simple_card_names.rey');
        case 11: return t('batchAnalyzer.simple_card_names.caballo');
        case 10: return t('batchAnalyzer.simple_card_names.sota');
        case 6: return t('batchAnalyzer.simple_card_names.seis');
        case 5: return t('batchAnalyzer.simple_card_names.cinco');
        case 4: return t('batchAnalyzer.simple_card_names.cuatro');
        default: return t('batchAnalyzer.simple_card_names.default', { rank: card.rank, suit: card.suit });
    }
};

const SortableHeader: React.FC<{
    sortKey: SortKey;
    title: string;
    sortConfig: { key: SortKey; direction: 'asc' | 'desc' } | null;
    requestSort: (key: SortKey) => void;
}> = ({ sortKey, title, sortConfig, requestSort }) => {
    const isSorted = sortConfig?.key === sortKey;
    const arrow = isSorted ? (sortConfig?.direction === 'asc' ? '▲' : '▼') : '';
    return (
        <th 
            className="p-3 cursor-pointer bg-stone-900 sticky top-0 z-10 border-b-2 border-cyan-800 hover:bg-stone-800 transition-colors text-xs uppercase tracking-wider font-bold text-cyan-400" 
            onClick={() => requestSort(sortKey)}
        >
            <div className="flex items-center gap-1">
                {title} 
                <span className={`text-xs ${isSorted ? 'text-cyan-300' : 'text-stone-700'}`}>{arrow || '▼'}</span>
            </div>
        </th>
    );
};

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);


const BatchAnalyzer: React.FC = () => {
    const { t } = useLocalization();
    const [analysisResults, setAnalysisResults] = useState<AnalysisResult[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>({ key: 'aiAssessment', direction: 'desc' });
    const [copyStatus, setCopyStatus] = useState(t('batchAnalyzer.copy_button'));

    const totalCombinations = useMemo(() => generateHandsToAnalyze().length, []);

    const processChunk = (hands: Card[][], index: number, accumulatedResults: AnalysisResult[]) => {
        if (index >= hands.length) {
            setAnalysisResults(accumulatedResults);
            setIsLoading(false);
            return;
        }

        // Process one hand
        const hand = hands[index];

        // FIX: Provide a dummy opponent hand so the simulation knows the opponent has 3 cards.
        const dummyOpponentHand: Card[] = [
            { rank: 4, suit: 'copas' },
            { rank: 5, suit: 'bastos' },
            { rank: 6, suit: 'oros' },
        ];
        
        // Create a minimal game state for analysis
        const baseGameState: GameState = {
            ...initialState,
            aiHand: hand,
            initialAiHand: hand,
            playerHand: dummyOpponentHand,
            initialPlayerHand: dummyOpponentHand,
            round: 1,
            mano: 'ai',
        };

        const trucoValue = calculateHandStrength(hand);
        const { strength: aiAssessment } = calculateTrucoStrength(baseGameState);

        const newResult = { hand, trucoValue, aiAssessment };
        const newResults = [...accumulatedResults, newResult];
        
        // Update progress and schedule the next chunk to keep the UI responsive
        setProgress(Math.round(((index + 1) / hands.length) * 100));
        setTimeout(() => processChunk(hands, index + 1, newResults), 0);
    };

    const runAnalysis = () => {
        setIsLoading(true);
        setAnalysisResults(null);
        setProgress(0);
        const handsToAnalyze = generateHandsToAnalyze();
        processChunk(handsToAnalyze, 0, []);
    };

    const requestSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedResults = useMemo(() => {
        if (!analysisResults) return null;
        const sortableItems = [...analysisResults];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                // Secondary sort for hand by truco value
                if (sortConfig.key !== 'trucoValue') {
                   return b.trucoValue - a.trucoValue;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [analysisResults, sortConfig]);

    const handleCopy = () => {
        if (!sortedResults) return;
        const header = `${t('batchAnalyzer.header_hand')}\t${t('batchAnalyzer.header_truco_value')}\t${t('batchAnalyzer.header_ai_assessment')}`;
        const rows = sortedResults.map(result => {
            const handText = result.hand.map(card => getSimpleCardName(card, t)).join(', ');
            const trucoValue = result.trucoValue;
            const aiAssessment = result.aiAssessment.toFixed(3);
            return `${handText}\t${trucoValue}\t${aiAssessment}`;
        });
        const tsvContent = [header, ...rows].join('\n');

        navigator.clipboard.writeText(tsvContent).then(() => {
            setCopyStatus(t('batchAnalyzer.copy_button_copied'));
            setTimeout(() => setCopyStatus(t('batchAnalyzer.copy_button')), 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            setCopyStatus(t('batchAnalyzer.copy_button_error'));
            setTimeout(() => setCopyStatus(t('batchAnalyzer.copy_button')), 2000);
        });
    };

    return (
        <div className="w-full h-full flex flex-col animate-fade-in-scale">
            <div className="bg-stone-900/80 p-6 rounded-lg border border-cyan-800/30 mb-4 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-cyan-300 font-cinzel tracking-widest">{t('batchAnalyzer.title')}</h2>
                    <p className="text-xs text-gray-400 mt-1">{t('batchAnalyzer.description', { count: totalCombinations })}</p>
                </div>
                <div className="flex items-center gap-4">
                     {!isLoading && !analysisResults && (
                         <button onClick={runAnalysis} disabled={isLoading} className="px-6 py-2 rounded-lg font-bold text-white bg-gradient-to-b from-green-600 to-green-700 border-b-4 border-green-900 hover:from-green-500 hover:to-green-600 transition-all shadow-lg">
                            {t('batchAnalyzer.button_analyze')}
                        </button>
                     )}
                    {sortedResults && (
                        <div className="relative group">
                            <button
                                onClick={handleCopy}
                                className="px-4 py-2 rounded-lg font-bold text-white bg-cyan-700 hover:bg-cyan-600 border border-cyan-600 transition-all flex items-center gap-2"
                                aria-label={t('batchAnalyzer.copy_tooltip')}
                            >
                                <CopyIcon /> {copyStatus}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-grow bg-black/40 rounded-lg border border-cyan-800/30 overflow-hidden relative">
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-20 backdrop-blur-sm">
                        <div className="w-64 bg-stone-800 rounded-full h-4 mb-2 border border-stone-600">
                            <div className="bg-green-500 h-full rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" style={{ width: `${progress}%`, transition: 'width 0.1s' }}></div>
                        </div>
                        <p className="text-green-300 font-mono">{t('batchAnalyzer.loading', { progress })}</p>
                    </div>
                )}

                <div className="h-full overflow-y-auto custom-scrollbar">
                    {sortedResults ? (
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-stone-900 sticky top-0 z-10 shadow-md">
                                <tr>
                                    <SortableHeader sortKey="hand" title={t('batchAnalyzer.header_hand')} sortConfig={sortConfig} requestSort={() => requestSort('trucoValue')} />
                                    <SortableHeader sortKey="trucoValue" title={t('batchAnalyzer.header_truco_value')} sortConfig={sortConfig} requestSort={requestSort} />
                                    <SortableHeader sortKey="aiAssessment" title={t('batchAnalyzer.header_ai_assessment')} sortConfig={sortConfig} requestSort={requestSort} />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-800">
                                {sortedResults.map((result, index) => (
                                    <tr key={index} className="hover:bg-cyan-900/20 transition-colors">
                                        <td className="p-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex -space-x-6">
                                                    {result.hand.map(card => (
                                                        <div key={`${card.rank}-${card.suit}`} className="transform scale-75 origin-left hover:z-10 transition-all hover:-translate-y-2">
                                                             <CardComponent card={card} size="small" />
                                                        </div>
                                                    ))}
                                                </div>
                                                <span className="text-gray-400 text-xs font-mono">
                                                    {result.hand.map(card => getSimpleCardName(card, t)).join(', ')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-3 font-mono text-base text-amber-200">{result.trucoValue}</td>
                                        <td className="p-3 font-mono text-base">
                                            <div className="flex items-center gap-2">
                                                 <div className="w-16 bg-stone-800 rounded-full h-1.5 overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full ${result.aiAssessment > 0.75 ? 'bg-green-500' : result.aiAssessment > 0.5 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                        style={{ width: `${result.aiAssessment * 100}%` }}
                                                    ></div>
                                                 </div>
                                                <span className={result.aiAssessment > 0.75 ? 'text-green-400' : result.aiAssessment > 0.5 ? 'text-yellow-400' : 'text-red-400'}>
                                                    {result.aiAssessment.toFixed(2)}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                         <div className="flex flex-col items-center justify-center h-full text-stone-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            <p>{t('scenario_runner.no_results')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BatchAnalyzer;
