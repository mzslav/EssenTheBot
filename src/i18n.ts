import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import uk from './locales/uk.json';
import en from './locales/en.json';
import pl from './locales/pl.json';
import ru from './locales/ru.json';

const resources = {
  uk: { translation: uk },
  en: { translation: en },
  pl: { translation: pl },
  ru: { translation: ru }
};

const supportedLangs = ['uk', 'en', 'pl', 'ru'];

// Try to get Telegram language
// We're casting window as any since Telegram might not be in global types
const tg = (window as any).Telegram?.WebApp;
let tgLang = tg?.initDataUnsafe?.user?.language_code || 'uk';

// Some telegram clients might send 'en-US' instead of 'en'
tgLang = tgLang.split('-')[0];

const initialLang = supportedLangs.includes(tgLang) ? tgLang : 'uk';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('i18nextLng') || initialLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
