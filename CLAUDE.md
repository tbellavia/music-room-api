# CLAUDE.md — Music Room API

## Context

42 school project "Music Room": back-end of a mobile app for collaborative playlists.
Full subject: `en.subject.pdf`. Vision and backlog: `SPECS.md`.

- Chosen services: **Music Track Vote** (suggest + vote, ranking follows votes)
  and **Music Playlist Editor** (add / move / delete tracks in real time).
  **Music Control Delegation is out of scope.**
- The back-end is the source of truth; the mobile app is only a "remote control".
- Personas: **Creator** (single owner and admin of the playlist) and **Participant**.
- Key invariants: one owner per playlist, optional end date, joining a playlist
  requires being within 500 m of its position (lat/long).
- The subject stresses **concurrency** (simultaneous votes, concurrent moves of the
  same track): take it into account from the design phase of those features.
- Security: an authenticated user only accesses their own data. No secret is ever
  committed (everything goes through `.env`, which is gitignored).
- I must be able to **explain and defend every choice** at the defense: design
  decisions are mine — Claude proposes, I decide.

## Stack & commands

NestJS 11 · TypeScript · TypeORM · PostgreSQL · JWT · class-validator · Jest

- `make start` / `make stop` / `make re`: run the API + DB with Docker
- `npm test`: unit tests (Jest, `*.spec.ts` files under `src/`)
- `npm run lint`: ESLint + Prettier
- `npm run build`: check that the project compiles

## Architecture (simplified clean architecture)

One folder per business module (`identity`, `social`, `music`, `playlist`):

```
<module>/
  domain/                 entities, enums, pure business rules
    errors/               one error class per file (`xxx.error.ts`)
  application/
    ports/                repository interfaces + injection Symbol
    use-cases/<name>/     <name>.usecase.ts, <name>.contracts.ts (Input/Output), <name>.usecase.spec.ts
  infrastructure/
    persistence/<agg>/    typeorm-*.entity.ts, typeorm-*.repository.ts, in-memory-*.repository.ts
  interface/http/         controller + dto/ (class-validator validation)
  <module>.module.ts
```

Rules:
- The domain depends on neither Nest nor TypeORM.
- Use-cases depend on **ports** (`@Inject(XXX_REPOSITORY)`), never on implementations.
- Controllers hold no logic: they map the DTO to the use-case Input and return its Output.
- Every new domain error **must** be registered in `DOMAIN_ERRORS`
  (`src/interface/http/filters/http-exception.filter.ts`), otherwise it ends up as a 500.
- Absolute imports use the `src/...` prefix.
- Keep the architecture simple: no extra layer or abstraction without discussing it first.

## Code style

- Explicit, readable code — tests included. No compressed one-liners.
- No `!` non-null assertions, no inline `await` combined with property access:
  use an intermediate variable.
- No type gymnastics (`Parameters<typeof X>[0]`, etc.): export named types
  (e.g. `CreatePlaylistInfos`).
- Descriptive names, including test constants.
- Comments only when the "why" is not obvious.

## Mandatory workflow

**Explore → Propose a plan → Implement → Test → Summarize**

1. **Explore**: read the relevant code, and the subject / `SPECS.md` when needed.
2. **Propose a plan**: files touched, routes, errors, design choices and alternatives.
   - For a **significant feature** (new entity/table, schema change, concurrency
     handling, open design choice, new dependency): **wait for my approval before
     implementing.**
   - For a **small feature** (fits the existing model, no open design choice): state
     the plan briefly and go ahead.
3. **Implement** following the architecture and style above.
4. **Test**:
   - Every new feature comes with tests: use-case unit tests using the in-memory
     repositories, and domain tests for invariants.
   - Update existing tests impacted by the change.
   - `npm test`, `npm run lint` and `npm run build` must pass before the feature is
     considered done. If something fails, report it with the output.
5. **Summarize**: at the end of every feature, always provide:
   - a short **summary** of what was done (files, choices, points of attention);
   - a **list of manual tests** I can run myself (curl / HTTP requests with body,
     auth header and expected response — happy paths **and** error cases).

## Route documentation

Every new or modified route must be documented in `docs/ROUTES.md`, in its module's
section, following the existing format (in French, like the rest of that file):

```
- METHOD /api/v1/<route> [(public)]
  Short description if needed.
  Body : { field: type (constraints), optionalField?: type (défaut ...) }
  → <status> { response }
  → <status> ERROR_CODE (detail if useful)
```

## Dependencies

- **Never install a new dependency (npm or other) without my explicit approval.**
- Before proposing one, explain why it is needed, which alternatives exist
  (including doing without it) and what it implies.
- The subject forbids committing libraries: dependencies must be downloadable
  automatically (`package.json` / Makefile).

## Git

- Never commit or push unless I ask for it.
