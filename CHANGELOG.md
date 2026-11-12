# Changelog

What changed in Essen since the public snapshot in this repository (July 2026).
Newer versions are developed in a private repository, so this file describes the changes without the code.

---

## November 2026: Training, part 2

### Exercise library
- New **Exercise library** screen. You browse by muscle group on a body-map grid (chest, back, shoulders, biceps,
  triceps, core, legs, glutes, cardio), search across all exercises, and keep favorites at the top.
- **3D technique clips** in the exercise card for about 60 exercises. The clips loop, can be paused, and play at
  adjustable speed. Each card also has step-by-step technique, common mistakes and the muscles worked.
- Library and exercise cards show 3D previews and match the screen layout while loading.

### Workouts
- **Free workout mode**: start an empty session, add exercises as you go, and save it as a plan at the end.
- **Log a past workout by voice**: describe what you did, and the exercises are matched to the catalog and saved
  with their sets.
- The coach and voice logs now prefer **catalog exercises**, so history, records and 3D clips stay linked.

### AI coach
- The coach can put together a **workout for today** from catalog exercises, with weights based on your recent
  results. You add it to today's session with one tap or save it as a plan.
- Recommendations group muscles in a simpler, clearer way.

### Personalization
- New **Customization** screen with the theme (auto / dark / light), accent colors, the home calendar style
  (last 7 days or a Monday-start week) and haptics.
- The app always asks Telegram for **full screen** on phones.

---

## October 2026: Essen v2

A large redesign of the whole app.

### New look
- A new design system with the Unbounded display font, colors derived from Telegram's theme, and redesigned
  bottom navigation.
- A redesigned **Home**: a calmer calories ring, macros, water, today's workout and coach tips in one view.
- Loading skeletons that match each screen's layout, Undo toasts, smoother tab transitions, and respect for
  reduced-motion settings.
- **Native Telegram Back button** instead of in-app back arrows, plus proper handling of Telegram full-screen safe areas.
- **Haptic feedback** on taps, selections and confirmations, which you can switch off in Profile.

### AI coach (new)
- A coach that **acts**. It turns messages like "had an omelette and toast" or "ran 40 minutes" into cards that
  log a meal, water, activity, a workout plan or recipes after one confirmation.
- It reads your own data: targets and what is left today, nutrition and weight trends up to 90 days, workout
  history, muscle load and saved recipes.
- **Ask coach** buttons on meals, exercises and statistics open the chat with that context attached.
- **Multiple chats** that are kept between sessions, full-screen chat, suggested questions and coach notes.

### Food
- A redesigned **Add food** flow with photo, text, voice, barcode and manual entry on one screen.
- A new meal sheet where you can adjust ingredients and portions before saving.
- Meal history grouped by day, plus a compact **recipe library** where AI writes recipes from text or voice.
- Meals are saved on **your local day**, not the server's.

### Workouts
- A faster, **offline-safe** workout journal: sets logged without a connection are kept on the phone and synced later.
- Previous results next to every set, **personal records**, **pinned notes** per exercise, and a workout summary
  at the end.
- Catalog v2 with a **muscle map**, a workout constructor, progression hints, a weekly streak and **muscle
  recommendations**.

### Activity & body
- **Activity outside the gym** (running, cycling, walking, steps and more) is added to the day's calorie target.
  Past days keep the target they had.
- A redesigned **Profile** with grouped settings, a **goal weight**, manual targets and **body measurements**.

### Statistics (rebuilt)
- A new **Statistics** screen with Overview, Food, Workouts and Body tabs over 7 days, 30 days, 3 months or a year.
- Custom charts, an activity heatmap, weekday and meal-time patterns, top meals, volume, frequency and records.
- Stats load faster because each tab is computed in a single request.

### Export
- **Data export** page with PDF, CSV, JSON and a plain-text report.

### Languages
- **Spanish** and **Brazilian Portuguese** added in the app, the bot, reminders, AI answers and exports, which
  makes 6 languages.
- Copy was revised in every language. Unsupported languages now fall back to English.
- Separate settings for the **AI answer language** and the **dictation language**.

### Reminders
- Reminders for water and meals now use **your time zone**, follow a schedule you choose, and skip a reminder
  when you have already logged.

### Under the hood
- The Telegram bot and reminders now run on the same platform as the app, so there is one deployment.
- AI system prompts moved to the server, and every AI request is logged and has rate limits.
- Runtime settings (models, limits, reminder texts) can be changed without a redeploy.

---

## July – September 2026

### Food & recipes
- **Recipe library** with AI generation from text or voice.
- Meal photos kept with the meal, favorites, and paged history.
- Smoother meal editing, with instant calorie and calendar updates after changes.

### Telegram bot
- **Log food straight from the chat**: send the bot text, a photo or a voice message. You get a preview, can save
  to favorites and can edit the entry before saving.

### Workouts
- A new exercise hero card, localized exercise names, and template imports.
- Faster journal loading and set syncing at 60 FPS.

### App
- **Legal consent** step in onboarding.
- **In-app support**: write to the developer and get replies inside the app.
- Screens load on demand with skeletons, so the app starts faster.
- Streaming coach responses.
- A more reliable AI setup with fallback models.
