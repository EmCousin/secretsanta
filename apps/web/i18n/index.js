import en from './en.js';
import fr from './fr.js';
import ptBR from './pt-BR.js';

export const CATALOGUES = Object.freeze({ en, fr, 'pt-BR': ptBR });

export function resolveLanguage(languages = []) {
  for (const value of languages) {
    if (typeof value !== 'string') continue;
    const language = value.toLowerCase().split(/[-_]/)[0];
    if (language === 'en' || language === 'fr') return language;
    if (language === 'pt') return 'pt-BR';
  }
  return 'en';
}

export class I18n {
  constructor(languages = ['en'], preference = '') {
    this.setLanguage(languages, preference);
  }

  setLanguage(languages, preference = '') {
    this.preference = Object.hasOwn(CATALOGUES, preference) ? preference : '';
    this.locale = this.preference || resolveLanguage(languages);
  }

  t(key, params = {}) {
    const template = CATALOGUES[this.locale][key] ?? en[key] ?? key;
    return template.replace(/\{(\w+)\}/g, (match, name) => String(params[name] ?? match));
  }

  error(error) {
    return this.t(Object.hasOwn(en, error?.code) ? error.code : 'app.unexpected', error?.params);
  }

  date(value) {
    return new Intl.DateTimeFormat(this.locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
  }
}
