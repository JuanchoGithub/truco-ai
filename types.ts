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
  | 'game_over'
  // New intermediate phases for delayed resolution
  | 'ENVIDO_ACCEPTED'
  | 'ENVIDO_DECLINED'
  | 'TRUCO_DECLINED'
  // New Flor phases
  | 'flor_called'
  | 'contraflor_called'
  | 'FLOR_SHOWDOWN'
  | 'CONTRAFLOR_DECLINED';


export interface AiReasoningEntry {
  round: number;
  reasoning: string;
}

// New types for AI learning

// New: Types for granular, contextual opponent modeling
export interface ActionStat {
    attempts: number;
    successes: number;
}

export interface ContextualActionStat {
    mano: ActionStat;
    pie: ActionStat;
}

export interface EnvidoContextualBehavior {
    callThreshold: number;
    foldRate: number;
    escalationRate: number;
}

export interface EnvidoBehavior {
    mano: EnvidoContextualBehavior;
    pie: EnvidoContextualBehavior;
}


export interface OpponentModel {
  trucoFoldRate: number; // General fold rate, acts as a fallback/total
  bluffSuccessRate: number; // General success rate
  envidoBehavior: EnvidoBehavior;
  playStyle: {
    leadWithHighestRate: number; // When mano, trick 1
    baitRate: number;
    envidoPrimeroRate: number; // NEW: Rate of responding to Truco with Envido
  };
  trucoBluffs: ContextualActionStat;
}

export interface PlayerEnvidoActionEntry {
  round: number;
  envidoPoints: number;
  action: 'called' | 'did_not_call' | 'folded' | 'accepted' | 'escalated_real' | 'escalated_falta';
  wasMano: boolean;
}

export interface PlayerPlayOrderEntry {
    round: number;
    trick: number;
    handBeforePlay: string[];
    playedCard: string;
    wasLeadingTrick: boolean;
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

export interface PlayerTrucoCallEntry {
  strength: number;
  mano: boolean;
}

// New types for detailed card play analysis
export type CardCategory =
  | 'ancho_espada'
  | 'ancho_basto'
  | 'siete_espada'
  | 'siete_oro'
  | 'tres'
  | 'dos'
  | 'anchos_falsos' // 1 de oro/copas
  | 'reyes' // 12
  | 'caballos' // 11
  | 'sotas' // 10
  | 'sietes_malos' // 7 de bastos/copas
  | 'seis'
  | 'cincos'
  | 'cuatros';

export interface CardPlayStats {
  plays: number;
  wins: number; // trick wins
  byTrick: [number, number, number]; // plays in trick 1, 2, 3
  asLead: number;
  asResponse: number;
}

export type PlayerCardPlayStatistics = Record<CardCategory, CardPlayStats>;

export interface PointNote {
    key: string;
    options?: { [key: string]: string | number };
}

export interface MessageObject {
  key: string;
  options?: { [key: string]: any };
}

export interface RoundSummary {
    round: number;
    mano: Player;
    playerInitialHand: string[];
    aiInitialHand: string[];
    playerHandStrength: number;
    aiHandStrength: number;
    playerEnvidoPoints: number;
    aiEnvidoPoints: number;
    calls: string[]; // e.g., "Player: ENVIDO", "AI: REAL ENVIDO", "Player: QUIERO"
    playerTricks: (string | null)[];
    aiTricks: (string | null)[];
    trickWinners: (Player | 'tie' | null)[];
    roundWinner: Player | 'tie' | null;
    pointsAwarded: {
        player: number;
        ai: number;
        by?: {
            flor: { player: number; ai: number; note: PointNote };
            envido: { player: number; ai: number; note: PointNote };
            truco: { player: number; ai: number; note: PointNote };
        }
    };
    playerTrucoCall: {
        handStrength: number;
        isBluff: boolean;
    } | null;
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
  currentTurn: Player | null;
  gamePhase: GamePhase;
  isThinking: boolean;
  winner: Player | null;
  gameOverReason: MessageObject | null;
  messageLog: (string | MessageObject)[];
  isDebugMode: boolean;
  aiReasoningLog: AiReasoningEntry[];
  isLogExpanded: boolean;
  isGameLogExpanded: boolean;
  lastCaller: Player | null;
  turnBeforeInterrupt: Player | null;
  pendingTrucoCaller: Player | null;
  hasEnvidoBeenCalledThisRound: boolean;
  hasRealEnvidoBeenCalledThisSequence: boolean;
  hasFlorBeenCalledThisRound: boolean;
  playerHasFlor: boolean;
  aiHasFlor: boolean;
  envidoPointsOnOffer: number;
  previousEnvidoPoints: number;
  florPointsOnOffer: number;
  trucoLevel: 0 | 1 | 2 | 3;
  playerEnvidoFoldHistory: boolean[];
  playerTrucoCallHistory: PlayerTrucoCallEntry[];
  playerCalledHighEnvido: boolean;
  playedCards: Card[];

  // AI Learning & Modeling
  opponentModel: OpponentModel;
  aiCases: Case[];
  aiTrucoContext: AiTrucoContext | null;
  
  // New: Probabilistic Opponent Modeling
  opponentHandProbabilities: OpponentHandProbabilities | null;
  playerEnvidoValue: number | null;
  aiEnvidoValue: number | null;
  playerActionHistory: ActionType[];
  
  // Blurbs for phrases
  aiBlurb: { text: string; isVisible: boolean; } | null;
  playerBlurb: { text: string; isVisible: boolean; } | null;

  // Round Winner Announcement
  lastRoundWinner: Player | 'tie' | null;

  // Central message for key events
  centralMessage: MessageObject | null;
  isCentralMessagePersistent: boolean;

  // Data Modal for user behavior
  isDataModalVisible: boolean;

  // Granular Behavior Tracking
  playerEnvidoHistory: PlayerEnvidoActionEntry[];
  playerPlayOrderHistory: PlayerPlayOrderEntry[];
  envidoPrimeroOpportunities: number;
  envidoPrimeroCalls: number;

  // New Detailed Statistics
  playerCardPlayStats: PlayerCardPlayStatistics;
  roundHistory: RoundSummary[];
}

export interface AiMove {
  action: Action;
  reasoning: string;
  summary?: string;
}

export enum ActionType {
  TOGGLE_DEBUG_MODE = 'TOGGLE_DEBUG_MODE',
  ADD_AI_REASONING_LOG = 'ADD_AI_REASONING_LOG',
  TOGGLE_AI_LOG_EXPAND = 'TOGGLE_AI_LOG_EXPAND',
  TOGGLE_GAME_LOG_EXPAND = 'TOGGLE_GAME_LOG_EXPAND',
  RESTART_GAME = 'RESTART_GAME',
  START_NEW_ROUND = 'START_NEW_ROUND',
  PROCEED_TO_NEXT_ROUND = 'PROCEED_TO_NEXT_ROUND',
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
  // New internal action for model updates
  UPDATE_OPPONENT_PROBS = 'UPDATE_OPPONENT_PROBS',
  // New actions for delayed resolution
  RESOLVE_ENVIDO_ACCEPT = 'RESOLVE_ENVIDO_ACCEPT',
  RESOLVE_ENVIDO_DECLINE = 'RESOLVE_ENVIDO_DECLINE',
  RESOLVE_TRUCO_DECLINE = 'RESOLVE_TRUCO_DECLINE',
  RESOLVE_FLOR_SHOWDOWN = 'RESOLVE_FLOR_SHOWDOWN',
  RESOLVE_CONTRAFLOR_DECLINE = 'RESOLVE_CONTRAFLOR_DECLINE',
  // Central Message
  CLEAR_CENTRAL_MESSAGE = 'CLEAR_CENTRAL_MESSAGE',
  // Player Blurb
  CLEAR_PLAYER_BLURB = 'CLEAR_PLAYER_BLURB',
  CLEAR_AI_BLURB = 'CLEAR_AI_BLURB',
  // Data Modal
  TOGGLE_DATA_MODAL = 'TOGGLE_DATA_MODAL',
  // Local Storage
  LOAD_PERSISTED_STATE = 'LOAD_PERSISTED_STATE',
  // New action for imported data
  LOAD_IMPORTED_DATA = 'LOAD_IMPORTED_DATA',
  // New Flor Actions
  RESPOND_TO_ENVIDO_WITH_FLOR = 'RESPOND_TO_ENVIDO_WITH_FLOR',
  ACKNOWLEDGE_FLOR = 'ACKNOWLEDGE_FLOR',
  CALL_CONTRAFLOR = 'CALL_CONTRAFLOR',
  ACCEPT_CONTRAFLOR = 'ACCEPT_CONTRAFLOR',
  DECLINE_CONTRAFLOR = 'DECLINE_CONTRAFLOR',
}

export type Action =
  | { type: ActionType.TOGGLE_DEBUG_MODE }
  | { type: ActionType.ADD_AI_REASONING_LOG; payload: AiReasoningEntry }
  | { type: ActionType.TOGGLE_AI_LOG_EXPAND }
  | { type: ActionType.TOGGLE_GAME_LOG_EXPAND }
  | { type: ActionType.RESTART_GAME }
  | { type: ActionType.START_NEW_ROUND }
  | { type: ActionType.PROCEED_TO_NEXT_ROUND }
  | { type: ActionType.PLAY_CARD; payload: { player: Player; cardIndex: number } }
  | { type: ActionType.CALL_ENVIDO; payload?: { blurbText: string } }
  | { type: ActionType.CALL_REAL_ENVIDO; payload?: { blurbText: string } }
  | { type: ActionType.CALL_FALTA_ENVIDO; payload?: { blurbText: string } }
  | { type: ActionType.DECLARE_FLOR; payload?: { blurbText?: string; player?: Player } }
  | { type: ActionType.CALL_TRUCO; payload?: { blurbText: string; trucoContext?: AiTrucoContext } }
  | { type: ActionType.CALL_RETRUCO; payload?: { blurbText: string; trucoContext?: AiTrucoContext } }
  | { type: ActionType.CALL_VALE_CUATRO; payload?: { blurbText: string; trucoContext?: AiTrucoContext } }
  | { type: ActionType.CALL_FALTA_TRUCO }
  | { type: ActionType.ACCEPT; payload?: { blurbText: string } }
  | { type: ActionType.DECLINE; payload?: { blurbText: string } }
  | { type: ActionType.AI_THINKING; payload: boolean }
  | { type: ActionType.ADD_MESSAGE; payload: string | MessageObject }
  | { type: ActionType.UPDATE_OPPONENT_PROBS; payload: OpponentHandProbabilities }
  | { type: ActionType.RESOLVE_ENVIDO_ACCEPT }
  | { type: ActionType.RESOLVE_ENVIDO_DECLINE }
  | { type: ActionType.RESOLVE_TRUCO_DECLINE }
  | { type: ActionType.RESOLVE_FLOR_SHOWDOWN }
  | { type: ActionType.RESOLVE_CONTRAFLOR_DECLINE }
  | { type: ActionType.CLEAR_CENTRAL_MESSAGE }
  | { type: ActionType.CLEAR_PLAYER_BLURB }
  | { type: ActionType.CLEAR_AI_BLURB }
  | { type: ActionType.TOGGLE_DATA_MODAL }
  | { type: ActionType.LOAD_PERSISTED_STATE; payload: Partial<GameState> }
  | { type: ActionType.LOAD_IMPORTED_DATA; payload: Partial<GameState> }
  // New Flor Actions
  | { type: ActionType.RESPOND_TO_ENVIDO_WITH_FLOR; payload?: { blurbText: string } }
  | { type: ActionType.ACKNOWLEDGE_FLOR; payload?: { blurbText: string } }
  | { type: ActionType.CALL_CONTRAFLOR; payload?: { blurbText: string } }
  | { type: ActionType.ACCEPT_CONTRAFLOR; payload?: { blurbText: string } }
  | { type: ActionType.DECLINE_CONTRAFLOR; payload?: { blurbText: string } };