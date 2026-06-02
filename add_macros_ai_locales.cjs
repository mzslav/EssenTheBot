const fs = require('fs');

const macros = {
  'uk.json': { kcal: "ккал", protein: "білки", fat: "жири", carbs: "вуглев." },
  'en.json': { kcal: "kcal", protein: "protein", fat: "fat", carbs: "carbs" },
  'ru.json': { kcal: "ккал", protein: "белки", fat: "жиры", carbs: "углев." },
  'pl.json': { kcal: "kcal", protein: "białko", fat: "tłuszcze", carbs: "węglow." }
};

for (const [filename, newKeys] of Object.entries(macros)) {
  const filePath = `src/locales/${filename}`;
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!data.ai_response) data.ai_response = {};
    data.ai_response.kcal = newKeys.kcal;
    data.ai_response.protein = newKeys.protein;
    data.ai_response.fat = newKeys.fat;
    data.ai_response.carbs = newKeys.carbs;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Updated ${filePath}`);
  }
}
