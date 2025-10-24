import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import i18nService from '../services/i18nService';
import { speechService } from '../services/speechService';

interface LocalizationContextType {
  t: (key: string, options?: { [key: string]: any }) => string;
  setLanguage: (lang: string) => Promise<void>;
  language: string;
  isLoaded: boolean;
  translatePlayerName: (player: string) => string;
}

const defaultContextValue: LocalizationContextType = {
  t: (key) => key, // Return key as fallback before loading
  setLanguage: async () => {},
  language: 'es-AR',
  isLoaded: false,
  translatePlayerName: (player) => player,
};

const LocalizationContext = createContext<LocalizationContextType>(defaultContextValue);

export const LocalizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<string>('es-AR');
  const [isLoaded, setIsLoaded] = useState(false);

  const t = useCallback((key: string, options?: { [key: string]: any }): string => {
      return i18nService.t(key, options);
  }, [language]); // Dependency on `language` ensures `t` is fresh when language changes.

  const translatePlayerName = useCallback((player: string): string => {
    if (player === 'player') return t('common.you');
    if (player === 'ai') return t('common.ai');
    if (player === 'tie') return t('common.tie');
    if (player === 'Jugador') return t('common.you'); // Legacy fallback
    if (player === 'IA') return t('common.ai'); // Legacy fallback
    return player;
  }, [t]);

  const setLanguage = useCallback(async (lang: string) => {
    // Don't set isLoaded to false here, to avoid flicker on language change.
    // The loading screen will only show on initial load.
    await i18nService.loadLanguage(lang);
    // Fix: Removed call to non-existent 'setLanguage' method on speechService.
    // The speech service automatically uses the current language from i18nService.
    setLanguageState(lang);
    localStorage.setItem('truco-lang', lang);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const savedLang = localStorage.getItem('truco-lang');
    // For now, we only have es-AR, so we default to it.
    // In the future, this can be expanded to check browser language.
    const initialLang = savedLang || 'es-AR';
    setLanguage(initialLang);
  }, [setLanguage]);


  const value = { t, setLanguage, language, isLoaded, translatePlayerName };

  if (!isLoaded) {
    return (
      <div className="h-screen bg-green-900 text-white flex items-center justify-center" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/felt.png')"}}>
        <div className="text-center">
            <h1 className="text-6xl lg:text-8xl font-cinzel font-bold tracking-wider text-yellow-300 mb-2 animate-pulse" style={{ textShadow: '4px 4px 6px rgba(0,0,0,0.8)' }}>
              TRUCO AI
            </h1>
            {/* This loading text is hardcoded to avoid the race condition */}
            <p className="text-gray-300">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = (): LocalizationContextType => {
  const context = useContext(LocalizationContext);
  if (context === undefined) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};