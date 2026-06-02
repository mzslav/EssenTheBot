const fs = require('fs');

const data = {
  'uk.json': {
    days_pct: "днів",
    avg_per_day: "В сер. за день",
    workouts_count: "Тренувань"
  },
  'ru.json': {
    days_pct: "дней",
    avg_per_day: "В ср. за день",
    workouts_count: "Тренировок"
  },
  'en.json': {
    days_pct: "days",
    avg_per_day: "Avg per day",
    workouts_count: "Workouts"
  },
  'pl.json': {
    days_pct: "dni",
    avg_per_day: "Śr. na dzień",
    workouts_count: "Treningów"
  }
};

for (const [filename, newKeys] of Object.entries(data)) {
  const filePath = `src/locales/${filename}`;
  if (fs.existsSync(filePath)) {
    const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!fileData.stats) fileData.stats = {};
    Object.assign(fileData.stats, newKeys);
    fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2));
    console.log(`Updated ${filePath}`);
  }
}
