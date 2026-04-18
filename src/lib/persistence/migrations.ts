import type { StoryTree } from '../models/story.js';
import { CURRENT_SCHEMA_VERSION } from '../models/story.js';

export { CURRENT_SCHEMA_VERSION };

// Each entry migrates data FROM that version number TO the next.
// To add a migration: increment CURRENT_SCHEMA_VERSION and add an entry here.
// Example: migrations[2] migrates v1 → v2.
const migrations: Record<number, (data: Record<string, unknown>) => void> = {
	// v0 (no schemaVersion field) → v1: no structural changes, just stamps the version
	1: (_data) => {},

	// v1 → v2: choiceText moved from StoryNode to StoryTree.edges["parentId:childId"]
	2: (data) => {
		const nodes = data.nodes as Record<string, Record<string, unknown>>;
		const edges: Record<string, { choiceText: string }> = {};
		for (const [nodeId, node] of Object.entries(nodes)) {
			if (node.choiceText && node.parentId) {
				edges[`${node.parentId}:${nodeId}`] = { choiceText: node.choiceText as string };
			}
			delete node.choiceText;
		}
		if (Object.keys(edges).length > 0) {
			data.edges = edges;
		}
	},

	// v2 → v3: variables field added to StoryTree (optional, absent on old saves — no-op)
	3: (_data) => {}
};

export function migrateStory(raw: unknown): { story: StoryTree; migrated: boolean } {
	const data = raw as Record<string, unknown>;
	const fromVersion = typeof data.schemaVersion === 'number' ? data.schemaVersion : 0;

	if (fromVersion === CURRENT_SCHEMA_VERSION) {
		return { story: raw as StoryTree, migrated: false };
	}

	for (let v = fromVersion + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
		migrations[v]?.(data);
	}

	data.schemaVersion = CURRENT_SCHEMA_VERSION;
	return { story: data as unknown as StoryTree, migrated: true };
}
