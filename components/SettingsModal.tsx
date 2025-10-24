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
}

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
        <div>
            <div className="flex items-center justify-between mb-2">
                <span className="text-gray-200">{label}</span>
                <button
                    onClick={onToggle}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-yellow-500 ${ isEnabled ? 'bg-green-600' : 'bg-gray-600' }`}
                >
                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${ isEnabled ? 'translate-x-6' : 'translate-x-1' }`} />
                </button>
            </div>
            <div className="flex items-center gap-2">
                <select
                    value={selectedVoiceURI}
                    onChange={(e) => onVoiceChange(e.target.value)}
                    className="w-full p-2 bg-gray-700/50 border border-yellow-700/40 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 disabled:opacity-50"
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
                    className="px-3 py-2 text-sm rounded-lg font-semibold text-yellow-200 bg-black/40 border-2 border-yellow-800/80 shadow-md hover:bg-black/60 hover:border-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
}) => {
  const { t, setLanguage, language } = useLocalization();
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const updateVoices = () => {
        const voices = speechService.getVoicesForLanguage(language);
        setAvailableVoices(voices);
    };
    
    // Voices might load asynchronously. We listen for an event from the service.
    speechService.onVoicesLoaded(updateVoices);
    updateVoices(); // Initial call in case they are already loaded

    return () => {
        speechService.offVoicesLoaded(updateVoices);
    };
  }, [language]);


  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in-scale">
      <div className="bg-green-800 border-4 border-yellow-500 rounded-xl shadow-2xl p-6 lg:p-8 text-left w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl lg:text-3xl font-bold text-yellow-300 font-cinzel">
              {t('settingsModal.title')}
            </h2>
            <button onClick={onClose} className="text-yellow-200 text-3xl font-bold hover:text-white transition-colors">&times;</button>
        </div>

        <div className="space-y-6">
            <div>
                <label htmlFor="language-select" className="block text-lg font-semibold text-gray-200 mb-2">{t('settingsModal.language')}</label>
                <select
                    id="language-select"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full p-2 bg-gray-900/50 border-2 border-yellow-700/60 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                    <option value="es-AR">Español (Argentina)</option>
                    <option value="en-US">English (US)</option>
                </select>
            </div>
            
            <div>
                <h3 className="text-lg font-semibold text-gray-200 mb-2">{t('settingsModal.sound')}</h3>
                <div className="space-y-6 bg-black/20 p-4 rounded-md">
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
            </div>
        </div>

        <div className="text-center mt-8">
            <button
                onClick={onClose}
                className="px-8 py-3 text-lg bg-yellow-600 text-white font-bold rounded-lg shadow-lg hover:bg-yellow-500 transition-colors duration-200 border-b-4 border-yellow-800"
            >
                {t('common.close')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;