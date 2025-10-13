class SpeechService {
  private synthesis: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private currentLang: string = 'es-AR'; // Default language

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
      this.loadVoices();
    } else {
      console.warn('Speech synthesis not supported in this browser.');
    }
  }

  public setLanguage(lang: string) {
    this.currentLang = lang;
    this.selectVoice(); // Re-select the voice when language changes
  }

  private loadVoices = () => {
    // getVoices() can be asynchronous, so we need to handle it carefully.
    const getAndSetVoices = () => {
        const voiceList = this.synthesis?.getVoices();
        if (voiceList && voiceList.length > 0) {
            this.voices = voiceList;
            this.selectVoice();
        }
    };
    
    getAndSetVoices();
    if (this.synthesis && this.synthesis.onvoiceschanged !== undefined) {
        this.synthesis.onvoiceschanged = getAndSetVoices;
    }
  };

  private selectVoice() {
    if (this.voices.length === 0) return;

    let voicePriority: ((v: SpeechSynthesisVoice) => boolean)[] = [];
    const langPrefix = this.currentLang.split('-')[0]; // 'es' or 'en'

    if (langPrefix === 'es') {
        // Priority for Spanish: es-AR > es-MX > es-US > es-ES > any es-*
        voicePriority = [
            (v: SpeechSynthesisVoice) => v.lang === 'es-AR',
            (v: SpeechSynthesisVoice) => v.lang === 'es-MX',
            (v: SpeechSynthesisVoice) => v.lang === 'es-US',
            (v: SpeechSynthesisVoice) => v.lang === 'es-ES',
            (v: SpeechSynthesisVoice) => v.lang.startsWith('es-'),
        ];
    } else if (langPrefix === 'en') {
        // Priority for English: en-US > en-GB > any en-*
        voicePriority = [
            (v: SpeechSynthesisVoice) => v.lang === 'en-US',
            (v: SpeechSynthesisVoice) => v.lang === 'en-GB',
            (v: SpeechSynthesisVoice) => v.lang.startsWith('en-'),
        ];
    }
    
    // Fallback to any voice of the correct language prefix if the specific priorities fail.
    voicePriority.push((v: SpeechSynthesisVoice) => v.lang.startsWith(langPrefix));

    for (const condition of voicePriority) {
        const found = this.voices.find(condition);
        if (found) {
            this.selectedVoice = found;
            return;
        }
    }
    
    // If absolutely no voice is found for the language, reset to null
    this.selectedVoice = null;
  }

  speak(text: string) {
    if (!this.synthesis || !text) {
      return;
    }
    
    // Cancel any ongoing speech to prevent overlap
    if (this.synthesis.speaking) {
        this.synthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.rate = 1;
    utterance.pitch = 1;
    
    // A slight delay seems to help with reliability after cancelling on some browsers
    setTimeout(() => {
        this.synthesis?.speak(utterance);
    }, 50);
  }
  
  cancel() {
    if (this.synthesis?.speaking) {
        this.synthesis.cancel();
    }
  }
}

export const speechService = new SpeechService();