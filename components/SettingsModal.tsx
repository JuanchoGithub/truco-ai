
import React, { useState, useEffect } from 'react';
import { useLocalization } from '../context/LocalizationContext';
import { speechService } from '../services/speechService';

interface SettingsModalProps {
  onClose: () => void;
  isOpponentSoundEnabled: boolean;
  onToggleOpponentSound: () => void;
  isAssistantSoundEnabled: boolean;
  onToggleAssistantSound: () => void;
  opponentVoiceURI: string;
  onOpponentVoiceChange: (uri: string) => void;
  assistantVoiceURI: string;
  onAssistantVoiceChange: (uri: string) => void;
  isFlorEnabled: boolean;
  onToggleFlor: () => void;
}

const ToggleSwitch: React.FC<{ isEnabled: boolean; onToggle: () => void }> = ({ isEnabled, onToggle }) => (
    <button
        onClick={onToggle}
        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-stone-900 focus:ring-amber-500 border ${ isEnabled ? 'bg-green-700 border-green-600' : 'bg-stone-700 border-stone-600' }`}
    >
        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform shadow-md ${ isEnabled ? 'translate-x-6' : 'translate-x-1' }`} />
    </button>
);

const VoiceSelector: React.FC<{
    label: string;
    isEnabled: boolean;
    onToggle: () => void;
    voices: SpeechSynthesisVoice[];
    selectedVoiceURI: string;
    onVoiceChange: (uri: string) => void;
    testPhrase: string;
}> = ({ label, isEnabled, onToggle, voices, selectedVoiceURI, onVoiceChange, testPhrase }) => {
    const { t } = useLocalization();

    const handleTest = () => {
        speechService.testVoice(testPhrase, selectedVoiceURI);
    };

    return (
        <div className="p-3 bg-black/20 rounded-lg border border-white/5">
            <div className="flex items-center justify-between mb-3">
                <span className="text-stone-200 font-cinzel text-sm font-semibold tracking-wide">{label}</span>
                <ToggleSwitch isEnabled={isEnabled} onToggle={onToggle} />
            </div>
            <div className="flex items-center gap-2">
                <select
                    value={selectedVoiceURI}
                    onChange={(e) => onVoiceChange(e.target.value)}
                    className="flex-grow p-2 bg-stone-800 border border-stone-600 rounded-md text-stone-200 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-50 transition-colors"
                    disabled={!isEnabled}
                >
                    <option value="auto">{t('settingsModal.select_voice')}</option>
                    {voices.map(voice => (
                        <option key={voice.voiceURI} value={voice.voiceURI}>
                            {voice.name} ({voice.lang})
                        </option>
                    ))}
                </select>
                <button 
                    onClick={handleTest}
                    disabled={!isEnabled}
                    className="px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-md text-amber-100 bg-gradient-to-b from-stone-600 to-stone-700 border border-stone-500 shadow-sm hover:from-stone-500 hover:to-stone-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {t('settingsModal.test_voice')}
                </button>
            </div>
        </div>
    );
};


const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  isOpponentSoundEnabled,
  onToggleOpponentSound,
  isAssistantSoundEnabled,
  onToggleAssistantSound,
  opponentVoiceURI,
  onOpponentVoiceChange,
  assistantVoiceURI,
  onAssistantVoiceChange,
  isFlorEnabled,
  onToggleFlor,
}) => {
  const { t, setLanguage, language } = useLocalization();
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const updateVoices = () => {
        const voices = speechService.getVoicesForLanguage(language);
        setAvailableVoices(voices);
    };
    
    speechService.onVoicesLoaded(updateVoices);
    updateVoices();

    return () => {
        speechService.offVoicesLoaded(updateVoices);
    };
  }, [language]);


  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] animate-fade-in-scale backdrop-blur-sm p-4">
      <div className="bg-stone-900 border-4 border-double border-amber-700/50 rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-b from-amber-900/40 to-stone-900 p-6 border-b border-amber-700/30 flex justify-between items-center flex-shrink-0">
            <h2 className="text-2xl font-bold text-amber-400 font-cinzel tracking-widest drop-shadow-md">
              {t('settingsModal.title')}
            </h2>
            <button onClick={onClose} className="text-stone-400 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-stone-200 custom-scrollbar">
            
            {/* Language */}
            <section>
                 <h3 className="text-xs font-bold text-amber-600 uppercase tracking-[0.15em] mb-3 border-b border-white/5 pb-1">{t('settingsModal.language')}</h3>
                <select
                    id="language-select"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full p-3 bg-stone-800 border border-stone-600 rounded-lg text-white font-lora text-lg focus:outline-none focus:border-amber-500 transition-colors"
                >
                    <option value="es-AR">🇦🇷 Español (Argentina)</option>
                    <option value="en-US">🇺🇸 English (US)</option>
                </select>
            </section>
            
            {/* Sound */}
            <section>
                <h3 className="text-xs font-bold text-amber-600 uppercase tracking-[0.15em] mb-3 border-b border-white/5 pb-1">{t('settingsModal.sound')}</h3>
                <div className="space-y-3">
                    <VoiceSelector
                        label={t('settingsModal.opponent_voice')}
                        isEnabled={isOpponentSoundEnabled}
                        onToggle={onToggleOpponentSound}
                        voices={availableVoices}
                        selectedVoiceURI={opponentVoiceURI}
                        onVoiceChange={onOpponentVoiceChange}
                        testPhrase={t('settingsModal.test_phrase_opponent')}
                    />
                    <VoiceSelector
                        label={t('settingsModal.assistant_voice')}
                        isEnabled={isAssistantSoundEnabled}
                        onToggle={onToggleAssistantSound}
                        voices={availableVoices}
                        selectedVoiceURI={assistantVoiceURI}
                        onVoiceChange={onAssistantVoiceChange}
                        testPhrase={t('settingsModal.test_phrase_assistant')}
                    />
                </div>
            </section>
            
            {/* Rules */}
            <section>
                <h3 className="text-xs font-bold text-amber-600 uppercase tracking-[0.15em] mb-3 border-b border-white/5 pb-1">{t('settingsModal.rules')}</h3>
                <div className="p-4 bg-black/20 rounded-lg border border-white/5 flex items-center justify-between">
                    <span className="text-stone-200 font-cinzel font-semibold">{t('settingsModal.flor_enabled')}</span>
                    <ToggleSwitch isEnabled={isFlorEnabled} onToggle={onToggleFlor} />
                </div>
            </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-stone-900 flex justify-end">
            <button
                onClick={onClose}
                className="px-8 py-2 bg-gradient-to-b from-amber-600 to-amber-700 border-b-4 border-amber-900 rounded-lg text-white font-bold uppercase tracking-wider shadow-lg hover:from-amber-500 hover:to-amber-600 active:border-b-0 active:translate-y-1 transition-all"
            >
                {t('common.close')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
