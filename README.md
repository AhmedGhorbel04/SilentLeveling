# SilentLeveling

> Your real life. Leveled up.

SilentLeveling is a full-stack web application that turns real-life goals and habits into an RPG progression system. Players complete daily, weekly and long-term quests, earn XP, grow their stats and climb from rank **E IV** to **SS**. The highest ranks can only be reached by proving real-life achievements.

> 🚧 **Work in progress.** Milestones 0–2 done (project setup, authentication, base UI in English, French and Arabic, game core: XP, levels, ranks, stats and streaks). See the [roadmap](docs/SRS.md#10-development-roadmap).

## Tech stack

| Layer    | Technologies                                     |
| -------- | ------------------------------------------------ |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS         |
| Backend  | Node.js 22, Express 5, TypeScript, Zod           |
| Database | PostgreSQL 17, Prisma ORM                        |
| Testing  | Vitest, Supertest, Testing Library               |
| Tooling  | ESLint, Prettier, Docker Compose, GitHub Actions |

The reasons behind each choice are explained in the [SRS §6.1](docs/SRS.md#61-technology-choices).

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 22 or newer
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for the local database)

### Setup

```bash
# 1. Install dependencies (frontend + backend, thanks to npm workspaces)
npm install

# 2. Create your local environment file
cp server/.env.example server/.env

# 3. Start PostgreSQL in Docker, create the tables and add the reference data
npm run db:up
npm run db:migrate -w server
npm run db:seed -w server

# 4. Start the backend (http://localhost:4000) and frontend (http://localhost:5173)
npm run dev
```

Open http://localhost:5173. The card should show **API: online**.

## Scripts

Run from the project root:

| Command                     | Description                              |
| --------------------------- | ---------------------------------------- |
| `npm run dev`               | Start backend and frontend in watch mode |
| `npm test`                  | Run all tests                            |
| `npm run lint`              | Lint both apps                           |
| `npm run typecheck`         | Type-check both apps                     |
| `npm run format`            | Format every file with Prettier          |
| `npm run build`             | Production build of both apps            |
| `npm run db:up` / `db:down` | Start / stop the local database          |

## Project structure

```
SilentLeveling/
├── client/        # React frontend
├── server/        # Express API + Prisma
├── docs/          # Specification and documentation
└── .github/       # CI workflow
```

## Documentation

- [Software Requirements Specification](docs/SRS.md): requirements, game rules, architecture, database and API design

## License

All rights reserved. This is a personal portfolio project.
