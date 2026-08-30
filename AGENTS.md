# Dailies - Agent Context

## What this is

Dailies is now a thin repo around the Expo / React Native app in
`dailies-react-native/`. That app is the only client. It talks to **Tasky**
(Better Auth + Tasky Convex) for signals, scorecards, tasks, captures, and
portfolio. Login is Tasky GitHub OAuth.

The `convex/` directory is the old Dailies backend. Leave it as-is. Do not add
new reads or auth against it.

## Active Mobile App

`dailies-react-native/` is an Expo app using:

- Expo Router under `dailies-react-native/app/`
- React Native / React Native Paper
- A separate Tasky Convex client in `lib/tasky.tsx`

Important screens:

- `app/index.tsx` — Tasky login gate, then home
- `app/home_page.tsx` — due signals, Today (scorecards), Tasky, portfolio
- `app/scorecard_page.tsx` — scorecard members and quick log
- `app/scorecards_page.tsx` / `app/scorecard_edit_page.tsx` — list and edit
- `app/signals_page.tsx` / `app/signal_edit_page.tsx` / `app/signal_history_page.tsx`

## Authentication

The app authenticates with Tasky via Better Auth (`useTaskyAuth`). There is no
Auth0 or Dailies Convex client in the mobile app.

## Old backend

`convex/` still has entities, events, flash cards, tokens, and Auth0 config.
Do not treat those as the source of truth for the mobile app. Do not delete
them unless asked.
