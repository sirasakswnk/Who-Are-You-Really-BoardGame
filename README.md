# Who Are You Really?

เว็บเกมแข่งขัน 2 คน — รับบทบาทลับ ตอบสถานการณ์ตามบท แล้วทายว่าเพื่อนเป็นใคร

## Tech Stack

| Layer     | Technology                      |
| --------- | ------------------------------- |
| Framework | Next.js 16 (App Router)         |
| Language  | TypeScript (strict)             |
| Realtime  | Firebase Realtime Database      |
| Auth      | Firebase Anonymous Auth         |
| Hosting   | Vercel                          |
| Testing   | Vitest + Playwright (planned)   |

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Lint
npm run lint

# Type check
npx tsc --noEmit

# Build for production
npm run build
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your Firebase credentials.

## Project Structure

```
app/                  Next.js pages + API route handlers
components/           UI components (cards, lobby, avatars, etc.)
lib/game/             Game engine types, state machine, scoring
lib/server/           Auth, room service, transactions
lib/firebase/         Firebase client + admin SDK setup
content/              Roles, scenarios, editorial (server-only)
tests/                Unit, rules, integration, E2E tests
```

## Architecture Decisions

- **Next.js 16.4.0** with App Router and TypeScript strict mode
- **React 19.3.0** with server/client component split
- **CSS variables** design system — detective-file theme (cream, navy, brick, sea-teal)
- **No Tailwind** — custom CSS matching the HTML template design
- **No third-party font loading** — local Thai font fallback chain for reliability
