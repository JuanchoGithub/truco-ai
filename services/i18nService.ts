let translations: any = {};
let currentLanguage = 'es-AR'; // default

// Simple dot notation accessor
function getNestedValue(obj: any, key: string): any {
  return key.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
}

// Deep merge helper
function deepMerge(target: any, source: any) {
    for (const key in source) {
        if (source[key] instanceof Object && key in target) {
            Object.assign(source[key], deepMerge(target[key], source[key]));
        }
    }
    Object.assign(target || {}, source);
    return target;
}


const i18nService = {
  async loadLanguage(lang: string): Promise<void> {
    try {
      const files = ['common', 'game', 'suggestion', 'tutorial', 'dataModal', 'manual', 'scenario_tester', 'phrases', 'ai_logic', 'simulation', 'scenario_runner'];
      
      let effectiveLang = lang;
      // Fallback to Spanish if an unsupported language is requested
      if (lang !== 'en-US' && lang !== 'es-AR') {
        effectiveLang = 'es-AR';
      }

      const promises = files.map(file => 
        fetch(`locales/${effectiveLang}/${file}.json`).then(res => {
          if (!res.ok) {
            throw new Error(`Failed to fetch ${file}.json for lang ${effectiveLang}`);
          }
          return res.json();
        })
      );
      
      const allData = await Promise.all(promises);

      let mergedTranslations = {};
      for (const data of allData) {
        deepMerge(mergedTranslations, data);
      }
      
      translations = mergedTranslations;
      currentLanguage = effectiveLang;
    } catch (error) {
      console.error(`[i18n] Error loading language ${lang} via fetch:`, error);
      // Fallback to default if loading fails and we're not already on it
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