export function formatDisplayTime(dateStr: string, locale: string): string {
  const d = new Date(dateStr);
  const timeStr = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return timeStr;
}

export function getDateLocale(lang: string): string {
  if (lang === 'en') return 'en-US';
  if (lang === 'pl') return 'pl-PL';
  if (lang === 'ru') return 'ru-RU';
  return 'uk-UA';
}
