# Dailies - Agent Context

## What this is

Dailies is a Convex-backed daily activity tracker. The active product surface is the
Expo / React Native mobile app in `dailies-react-native/`.

There are also older clients in the repo:

- `ios/dailies/` is a SwiftUI iOS app. Treat it as a reference implementation only.
  It is useful for understanding intended behavior and UX, but it is not the active
  client.
- `app/` is a Next.js web app. It was never functional as the real product client,
  so do not assume its behavior is correct or current.

## Active Mobile App

The React Native app lives in `dailies-react-native/` and is the only client being
used. It is an Expo app using:

- Expo Router for file-based screens under `dailies-react-native/app/`
- React Native / React Native Paper for UI
- Convex React client for backend data
- Auth0 for authentication
- `react-native-mmkv` for local flash-card persistence
- `react-native-gesture-handler` for tap gestures, including triple-tap reset

Important screens:

- `dailies-react-native/app/index.tsx` handles login state and routes to the home page.
- `dailies-react-native/app/home_page.tsx` shows category completion buttons.
- `dailies-react-native/app/category_page.tsx` lists entities for a category.
- `dailies-react-native/app/entity_button.tsx` logs generic completions or routes to
  specialized flows.
- `dailies-react-native/app/workout_edit_page.tsx` creates, updates, and deletes
  workout events.
- `dailies-react-native/app/flash_card_page.tsx` handles flash-card review, local
  persistence, and save/load flows.
- `dailies-react-native/app/entity_edit_page.tsx` creates new tracked entities.

## Authentication

The active React Native app authenticates with Auth0 using `react-native-auth0`.
`dailies-react-native/app/_layout.tsx` wraps the app in `Auth0Provider`, then bridges
Auth0 into Convex with `ConvexProviderWithAuth`.

The Convex auth hook calls Auth0 `getCredentials()` with:

```ts
"openid email profile offline_access"
```

It returns the Auth0 `idToken` to Convex as the access token. Login starts from
`dailies-react-native/app/index.tsx` via `authorize()` with the same scopes.

Convex accepts Auth0 JWTs via `convex/auth.config.ts`. That file configures two Auth0
providers: one for the old web client and one for the mobile/iOS client. The mobile
client ID is the same one used by the React Native app and the old Swift reference
app.

The old Swift app uses `ConvexAuth0` / `ConvexMobile` with Auth0 and cached logins.
The old web app uses `@auth0/auth0-react` and `ConvexProviderWithAuth0`, but it should
not be treated as an active or reliable client.

## Shared Backend

The shared Convex backend lives in `convex/`.

Core modules:

- `convex/entities.ts` defines tracked activities: category, type, required status,
  reset interval, and workout event fields.
- `convex/events.ts` stores activity events for generic completions, workouts, and
  flash-card review counts.
- `convex/flashCards.ts` syncs flash cards from Airtable and saves review status via
  an FSRS lambda flow.
- `convex/tokens.ts` stores per-user integration tokens.
- `convex/users.ts` maps authenticated users into the app's user table.

The React Native app imports shared Convex types through the Metro alias configured in
`dailies-react-native/metro.config.js`.

## Mobile Implementation Notes

- The React Native app is currently iOS-focused.
- The UI uses fixed dimensions in some places, such as the `300` px wide big buttons.
- `react-native-safe-area-context` is installed but not broadly used; layouts often use
  hardcoded top padding.
- The old Swift app can clarify intended UX for features that are incomplete or rough
  in React Native, especially notifications, toasts, and flash-card review behavior.
- Do not make product decisions based on the Next.js app unless the user explicitly
  asks to revive or inspect it.

