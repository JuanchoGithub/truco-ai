// Fix: Created a dedicated types file to resolve circular dependencies and export all necessary types.

export type Suit = 'espadas' | 'bastos' | 'oros' | 'copas';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10 | 11 | 12;

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type Player = 'player' | 'ai';

export type GamePhase =
  | 'initial'
  | 'trick_1'
  | 'trick_2'
  | 'trick_3'
  | 'envido_called'
  | 'truco_called'
  | 'retruco_called'
  | 'vale_cuatro_called'
  | 'round_end'
  | 'game_over';

export interface AiReasoningEntry {
  round: number;
  reasoning: string;
}

export interface GameState {
  deck: Card[];
  playerHand: Card[];
  aiHand: Card[];
  initialPlayerHand: Card[];
  initialAiHand: Card[];
  playerTricks: (Card | null)[];
  aiTricks: (Card | null)[];
  trickWinners: (Player | 'tie' | null)[];
  currentTrick: number;
  playerScore: number;
  aiScore: number;
  round: number;
  mano: Player;
  currentTurn: Player;
  gamePhase: GamePhase;
  isThinking: boolean;
  winner: Player | null;
  messageLog: string[];
  isDebugMode: boolean;
  aiReasoningLog: AiReasoningEntry[];
  isLogExpanded: boolean;
  lastCaller: Player | null;
  turnBeforeEnvido: Player | null;
  hasEnvidoBeenCalledThisRound: boolean;
  envidoPointsOnOffer: number;
  trucoLevel: 0 | 1 | 2 | 3;
  playerEnvidoFoldHistory: boolean[]; // true for fold, false for accept/escalate
}

export interface AiMove {
  action: Action;
  reasoning: string;
}

export enum ActionType {
  TOGGLE_DEBUG_MODE = 'TOGGLE_DEBUG_MODE',
  ADD_AI_REASONING_LOG = 'ADD_AI_REASONING_LOG',
  TOGGLE_AI_LOG_EXPAND = 'TOGGLE_AI_LOG_EXPAND',
  RESTART_GAME = 'RESTART_GAME',
  START_NEW_ROUND = 'START_NEW_ROUND',
  PLAY_CARD = 'PLAY_CARD',
  CALL_ENVIDO = 'CALL_ENVIDO',
  CALL_REAL_ENVIDO = 'CALL_REAL_ENVIDO',
  CALL_FALTA_ENVIDO = 'CALL_FALTA_ENVIDO',
  CALL_TRUCO = 'CALL_TRUCO',
  CALL_RETRUCO = 'CALL_RETRUCO',
  CALL_VALE_CUATRO = 'CALL_VALE_CUATRO',
  ACCEPT = 'ACCEPT',
  DECLINE = 'DECLINE',
  AI_THINKING = 'AI_THINKING',
  ADD_MESSAGE = 'ADD_MESSAGE',
}

export type Action =
  | { type: ActionType.TOGGLE_DEBUG_MODE }
  | { type: ActionType.ADD_AI_REASONING_LOG; payload: AiReasoningEntry }
  | { type: ActionType.TOGGLE_AI_LOG_EXPAND }
  | { type: ActionType.RESTART_GAME }
  | { type: ActionType.START_NEW_ROUND }
  | { type: ActionType.PLAY_CARD; payload: { player: Player; cardIndex: number } }
  | { type: ActionType.CALL_ENVIDO }
  | { type: ActionType.CALL_REAL_ENVIDO }
  | { type: ActionType.CALL_FALTA_ENVIDO }
  | { type: ActionType.CALL_TRUCO }
  | { type: ActionType.CALL_RETRUCO }
  | { type: ActionType.CALL_VALE_CUATRO }
  | { type: ActionType.ACCEPT }
  | { type: ActionType.DECLINE }
  | { type: ActionType.AI_THINKING; payload: boolean }
  | { type: ActionType.ADD_MESSAGE; payload: string };