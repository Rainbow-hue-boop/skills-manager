# AGENTS.md

## Commands
- Use `npm install`; this repo has `package-lock.json` and no pnpm/yarn config.
- Dev app: `npm run dev` (`electron-vite dev`).
- Build app: `npm run build` writes Electron outputs under `out/{main,preload,renderer}`.
- Typecheck main/preload/renderer: `npm run typecheck` (`tsconfig.node.json` then `tsconfig.web.json`).
- CLI has its own config and is not covered by `npm run typecheck`: run `npx tsc --noEmit -p tsconfig.cli.json` after editing `cli/`.
- Unit/integration tests: `npm test`; focused test: `npx vitest run tests/unit/skill-manager.test.ts` or any specific test file.
- E2E tests: `npm run test:e2e`; `playwright.config.ts` only sets `baseURL: http://localhost:5173`, so start the app/dev server separately first.
- There is no lint script or formatter config in `package.json`; do not invent one.

## Architecture
- Electron main entry is `src/main/index.ts`; renderer entry is `src/renderer/main.tsx`; preload exposes `window.skillsApi` from `src/preload/index.ts`.
- Runtime data lives in `~/.skills-manager`, not this repo: groups are directories containing skills with `SKILL.md`, plus runtime files like `skills-lock.json`, `.ipc-port`, `.pending-path`, and `.settings.json`.
- CLI flow: `cli/skills.ts` reads `~/.skills-manager/.ipc-port`, sends `GET /open?path={cwd}` to the Electron main HTTP server, or writes `.pending-path` and launches Electron if the GUI is not running.
- Install flow in `src/main/skill-manager.ts`: scan `{managerDir}/{group}/{skill}/SKILL.md`, install each skill directly into `{project}/.agents/skills/{skill}` without a group-name prefix, write `.skills-installed.json`, prefer symlink/junction, fall back to copy.
- Git sync operates on `~/.skills-manager` via system `git` calls in `src/main/git-service.ts`; the GUI settings may initialize the repo and replace `origin`.

## Gotchas
- `readLockFile` migrates old string tags to `{ name, color }`; keep renderer/preload tag types aligned with `TagEntry[]` behavior.
- Existing tests create real temp directories and symlinks; avoid assertions that require `lstat().isSymbolicLink()` on Windows because junctions differ.
- Docs under `docs/plans/` are implementation plans and may be stale; trust `package.json`, configs, and current `src/` first.
- `electron-builder.yml` packages only `out/**/*` plus `cli/` as extra resources; changes to CLI build/distribution need explicit verification.
