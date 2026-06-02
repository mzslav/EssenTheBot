const fs = require('fs');
const files = [
  'src/locales/uk.json',
  'src/locales/en.json',
  'src/locales/pl.json',
  'src/locales/ru.json'
];

files.forEach(file => {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  
  if (data.form && data.form.fields) {
    if (data.form.fields.gender && data.form.fields.gender.options) {
      if (data.form.fields.gender.options.male) data.form.fields.gender.options.male = data.form.fields.gender.options.male.replace(/ 👨/g, '');
      if (data.form.fields.gender.options.female) data.form.fields.gender.options.female = data.form.fields.gender.options.female.replace(/ 👩/g, '');
    }
    if (data.form.fields.goal && data.form.fields.goal.options) {
      if (data.form.fields.goal.options.lose) data.form.fields.goal.options.lose = data.form.fields.goal.options.lose.replace(/ 🔥/g, '');
      if (data.form.fields.goal.options.gain) data.form.fields.goal.options.gain = data.form.fields.goal.options.gain.replace(/ 💪/g, '');
    }
    if (data.form.fields.activity && data.form.fields.activity.options) {
      if (data.form.fields.activity.options.sedentary) data.form.fields.activity.options.sedentary = data.form.fields.activity.options.sedentary.replace(/ 🪑/g, '');
      if (data.form.fields.activity.options.light) data.form.fields.activity.options.light = data.form.fields.activity.options.light.replace(/ 🚶/g, '');
      if (data.form.fields.activity.options.moderate) data.form.fields.activity.options.moderate = data.form.fields.activity.options.moderate.replace(/ 🏃/g, '');
      if (data.form.fields.activity.options.high) data.form.fields.activity.options.high = data.form.fields.activity.options.high.replace(/ 🔥/g, '');
    }
    
    // Fix placeholders
    if (data.form.fields.age && data.form.fields.age.placeholder) {
        data.form.fields.age.placeholder = '28';
    }
    if (data.form.fields.weight && data.form.fields.weight.placeholder) {
        data.form.fields.weight.placeholder = '78.5';
    }
    if (data.form.fields.height && data.form.fields.height.placeholder) {
        data.form.fields.height.placeholder = '175';
    }
  }

  fs.writeFileSync(file, JSON.stringify(data, null, 2));
});
