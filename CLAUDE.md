# Responde App

Mobile-only omnichannel chat app (our respond.io) linking to PyDent AI and
every future LHDM product. React 18 + TypeScript + Vite, no UI framework —
the design system lives entirely in `src/styles/global.css`.

## Commands

- `npm run dev` — dev server (mobile viewport)
- `npm run build` — typecheck + production build (must pass before pushing)
- `npm run preview` — serve the built app (used for Playwright screenshots)

## Architecture

- `src/state/AppStore.tsx` — single React context store. **Demo mode** uses
  `src/data/mock.ts`; **live mode** activates automatically when
  `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set and the user signs
  in with real credentials. Every mutation is optimistic-local first, then
  mirrored to Supabase via `src/lib/api.ts` when live.
- `src/lib/api.ts` — all Supabase reads/writes/Realtime. UI components never
  import supabase directly.
- `src/screens/` — SignIn, Inbox (+drawer, Notifications, Calls), Chat,
  Lifecycle, Team, Settings. `src/components/` — icons, Avatar, BottomNav.
- `supabase/` — schema + Edge Functions (see `supabase/CLAUDE.md`).

## Conventions

- Design: Inter, ice-gray bg, white cards, hairline borders, blue `#1F6BFF`.
  **No purple, ever.** Internal comments/notes are orange (`--orange`).
- Internal comments (`kind: 'comment'`) must NEVER reach the contact's
  channel — enforce both in UI and in the send Edge Function.
- Arabic/RTL: message bodies render with `dir="auto"` +
  `unicode-bidi: plaintext`. Keep this on any new text surface.
- Non-standard font weights (650 etc.) are forbidden — only 400–800 in
  hundreds (Google Fonts static Inter).
- After UI changes: build, run preview, screenshot with Playwright
  (`/opt/pw-browsers/chromium`, viewport 390×844) and eyeball before push.

## Git

Work on branch `claude/responde-app-mobile-chat-rlvtqb`, push with
`git push -u origin <branch>`. Do not create PRs unless asked.
