# GamePool — Monorepo Architecture

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** June 23, 2026  
**Tooling:** pnpm workspaces · Turborepo · TypeScript · GitHub Actions

---

## 1. Document Summary

This document defines the **production-ready monorepo architecture** for GamePool MVP — a sports matchmaking platform with a NestJS API, Next.js web app, and React Native (Expo) mobile app. The repository uses **pnpm workspaces** for dependency management and **Turborepo** for task orchestration, caching, and CI optimization.

The monorepo enables a multi-developer team to ship coordinated changes across backend and clients while sharing API types, lint rules, and TypeScript configuration. Target scale: **100k+ registered users**, independent deploy pipelines per app, and clear ownership boundaries.

**Applications:**

| App | Stack | Deployment |
|-----|-------|------------|
| `apps/api` | NestJS · Prisma · PostgreSQL · Redis · Firebase Admin | Google Cloud Run |
| `apps/web` | Next.js 15 · TanStack Query · Zustand · shadcn/ui | Vercel |
| `apps/mobile` | Expo SDK 52 · Expo Router · NativeWind | Expo EAS Build |

**Shared packages:**

| Package | Purpose |
|---------|---------|
| `packages/api-types` | OpenAPI-generated types, error codes, query key helpers |
| `packages/ui` | Cross-platform primitives (web-first; mobile adapters post-MVP) |
| `packages/eslint-config` | Shared ESLint flat config |
| `packages/tsconfig` | Base TypeScript configs per app type |

**Related documents:** [`PRD.md`](./PRD.md) · [`api-contract.md`](./api-contract.md) · [`database-design.md`](./database-design.md) · [`backend-architecture.md`](./backend-architecture.md) · [`web-architecture.md`](./web-architecture.md) · [`mobile-architecture.md`](./mobile-architecture.md)

---

## 2. Monorepo Goals and Principles

### 2.1 Goals

| Goal | How the monorepo achieves it |
|------|------------------------------|
| **Single source of truth** | API contract drives shared types consumed by web, mobile, and API |
| **Atomic cross-app changes** | One PR can update DTO + client types + UI in lockstep |
| **Fast CI** | Turborepo remote cache + affected-only builds |
| **Independent deploys** | Each app has its own pipeline; merging web does not redeploy API |
| **Consistent DX** | Shared ESLint, TSConfig, scripts at root |
| **Onboard in < 1 day** | `pnpm install && pnpm dev` starts full stack |
| **Scale to 10+ engineers** | CODEOWNERS, package boundaries, clear dependency rules |

### 2.2 Principles

| Principle | Rule |
|-----------|------|
| **Apps deploy, packages don't** | `packages/*` are build artifacts consumed by apps — never deployed standalone |
| **Acyclic dependencies** | `apps → packages` only; packages never import from apps |
| **api-types is the contract hub** | Web and mobile depend on `@gamepool/api-types`; API validates against same shapes |
| **No circular workspace deps** | Enforced via `dependency-cruiser` in CI |
| **Explicit public API** | Packages export via `package.json` `exports` field only |
| **Environment isolation** | Secrets never in repo; per-app `.env.example` + platform secret stores |
| **Minimize shared UI early** | `packages/ui` starts thin; web keeps shadcn local until patterns stabilize |
| **Cache everything safe** | Turbo caches `build`, `lint`, `test`, `typecheck` with correct `outputs` |

### 2.3 What Does NOT Belong in the Monorepo

- Production secrets or service account JSON
- Large binary assets (use CDN / Git LFS if needed)
- Unrelated experiments (use separate repo or `apps/*` feature branches)
- Infrastructure Terraform (optional separate `infra/` repo at scale; stub in `tools/` for MVP)

---

## 3. Repository Structure

### 3.1 Complete Folder Tree

```
gamepool/
├── .github/
│   ├── CODEOWNERS
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/
│       ├── ci.yml                      # PR: lint, typecheck, test, build (affected)
│       ├── deploy-api-staging.yml
│       ├── deploy-api-production.yml
│       ├── deploy-web-preview.yml      # Vercel handles; optional smoke
│       └── mobile-eas-production.yml
│
├── apps/
│   ├── api/                            # NestJS backend
│   │   ├── docker/
│   │   │   ├── Dockerfile
│   │   │   └── Dockerfile.dev
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── worker.ts               # BullMQ notification worker
│   │   │   ├── app.module.ts
│   │   │   ├── config/
│   │   │   ├── common/
│   │   │   ├── domain/
│   │   │   ├── infrastructure/
│   │   │   └── modules/
│   │   │       ├── auth/
│   │   │       ├── users/
│   │   │       ├── sports/
│   │   │       ├── matches/
│   │   │       └── notifications/
│   │   ├── test/
│   │   ├── .env.example
│   │   ├── nest-cli.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web/                            # Next.js 15
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── features/
│   │   │   ├── components/
│   │   │   ├── lib/
│   │   │   ├── stores/
│   │   │   ├── providers/
│   │   │   ├── types/                  # App-local types only
│   │   │   └── middleware.ts
│   │   ├── .env.example
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── components.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── mobile/                         # Expo SDK 52
│       ├── app/                        # Expo Router
│       ├── src/
│       │   ├── components/
│       │   ├── features/
│       │   ├── lib/
│       │   ├── stores/
│       │   └── providers/
│       ├── assets/
│       ├── app.config.ts
│       ├── eas.json
│       ├── babel.config.js
│       ├── tailwind.config.js
│       ├── .env.example
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── api-types/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── generated/              # OpenAPI output (gitignored or committed)
│   │   │   │   └── schema.ts
│   │   │   ├── errors.ts               # ApiErrorCode enum
│   │   │   ├── query-keys.ts           # Shared React Query keys
│   │   │   └── constants.ts            # SkillLevel, MatchStatus enums
│   │   ├── openapi/
│   │   │   └── gamepool.openapi.json   # Snapshot from API or hand-maintained
│   │   ├── scripts/
│   │   │   └── generate.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ui/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── sport-badge.tsx
│   │   │   ├── skill-badge.tsx
│   │   │   ├── match-status-badge.tsx
│   │   │   └── format-date.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── eslint-config/
│   │   ├── base.js
│   │   ├── nestjs.js
│   │   ├── next.js
│   │   ├── react-native.js
│   │   └── package.json
│   │
│   └── tsconfig/
│       ├── base.json
│       ├── nestjs.json
│       ├── nextjs.json
│       ├── react-native.json
│       └── package.json
│
├── tools/
│   ├── docker/
│   │   └── docker-compose.yml          # Postgres + Redis for local dev
│   ├── scripts/
│   │   ├── setup.sh
│   │   ├── codegen.sh                  # OpenAPI → api-types
│   │   └── db-reset.sh
│   └── openapi-diff/                   # CI contract diff (optional)
│
├── docs/
│   ├── PRD.md
│   ├── api-contract.md
│   ├── database-design.md
│   ├── backend-architecture.md
│   ├── web-architecture.md
│   ├── mobile-architecture.md
│   └── monorepo-architecture.md
│
├── .gitignore
├── .npmrc
├── .nvmrc                              # Node 20
├── package.json                        # Root scripts
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── turbo.json
├── README.md
└── LICENSE
```

### 3.2 Dependency Graph

```mermaid
flowchart TB
    subgraph Apps
        API[apps/api]
        Web[apps/web]
        Mobile[apps/mobile]
    end

    subgraph Packages
        Types["@gamepool/api-types"]
        UI["@gamepool/ui"]
        ESLint["@gamepool/eslint-config"]
        TSConfig["@gamepool/tsconfig"]
    end

    API --> Types
    Web --> Types
    Web --> UI
    Mobile --> Types
    Mobile --> UI

    API --> ESLint
    Web --> ESLint
    Mobile --> ESLint

    API --> TSConfig
    Web --> TSConfig
    Mobile --> TSConfig

    UI --> Types
```

**Forbidden edges:** `packages/api-types → apps/*`, `apps/web → apps/mobile`, `apps/mobile → apps/web`.

---

## 4. Turborepo Architecture

### 4.1 Role of Turborepo

Turborepo orchestrates tasks across workspaces with:

- **Topological execution** — `build` runs `^build` (dependencies first)
- **Remote caching** — Vercel Remote Cache or self-hosted for CI speedup
- **Affected filtering** — `--filter=...[origin/main]` on PRs
- **Parallel execution** — lint/test across apps concurrently

### 4.2 Task Graph

```mermaid
flowchart LR
    subgraph PackageBuilds
        PT["@gamepool/api-types build"]
        PU["@gamepool/ui build"]
    end

    subgraph AppBuilds
        API["apps/api build"]
        Web["apps/web build"]
        Mob["apps/mobile typecheck"]
    end

    PT --> PU
    PT --> API
    PT --> Web
    PT --> Mob
    PU --> Web
    PU --> Mob
```

### 4.3 Task Definitions

| Task | Cached | Depends on | Outputs |
|------|--------|------------|---------|
| `build` | Yes | `^build` | `dist/`, `.next/`, `generated/` |
| `dev` | No | — | — |
| `lint` | Yes | `^build` | — |
| `typecheck` | Yes | `^build` | — |
| `test` | Yes | `^build` | `coverage/` |
| `codegen` | Yes | — | `packages/api-types/src/generated/` |
| `db:generate` | Yes | — | `node_modules/.prisma` |
| `db:migrate` | No | — | — |

### 4.4 Remote Cache

```bash
# Vercel Remote Cache (recommended for teams on Vercel)
npx turbo login
npx turbo link

# CI
TURBO_TOKEN=${{ secrets.TURBO_TOKEN }}
TURBO_TEAM=${{ vars.TURBO_TEAM }}
```

Expected CI speedup: **60–80%** on unchanged packages after first main-branch build.

---

## 5. Apps Structure

### 5.1 `apps/api` — NestJS Backend

| Attribute | Value |
|-----------|-------|
| **Package name** | `@gamepool/api` |
| **Entry** | `src/main.ts`, `src/worker.ts` |
| **Port** | `3001` (local) |
| **Deploy** | Cloud Run (`api.gamepool.app`) |

**Key directories:** See [`backend-architecture.md`](./backend-architecture.md).

**Monorepo-specific notes:**

- Prisma schema lives in `apps/api/prisma/` — not shared (DB is API-only)
- OpenAPI spec exported to `packages/api-types/openapi/` via CI or `pnpm codegen`
- Depends on `@gamepool/api-types` for enum parity in DTOs (optional re-export)

**`apps/api/package.json` (excerpt):**

```json
{
  "name": "@gamepool/api",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "dev:worker": "nest start --watch --entryFile worker",
    "start:prod": "node dist/main.js",
    "lint": "eslint \"{src,test}/**/*.ts\"",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:seed": "ts-node prisma/seed.ts",
    "openapi:export": "ts-node scripts/export-openapi.ts"
  },
  "dependencies": {
    "@gamepool/api-types": "workspace:*",
    "@nestjs/common": "^10.0.0",
    "@prisma/client": "^5.0.0"
  },
  "devDependencies": {
    "@gamepool/eslint-config": "workspace:*",
    "@gamepool/tsconfig": "workspace:*"
  }
}
```

### 5.2 `apps/web` — Next.js 15

| Attribute | Value |
|-----------|-------|
| **Package name** | `@gamepool/web` |
| **Entry** | `src/app/` |
| **Port** | `3000` (local) |
| **Deploy** | Vercel (`gamepool.app`) |

See [`web-architecture.md`](./web-architecture.md).

**Monorepo-specific notes:**

- Imports API types from `@gamepool/api-types` — not duplicated in `src/types/api`
- shadcn/ui stays in `apps/web/src/components/ui` (not `packages/ui` for primitives)
- `packages/ui` holds domain badges shared with mobile

**Import example:**

```typescript
import type { MatchDetail, ApiErrorCode } from '@gamepool/api-types';
import { queryKeys } from '@gamepool/api-types';
import { MatchStatusBadge } from '@gamepool/ui';
```

### 5.3 `apps/mobile` — Expo SDK 52

| Attribute | Value |
|-----------|-------|
| **Package name** | `@gamepool/mobile` |
| **Entry** | `app/` (Expo Router) |
| **Deploy** | EAS Build → App Store / Play Store |

See [`mobile-architecture.md`](./mobile-architecture.md).

**Monorepo-specific notes:**

- Metro must resolve workspace packages — configure `watchFolders` and `nodeModulesPaths`
- Native Firebase modules require **EAS dev client** (not Expo Go for production)
- No `next` or Node-only deps in mobile bundle

**`apps/mobile/metro.config.js` (workspace support):**

```javascript
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
```

---

## 6. Shared Packages Architecture

### 6.1 `packages/api-types`

**Purpose:** Single contract layer for REST API types, error codes, enums, and React Query key factory.

```
packages/api-types/
├── src/
│   ├── index.ts              # Public exports
│   ├── generated/
│   │   └── schema.ts         # openapi-typescript output
│   ├── errors.ts
│   ├── query-keys.ts
│   └── constants.ts
├── openapi/
│   └── gamepool.openapi.json
└── scripts/
    └── generate.ts
```

**`package.json`:**

```json
{
  "name": "@gamepool/api-types",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "codegen": "openapi-typescript openapi/gamepool.openapi.json -o src/generated/schema.ts",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "openapi-typescript": "^7.0.0",
    "typescript": "^5.0.0"
  }
}
```

**`src/errors.ts`:**

```typescript
export const ApiErrorCode = {
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  MATCH_FULL: 'MATCH_FULL',
  PROFILE_INCOMPLETE: 'PROFILE_INCOMPLETE',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  // ... mirror api-contract.md
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  status: number;
  details?: { field: string; message: string }[];
  requestId?: string;
}
```

**`src/query-keys.ts`:**

```typescript
export const queryKeys = {
  auth: { me: ['auth', 'me'] as const },
  sports: { all: ['sports'] as const },
  matches: {
    list: (filters: Record<string, unknown>) => ['matches', 'list', filters] as const,
    detail: (id: string) => ['matches', 'detail', id] as const,
  },
  users: {
    me: ['users', 'me'] as const,
    public: (id: string) => ['users', id] as const,
  },
  notifications: {
    unreadCount: ['notifications', 'unread-count'] as const,
    inbox: (page: number) => ['notifications', 'inbox', page] as const,
  },
} as const;
```

### 6.2 `packages/ui`

**Purpose:** Domain-presentational components safe for web + React Native (no DOM-only APIs).

| Component | Web | Mobile |
|-----------|-----|--------|
| `SportBadge` | Tailwind span | NativeWind View |
| `SkillBadge` | ✓ | ✓ |
| `MatchStatusBadge` | ✓ | ✓ |
| `formatMatchDate` | date-fns | date-fns |

**MVP scope:** Badges and formatters only. shadcn primitives remain in `apps/web`.

**`package.json`:**

```json
{
  "name": "@gamepool/ui",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0"
  },
  "dependencies": {
    "@gamepool/api-types": "workspace:*"
  }
}
```

**Import example (web):**

```tsx
import { MatchStatusBadge } from '@gamepool/ui';

<MatchStatusBadge status="OPEN" />
```

**Import example (mobile):**

```tsx
import { MatchStatusBadge } from '@gamepool/ui';

<MatchStatusBadge status="OPEN" />
```

### 6.3 `packages/eslint-config`

Shared ESLint 9 flat configs.

```
packages/eslint-config/
├── base.js           # TypeScript, import order, prettier
├── nestjs.js         # extends base + Nest rules
├── next.js           # extends base + next/core-web-vitals
├── react-native.js   # extends base + react-native
└── package.json
```

**Usage in `apps/web/eslint.config.mjs`:**

```javascript
import nextConfig from '@gamepool/eslint-config/next.js';

export default [...nextConfig];
```

### 6.4 `packages/tsconfig`

```
packages/tsconfig/
├── base.json         # strict, ES2022, moduleResolution bundler
├── nestjs.json       # extends base, CommonJS emit for Nest
├── nextjs.json       # extends base, jsx preserve, next plugin
├── react-native.json # extends base, jsx react-native
└── package.json
```

**`apps/web/tsconfig.json`:**

```json
{
  "extends": "@gamepool/tsconfig/nextjs.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules"]
}
```

---

## 7. Dependency Management Strategy

### 7.1 pnpm Workspaces

- **Single lockfile** at root — reproducible installs
- **Workspace protocol** — `"@gamepool/api-types": "workspace:*"`
- **Hoisted tooling** — `turbo`, `typescript`, `prettier` at root
- **Isolated app deps** — React versions pinned per app if needed

### 7.2 Version Pinning Rules

| Dependency | Strategy |
|------------|----------|
| `react` / `react-dom` | Same major across web; mobile may lag one minor — document in README |
| `@tanstack/react-query` | Same version web + mobile via root `pnpm.overrides` |
| `typescript` | Single version at root |
| `firebase` | Web: `firebase` JS SDK; Mobile: `@react-native-firebase/*` — separate, no shared package |
| NestJS / Next / Expo | Independent per app |

### 7.3 Root `pnpm.overrides` (example)

```json
{
  "pnpm": {
    "overrides": {
      "@tanstack/react-query": "^5.59.0",
      "typescript": "^5.6.0"
    }
  }
}
```

### 7.4 `.npmrc`

```ini
auto-install-peers=true
strict-peer-dependencies=false
shamefully-hoist=false
node-linker=hoisted
```

`node-linker=hoisted` improves React Native Metro compatibility with monorepos.

### 7.5 Adding a Dependency

```bash
# App-specific
pnpm add axios --filter @gamepool/web

# Shared package
pnpm add date-fns --filter @gamepool/ui

# Root dev tool
pnpm add -D turbo -w
```

---

## 8. Shared Type Generation Workflow

### 8.1 Source of Truth

```
api-contract.md  →  apps/api (implementation)  →  OpenAPI JSON  →  packages/api-types
```

OpenAPI is the **machine-readable contract**; markdown doc is human-readable spec.

### 8.2 Generation Pipeline

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant API as apps/api
    participant OpenAPI as openapi.json
    participant Types as packages/api-types
    participant Clients as web + mobile

    Dev->>API: Change DTO / controller
    Dev->>API: pnpm openapi:export
    API->>OpenAPI: Write gamepool.openapi.json
    Dev->>Types: pnpm codegen
    Types->>Types: openapi-typescript → generated/schema.ts
    Dev->>Types: pnpm build
    Clients->>Types: Import updated types
    Dev->>Clients: Fix type errors
```

### 8.3 Commands

```bash
# From repo root
pnpm codegen                    # turbo: api openapi:export + api-types codegen + build
```

**`tools/scripts/codegen.sh`:**

```bash
#!/usr/bin/env bash
set -euo pipefail
pnpm --filter @gamepool/api openapi:export
pnpm --filter @gamepool/api-types codegen
pnpm --filter @gamepool/api-types build
```

### 8.4 CI Contract Check

On PR touching `apps/api`:

1. Export OpenAPI from built API or committed snapshot
2. Regenerate types
3. Fail if `packages/api-types/src/generated/` has uncommitted diff
4. Optional: `openapi-diff` against `main` for breaking changes

### 8.5 Hand-Maintained vs Generated

| Artifact | Source |
|----------|--------|
| DTO interfaces (`MatchDetail`, etc.) | Generated |
| `ApiErrorCode` | Hand-maintained (stable codes) |
| `queryKeys` | Hand-maintained (convenience) |
| Zod schemas | Per-app (web/mobile) — derive from types where possible |

---

## 9. Environment Variable Strategy

### 9.1 Principles

| Rule | Detail |
|------|--------|
| Never commit `.env` | Only `.env.example` in repo |
| Prefix public vars | `NEXT_PUBLIC_*`, `EXPO_PUBLIC_*` |
| Server-only on API | `DATABASE_URL`, `FIREBASE_SERVICE_ACCOUNT` |
| Same API URL across clients | Staging/prod alignment per environment tier |

### 9.2 Environment Matrix

| Variable | api | web | mobile | Storage |
|----------|-----|-----|--------|---------|
| `DATABASE_URL` | ✓ | — | — | Secret Manager |
| `REDIS_URL` | ✓ | — | — | Secret Manager |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | ✓ | — | — | Secret Manager |
| `NEXT_PUBLIC_API_URL` | — | ✓ | — | Vercel env |
| `EXPO_PUBLIC_API_URL` | — | — | ✓ | EAS secrets |
| `NEXT_PUBLIC_FIREBASE_*` | — | ✓ | — | Vercel env |
| `GOOGLE_SERVICES_*` | — | — | ✓ | EAS file secrets |

### 9.3 Per-App `.env.example`

**`apps/api/.env.example`:**

```bash
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://gamepool:gamepool@localhost:5432/gamepool
REDIS_URL=redis://localhost:6379
FIREBASE_PROJECT_ID=gamepool-dev
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
CORS_ORIGINS=http://localhost:3000,http://localhost:8081
```

**`apps/web/.env.example`:**

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
```

**`apps/mobile/.env.example`:**

```bash
EXPO_PUBLIC_API_URL=http://localhost:3001/v1
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
```

### 9.4 Local Unified Setup

Root `tools/docker/docker-compose.yml` provides Postgres + Redis. API points to `localhost:5432`; web/mobile point API to `localhost:3001`.

For Android emulator: `EXPO_PUBLIC_API_URL=http://10.0.2.2:3001/v1`.

### 9.5 Turbo Global Env

Declare env vars that affect build cache in `turbo.json` `globalEnv` and per-task `env` to prevent cache poisoning.

---

## 10. Build Pipeline Architecture

### 10.1 Local Build

```bash
pnpm install
pnpm db:generate          # Prisma client
pnpm build                # turbo: packages → apps
```

### 10.2 CI Build (affected)

```bash
turbo run lint typecheck test build \
  --filter=...[origin/main] \
  --cache-dir=.turbo
```

### 10.3 Deploy Builds

| App | Build command | Artifact |
|-----|---------------|----------|
| API | `docker build -f apps/api/docker/Dockerfile` | Container image → GCR |
| Web | Vercel `next build` | Serverless + static |
| Mobile | `eas build --profile production` | IPA / AAB |

### 10.4 Build Order (full monorepo)

```
1. packages/api-types (codegen + build)
2. packages/ui (build)
3. apps/api (prisma generate + nest build)
4. apps/web (next build)
5. apps/mobile (expo export / eas build)
```

---

## 11. Development Workflow

### 11.1 Daily Commands

```bash
# Full stack (root)
pnpm dev

# Individual
pnpm dev --filter @gamepool/api
pnpm dev --filter @gamepool/web
pnpm dev --filter @gamepool/mobile
```

### 11.2 Root `package.json` Scripts

```json
{
  "name": "gamepool",
  "private": true,
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "codegen": "turbo run codegen",
    "db:generate": "turbo run db:generate --filter=@gamepool/api",
    "db:migrate": "pnpm --filter @gamepool/api db:migrate",
    "db:seed": "pnpm --filter @gamepool/api db:seed",
    "docker:up": "docker compose -f tools/docker/docker-compose.yml up -d",
    "docker:down": "docker compose -f tools/docker/docker-compose.yml down",
    "setup": "bash tools/scripts/setup.sh",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.6.0",
    "prettier": "^3.0.0"
  },
  "packageManager": "pnpm@9.12.0",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

### 11.3 Typical Feature Flow

1. Branch from `develop`: `feature/GP-123-match-filters`
2. Update API if needed + export OpenAPI
3. Run `pnpm codegen`
4. Update web + mobile features
5. PR → CI affected checks
6. Merge → staging deploys (API Cloud Run, Web Vercel preview, Mobile EAS preview on label)

### 11.4 Pre-Commit (optional)

```bash
# .husky/pre-commit
pnpm lint-staged
```

---

## 12. Git Branching Strategy

### 12.1 Branch Model (GitFlow-lite)

```mermaid
gitGraph
    commit id: "init"
    branch develop
    checkout develop
    commit id: "dev-work"
    branch feature/match-filters
    checkout feature/match-filters
    commit id: "feat"
    checkout develop
    merge feature/match-filters
    checkout main
    merge develop tag: "v1.0.0"
```

| Branch | Purpose | Deploy |
|--------|---------|--------|
| `main` | Production-ready | API prod, Web prod, Mobile release tags |
| `develop` | Integration | API staging, Web staging |
| `feature/*` | Feature work | Vercel preview, optional EAS preview |
| `hotfix/*` | Production fixes | Cherry-pick to main + develop |

### 12.2 PR Rules

- Squash merge to `develop`
- Require 1+ approval, passing CI
- `CODEOWNERS` auto-request for sensitive paths
- No direct push to `main`

---

## 13. CI/CD Architecture

### 13.1 Pipeline Overview

```mermaid
flowchart TB
    PR[Pull Request] --> CI[ci.yml<br/>affected lint test build]
    CI --> TurboCache[Turborepo Remote Cache]

    MergeDev[Merge to develop] --> APIStg[deploy-api-staging.yml]
    MergeDev --> VercelStg[Vercel auto-deploy staging]

    TagAPI[Tag api-v*] --> APIProd[deploy-api-production.yml]
    TagWeb[Tag web-v*] --> VercelProd[Vercel production]
    TagMobile[Tag mobile-v*] --> EASProd[mobile-eas-production.yml]
```

### 13.2 Independent Deploy Triggers

| App | Staging trigger | Production trigger |
|-----|-----------------|-------------------|
| API | Push to `develop` | Tag `api-v1.2.3` |
| Web | Vercel Git integration (`develop`) | Vercel (`main`) or tag `web-v1.2.3` |
| Mobile | Label `eas-preview` on PR | Tag `mobile-v1.2.3` |

Clients can release independently of API if contract is backward-compatible.

---

## 14. Testing Strategy

### 14.1 Testing Pyramid

| Layer | api | web | mobile |
|-------|-----|-----|--------|
| Unit | Jest (services, domain) | Jest + RTL (hooks, components) | Jest (hooks, utils) |
| Integration | Jest + Prisma test DB | MSW + RTL | MSW |
| E2E | Supertest / HTTP | Playwright (post-MVP) | Maestro (post-MVP) |
| Contract | OpenAPI diff | Typecheck vs api-types | Typecheck vs api-types |

### 14.2 Shared Testing Rules

- MSW handlers use types from `@gamepool/api-types`
- Fixture JSON in `packages/api-types/fixtures/` (optional)
- E2E runs against staging API only

### 14.3 Turbo Test Tasks

```json
"test": {
  "dependsOn": ["^build"],
  "outputs": ["coverage/**"],
  "inputs": ["src/**", "test/**", "**/*.test.ts"]
}
```

### 14.4 Coverage Targets (MVP)

| App | Target |
|-----|--------|
| api | 70% on services |
| web | 60% on features/hooks |
| mobile | 50% on hooks/utils |

---

## 15. Code Ownership Rules

### 15.1 `.github/CODEOWNERS`

```
# Default
*                           @gamepool/engineering

# API
/apps/api/                  @gamepool/backend
/apps/api/prisma/           @gamepool/backend @gamepool/platform

# Web
/apps/web/                  @gamepool/web

# Mobile
/apps/mobile/               @gamepool/mobile

# Shared contracts
/packages/api-types/        @gamepool/backend @gamepool/web @gamepool/mobile
/docs/api-contract.md       @gamepool/backend @gamepool/product

# CI / infra
/.github/                   @gamepool/platform
/turbo.json                 @gamepool/platform
```

### 15.2 Change Approval Matrix

| Change type | Required reviewers |
|-------------|-------------------|
| API breaking change | Backend + 1 client lead |
| `api-types` | Backend + web or mobile |
| Prisma migration | Backend + platform |
| Shared eslint/tsconfig | Platform + 1 app lead |

---

## 16. Versioning Strategy

### 16.1 App Versioning (independent)

| App | Version source | Example |
|-----|----------------|---------|
| API | Git tag `api-v*` | `api-v1.2.0` |
| Web | `package.json` + Vercel | `1.2.0` |
| Mobile | `app.config.ts` + EAS | `1.2.0` (build 42) |

### 16.2 Package Versioning

Internal packages use `0.0.0` with `workspace:*` — not published to npm for MVP.

### 16.3 API Contract Versioning

URL path `/v1/` per [`api-contract.md`](./api-contract.md). Breaking changes → `/v2/` + coordinated client releases.

### 16.4 Semver Tags

```
api-v1.0.0
web-v1.0.0
mobile-v1.0.0
```

Monorepo meta-release (optional): `v1.0.0` GitHub Release notes aggregating all apps.

---

## 17. Release Management

### 17.1 Release Cadence (MVP)

| App | Cadence |
|-----|---------|
| API | Weekly to staging; bi-weekly to prod |
| Web | Continuous (Vercel) after staging soak |
| Mobile | Bi-weekly store submission |

### 17.2 Release Checklist

**API (`api-v*`):**

- [ ] Migrations tested on staging
- [ ] `prisma migrate deploy` job succeeded
- [ ] OpenAPI exported; `api-types` regenerated on main
- [ ] Smoke test `/health/ready`

**Web:**

- [ ] Vercel production deploy green
- [ ] `NEXT_PUBLIC_API_URL` points to prod API
- [ ] Sentry release created

**Mobile (`mobile-v*`):**

- [ ] EAS production build iOS + Android
- [ ] TestFlight / Internal testing 48h
- [ ] Store metadata updated
- [ ] OTA runtime version bumped if native deps changed

### 17.3 Changelog

`CHANGELOG.md` at root with sections per app:

```markdown
## [api-v1.1.0] - 2026-07-01
### API
- Added waitlist support for matches

## [web-v1.1.0] - 2026-07-02
### Web
- Match filter UI
```

---

## 18. Deployment Architecture

### 18.1 Production Topology

```mermaid
flowchart TB
    subgraph Clients
        Browser[Web Browser]
        iOS[iOS App]
        Android[Android App]
    end

    subgraph Vercel
        WebApp["apps/web<br/>gamepool.app"]
        TurboCache[Turborepo Remote Cache]
    end

    subgraph GCP
        CloudRun["apps/api<br/>Cloud Run"]
        Worker[Worker Service]
        PG[(Cloud SQL PostgreSQL)]
        Redis[(Memorystore Redis)]
        GCR[Container Registry]
    end

    subgraph Expo
        EAS[EAS Build]
        OTA[Expo Updates]
    end

    subgraph Firebase
        FAuth[Auth]
        FCM[FCM]
    end

    Browser --> WebApp
    WebApp --> CloudRun
    Browser --> FAuth
    iOS --> CloudRun
    Android --> CloudRun
    iOS --> FAuth
    Android --> FAuth
    CloudRun --> PG
    CloudRun --> Redis
    Worker --> PG
    Worker --> Redis
    Worker --> FCM
    GCR --> CloudRun
    EAS --> iOS
    EAS --> Android
    OTA --> iOS
    OTA --> Android
    iOS --> FCM
    Android --> FCM
```

### 18.2 Deploy Responsibilities

| Component | Owner | Method |
|-----------|-------|--------|
| `apps/api` image | Platform | Cloud Build → GCR → Cloud Run |
| DB migrations | Platform | Cloud Run Job pre-deploy |
| `apps/web` | Web | Vercel Git integration |
| `apps/mobile` | Mobile | EAS CLI in GitHub Actions |
| Secrets | Platform | GCP Secret Manager, Vercel, EAS |

### 18.3 Domain Map

| Service | URL |
|---------|-----|
| Web | `https://gamepool.app` |
| API | `https://api.gamepool.app/v1` |
| API staging | `https://api.staging.gamepool.app/v1` |
| Web staging | `https://staging.gamepool.app` |

---

## 19. Turborepo Configuration

### 19.1 `turbo.json` (complete example)

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "globalDependencies": [
    ".env",
    "tsconfig.json",
    "pnpm-lock.yaml"
  ],
  "globalEnv": [
    "NODE_ENV",
    "CI"
  ],
  "tasks": {
    "build": {
      "dependsOn": ["^build", "codegen"],
      "outputs": [
        "dist/**",
        ".next/**",
        "!.next/cache/**",
        "src/generated/**"
      ],
      "env": [
        "NEXT_PUBLIC_API_URL",
        "NEXT_PUBLIC_APP_ENV",
        "EXPO_PUBLIC_API_URL",
        "DATABASE_URL"
      ]
    },
    "codegen": {
      "outputs": ["src/generated/**", "openapi/**"],
      "cache": true
    },
    "dev": {
      "dependsOn": ["^build"],
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "env": ["DATABASE_URL", "REDIS_URL"]
    },
    "clean": {
      "cache": false
    },
    "db:generate": {
      "cache": true,
      "outputs": ["node_modules/.prisma/**"]
    },
    "openapi:export": {
      "dependsOn": ["build"],
      "outputs": ["../../packages/api-types/openapi/**"],
      "cache": true
    }
  }
}
```

---

## 20. Package Manager Selection (pnpm)

### 20.1 Why pnpm

| Criteria | pnpm | npm | yarn |
|----------|------|-----|------|
| Disk efficiency | ✓ content-addressable store | ✗ | partial |
| Strict `node_modules` | ✓ prevents phantom deps | ✗ | partial |
| Workspace support | ✓ native | ✓ | ✓ |
| Metro / RN monorepo | ✓ with hoisted linker | ✗ | ✓ |
| Speed | ✓ | medium | medium |

### 20.2 `pnpm-workspace.yaml`

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### 20.3 Corepack (recommended)

```bash
corepack enable
corepack prepare pnpm@9.12.0 --activate
```

Pin in root `package.json`:

```json
"packageManager": "pnpm@9.12.0"
```

---

## 21. GitHub Actions Workflows

### 21.1 `ci.yml` — Pull Request

```yaml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [develop]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ vars.TURBO_TEAM }}

jobs:
  ci:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: gamepool
          POSTGRES_PASSWORD: gamepool
          POSTGRES_DB: gamepool_test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Generate Prisma client
        run: pnpm db:generate
        env:
          DATABASE_URL: postgresql://gamepool:gamepool@localhost:5432/gamepool_test

      - name: Lint, typecheck, test, build (affected)
        run: |
          pnpm turbo run lint typecheck test build \
            --filter=...[origin/${{ github.base_ref || 'main' }}]
        env:
          DATABASE_URL: postgresql://gamepool:gamepool@localhost:5432/gamepool_test
          REDIS_URL: redis://localhost:6379
          NEXT_PUBLIC_API_URL: http://localhost:3001/v1
          NEXT_PUBLIC_APP_ENV: test

      - name: OpenAPI / types drift check
        run: |
          pnpm codegen
          git diff --exit-code packages/api-types/
```

### 21.2 `deploy-api-staging.yml`

```yaml
name: Deploy API Staging

on:
  push:
    branches: [develop]
    paths:
      - 'apps/api/**'
      - 'packages/api-types/**'
      - 'tools/docker/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Configure Docker
        run: gcloud auth configure-docker

      - name: Build and push image
        run: |
          IMAGE=gcr.io/${{ vars.GCP_PROJECT }}/gamepool-api:staging-${{ github.sha }}
          docker build -f apps/api/docker/Dockerfile -t $IMAGE .
          docker push $IMAGE

      - name: Run migrations
        run: gcloud run jobs execute gamepool-migrate-staging --region=${{ vars.GCP_REGION }} --wait

      - name: Deploy Cloud Run
        run: |
          gcloud run deploy gamepool-api-staging \
            --image gcr.io/${{ vars.GCP_PROJECT }}/gamepool-api:staging-${{ github.sha }} \
            --region ${{ vars.GCP_REGION }} \
            --platform managed

      - name: Smoke test
        run: curl -f https://api.staging.gamepool.app/health/ready
```

### 21.3 `deploy-api-production.yml`

```yaml
name: Deploy API Production

on:
  push:
    tags: ['api-v*.*.*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Build and deploy
        run: |
          VERSION=${GITHUB_REF#refs/tags/api-v}
          IMAGE=gcr.io/${{ vars.GCP_PROJECT }}/gamepool-api:$VERSION
          docker build -f apps/api/docker/Dockerfile -t $IMAGE .
          docker push $IMAGE
          gcloud run jobs execute gamepool-migrate-prod --region=${{ vars.GCP_REGION }} --wait
          gcloud run deploy gamepool-api \
            --image $IMAGE \
            --region ${{ vars.GCP_REGION }} \
            --min-instances 2

      - run: curl -f https://api.gamepool.app/health/ready
```

### 21.4 `mobile-eas-production.yml`

```yaml
name: Mobile Production Build

on:
  push:
    tags: ['mobile-v*.*.*']

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        platform: [ios, android]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: pnpm turbo run build --filter=@gamepool/api-types --filter=@gamepool/ui
      - run: eas build --profile production --platform ${{ matrix.platform }} --non-interactive
        working-directory: apps/mobile
```

### 21.5 Vercel Integration

Web deploys via Vercel Git integration — not a custom workflow required.

**Vercel project settings:**

| Setting | Value |
|---------|-------|
| Root directory | `apps/web` |
| Build command | `cd ../.. && pnpm turbo run build --filter=@gamepool/web` |
| Install command | `cd ../.. && pnpm install` |
| Output | Next.js default |

---

## 22. Security Considerations

### 22.1 Secrets

| Secret | Location |
|--------|----------|
| `DATABASE_URL` | GCP Secret Manager → Cloud Run |
| `FIREBASE_SERVICE_ACCOUNT` | GCP Secret Manager |
| `TURBO_TOKEN` | GitHub Secrets |
| `EXPO_TOKEN` | GitHub Secrets |
| Firebase web config | Public by design (`NEXT_PUBLIC_*`) |

### 22.2 Supply Chain

- `pnpm install --frozen-lockfile` in CI
- Dependabot / Renovate for updates
- `npm audit` gate on critical CVEs
- Pin GitHub Actions to SHA

### 22.3 Access Control

- GCP: least-privilege SA per environment
- Vercel: team roles; production deploys from `main` only
- EAS: separate Apple/Google credentials per env
- Firebase: separate projects for dev/staging/prod

### 22.4 Code Scanning

- GitHub CodeQL (optional MVP)
- Trivy container scan on API image
- No secrets in Turbo cache inputs (declare `env` explicitly)

---

## 23. Scaling Strategy

### 23.1 Team Scaling (3 → 15 engineers)

| Stage | Structure |
|-------|-----------|
| 3–5 | Full-stack + 1 platform; shared CODEOWNERS |
| 6–10 | Dedicated api/web/mobile squads; feature branches |
| 10–15 | Add `packages/*` maintainer rotation; RFC for contract changes |

### 23.2 Repository Scaling

| Trigger | Action |
|---------|--------|
| CI > 15 min | Aggressive Turbo remote cache; shard test jobs |
| `packages/ui` conflicts | Split web/mobile UI packages |
| OpenAPI churn | Automate codegen in CI; block drift |
| Mobile build times | EAS build caching; monorepo `eas build` from root |

### 23.3 User Scaling (100k+)

Monorepo does not limit runtime scale — see backend/web/mobile architecture docs for CDN, Cloud Run HPA, read replicas.

---

## 24. Local Development Setup

### 24.1 Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20 LTS |
| pnpm | 9.x |
| Docker | 24+ |
| Firebase CLI | optional (emulators) |
| EAS CLI | mobile builds only |

### 24.2 First-Time Setup

```bash
git clone https://github.com/gamepool/gamepool.git
cd gamepool
corepack enable
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
pnpm docker:up
pnpm db:generate
pnpm --filter @gamepool/api db:migrate
pnpm --filter @gamepool/api db:seed
pnpm codegen
pnpm dev
```

### 24.3 `tools/scripts/setup.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
echo "==> GamePool setup"
command -v pnpm >/dev/null || { echo "Install pnpm"; exit 1; }
command -v docker >/dev/null || { echo "Install Docker"; exit 1; }

pnpm install
docker compose -f tools/docker/docker-compose.yml up -d

for app in api web mobile; do
  [ -f "apps/$app/.env" ] || cp "apps/$app/.env.example" "apps/$app/.env"
done
[ -f "apps/web/.env.local" ] || cp apps/web/.env.example apps/web/.env.local

pnpm db:generate
pnpm --filter @gamepool/api db:migrate
pnpm --filter @gamepool/api db:seed
pnpm codegen

echo "✓ Run: pnpm dev"
```

### 24.4 Local URLs

| Service | URL |
|---------|-----|
| Web | http://localhost:3000 |
| API | http://localhost:3001 |
| API docs | http://localhost:3001/docs |
| Metro | http://localhost:8081 |
| Postgres | localhost:5432 |
| Redis | localhost:6379 |

### 24.5 `tools/docker/docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ['5432:5432']
    environment:
      POSTGRES_USER: gamepool
      POSTGRES_PASSWORD: gamepool
      POSTGRES_DB: gamepool
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U gamepool']
      interval: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

---

## 25. Monorepo Best Practices

### 25.1 Do

| Practice | Reason |
|----------|--------|
| Run `pnpm codegen` after API contract changes | Prevents client drift |
| Use `--filter` for targeted work | Faster feedback |
| Keep packages small and focused | Clear boundaries |
| Export explicit `package.json` exports | Prevent deep imports |
| Document env vars in `.env.example` | Onboarding |
| Use Turbo `dependsOn: ["^build"]` | Correct build order |
| Tag releases per app | Independent deploys |

### 25.2 Don't

| Anti-pattern | Why |
|--------------|-----|
| Import `apps/web` from `apps/mobile` | Couples deployables |
| Put Prisma in shared package | DB access is API-only |
| Share Firebase native code in `packages/ui` | Platform-specific |
| Commit `.env` or service account JSON | Security |
| Skip OpenAPI drift CI | Silent type breakage |
| Put business logic in `packages/ui` | UI package is presentational |
| Use `any` to bypass api-types | Defeats contract purpose |

### 25.3 Import Cheat Sheet

```typescript
// ✅ Web / Mobile — shared types
import type { MatchDetail, PaginatedMeta } from '@gamepool/api-types';
import { ApiErrorCode, queryKeys } from '@gamepool/api-types';

// ✅ Web / Mobile — shared UI
import { SportBadge, formatMatchDate } from '@gamepool/ui';

// ✅ Apps — local features
import { useJoinMatch } from '@/features/matches/hooks/use-join-match';

// ❌ Never — cross-app import
// import { MatchCard } from '../../../web/src/...'

// ❌ Never — app importing another app's internals
// import { UsersService } from '@gamepool/api/src/...'
```

### 25.4 When to Create a New Package

| Signal | Action |
|--------|--------|
| Types used by 2+ apps | `packages/api-types` (already exists) |
| UI used by web + mobile with same API | `packages/ui` |
| Utility used by 2+ apps, no platform APIs | `packages/utils` (future) |
| Used by 1 app only | Keep in app |

### 25.5 RFC Process (contract changes)

1. Update `docs/api-contract.md`
2. Open RFC PR with API + `api-types` + client stubs
3. Backend + client leads approve
4. Implement + codegen + merge

---

## Appendix A: Prisma Location

Prisma remains in `apps/api/prisma/` only. Web and mobile **never** import `@prisma/client`.

---

## Appendix B: Aligning Existing Docs

Historical docs reference standalone repos (`gamepool-api/`, `gamepool-mobile/`). In the monorepo:

| Doc path | Monorepo path |
|----------|---------------|
| `gamepool-api/` | `apps/api/` |
| `apps/web/` (web-architecture) | `apps/web/` |
| `gamepool-mobile/` | `apps/mobile/` |
| `prisma/schema.prisma` (root) | `apps/api/prisma/schema.prisma` |

---

## Appendix C: Quick Reference Card

```bash
pnpm install              # Install all workspaces
pnpm dev                  # Start api + web + mobile
pnpm build                # Build all (turbo)
pnpm lint                 # Lint all
pnpm test                 # Test all
pnpm codegen              # OpenAPI → api-types
pnpm db:migrate           # Prisma migrate (api)
pnpm --filter @gamepool/web dev    # Web only
turbo run build --filter=@gamepool/web  # Build web + deps
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-06-23 | Engineering | Initial monorepo architecture for MVP |
