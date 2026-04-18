# Typewriter

Branching narrative word processor built with SvelteKit, TipTap, and DaisyUI. Designed for writing interactive fiction.

## Stack

- **Framework**: SvelteKit (Svelte 5, runes mode)
- **Editor**: TipTap (ProseMirror)
- **UI**: DaisyUI + Tailwind CSS v4
- **Persistence**: IndexedDB (via `idb`)
- **Testing**: Vitest (unit + browser mode)
- **Package Manager**: npm

## Architecture

- `src/lib/models/` — Pure data types and functions (story tree, path resolution)
- `src/lib/stores/` — Reactive `$state`-based store (`story.svelte.ts`)
- `src/lib/components/` — Svelte UI components
- `src/lib/editor/` — TipTap configuration
- `src/lib/persistence/` — IndexedDB save/load
- `src/lib/utils/` — Helpers (ID generation, tree layout)

## Key Patterns

- Use `$state.snapshot()` (not `structuredClone`) to serialize reactive proxy objects
- Tree data model: `StoryTree` contains `Record<string, StoryNode>`; paths are resolved by walking the tree with `BranchSelections`
- Unit test files live next to their source (e.g. `tree.test.ts` beside `tree.ts`)
- Themes defined in `src/lib/themes.ts` and applied via DaisyUI plugin in `layout.css`

## Schema Versioning & Migrations

`StoryTree` has a `schemaVersion: number` field. Any change to the shape of `StoryTree` or `StoryNode` that is not backwards-compatible requires a migration.

- `CURRENT_SCHEMA_VERSION` is defined in `src/lib/models/story.ts`
- Migration functions live in `src/lib/persistence/migrations.ts`
- `loadStory` and `listStories` in `indexeddb.ts` automatically migrate stale saves on load and re-save them

**When changing the data schema:**
1. Increment `CURRENT_SCHEMA_VERSION` in `story.ts`
2. Add a migration function to the `migrations` map in `migrations.ts` keyed by the new version number — the function receives the raw data object and should mutate it in place
3. The migration from version N-1 → N runs automatically for any user whose save predates the change

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm test` — Run all tests
- `npx vitest run --project server` — Unit tests only

## MCP Tools

- **Svelte**: Call `list-sections` first, then `get-documentation` for relevant sections. Use `svelte-autofixer` when writing Svelte components.
- **DaisyUI Docs**: Use for DaisyUI component references, theming, and configuration.
