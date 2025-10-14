import { GameState, Card } from '../types';
import { decodeCardFromCode } from './trucoLogic';

interface PredefinedScenario {
    nameKey: string;
    state: Partial<GameState>;
}

export const predefinedScenarios: PredefinedScenario[] = [
    {
        nameKey: 'scenario_tester.scenario_names.parda_y_gano',
        state: {
            aiHand: ['E7', 'B6'].map(decodeCardFromCode),
            playerHand: ['O7', 'C4'].map(decodeCardFromCode),
            aiTricks: [ { rank: 3, suit: 'bastos' }, null, null ],
            playerTricks: [ { rank: 3, suit: 'oros' }, null, null ],
            trickWinners: ['tie', null, null],
            currentTrick: 1,
            mano: 'ai',
            currentTurn: 'ai',
            gamePhase: 'trick_2',
            aiScore: 5,
            playerScore: 5
        }
    },
    {
        nameKey: 'scenario_tester.scenario_names.do_or_die',
        state: {
            aiHand: ['B4', 'C5', 'O6'].map(decodeCardFromCode), // Weak hand
            playerHand: ['E3', 'O2', 'C1'].map(decodeCardFromCode), // Strong hand
            aiScore: 13,
            playerScore: 14,
            trucoLevel: 1,
            gamePhase: 'truco_called',
            lastCaller: 'player',
            currentTurn: 'ai',
            mano: 'player'
        }
    },
    {
        nameKey: 'scenario_tester.scenario_names.lopsided_bait',
        state: {
            aiHand: ['O7', 'O6', 'C4'].map(decodeCardFromCode), // 33 envido, weak truco
            playerHand: ['E3', 'B2', 'C1'].map(decodeCardFromCode),
            aiScore: 8,
            playerScore: 8,
            currentTrick: 0,
            mano: 'ai',
            currentTurn: 'ai',
            gamePhase: 'trick_1'
        }
    },
    {
        nameKey: 'scenario_tester.scenario_names.envido_primero',
        state: {
            aiHand: ['E7', 'E6', 'B4'].map(decodeCardFromCode), // 33 envido
            playerHand: ['B7', 'B2', 'O1'].map(decodeCardFromCode),
            aiScore: 10,
            playerScore: 10,
            trucoLevel: 1,
            gamePhase: 'truco_called',
            lastCaller: 'player',
            currentTurn: 'ai',
            mano: 'player',
            currentTrick: 0
        }
    },
    {
        nameKey: 'scenario_tester.scenario_names.flor_vs_envido',
        state: {
            aiHand: ['O7', 'O6', 'O5'].map(decodeCardFromCode), // 33 flor
            playerHand: ['E7', 'E6', 'B2'].map(decodeCardFromCode), // 33 envido
            aiHasFlor: true,
            playerHasFlor: false,
            aiScore: 2,
            playerScore: 2,
            gamePhase: 'envido_called',
            lastCaller: 'player',
            currentTurn: 'ai',
            mano: 'player',
            currentTrick: 0
        }
    }
];