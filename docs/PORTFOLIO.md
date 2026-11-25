# Portfolio description

Ready-to-use texts about SilentLeveling, from shortest to longest.

## One line (CV, LinkedIn headline of a project)

Full-stack web app that turns real-life goals into an RPG: generated quests, XP, ranks and friends, in English, French and Arabic.

## Short description (portfolio card, GitHub "About")

SilentLeveling is a habit and goal tracker built like a game. Players get daily and weekly quests that fit their goals and free time, earn XP, level up and climb ranks. The highest ranks only unlock once an admin verifies a real achievement. Built with React, Node.js/Express, PostgreSQL and Prisma, fully tested and deployed.

## CV bullets

- Designed and built a full-stack app (React 19, TypeScript, Express 5, PostgreSQL, Prisma) from a written specification to production, in 10 milestones.
- Wrote a rule-based quest generator and the game logic as pure, configurable functions, covered by 300+ automated tests (Vitest, Supertest) with CI on every pull request.
- Made data integrity a database concern: an XP ledger with unique keys so nothing is paid twice, CHECK constraints, and row locks for the daily rollover.
- Secured the API: HttpOnly cookie sessions, input validation with Zod, rate limiting, role-based admin routes, and documented every endpoint with OpenAPI/Swagger.
- Built a trilingual interface (EN/FR/AR) with a full right-to-left layout and reached a Lighthouse accessibility score of 100.
- Deployed on Vercel, Render and Neon behind a single domain, with automatic deploys and database migrations.

## Longer description (portfolio page, project post)

**The idea.** Most habit trackers are checklists you stop opening after a week. SilentLeveling borrows what makes games addictive (quests, XP, levels, ranks, rewards) and points it at real life. You pick focus areas like fitness or languages, say how much time you have per day, and the app gives you quests sized for you.

**What makes it fair.** XP depends on a quest's difficulty, never on how long you claim it took, so nobody gains by cheating the timer. Competition is only between friends. The top ranks can't be reached by grinding: they need a real achievement (a marathon, a degree, a published app) that a human admin checks against a proof.

**How it's built.**

- **Frontend:** React 19, TypeScript and Tailwind, with TanStack Query for server state and i18next for three languages, including right-to-left Arabic.
- **Backend:** an Express 5 API in TypeScript, organized by feature module. All game rules are pure functions with their numbers in one config file.
- **Database:** PostgreSQL through Prisma. XP is stored as a ledger, so totals can always be recomputed and audited.
- **Free hosting without cron jobs.** Free hosting sleeps, so there are no scheduled jobs: each player's day is closed on their first request after their own local midnight.

**Quality.**

- 300+ tests: unit tests on the game rules, integration tests on a real database, and component tests on the UI.
- GitHub Actions blocks any pull request that fails lint, type checks, tests or the build.
- Every endpoint is documented in Swagger, generated from the same schemas that validate requests.
- Lighthouse scores 100 on accessibility, best practices and SEO.

**What I learned.**

- Writing a specification before coding, and splitting work into reviewable pull requests.
- Handling time zones correctly.
- Designing a database that defends its own integrity.
- Making an interface work right to left.
- Deploying a monorepo across three hosting providers.

**Links:** [Live app](https://silentleveling.vercel.app) · [Source code](https://github.com/AhmedGhorbel04/SilentLeveling) · [API docs](https://silentleveling.vercel.app/api/docs/)

## Interview talking points

- **"Walk me through a technical decision."** The XP ledger: why every gain is a row with a unique quest or claim id, and how that makes double rewards impossible even under concurrent requests.
- **"A hard bug?"** Time zones: a day is a plain `YYYY-MM-DD` string in the player's zone, never a JavaScript date at midnight UTC, which would shift the day for anyone east or west of UTC.
- **"How do you test?"** Pure game functions get unit tests, services run against a real test database, and services take the current time as a parameter so tests can travel in time.
- **"Security?"** HttpOnly cookies instead of tokens in localStorage, the admin role checked in the database on every request, Zod validation, and rate limits on login.
- **"What would you add next?"** An admin page to manage users, email notifications, and a PWA so the app installs on phones.
