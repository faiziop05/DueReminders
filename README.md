# DueReminders

A bill and task reminder app that keeps nagging you with notifications until you actually deal with it.

## Overview

DueReminders is a React Native (Expo Router) app for tracking due tasks and bills — each with a title, optional amount/currency, due date, priority, and category — plus simple countdown timers. Instead of firing a single reminder notification, it schedules repeating "nagging" notifications at a configurable interval until the task is marked done, and stores everything locally in SQLite with no account or backend required.

## Problem it solves

A single reminder notification is easy to dismiss and forget about, especially for bills or obligations with real financial consequences. DueReminders is built around the idea that some reminders need to be persistent rather than polite: it keeps re-notifying the user at a set interval (`nag_interval`) until the item is resolved, and separately tracks a dollar `amount`/`currency` per task so it doubles as a lightweight bill tracker, not just a generic to-do list.

## Key features

- **Escalating "nagging" notifications** — each task stores a `nag_interval` (minutes) and reschedules itself via `expo-notifications` until completed (`src/utils/notifications.js`, `scheduleNaggingNotifications`)
- **Bill-aware tasks** — tasks carry `amount` and `currency` fields alongside due date, priority, and category, so due bills/payments are tracked with a dollar amount, not just a checkbox
- **Countdown timers** — a separate `timers` table/tab for simple duration-based countdowns independent of the due-date reminders
- **Local SQLite storage** — all tasks and timers persist in an on-device `expo-sqlite` database (`src/db/database.js`) with in-place schema migrations (e.g. `ALTER TABLE` guards for added columns)
- **Biometric lock & haptics** — `expo-local-authentication` and `expo-haptics` for securing and adding tactile feedback to the app
- **Bottom-sheet quick actions** — `@gorhom/bottom-sheet`-based sheets for quickly creating reminders/timers (`NewReminderSheet`, `NewTimerSheet`, `QuickAddSheet`) without leaving the current screen
- **Premium tier** — in-app purchases via `react-native-purchases` (RevenueCat) gate premium features, tracked via an `isPremium` flag in the global store
- **History view** — a dedicated `history` screen for completed/past tasks
- **Onboarding flow** and settings/profile screens, with state persisted through `zustand` + `AsyncStorage`

## What's unique about it

- **Nagging-by-design notification model**: most reminder apps fire once; DueReminders explicitly reschedules notifications on a configurable cadence per task until it's completed, encoded directly in the SQLite schema (`nag_interval` column) rather than as a client-side hack.
- **Bills and generic tasks share one model**: the same `tasks` table carries a monetary `amount`/`currency`, so due-bill tracking and ordinary to-dos are first-class equals rather than the app being a pure to-do list with reminders bolted on.
- **Fully local, subscription-monetized**: no backend or user accounts at all — persistence is entirely on-device SQLite — while monetization still comes through a RevenueCat-powered premium subscription tier.

## Tech stack

- React Native 0.83 / React 19, via **Expo SDK 55** with **Expo Router** (file-based routing, `app/` directory)
- **expo-sqlite** for local storage, **expo-notifications** for scheduled/repeating reminders
- **zustand** for global state, backed by `@react-native-async-storage/async-storage` for simple preference persistence
- **react-native-purchases** (RevenueCat) for premium subscriptions
- **@gorhom/bottom-sheet** + **react-native-reanimated**/**react-native-worklets** for the sheet-based UI
- **expo-local-authentication**, **expo-haptics**, **expo-document-picker**, **expo-sharing**
- TypeScript type definitions included (`tsconfig.json`, `@types/react`) alongside JS source

## Setup / running instructions

Requires Node.js and the Expo CLI toolchain.

```bash
npm install
npm start          # opens Expo dev tools / Metro bundler
npm run android     # build & run on Android (expo run:android — requires native tooling)
npm run ios         # build & run on iOS (expo run:ios, macOS only)
npm run web         # run in a browser
```

Note: `android`/`ios` scripts use `expo run:*` (a native/prebuild-based run) rather than `expo start --android/--ios`, so a local Android/Xcode toolchain is required for those two commands.
