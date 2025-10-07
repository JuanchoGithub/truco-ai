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

// New types for AI learning
export interface OpponentModel {
  trucoFoldRate: number;
  bluffSuccessRate: number;
}

export interface Case {
  strength: number;
  isBluff: boolean;
  outcome: 'win' | 'loss';
  opponentFoldRateAtTimeOfCall: number;
}

export interface AiTrucoContext {
  strength: number;
  isBluff: boolean;
}

export interface OpponentHandProbabilities {
  suitDist: Partial<Record<Suit, number>>;
  rankProbs: Partial<Record<Rank, number>>;
  unseenCards: Card[];
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
  isGameLogExpanded: boolean;
  lastCaller: Player | null;
  turnBeforeInterrupt: Player | null;
  pendingTrucoCaller: Player | null;
  hasEnvidoBeenCalledThisRound: boolean;
  hasFlorBeenCalledThisRound: boolean;
  playerHasFlor: boolean;
  aiHasFlor: boolean;
  envidoPointsOnOffer: number;
  trucoLevel: 0 | 1 | 2 | 3;
  playerEnvidoFoldHistory: boolean[];
  playerCalledHighEnvido: boolean;
  playedCards: Card[];

  // AI Learning & Modeling
  opponentModel: OpponentModel;
  aiCases: Case[];
  aiTrucoContext: AiTrucoContext | null;
  
  // New: Probabilistic Opponent Modeling
  opponentHandProbabilities: OpponentHandProbabilities | null;
  playerEnvidoValue: number | null;
  playerActionHistory: ActionType[];
  
  // AI Blurb for phrases
  aiBlurb: { text: string; isVisible: boolean; } | null;
}

export interface AiMove {
  action: Action;
  reasoning: string;
  trucoContext?: AiTrucoContext;
}

export enum ActionType {
  TOGGLE_DEBUG_MODE = 'TOGGLE_DEBUG_MODE',
  ADD_AI_REASONING_LOG = 'ADD_AI_REASONING_LOG',
  TOGGLE_AI_LOG_EXPAND = 'TOGGLE_AI_LOG_EXPAND',
  TOGGLE_GAME_LOG_EXPAND = 'TOGGLE_GAME_LOG_EXPAND',
  RESTART_GAME = 'RESTART_GAME',
  START_NEW_ROUND = 'START_NEW_ROUND',
  PLAY_CARD = 'PLAY_CARD',
  CALL_ENVIDO = 'CALL_ENVIDO',
  CALL_REAL_ENVIDO = 'CALL_REAL_ENVIDO',
  CALL_FALTA_ENVIDO = 'CALL_FALTA_ENVIDO',
  DECLARE_FLOR = 'DECLARE_FLOR',
  CALL_TRUCO = 'CALL_TRUCO',
  CALL_RETRUCO = 'CALL_RETRUCO',
  CALL_VALE_CUATRO = 'CALL_VALE_CUATRO',
  CALL_FALTA_TRUCO = 'CALL_FALTA_TRUCO',
  ACCEPT = 'ACCEPT',
  DECLINE = 'DECLINE',
  AI_THINKING = 'AI_THINKING',
  ADD_MESSAGE = 'ADD_MESSAGE',
  SET_AI_TRUCO_CONTEXT = 'SET_AI_TRUCO_CONTEXT',
  // New internal action for model updates
  UPDATE_OPPONENT_PROBS = 'UPDATE_OPPONENT_PROBS',
}

export type Action =
  | { type: ActionType.TOGGLE_DEBUG_MODE }
  | { type: ActionType.ADD_AI_REASONING_LOG; payload: AiReasoningEntry }
  | { type: ActionType.TOGGLE_AI_LOG_EXPAND }
  | { type: ActionType.TOGGLE_GAME_LOG_EXPAND }
  | { type: ActionType.RESTART_GAME }
  | { type: ActionType.START_NEW_ROUND }
  | { type: ActionType.PLAY_CARD; payload: { player: Player; cardIndex: number } }
  | { type: ActionType.CALL_ENVIDO; payload?: { blurbText: string } }
  | { type: ActionType.CALL_REAL_ENVIDO; payload?: { blurbText: string } }
  | { type: ActionType.CALL_FALTA_ENVIDO; payload?: { blurbText: string } }
  | { type: ActionType.DECLARE_FLOR }
  | { type: ActionType.CALL_TRUCO; payload?: { blurbText: string } }
  | { type: ActionType.CALL_RETRUCO; payload?: { blurbText: string } }
  | { type: ActionType.CALL_VALE_CUATRO; payload?: { blurbText: string } }
  | { type: ActionType.CALL_FALTA_TRUCO }
  | { type: ActionType.ACCEPT }
  | { type: ActionType.DECLINE }
  | { type: ActionType.AI_THINKING; payload: boolean }
  | { type: ActionType.ADD_MESSAGE; payload: string }
  | { type: ActionType.SET_AI_TRUCO_CONTEXT; payload: AiTrucoContext }
  | { type: ActionType.UPDATE_OPPONENT_PROBS; payload: OpponentHandProbabilities };