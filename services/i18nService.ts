let translations: any = {};
let currentLanguage = 'es-AR'; // default

// Simple dot notation accessor
function getNestedValue(obj: any, key: string): any {
  return key.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
}

const i18nService = {
  async loadLanguage(lang: string): Promise<void> {
    try {
      let uiPromise, phrasesPromise, aiLogicPromise, simulationPromise;

      // Use fetch with paths relative to the document root. This is more robust for deployment environments
      // like Vercel, as it correctly resolves paths even if the app is in a subdirectory.
      switch (lang) {
        case 'en-US':
          uiPromise = fetch('locales/en-US/ui.json').then(res => res.json());
          phrasesPromise = fetch('locales/en-US/phrases.json').then(res => res.json());
          aiLogicPromise = fetch('locales/en-US/ai_logic.json').then(res => res.json());
          simulationPromise = fetch('locales/en-US/simulation.json').then(res => res.json());
          break;
        case 'es-AR':
        default:
          uiPromise = fetch('locales/es-AR/ui.json').then(res => res.json());
          phrasesPromise = fetch('locales/es-AR/phrases.json').then(res => res.json());
          aiLogicPromise = fetch('locales/es-AR/ai_logic.json').then(res => res.json());
          simulationPromise = fetch('locales/es-AR/simulation.json').then(res => res.json());
          lang = 'es-AR'; // Ensure lang is set to the fallback for consistency
          break;
      }
      
      const [uiData, phrasesData, aiLogicData, simulationData] = await Promise.all([
        uiPromise,
        phrasesPromise,
        aiLogicPromise,
        simulationPromise,
      ]);

      translations = { 
        ...uiData, 
        ...phrasesData, 
        ...aiLogicData,
        ...simulationData
      };
      currentLanguage = lang;
    } catch (error) {
      console.error(`[i18n] Error loading language ${lang} via fetch:`, error);
      // Fallback to default if loading fails
      if (lang !== 'es-AR') {
          await this.loadLanguage('es-AR');
      }
    }
  },

  t(key: string, options?: { [key: string]: any }): string {
    let value = getNestedValue(translations, key);

    if (value === undefined) {
      console.warn(`[i18n] Missing translation for key: ${key}`);
      return key;
    }

    // Handle random phrase from array
    if (Array.isArray(value)) {
      value = value[Math.floor(Math.random() * value.length)];
    }

    if (typeof value !== 'string') {
        console.warn(`[i18n] Value for key '${key}' is not a string or array of strings.`);
        return key;
    }
    
    let result = value;

    // Handle interpolation and pluralization
    if (options) {
      result = result.replace(/{{(.*?)}}/g, (match, rawExpression) => {
        const expression = rawExpression.trim();
        const parts = expression.split(',').map(p => p.trim());
        const varName = parts[0];

        if (options[varName] === undefined) {
          return match; // return original placeholder if value not provided
        }

        if (parts.length > 1 && parts[1] === 'plural') {
          // simple pluralization: {{count, plural, one{...} other{...}}}
          const count = Number(options[varName]);
          const oneMatch = /one{(.*?)}/.exec(expression);
          const otherMatch = /other{(.*?)}/.exec(expression);
          
          if (oneMatch && otherMatch) {
            return count === 1 ? oneMatch[1] : otherMatch[1];
          }
        }
        
        return String(options[varName]);
      });
    }

    return result;
  },
  
  getCurrentLanguage(): string {
    return currentLanguage;
  }
};

export default i18nService;