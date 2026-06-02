const fs = require('fs');

const translations = {
  'uk.json': {
    nav: {
      main: "Головна",
      fridge: "Меню",
      workout: "Спорт",
      profile: "Профіль"
    }
  },
  'en.json': {
    nav: {
      main: "Home",
      fridge: "Menu",
      workout: "Sport",
      profile: "Profile"
    }
  },
  'ru.json': {
    nav: {
      main: "Главная",
      fridge: "Меню",
      workout: "Спорт",
      profile: "Профиль"
    }
  },
  'pl.json': {
    nav: {
      main: "Główna",
      fridge: "Menu",
      workout: "Sport",
      profile: "Profil"
    }
  }
};

for (const [filename, newKeys] of Object.entries(translations)) {
  const filePath = `src/locales/${filename}`;
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    data.nav = newKeys.nav;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Updated ${filePath}`);
  }
}
