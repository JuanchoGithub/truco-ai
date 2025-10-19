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
        <th className="p-2 cursor-pointer" onClick={() => requestSort(sortKey)}>
            {title} {arrow}
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
        // The actual cards don't matter, as they will be simulated by `generateConstrainedOpponentHand`.
        // The key is that `playerHand.length` must be 3.
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
        <div className="bg-stone-800/95 border-4 border-amber-700/50 rounded-xl shadow-2xl w-full h-full flex flex-col">
            <div className="p-4 border-b-2 border-amber-700/30 flex justify-between items-center flex-shrink-0">
                <h2 className="text-xl lg:text-2xl font-bold text-amber-300 font-cinzel tracking-widest">
                    {t('batchAnalyzer.title')}
                </h2>
            </div>

            <div className="p-4 lg:p-6 flex-grow overflow-y-auto text-amber-50 space-y-4">
                <p className="text-sm text-gray-300">
                    {t('batchAnalyzer.description', { count: totalCombinations })}
                </p>
                
                {!isLoading && !analysisResults && (
                    <div className="text-center py-8">
                         <button onClick={runAnalysis} disabled={isLoading} className="px-6 py-3 rounded-lg font-bold text-white bg-green-600 border-b-4 border-green-800 hover:bg-green-500 disabled:bg-gray-500 disabled:border-gray-700 transition-colors text-lg">
                            {t('batchAnalyzer.button_analyze')}
                        </button>
                    </div>
                )}
                
                {isLoading && (
                    <div className="w-full bg-gray-700 rounded-full h-4 my-4">
                        <div className="bg-green-500 h-4 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.1s' }}></div>
                        <p className="text-center text-xs mt-1">{t('batchAnalyzer.loading', { progress })}</p>
                    </div>
                )}

                {sortedResults && (
                    <div>
                        <div className="flex justify-end items-center mb-2">
                            <div className="relative group">
                                <button
                                    onClick={handleCopy}
                                    className="p-2 rounded-md text-gray-300 bg-black/40 border border-amber-700/80 hover:bg-black/60 hover:text-white transition-colors"
                                    aria-label={t('batchAnalyzer.copy_tooltip')}
                                >
                                    <CopyIcon />
                                </button>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                    {copyStatus}
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs lg:text-sm">
                                <thead className="bg-black/40 text-amber-100">
                                    <tr>
                                        <SortableHeader sortKey="hand" title={t('batchAnalyzer.header_hand')} sortConfig={sortConfig} requestSort={() => requestSort('trucoValue')} />
                                        <SortableHeader sortKey="trucoValue" title={t('batchAnalyzer.header_truco_value')} sortConfig={sortConfig} requestSort={requestSort} />
                                        <SortableHeader sortKey="aiAssessment" title={t('batchAnalyzer.header_ai_assessment')} sortConfig={sortConfig} requestSort={requestSort} />
                                    </tr>
                                </thead>
                                <tbody className="bg-black/20">
                                    {sortedResults.map((result, index) => (
                                        <tr key={index} className="border-b border-stone-700">
                                            <td className="p-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex gap-1 flex-shrink-0">
                                                        {result.hand.map(card => <CardComponent key={`${card.rank}-${card.suit}`} card={card} size="small" />)}
                                                    </div>
                                                    <span className="text-gray-300 text-[11px] lg:text-xs pl-2">
                                                        {result.hand.map(card => getSimpleCardName(card, t)).join(', ')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-2 font-mono text-lg">{result.trucoValue}</td>
                                            <td className="p-2 font-mono text-lg">
                                                <span className={result.aiAssessment > 0.75 ? 'text-green-400' : result.aiAssessment > 0.5 ? 'text-yellow-400' : 'text-red-400'}>
                                                    {result.aiAssessment.toFixed(2)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BatchAnalyzer;