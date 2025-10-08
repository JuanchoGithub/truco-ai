import { GameState, OpponentModel, Case, PlayerTrucoCallEntry, PlayerEnvidoActionEntry, PlayerPlayOrderEntry, PlayerCardPlayStatistics, RoundSummary } from '../types';

const STORAGE_KEY = 'trucoAiGameState';

interface PersistedState {
    opponentModel: OpponentModel;
    aiCases: Case[];
    playerEnvidoFoldHistory: boolean[];
    playerTrucoCallHistory: PlayerTrucoCallEntry[];
    playerEnvidoHistory: PlayerEnvidoActionEntry[];
    playerPlayOrderHistory: PlayerPlayOrderEntry[];
    playerCardPlayStats: PlayerCardPlayStatistics;
    roundHistory: RoundSummary[];
}

export const saveStateToStorage = (state: GameState): void => {
    try {
        const stateToPersist: PersistedState = {
            opponentModel: state.opponentModel,
            aiCases: state.aiCases,
            playerEnvidoFoldHistory: state.playerEnvidoFoldHistory,
            playerTrucoCallHistory: state.playerTrucoCallHistory,
            playerEnvidoHistory: state.playerEnvidoHistory,
            playerPlayOrderHistory: state.playerPlayOrderHistory,
            playerCardPlayStats: state.playerCardPlayStats,
            roundHistory: state.roundHistory,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToPersist));
    } catch (error) {
        console.error("Failed to save state to localStorage:", error);
    }
};

export const loadStateFromStorage = (): Partial<GameState> | null => {
    try {
        const serializedState = localStorage.getItem(STORAGE_KEY);
        if (serializedState === null) {
            return null;
        }
        const parsedState: PersistedState = JSON.parse(serializedState);
        // Basic validation
        if (parsedState && typeof parsedState.opponentModel === 'object') {
            return {
                ...parsedState,
                // Provide defaults for new fields if loading old data
                playerEnvidoHistory: parsedState.playerEnvidoHistory || [],
                playerPlayOrderHistory: parsedState.playerPlayOrderHistory || [],
                playerCardPlayStats: parsedState.playerCardPlayStats || undefined, // Let reducer handle initial state
                roundHistory: parsedState.roundHistory || [],
            };
        }
        return null;
    } catch (error) {
        console.error("Failed to load state from localStorage:", error);
        return null;
    }
};

export const clearStateFromStorage = (): void => {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error("Failed to clear state from localStorage:", error);
    }
}
