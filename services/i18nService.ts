
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
      const files = ['ui', 'common', 'game', 'suggestion', 'tutorial', 'dataModal', 'manual', 'scenario_tester', 'phrases', 'simulation', 'scenario_runner', 'ai_logic'];
      
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

    if (options) {
      // First, handle plurals with a very specific regex for the `one{...} other{...}` format.
      // This is more robust than a generic parser.
      const pluralRegex = /{{\s*(\w+)\s*,\s*plural\s*,\s*one{([^}]+)}\s*other{([^}]+)}\s*}}/g;
      result = result.replace(pluralRegex, (match, varName, oneRule, otherRule) => {
        const count = options[varName];
        if (count === undefined || isNaN(Number(count))) {
          console.warn(`[i18n] Pluralization variable '${varName}' not found or not a number for key '${key}'.`);
          return match; // Return original block if data is missing
        }

        return Number(count) === 1 ? oneRule.trim() : otherRule.trim();
      });

      // Then, handle simple variables. This regex won't conflict with the plural format.
      const simpleVarRegex = /{{\s*(\w+)\s*}}/g;
      result = result.replace(simpleVarRegex, (match, varName) => {
        if (options[varName] !== undefined) {
          return String(options[varName]);
        }
        console.warn(`[i18n] Missing value for placeholder '${varName}' in key '${key}'.`);
        return match; // Leave placeholder if value not found
      });
    }

    return result;
  },
  
  getCurrentLanguage(): string {
    return currentLanguage;
  }
};

export default i18nService;