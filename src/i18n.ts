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

let tgLang = 'uk';
try {
  const tg = (window as any).Telegram?.WebApp;
  if (tg?.initDataUnsafe?.user?.language_code) {
    tgLang = tg.initDataUnsafe.user.language_code.split('-')[0];
  }
} catch (e) {}

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
