import i18nService from './i18nService';

class SpeechService {
  private synthesis: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  
  private opponentSoundEnabled: boolean = false;
  private assistantSoundEnabled: boolean = false;

  private onVoicesLoadedCallbacks: (() => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
      this.loadVoices();
      
      this.opponentSoundEnabled = JSON.parse(localStorage.getItem('trucoAiOpponentSoundEnabled') || 'false');
      this.assistantSoundEnabled = JSON.parse(localStorage.getItem('trucoAiAssistantSoundEnabled') || 'false');
    } else {
      console.warn('Speech synthesis not supported in this browser.');
    }
  }
  
  private loadVoices = () => {
    const getAndSetVoices = () => {
        const voiceList = this.synthesis?.getVoices();
        if (voiceList && voiceList.length > 0) {
            this.voices = voiceList;
            this.onVoicesLoadedCallbacks.forEach(cb => cb());
        }
    };
    
    getAndSetVoices();
    if (this.synthesis && this.synthesis.onvoiceschanged !== undefined) {
        this.synthesis.onvoiceschanged = getAndSetVoices;
    }
  };

  public onVoicesLoaded(callback: () => void) {
    this.onVoicesLoadedCallbacks.push(callback);
  }

  public offVoicesLoaded(callback: () => void) {
    this.onVoicesLoadedCallbacks = this.onVoicesLoadedCallbacks.filter(cb => cb !== callback);
  }

  public getVoicesForLanguage(lang: string): SpeechSynthesisVoice[] {
    const langPrefix = lang.split('-')[0];
    return this.voices.filter(voice => voice.lang.startsWith(langPrefix));
  }

  public setOpponentSoundEnabled(enabled: boolean) {
    this.opponentSoundEnabled = enabled;
  }
  public setAssistantSoundEnabled(enabled: boolean) {
    this.assistantSoundEnabled = enabled;
  }
  
  speak(text: string, type: 'opponent' | 'assistant') {
    const isEnabled = type === 'opponent' ? this.opponentSoundEnabled : this.assistantSoundEnabled;
    if (!this.synthesis || !text || !isEnabled) {
      return;
    }
    
    if (this.synthesis.speaking) {
        this.synthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    const voiceURI = localStorage.getItem(type === 'opponent' ? 'trucoAiOpponentVoiceURI' : 'trucoAiAssistantVoiceURI');
    let selectedVoice: SpeechSynthesisVoice | null = null;

    if (voiceURI && voiceURI !== 'auto') {
        selectedVoice = this.voices.find(v => v.voiceURI === voiceURI) || null;
    }

    if (!selectedVoice) {
        const lang = i18nService.getCurrentLanguage();
        const langPrefix = lang.split('-')[0];
        
        let voicePriority: ((v: SpeechSynthesisVoice) => boolean)[] = [];
        if (langPrefix === 'es') {
            voicePriority = [
                (v: SpeechSynthesisVoice) => v.lang === 'es-AR', (v: SpeechSynthesisVoice) => v.lang === 'es-MX',
                (v: SpeechSynthesisVoice) => v.lang === 'es-US', (v: SpeechSynthesisVoice) => v.lang === 'es-ES',
                (v: SpeechSynthesisVoice) => v.lang.startsWith('es-'),
            ];
        } else { // 'en'
            voicePriority = [
                (v: SpeechSynthesisVoice) => v.lang === 'en-US', (v: SpeechSynthesisVoice) => v.lang === 'en-GB',
                (v: SpeechSynthesisVoice) => v.lang.startsWith('en-'),
            ];
        }

        for (const condition of voicePriority) {
            const found = this.voices.find(condition);
            if (found) {
                selectedVoice = found;
                break;
            }
        }
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.rate = 1;
    utterance.pitch = 1;
    
    setTimeout(() => {
        this.synthesis?.speak(utterance);
    }, 50);
  }

  public testVoice(text: string, voiceURI: string) {
    if (!this.synthesis || !text) {
        return;
    }
    if (voiceURI === 'auto') {
        // Test with default voice for current language
        this.speak(text, 'assistant'); // Use assistant as a dummy type for default voice selection
        return;
    }
    if (this.synthesis.speaking) {
        this.synthesis.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = this.voices.find(v => v.voiceURI === voiceURI);
    if (voice) {
        utterance.voice = voice;
        utterance.rate = 1;
        utterance.pitch = 1;
        this.synthesis.speak(utterance);
    } else {
        console.warn(`Test voice: Could not find voice with URI: ${voiceURI}`);
    }
  }
  
  cancel() {
    if (this.synthesis?.speaking) {
        this.synthesis.cancel();
    }
  }
}

export const speechService = new SpeechService();