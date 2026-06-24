# GamePool — Backend Architecture

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** June 23, 2026  
**Stack:** NestJS · Prisma · PostgreSQL · Firebase Auth · Firebase Cloud Messaging · Redis

---

## Document Summary

This document defines the production-ready NestJS backend architecture for GamePool MVP. It follows **Clean Architecture** principles with a **Repository Pattern** over Prisma, strict **DTO validation**, and cross-cutting concerns (logging, exceptions, interceptors, guards, rate limiting, caching) applied globally.

**Related documents:** [`PRD.md`](./PRD.md) · [`database-design.md`](./database-design.md) · [`api-contract.md`](./api-contract.md)

---

## Architecture Principles

| Principle | Implementation |
|-----------|----------------|
| Clean Architecture | Domain → Application → Infrastructure → Presentation |
| Dependency rule | Inner layers never depend on outer layers; interfaces in domain/application |
| Repository pattern | Prisma hidden behind repository interfaces; services depend on abstractions |
| Thin controllers | HTTP mapping only; no business logic |
| Fat services (application) | Orchestration, transactions, domain rules |
| Single responsibility | One module per bounded context |
| Fail fast | DTO validation + domain exceptions at boundaries |
| Observability | Structured JSON logs, request IDs, health checks |
| Security by default | Firebase guard on protected routes; rate limits; no secrets in code |

---

## 1. Folder Structure

```
gamepool-api/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint, test, build on PR
│       ├── deploy-staging.yml        # Deploy to staging on merge to develop
│       └── deploy-production.yml     # Deploy to prod on release tag
│
├── docker/
│   ├── Dockerfile                    # Multi-stage production build
│   ├── Dockerfile.dev                # Dev with hot reload
│   └── docker-compose.yml            # API + Postgres + Redis (local)
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── src/
│   ├── main.ts                       # Bootstrap, global pipes/filters
│   ├── app.module.ts                 # Root module
│   │
│   ├── config/                       # Configuration (env validation)
│   │   ├── config.module.ts
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── firebase.config.ts
│   │   ├── redis.config.ts
│   │   └── validation.schema.ts      # Joi/Zod env schema
│   │
│   ├── common/                       # Shared cross-cutting code
│   │   ├── constants/
│   │   │   ├── error-codes.ts
│   │   │   └── cache-keys.ts
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── public.decorator.ts
│   │   │   ├── roles.decorator.ts
│   │   │   ├── paginated.decorator.ts
│   │   │   └── idempotency-key.decorator.ts
│   │   ├── dto/
│   │   │   ├── pagination-query.dto.ts
│   │   │   ├── paginated-response.dto.ts
│   │   │   └── api-response.dto.ts
│   │   ├── enums/
│   │   ├── exceptions/
│   │   │   ├── domain.exception.ts
│   │   │   ├── business.exception.ts
│   │   │   └── error-code.enum.ts
│   │   ├── filters/
│   │   │   ├── http-exception.filter.ts
│   │   │   ├── prisma-exception.filter.ts
│   │   │   └── all-exceptions.filter.ts
│   │   ├── guards/
│   │   │   ├── firebase-auth.guard.ts
│   │   │   ├── user-status.guard.ts
│   │   │   ├── profile-complete.guard.ts
│   │   │   └── match-host.guard.ts
│   │   ├── interceptors/
│   │   │   ├── transform.interceptor.ts      # { data, meta, links }
│   │   │   ├── logging.interceptor.ts
│   │   │   ├── timeout.interceptor.ts
│   │   │   └── cache.interceptor.ts
│   │   ├── interfaces/
│   │   │   ├── authenticated-user.interface.ts
│   │   │   └── paginated-result.interface.ts
│   │   ├── middleware/
│   │   │   └── request-id.middleware.ts
│   │   ├── pipes/
│   │   │   └── parse-uuid.pipe.ts
│   │   └── utils/
│   │       ├── pagination.util.ts
│   │       └── slug.util.ts
│   │
│   ├── infrastructure/               # External adapters (outer layer)
│   │   ├── database/
│   │   │   ├── prisma.module.ts
│   │   │   ├── prisma.service.ts
│   │   │   └── prisma-soft-delete.extension.ts
│   │   ├── firebase/
│   │   │   ├── firebase.module.ts
│   │   │   ├── firebase-auth.service.ts
│   │   │   └── firebase-messaging.service.ts
│   │   ├── cache/
│   │   │   ├── cache.module.ts
│   │   │   └── redis-cache.service.ts
│   │   ├── logging/
│   │   │   ├── logging.module.ts
│   │   │   └── pino-logger.service.ts
│   │   └── health/
│   │       ├── health.module.ts
│   │       └── health.controller.ts
│   │
│   ├── domain/                       # Pure domain (no Nest/Prisma imports)
│   │   ├── auth/
│   │   │   └── entities/
│   │   ├── users/
│   │   │   ├── entities/
│   │   │   │   ├── user.entity.ts
│   │   │   │   └── user-profile.entity.ts
│   │   │   └── repositories/
│   │   │       └── user.repository.interface.ts
│   │   ├── sports/
│   │   │   ├── entities/
│   │   │   │   └── sport.entity.ts
│   │   │   └── repositories/
│   │   │       └── sport.repository.interface.ts
│   │   ├── matches/
│   │   │   ├── entities/
│   │   │   │   ├── match.entity.ts
│   │   │   │   └── match-participant.entity.ts
│   │   │   ├── repositories/
│   │   │   │   ├── match.repository.interface.ts
│   │   │   │   └── match-participant.repository.interface.ts
│   │   │   └── services/
│   │   │       └── match-capacity.domain-service.ts
│   │   └── notifications/
│   │       ├── entities/
│   │       │   └── notification.entity.ts
│   │       └── repositories/
│   │           └── notification.repository.interface.ts
│   │
│   └── modules/                      # Feature modules (presentation + application)
│       ├── auth/
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── dto/
│       │   │   ├── bootstrap.dto.ts
│       │   │   └── auth-me-response.dto.ts
│       │   └── mappers/
│       │       └── auth.mapper.ts
│       │
│       ├── users/
│       │   ├── users.module.ts
│       │   ├── users.controller.ts
│       │   ├── users.service.ts
│       │   ├── user-sports.service.ts
│       │   ├── dto/
│       │   ├── repositories/
│       │   │   └── prisma-user.repository.ts
│       │   └── mappers/
│       │       └── user.mapper.ts
│       │
│       ├── sports/
│       │   ├── sports.module.ts
│       │   ├── sports.controller.ts
│       │   ├── sports.service.ts
│       │   ├── constants/
│       │   │   └── sport-formats.constant.ts
│       │   ├── dto/
│       │   ├── repositories/
│       │   │   └── prisma-sport.repository.ts
│       │   └── mappers/
│       │
│       ├── matches/
│       │   ├── matches.module.ts
│       │   ├── matches.controller.ts
│       │   ├── matches.service.ts
│       │   ├── match-participants.service.ts
│       │   ├── match-join.service.ts          # Transactional join logic
│       │   ├── dto/
│       │   ├── repositories/
│       │   │   ├── prisma-match.repository.ts
│       │   │   └── prisma-match-participant.repository.ts
│       │   └── mappers/
│       │
│       └── notifications/
│           ├── notifications.module.ts
│           ├── notifications.controller.ts
│           ├── notifications.service.ts
│           ├── notification-dispatch.service.ts  # FCM + in-app
│           ├── dto/
│           ├── repositories/
│           │   └── prisma-notification.repository.ts
│           ├── processors/
│           │   └── notification.processor.ts   # Bull queue worker
│           └── mappers/
│
├── test/
│   ├── e2e/
│   │   ├── auth.e2e-spec.ts
│   │   ├── matches.e2e-spec.ts
│   │   └── jest-e2e.json
│   └── unit/
│       └── matches/
│           └── match-join.service.spec.ts
│
├── .env.example
├── nest-cli.json
├── package.json
├── tsconfig.json
├── tsconfig.build.json
└── README.md
```

### Layer Responsibilities

| Layer | Path | Responsibility |
|-------|------|----------------|
| **Presentation** | `modules/*/*.controller.ts` | HTTP, Swagger decorators, route guards |
| **Application** | `modules/*/*.service.ts` | Use cases, orchestration, DTO mapping |
| **Domain** | `domain/` | Entities, repository interfaces, pure domain services |
| **Infrastructure** | `infrastructure/` | Prisma, Firebase, Redis, logging adapters |
| **Common** | `common/` | Cross-cutting NestJS building blocks |

---

## 2. Module Architecture

### 2.1 Root Module Graph

```mermaid
graph TB
    AppModule --> ConfigModule
    AppModule --> PrismaModule
    AppModule --> FirebaseModule
    AppModule --> CacheModule
    AppModule --> LoggingModule
    AppModule --> HealthModule
    AppModule --> ThrottlerModule

    AppModule --> AuthModule
    AppModule --> UsersModule
    AppModule --> SportsModule
    AppModule --> MatchesModule
    AppModule --> NotificationsModule

    AuthModule --> UsersModule
    MatchesModule --> UsersModule
    MatchesModule --> NotificationsModule
    MatchesModule --> SportsModule
    UsersModule --> SportsModule
    NotificationsModule --> FirebaseModule
```

### 2.2 Feature Module Internals

Each feature module follows the same internal structure:

```
FeatureModule
├── Controller(s)     → HTTP layer
├── Service(s)        → Application layer (use cases)
├── Repository impl   → Infrastructure (Prisma), bound via DI token
├── DTOs              → Request/response validation
├── Mappers           → Entity ↔ DTO transformation
└── Module imports    → Other modules' exported services only
```

### 2.3 Module Definitions

#### `AuthModule`

| Export | Consumed by |
|--------|-------------|
| `AuthService` | Internal |
| `FirebaseAuthGuard` | All protected modules (via global or import) |

**Responsibilities:** Bootstrap user from Firebase, session metadata, account deletion.

#### `UsersModule`

| Export | Consumed by |
|--------|-------------|
| `UsersService` | Auth, Matches |
| `UserSportsService` | Auth (bootstrap) |
| `USER_REPOSITORY` token | Internal |

**Responsibilities:** Profile CRUD, sports preferences, player search, `GET /users/me/matches`.

#### `SportsModule`

| Export | Consumed by |
|--------|-------------|
| `SportsService` | Users, Matches, Auth |

**Responsibilities:** Sport catalog (cached), slug resolution, static format metadata.

#### `MatchesModule`

| Export | Consumed by |
|--------|-------------|
| `MatchesService` | Users (my matches) |
| `MatchJoinService` | Internal |
| `MATCH_REPOSITORY` token | Internal |

**Responsibilities:** Match CRUD, publish, join/leave, participant management, capacity locking.

#### `NotificationsModule`

| Export | Consumed by |
|--------|-------------|
| `NotificationDispatchService` | Matches |
| `NotificationsService` | Internal |

**Responsibilities:** In-app inbox, FCM push, event-driven dispatch via queue.

### 2.4 Dependency Injection Tokens

```typescript
// domain/users/repositories/user.repository.interface.ts
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByFirebaseUid(firebaseUid: string): Promise<User | null>;
  create(data: CreateUserInput): Promise<User>;
  // ...
}

// modules/users/users.module.ts
@Module({
  providers: [
    UsersService,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  ],
  exports: [UsersService, USER_REPOSITORY],
})
export class UsersModule {}
```

### 2.5 Global Providers (registered in `AppModule`)

| Provider | Scope | Purpose |
|----------|-------|---------|
| `FirebaseAuthGuard` | `APP_GUARD` | Default auth; bypass via `@Public()` |
| `ThrottlerGuard` | `APP_GUARD` | Rate limiting |
| `ValidationPipe` | `APP_PIPE` | DTO validation |
| `TransformInterceptor` | `APP_INTERCEPTOR` | Response envelope |
| `LoggingInterceptor` | `APP_INTERCEPTOR` | Request/response logs |
| `AllExceptionsFilter` | `APP_FILTER` | Unified error format |
| `PrismaExceptionFilter` | `APP_FILTER` | Map Prisma errors |

---

## 3. Request Flow

### 3.1 HTTP Request Pipeline

```mermaid
sequenceDiagram
    participant Client
    participant MW as RequestIdMiddleware
    participant Guard as Guards
    participant Pipe as ValidationPipe
    participant Ctrl as Controller
    participant Svc as Service
    participant Repo as Repository
    participant DB as PostgreSQL
    participant Int as Interceptors
    participant Filter as ExceptionFilter

    Client->>MW: HTTP Request
    MW->>MW: Set X-Request-Id
    MW->>Guard: next()
    Guard->>Guard: FirebaseAuthGuard
    Guard->>Guard: UserStatusGuard
    Guard->>Guard: Resource guards (optional)
    Guard->>Pipe: next()
    Pipe->>Pipe: Validate DTO (class-validator)
    Pipe->>Ctrl: invoke handler
    Ctrl->>Svc: call use case
    Svc->>Repo: repository method
    Repo->>DB: Prisma query
    DB-->>Repo: rows
    Repo-->>Svc: domain entity
    Svc-->>Ctrl: result DTO
    Ctrl-->>Int: raw return value
    Int->>Int: TransformInterceptor → { data }
    Int-->>Client: JSON response

    Note over Guard,Filter: On error → ExceptionFilter → { error }
```

### 3.2 Request Lifecycle (ordered)

```
1. RequestIdMiddleware          → attach requestId to AsyncLocalStorage
2. ThrottlerGuard               → rate limit check (Redis store)
3. FirebaseAuthGuard            → verify JWT, load User (skip if @Public())
4. UserStatusGuard              → reject SUSPENDED / DEACTIVATED
5. ProfileCompleteGuard         → per-route (join, create match)
6. MatchHostGuard               → per-route (host-only actions)
7. ValidationPipe               → transform + validate DTO
8. Controller handler           → delegate to service
9. LoggingInterceptor           → log duration + status (post-handler)
10. TransformInterceptor        → wrap in { data, meta, links }
11. CacheInterceptor            → optional GET cache (sports catalog)
```

### 3.3 Example: Join Match Flow

```
POST /v1/matches/:id/join
  → FirebaseAuthGuard: resolve userId
  → ProfileCompleteGuard: profile + sports exist
  → IdempotencyMiddleware: check Redis key
  → MatchJoinService.joinMatch():
       1. $transaction:
          - SELECT match FOR UPDATE
          - validate status, capacity, blocks
          - upsert MatchParticipant
          - increment confirmedCount if CONFIRMED
          - update match.status if FULL
       2. NotificationDispatchService.emit(MATCH_JOIN_REQUEST | CONFIRMED)
       3. Cache invalidation: match detail key
  → TransformInterceptor: { data: JoinMatchResponseDto }
```

---

## 4. Service Layer Design

### 4.1 Service Responsibilities

| Service | Use Cases |
|---------|-----------|
| `AuthService` | `bootstrap`, `getMe`, `logout`, `deleteAccount` |
| `UsersService` | `getProfile`, `updateProfile`, `searchPlayers`, `getPublicProfile` |
| `UserSportsService` | `list`, `add`, `update`, `remove`, `replaceAll` |
| `SportsService` | `listSports`, `getByIdOrSlug` |
| `MatchesService` | `create`, `update`, `cancel`, `publish`, `findAll`, `findOne` |
| `MatchJoinService` | `join`, `leave` (transactional, capacity rules) |
| `MatchParticipantsService` | `list`, `approve`, `decline`, `remove` |
| `NotificationsService` | `getInbox`, `markRead`, `markAllRead`, `getUnreadCount` |
| `NotificationDispatchService` | `createAndDispatch`, `sendPush`, `sendEmail` |

### 4.2 Service Design Rules

1. **One use case per public method** — `joinMatch()`, not `handleParticipantAction()`.
2. **Transactions at service boundary** — `MatchJoinService` owns `$transaction`.
3. **No Prisma in services** — only repository interfaces.
4. **Domain exceptions** — throw `BusinessException(ErrorCode.MATCH_FULL)`, not `HttpException`.
5. **Side effects after commit** — notifications enqueued after transaction succeeds.
6. **Idempotency in service** — check idempotency store before mutating.

### 4.3 AuthService (example skeleton)

```typescript
@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    private readonly userSports: UserSportsService,
    private readonly firebaseAuth: FirebaseAuthService,
  ) {}

  async bootstrap(firebaseUser: AuthenticatedFirebaseUser, dto: BootstrapDto) {
    let user = await this.users.findByFirebaseUid(firebaseUser.uid);

    if (!user) {
      user = await this.users.createFromFirebase(firebaseUser, dto);
    } else {
      await this.users.updateLastLogin(user.id);
    }

    if (dto.sports?.length) {
      await this.userSports.replaceAll(user.id, dto.sports);
    }

    return this.buildBootstrapResponse(user);
  }
}
```

### 4.4 MatchJoinService (transactional)

```typescript
@Injectable()
export class MatchJoinService {
  constructor(
    @Inject(MATCH_REPOSITORY) private readonly matches: IMatchRepository,
    @Inject(MATCH_PARTICIPANT_REPOSITORY) private readonly participants: IMatchParticipantRepository,
    private readonly dispatch: NotificationDispatchService,
    private readonly prisma: PrismaService,
  ) {}

  async join(matchId: string, userId: string, dto: JoinMatchDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const match = await this.matches.lockById(matchId, tx); // FOR UPDATE
      // capacity + status validation
      // create/update participant
      // update confirmedCount + match status
      return { participant, match };
    });

    await this.dispatch.emitMatchJoin(result);
    return result;
  }
}
```

### 4.5 Domain Services (pure logic)

Located in `domain/matches/services/` — no I/O:

```typescript
// match-capacity.domain-service.ts
export class MatchCapacityDomainService {
  static slotsRemaining(match: Match): number {
    return match.maxParticipants - match.confirmedCount;
  }

  static canJoin(match: Match, participant: MatchParticipant | null): JoinDecision {
    // pure rules: status, cutoff, duplicate, full + waitlist
  }
}
```

---

## 5. Repository Layer Design

### 5.1 Repository Pattern Overview

```
Service → IUserRepository (interface) → PrismaUserRepository (impl) → PrismaService → PostgreSQL
```

| Rule | Detail |
|------|--------|
| Interface location | `domain/*/repositories/*.interface.ts` |
| Implementation location | `modules/*/repositories/prisma-*.repository.ts` |
| Return types | Domain entities or typed query results — not raw Prisma models in services |
| Soft delete | Repository always filters `deletedAt: null` unless `includeDeleted` |
| Pagination | Repository accepts `PaginationQuery`, returns `PaginatedResult<T>` |
| Transactions | Accept optional `Prisma.TransactionClient` parameter |

### 5.2 Repository Interface Examples

```typescript
// domain/matches/repositories/match.repository.interface.ts
export interface MatchFilters {
  sportId?: string;
  status?: MatchStatus[];
  city?: string;
  startsAtFrom?: Date;
  startsAtTo?: Date;
}

export interface IMatchRepository {
  findById(id: string): Promise<Match | null>;
  lockById(id: string, tx: Prisma.TransactionClient): Promise<Match>;
  findPaginated(filters: MatchFilters, pagination: PaginationQuery): Promise<PaginatedResult<Match>>;
  create(data: CreateMatchInput): Promise<Match>;
  update(id: string, data: UpdateMatchInput): Promise<Match>;
  softDelete(id: string): Promise<void>;
  incrementConfirmedCount(id: string, delta: number, tx: Prisma.TransactionClient): Promise<Match>;
}
```

### 5.3 Prisma Repository Implementation

```typescript
@Injectable()
export class PrismaMatchRepository implements IMatchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPaginated(filters: MatchFilters, pagination: PaginationQuery) {
    const where = this.buildWhere(filters);
    const [items, totalItems] = await Promise.all([
      this.prisma.match.findMany({
        where: { ...where, deletedAt: null },
        skip: pagination.skip,
        take: pagination.take,
        orderBy: parseSort(pagination.sort),
        include: { sport: true, host: { include: { profile: true } } },
      }),
      this.prisma.match.count({ where: { ...where, deletedAt: null } }),
    ]);
    return { items: items.map(MatchMapper.toDomain), totalItems };
  }

  async lockById(id: string, tx: Prisma.TransactionClient) {
    const rows = await tx.$queryRaw<MatchRow[]>`
      SELECT * FROM matches WHERE id = ${id}::uuid AND deleted_at IS NULL FOR UPDATE
    `;
    if (!rows.length) throw new BusinessException(ErrorCode.MATCH_NOT_FOUND);
    return MatchMapper.toDomain(rows[0]);
  }
}
```

### 5.4 Prisma Soft-Delete Extension

```typescript
// infrastructure/database/prisma-soft-delete.extension.ts
export const softDeleteExtension = Prisma.defineExtension({
  name: 'softDelete',
  query: {
    user: { findMany({ args, query }) { args.where = { ...args.where, deletedAt: null }; return query(args); } },
    match: { findMany({ args, query }) { args.where = { ...args.where, deletedAt: null }; return query(args); } },
    // ...
  },
});
```

### 5.5 Mapper Pattern

```typescript
// modules/matches/mappers/match.mapper.ts
export class MatchMapper {
  static toDomain(row: PrismaMatchWithRelations): Match { /* ... */ }
  static toResponseDto(match: Match, context: MatchViewContext): MatchResponseDto { /* ... */ }
}
```

### 5.6 Repository Summary Table

| Repository | Interface | Prisma Model(s) |
|------------|-----------|-----------------|
| `PrismaUserRepository` | `IUserRepository` | `User`, `UserProfile` |
| `PrismaSportRepository` | `ISportRepository` | `Sport` |
| `PrismaMatchRepository` | `IMatchRepository` | `Match` |
| `PrismaMatchParticipantRepository` | `IMatchParticipantRepository` | `MatchParticipant` |
| `PrismaNotificationRepository` | `INotificationRepository` | `Notification` |
| `PrismaIdempotencyRepository` | `IIdempotencyRepository` | `IdempotencyKey` (add to schema) |

---

## 6. Authentication Flow

### 6.1 Firebase Auth Integration

```mermaid
sequenceDiagram
    participant App as Mobile/Web App
    participant FB as Firebase Auth
    participant API as NestJS API
    participant FAS as FirebaseAuthService
    participant DB as PostgreSQL

    App->>FB: signInWithPhoneNumber / Email
    FB-->>App: ID Token (JWT)
    App->>API: POST /v1/auth/bootstrap<br/>Authorization: Bearer {token}
    API->>FAS: verifyIdToken(token)
    FAS->>FB: Admin SDK verify
    FB-->>FAS: decoded claims (uid, email, phone)
    FAS-->>API: AuthenticatedFirebaseUser
    API->>DB: findByFirebaseUid OR create User + Profile
    DB-->>API: User record
    API-->>App: { data: { user, profile, profileComplete } }

    Note over App,API: Subsequent requests
    App->>API: GET /v1/matches<br/>Authorization: Bearer {token}
    API->>FAS: verifyIdToken (cached 60s)
    FAS-->>API: claims
    API->>DB: findByFirebaseUid → userId
    API-->>App: matches list
```

### 6.2 FirebaseAuthGuard

```typescript
@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly firebase: FirebaseAuthService,
    private readonly users: UsersService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.get<boolean>(IS_PUBLIC_KEY, context.getHandler())) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) throw new BusinessException(ErrorCode.AUTH_TOKEN_MISSING);

    const decoded = await this.firebase.verifyIdToken(token);
    const user = await this.users.findByFirebaseUid(decoded.uid);

    if (!user && !this.isBootstrapRoute(context)) {
      throw new BusinessException(ErrorCode.AUTH_BOOTSTRAP_REQUIRED);
    }

    request.user = { firebaseUid: decoded.uid, userId: user?.id, email: decoded.email, phone: decoded.phone_number };
    return true;
  }
}
```

### 6.3 Token Verification Caching

| Cache Key | TTL | Purpose |
|-----------|-----|---------|
| `auth:token:{sha256(token)}` | 60s | Avoid repeated Firebase verify calls per burst |
| `auth:user:{firebaseUid}` | 300s | Map firebaseUid → userId (invalidate on profile update) |

### 6.4 User Provisioning

On bootstrap, create in single transaction:

1. `User` — `firebaseUid`, `email`, `phone`, `status: ACTIVE`
2. `UserProfile` — from DTO or defaults
3. `UserSport[]` — if provided
4. `Notification` — `WELCOME` type

### 6.5 Account Deletion

```
DELETE /v1/auth/account
  → Revoke Firebase refresh tokens (Admin SDK)
  → Soft-delete User + UserProfile
  → Cancel future hosted matches
  → Anonymize PII (email, phone, displayName)
  → Delete FCM device tokens
```

### 6.6 FCM Device Token Registration (post-bootstrap)

```
POST /v1/users/me/device-tokens   (Phase 1.1 — document for FCM)
{ "token": "fcm-device-token", "platform": "android" | "ios" | "web" }
```

Stored in `user_device_tokens` table; used by `FirebaseMessagingService`.

---

## 7. Notification Flow

### 7.1 Architecture Overview

```mermaid
flowchart LR
    subgraph API["NestJS API"]
        MS[MatchJoinService]
        ND[NotificationDispatchService]
        Q[BullMQ Queue]
        NP[NotificationProcessor]
        FCM[FirebaseMessagingService]
        NR[NotificationRepository]
    end

    MS -->|emit event| ND
    ND -->|1. persist| NR
    ND -->|2. enqueue| Q
    Q --> NP
    NP -->|push enabled| FCM
    NP -->|email enabled| Email[Email Provider]
    FCM --> Devices[User Devices]
```

**Principle:** API request path only writes to DB + enqueues; push/email delivery is async.

### 7.2 Event Types → Notification Mapping

| Trigger | `NotificationType` | Recipients | Push |
|---------|-------------------|------------|------|
| User joins (pending approval) | `MATCH_JOIN_REQUEST` | Host | Yes |
| Host approves | `MATCH_JOIN_APPROVED` | Participant | Yes |
| Host declines | `MATCH_JOIN_DECLINED` | Participant | Yes |
| Match becomes full | `MATCH_FULL` | Host + participants | Yes |
| Host cancels | `MATCH_CANCELLED` | All participants | Yes |
| Cron: 24h / 2h before | `MATCH_REMINDER` | Confirmed participants | Yes |
| Match updated | `MATCH_UPDATED` | Participants | Yes |
| Bootstrap | `WELCOME` | New user | No |

### 7.3 NotificationDispatchService

```typescript
@Injectable()
export class NotificationDispatchService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notifications: INotificationRepository,
  @InjectQueue('notifications') private readonly queue: Queue,
  ) {}

  async dispatch(payload: CreateNotificationPayload) {
  // 1. Persist in-app notification
    const notification = await this.notifications.create(payload);

    // 2. Enqueue async delivery
    await this.queue.add('deliver', {
      notificationId: notification.id,
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.payload,
    }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });

    return notification;
  }
}
```

### 7.4 NotificationProcessor (BullMQ Worker)

```typescript
@Processor('notifications')
export class NotificationProcessor {
  constructor(
    private readonly fcm: FirebaseMessagingService,
    private readonly users: UsersService,
  ) {}

  @Process('deliver')
  async handleDeliver(job: Job<DeliverNotificationJob>) {
    const prefs = await this.users.getPreferences(job.data.userId);
    if (!prefs.pushNotificationsEnabled) return;

    const tokens = await this.users.getDeviceTokens(job.data.userId);
    if (!tokens.length) return;

    await this.fcm.sendMulticast({
      tokens,
      notification: { title: job.data.title, body: job.data.body },
      data: { type: job.data.type, ...stringifyPayload(job.data.data) },
    });
  }
}
```

### 7.5 FirebaseMessagingService

```typescript
@Injectable()
export class FirebaseMessagingService {
  private messaging: admin.messaging.Messaging;

  constructor(private readonly config: ConfigService) {
    this.messaging = admin.messaging();
  }

  async sendMulticast(message: MulticastMessage): Promise<BatchResponse> {
    return this.messaging.sendEachForMulticast(message);
  }

  async invalidateStaleTokens(responses: SendResponse[], tokens: string[]) {
    // Remove tokens with messaging/registration-token-not-registered
  }
}
```

### 7.6 Match Reminder Cron

```typescript
// modules/notifications/schedulers/match-reminder.scheduler.ts
@Injectable()
export class MatchReminderScheduler {
  @Cron('*/15 * * * *') // every 15 minutes
  async sendReminders() {
    const matches24h = await this.matches.findStartingIn(24 * 60, 24 * 60 + 15);
    const matches2h = await this.matches.findStartingIn(2 * 60, 2 * 60 + 15);
    // dispatch MATCH_REMINDER to confirmed participants (dedupe via payload key)
  }
}
```

### 7.7 Unread Count Caching

| Key | TTL | Invalidation |
|-----|-----|--------------|
| `notifications:unread:{userId}` | 30s | On create/read/delete notification |

---

## 8. Deployment Architecture

### 8.1 Production Topology

```mermaid
flowchart TB
    subgraph Clients
        Web[Web App]
        Mobile[Mobile App]
    end

    subgraph CDN["CDN / WAF"]
        CF[Cloudflare]
    end

    subgraph GCP["Cloud Platform"]
        LB[Load Balancer]

        subgraph ECS["Container Service"]
            API1[API Pod 1]
            API2[API Pod 2]
            Worker[Worker Pod<br/>BullMQ processor]
        end

        subgraph Data
            PG[(PostgreSQL<br/>Primary)]
            PGR[(Read Replica)]
            Redis[(Redis<br/>Cache + Queue)]
        end

        subgraph Firebase
            FAuth[Firebase Auth]
            FCM[FCM]
        end
    end

    Web --> CF
    Mobile --> CF
    CF --> LB
    LB --> API1
    LB --> API2
    API1 --> PG
    API2 --> PG
    API1 --> PGR
    API2 --> PGR
    API1 --> Redis
    API2 --> Redis
    Worker --> PG
    Worker --> Redis
    API1 --> FAuth
    API2 --> FAuth
    Worker --> FCM
```

### 8.2 Environment Tiers

| Environment | Purpose | Database | Redis | Firebase |
|-------------|---------|----------|-------|----------|
| **local** | Developer machine | Docker Postgres | Docker Redis | Firebase Emulator |
| **staging** | QA / integration | Managed PG (small) | Managed Redis | Staging Firebase project |
| **production** | Live users | Managed PG + replica | Managed Redis (HA) | Production Firebase project |

### 8.3 Process Model

| Process | Instances | Notes |
|---------|-----------|-------|
| `api` | 2+ (auto-scale on CPU/latency) | Stateless; HPA on p95 latency |
| `worker` | 1–2 | BullMQ notification processor + cron |
| `migrate` | Job (pre-deploy) | `prisma migrate deploy` |

### 8.4 Configuration Management

| Source | Contents |
|--------|----------|
| Env vars | `DATABASE_URL`, `REDIS_URL`, `NODE_ENV`, `PORT` |
| Secrets manager | `FIREBASE_SERVICE_ACCOUNT_JSON`, API keys |
| Config service (optional) | Feature flags post-MVP |

### 8.5 Health Checks

| Endpoint | K8s probe | Checks |
|----------|-----------|--------|
| `GET /health` | Liveness | Process alive |
| `GET /health/ready` | Readiness | Postgres `SELECT 1`, Redis PING, Firebase init |

### 8.6 Scaling Targets (100k users)

| Resource | MVP | Scale trigger |
|----------|-----|---------------|
| API pods | 2 × 0.5 vCPU, 512MB | p95 > 500ms |
| Worker pods | 1 × 0.25 vCPU | Queue depth > 1000 |
| Postgres | 2 vCPU, 8GB | CPU > 70% sustained |
| Redis | 1GB | Memory > 80% |

---

## 9. Docker Setup

### 9.1 `docker/Dockerfile` (multi-stage production)

```dockerfile
# ── Stage 1: Dependencies ──
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Stage 2: Build ──
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

# ── Stage 3: Production ──
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

USER nestjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
```

### 9.2 `docker/Dockerfile.dev`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "start:dev"]
```

### 9.3 `docker/docker-compose.yml`

```yaml
services:
  api:
    build:
      context: ..
      dockerfile: docker/Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ../src:/app/src
      - ../prisma:/app/prisma
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://gamepool:gamepool@postgres:5432/gamepool?schema=public
      REDIS_URL: redis://redis:6379
      FIREBASE_PROJECT_ID: gamepool-dev
      FIREBASE_EMULATOR_HOST: firebase:9099
      GOOGLE_APPLICATION_CREDENTIALS: /app/firebase-service-account.json
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: sh -c "npx prisma migrate deploy && npm run start:dev"

  worker:
    build:
      context: ..
      dockerfile: docker/Dockerfile.dev
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://gamepool:gamepool@postgres:5432/gamepool?schema=public
      REDIS_URL: redis://redis:6379
      WORKER_MODE: "true"
    depends_on:
      - api
      - redis
    command: npm run start:worker:dev

  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: gamepool
      POSTGRES_PASSWORD: gamepool
      POSTGRES_DB: gamepool
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gamepool"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  pgdata:
  redisdata:
```

### 9.4 `.env.example`

```bash
# App
NODE_ENV=development
PORT=3000
API_PREFIX=v1
LOG_LEVEL=debug

# Database
DATABASE_URL=postgresql://gamepool:gamepool@localhost:5432/gamepool?schema=public

# Redis
REDIS_URL=redis://localhost:6379

# Firebase
FIREBASE_PROJECT_ID=gamepool-dev
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json

# Rate limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=120

# CORS
CORS_ORIGINS=http://localhost:3001,http://localhost:5173
```

### 9.5 `package.json` Scripts

```json
{
  "scripts": {
    "build": "nest build",
    "start": "node dist/main.js",
    "start:dev": "nest start --watch",
    "start:worker:dev": "nest start --watch --entryFile worker",
    "start:prod": "node dist/main.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:deploy": "prisma migrate deploy",
    "prisma:seed": "ts-node prisma/seed.ts",
    "test": "jest",
    "test:e2e": "jest --config ./test/e2e/jest-e2e.json",
    "lint": "eslint \"{src,test}/**/*.ts\"",
    "docker:up": "docker compose -f docker/docker-compose.yml up -d",
    "docker:down": "docker compose -f docker/docker-compose.yml down"
  }
}
```

---

## 10. CI/CD Structure

### 10.1 Pipeline Overview

```mermaid
flowchart LR
    PR[Pull Request] --> CI[CI Pipeline]
    CI --> Lint[Lint + Typecheck]
    CI --> Test[Unit Tests]
    CI --> E2E[E2E Tests]
    CI --> Build[Docker Build]
    CI --> Scan[Security Scan]

    Merge[Merge to develop] --> DeployStg[Deploy Staging]
    DeployStg --> Smoke[Smoke Tests]

  Tag[Release Tag v*] --> DeployProd[Deploy Production]
    DeployProd --> Migrate[Prisma Migrate]
    Migrate --> Rollout[Rolling Deploy]
    Rollout --> Health[Health Check]
```

### 10.2 `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [develop]

env:
  NODE_VERSION: "20"

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: gamepool
          POSTGRES_PASSWORD: gamepool
          POSTGRES_DB: gamepool_test
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm

      - run: npm ci

      - name: Prisma generate
        run: npx prisma generate

      - name: Migrate test DB
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://gamepool:gamepool@localhost:5432/gamepool_test

      - name: Lint
        run: npm run lint

      - name: Unit tests
        run: npm run test -- --coverage
        env:
          DATABASE_URL: postgresql://gamepool:gamepool@localhost:5432/gamepool_test
          REDIS_URL: redis://localhost:6379

      - name: E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://gamepool:gamepool@localhost:5432/gamepool_test
          REDIS_URL: redis://localhost:6379
          FIREBASE_PROJECT_ID: test

  build:
    runs-on: ubuntu-latest
    needs: lint-and-test
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -f docker/Dockerfile -t gamepool-api:${{ github.sha }} .

      - name: Trivy scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: gamepool-api:${{ github.sha }}
          severity: CRITICAL,HIGH
```

### 10.3 `.github/workflows/deploy-staging.yml`

```yaml
name: Deploy Staging

on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Configure cloud credentials
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Build and push image
        run: |
          docker build -f docker/Dockerfile -t gcr.io/${{ vars.GCP_PROJECT }}/gamepool-api:staging-${{ github.sha }} .
          docker push gcr.io/${{ vars.GCP_PROJECT }}/gamepool-api:staging-${{ github.sha }}

      - name: Run migrations
        run: |
          gcloud run jobs execute gamepool-migrate-staging --region=${{ vars.GCP_REGION }} --wait

      - name: Deploy API
        run: |
          gcloud run deploy gamepool-api-staging \
            --image gcr.io/${{ vars.GCP_PROJECT }}/gamepool-api:staging-${{ github.sha }} \
            --region ${{ vars.GCP_REGION }} \
            --platform managed

      - name: Smoke test
        run: curl -f https://api.staging.gamepool.app/health/ready
```

### 10.4 `.github/workflows/deploy-production.yml`

```yaml
name: Deploy Production

on:
  push:
    tags: ["v*.*.*"]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Build and push
        run: |
          VERSION=${GITHUB_REF#refs/tags/}
          docker build -f docker/Dockerfile -t gcr.io/${{ vars.GCP_PROJECT }}/gamepool-api:$VERSION .
          docker push gcr.io/${{ vars.GCP_PROJECT }}/gamepool-api:$VERSION

      - name: Migrate
        run: gcloud run jobs execute gamepool-migrate-prod --region=${{ vars.GCP_REGION }} --wait

      - name: Rolling deploy
        run: |
          gcloud run deploy gamepool-api \
            --image gcr.io/${{ vars.GCP_PROJECT }}/gamepool-api:$VERSION \
            --region ${{ vars.GCP_REGION }} \
            --min-instances 2 \
            --max-instances 10

      - name: Verify health
        run: curl -f https://api.gamepool.app/health/ready
```

### 10.5 CI/CD Conventions

| Convention | Rule |
|------------|------|
| Branch `develop` | Auto-deploy staging |
| Tag `v1.2.3` | Deploy production |
| Migrations | Always run **before** app rollout via dedicated job |
| Secrets | GitHub Environments (`staging`, `production`) |
| Rollback | Re-deploy previous image tag; migrations must be backward-compatible |
| OpenAPI | Export `openapi.json` as CI artifact for contract diff |

---

## Appendix A: Cross-Cutting Implementation Reference

### A.1 Global ValidationPipe (`main.ts`)

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
  }),
);
```

### A.2 TransformInterceptor

```typescript
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      map((result) => {
        if (result?.data !== undefined) return result; // already wrapped (paginated)
        return { data: result ?? null };
      }),
    );
  }
}
```

### A.3 HttpExceptionFilter (RFC 7807-style)

```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp().getResponse<Response>();
    const requestId = getRequestId();

    if (exception instanceof BusinessException) {
      return ctx.status(exception.httpStatus).json({
        error: {
          code: exception.code,
          message: exception.message,
          status: exception.httpStatus,
          details: exception.details,
          requestId,
        },
      });
    }
    // ...
  }
}
```

### A.4 Rate Limiting (`@nestjs/throttler` + Redis)

```typescript
ThrottlerModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    throttlers: [
      { name: 'default', ttl: 60000, limit: 120 },
      { name: 'search', ttl: 60000, limit: 60 },
      { name: 'write', ttl: 60000, limit: 20 },
    ],
    storage: new ThrottlerStorageRedisService(config.get('REDIS_URL')),
  }),
}),
```

### A.5 Caching Strategy

| Resource | Strategy | TTL | Key pattern |
|----------|----------|-----|-------------|
| Sports catalog | Cache-aside | 1h | `sports:list` |
| Sport by slug | Cache-aside | 1h | `sports:slug:{slug}` |
| User profile (public) | Cache-aside | 5m | `users:public:{id}` |
| Match detail | Cache-aside | 30s | `matches:{id}` |
| Auth token verify | Write-through | 60s | `auth:token:{hash}` |
| Unread count | Invalidate on write | 30s | `notifications:unread:{userId}` |

```typescript
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  // @CacheKey() + @CacheTTL() decorators on controller methods
}
```

### A.6 Swagger Setup

```typescript
const config = new DocumentBuilder()
  .setTitle('GamePool API')
  .setVersion('1.0.0')
  .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'firebase')
  .build();
SwaggerModule.setup('docs', app, document);
```

### A.7 Structured Logging (Pino)

```typescript
// Log format
{
  "level": "info",
  "time": "2026-06-23T14:30:00.000Z",
  "requestId": "req_01JY2XK3",
  "userId": "3fa85f64-...",
  "method": "POST",
  "url": "/v1/matches/.../join",
  "statusCode": 200,
  "durationMs": 45
}
```

---

## Appendix B: `main.ts` Bootstrap Summary

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLoggerService));
  app.use(requestIdMiddleware);
  app.setGlobalPrefix('v1', { exclude: ['health', 'health/ready', 'docs'] });
  app.enableCors({ origin: config.get('CORS_ORIGINS').split(',') });
  app.useGlobalPipes(validationPipe);
  app.useGlobalInterceptors(new TransformInterceptor(), new LoggingInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter(), new PrismaExceptionFilter());
  setupSwagger(app);
  await app.listen(config.get('PORT', 3000));
}
```

---

## Appendix C: Schema Additions for Architecture

Extend [`prisma/schema.prisma`](../prisma/schema.prisma) with:

```prisma
model User {
  firebaseUid  String  @unique @map("firebase_uid") @db.VarChar(128)
  // ...
  deviceTokens UserDeviceToken[]
}

model UserDeviceToken {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  token     String   @unique @db.VarChar(500)
  platform  String   @db.VarChar(20)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("user_device_tokens")
}

model IdempotencyKey {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId       String   @map("user_id") @db.Uuid
  key          String   @db.VarChar(64)
  route        String   @db.VarChar(200)
  requestHash  String   @map("request_hash") @db.VarChar(64)
  responseBody Json     @map("response_body") @db.JsonB
  statusCode   Int      @map("status_code")
  expiresAt    DateTime @map("expires_at") @db.Timestamptz
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@unique([userId, key, route])
  @@index([expiresAt])
  @@map("idempotency_keys")
}
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-06-23 | Engineering | Initial backend architecture for MVP |
