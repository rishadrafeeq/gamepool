# GamePool

Sports coordination platform — find players, teammates, opponents, create matches, and play.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (local PostgreSQL)

## Quick start

```bash
# Install dependencies
pnpm install

# Start PostgreSQL
docker compose up -d

# Copy environment variables
cp .env.example .env

# Generate Prisma client & run migrations
pnpm db:generate
pnpm db:migrate:dev

# Seed sports (+ optional admin)
pnpm db:seed

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

API health: [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)

## Monorepo

| Package | Description |
|---------|-------------|
| `apps/web` | Next.js 15 app (UI + API routes) |
| `packages/database` | Prisma client singleton |
| `packages/shared` | Shared types, Zod schemas, API envelope |
| `packages/config` | Shared TSConfig |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm build` | Production build |
| `pnpm db:migrate` | Apply migrations (deploy) |
| `pnpm db:migrate:dev` | Create/apply migrations (dev) |
| `pnpm db:seed` | Seed reference data |
| `pnpm db:studio` | Prisma Studio |

## Documentation

- [PRD](docs/PRD.md)
- [Database Design](docs/database-design.md)
- [Implementation Plan](docs/implementation-plan.md)
