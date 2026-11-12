# Gainmark

A gym workout tracker for Android. Log your moves, sets, weights and reps for each day, copy past
workouts to beat them, and follow your progress in Statistics.

Made by [@Rozevelt](https://github.com/Rozevelt).

> **Built with AI.** The code in this project was written by AI ([Claude](https://claude.com/claude-code)
> by Anthropic), not by hand.

## Install (Android)

1. Open the [latest release](https://github.com/Rozevelt/Gainmark/releases/latest) on your phone.
2. Download the `.apk` file and open it. Android may ask you to allow installs from your browser.
3. When a new version comes out, Gainmark tells you and offers the download. Updates keep your data.

## Install (iPhone)

Gainmark runs on iPhone as a Home Screen app, fullscreen and offline:

1. Open **https://rozevelt.github.io/Gainmark/** in Safari.
2. Tap the Share button, then **Add to Home Screen**, then **Add**.
3. Open Gainmark from your Home Screen. It updates by itself when a new version comes out.

The iPhone version has no lock-screen timer, vibration, or rest alert while the app is closed.
Deleting its Home Screen icon deletes its data, so use Settings → Your data → Export now and then.

Your workouts stay on your phone. Settings → Your data can export them to a file and back them up.

## Features

- Big move library by muscle group, plus your own moves and groups
- Weight, bodyweight, timed and cardio moves; drop sets and supersets
- Copy a past workout or start a saved one, with optional auto progression
- Workout timer, rest timer and a lock-screen timer
- Statistics: trends, muscle split, move history, records, training heatmap, body weight and measurements
- Weekly goal and streaks, gym split with reminders, PRs, plate calculator, 1RM and warm-up sets
- Dark and light themes with several accent colours

## Development

Expo (React Native) with TypeScript and Expo Router; screens are in `src/app`.

```bash
npm install
npx expo start --go     # run in Expo Go
npm run apk             # build a release APK and install it on a phone over USB
npm run release         # publish a new version as a GitHub Release
```

Release builds are signed with a key kept outside the project (see `scripts/make-signing-key.ps1`).
