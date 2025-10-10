import { GameState } from '../types';

const getStorageKey = (gameMode: 'playing' | 'playing-with-help'): string => `trucoAiGameState_${gameMode}`;

export const saveStateToStorage = (state: GameState, gameMode: 'playing' | 'playing-with-help'): void => {
    try {
        // Omit transient UI state that shouldn't be persisted.
        // This prevents loading the app into a weird UI state (e.g., a modal open).
        const { 
            isLogExpanded, 
            isGameLogExpanded, 
            isDataModalVisible, 
            isThinking, 
            centralMessage,
            aiBlurb,
            ...stateToPersist 
        } = state;

        const key = getStorageKey(gameMode);
        localStorage.setItem(key, JSON.stringify(stateToPersist));
    } catch (error) {
        console.error("Failed to save state to localStorage:", error);
    }
};

export const loadStateFromStorage = (gameMode: 'playing' | 'playing-with-help'): Partial<GameState> | null => {
    try {
        const key = getStorageKey(gameMode);
        const serializedState = localStorage.getItem(key);
        if (serializedState === null) {
            return null;
        }
        
        const parsedState: Partial<GameState> = JSON.parse(serializedState);
        
        // Basic validation to make sure we're not loading corrupted/old data.
        if (parsedState && typeof parsedState.playerScore === 'number' && typeof parsedState.round === 'number') {
            return parsedState;
        }
        
        console.warn("Loaded state from storage failed validation, clearing.");
        clearStateFromStorage(gameMode);
        return null;
    } catch (error) {
        console.error("Failed to load state from localStorage:", error);
        return null;
    }
};

export const clearStateFromStorage = (gameMode: 'playing' | 'playing-with-help'): void => {
    try {
        const key = getStorageKey(gameMode);
        localStorage.removeItem(key);
    } catch (error) {
        console.error("Failed to clear state from localStorage:", error);
    }
}
