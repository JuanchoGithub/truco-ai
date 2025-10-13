import i18nService from '../i18nService';

export const getRandomPhrase = (phraseKey: string): string => {
  // The i18n service already handles picking a random phrase from an array
  return i18nService.t(phraseKey);
};

// Keys for i18n to ensure consistency
export const PHRASE_KEYS = {
    QUIERO: 'phrases.quiero',
    NO_QUIERO: 'phrases.no_quiero',
    ENVIDO_WIN: 'phrases.envido_win',
    ENVIDO_LOSE: 'phrases.envido_lose',
    TRICK_WIN: 'phrases.trick_win',
    TRICK_LOSE: 'phrases.trick_lose',
    FLOR: 'phrases.flor',
    CONTRAFLOR: 'phrases.contraflor',
    CONTRAFLOR_QUIERO: 'phrases.contraflor_quiero',
    CONTRAFLOR_NO_QUIERO: 'phrases.contraflor_no_quiero',
    ENVIDO_PRIMERO: 'phrases.envido_primero',
    POST_ENVIDO_TRUCO_REMINDER: 'phrases.post_envido_truco_reminder',
    ENVIDO: 'phrases.envido',
    REAL_ENVIDO: 'phrases.real_envido',
    FALTA_ENVIDO: 'phrases.falta_envido',
    TRUCO: 'phrases.truco',
    RETRUCO: 'phrases.retruco',
    VALE_CUATRO: 'phrases.vale_cuatro',
};
