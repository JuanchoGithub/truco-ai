class SpeechService {
  private synthesis: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private selectedVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
      this.loadVoices();
    } else {
      console.warn('Speech synthesis not supported in this browser.');
    }
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

    // Priority: es-AR > es-MX > es-US > es-ES > any es-*
    const voicePriority = [
        (v: SpeechSynthesisVoice) => v.lang === 'es-AR', // Argentinian Spanish
        (v: SpeechSynthesisVoice) => v.lang === 'es-MX', // Mexican Spanish
        (v: SpeechSynthesisVoice) => v.lang === 'es-US', // US Spanish
        (v: SpeechSynthesisVoice) => v.lang === 'es-ES', // Spain Spanish
        (v: SpeechSynthesisVoice) => v.lang.startsWith('es-'), // Any other Spanish
    ];

    for (const condition of voicePriority) {
        const found = this.voices.find(condition);
        if (found) {
            this.selectedVoice = found;
            return;
        }
    }
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
