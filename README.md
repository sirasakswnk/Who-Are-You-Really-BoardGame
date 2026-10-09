# Who Are You Really?

[![CI](https://github.com/sirasakswnk/Who-Are-You-Really-BoardGame/actions/workflows/ci.yml/badge.svg)](https://github.com/sirasakswnk/Who-Are-You-Really-BoardGame/actions/workflows/ci.yml)

เว็บเกมแข่งขัน 2 คน — รับบทบาทลับ ตอบสถานการณ์ตามบท แล้วทายว่าเพื่อนเป็นใคร

## Tech Stack

| Layer     | Technology                      |
| --------- | ------------------------------- |
| Framework | Next.js 16.4.0 (App Router)     |
| UI / Core | React 19.3.0                    |
| Language  | TypeScript (strict mode)        |
| Realtime  | Firebase Realtime Database      |
| Auth      | Firebase Anonymous Auth         |
| Testing   | Vitest 3.2.7 + Playwright 1.64  |
| CI / CD   | GitHub Actions                  |

## Getting Started

```bash
# Clean install dependencies
npm ci

# Start development server
npm run dev

# Code linting (ESLint 9)
npm run lint

# Strict TypeScript type check
npm run typecheck

# Validate game scenarios content & coverage
npm run validate:content

# Run Unit & Concurrency tests (Vitest)
npm test

# Run multi-browser E2E tests (Playwright)
npm run test:e2e

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
