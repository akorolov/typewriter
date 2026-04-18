import { describe, it, expect } from 'vitest';
import { migrateStory } from './migrations.js';

describe('migrateStory v1 → v2', () => {
	it('migrates choiceText from nodes into edges keyed by parentId:childId', () => {
		const v1: Record<string, unknown> = {
			id: 'story-1',
			title: 'Test',
			rootNodeId: 'root',
			nodes: {
				root: { id: 'root', parentId: null, childIds: ['c1', 'c2'], content: {}, createdAt: 0, updatedAt: 0 },
				c1: { id: 'c1', parentId: 'root', childIds: [], content: {}, choiceText: 'Go left', createdAt: 0, updatedAt: 0 },
				c2: { id: 'c2', parentId: 'root', childIds: [], content: {}, choiceText: 'Go right', createdAt: 0, updatedAt: 0 }
			},
			createdAt: 0,
			updatedAt: 0,
			schemaVersion: 1
		};

		const { story, migrated } = migrateStory(v1);

		expect(migrated).toBe(true);
		expect(story.schemaVersion).toBe(2);
		expect(story.edges?.['root:c1']?.choiceText).toBe('Go left');
		expect(story.edges?.['root:c2']?.choiceText).toBe('Go right');
		expect((story.nodes.c1 as Record<string, unknown>).choiceText).toBeUndefined();
		expect((story.nodes.c2 as Record<string, unknown>).choiceText).toBeUndefined();
	});

	it('does not create an edges map when no nodes have choiceText', () => {
		const v1: Record<string, unknown> = {
			id: 'story-2',
			title: 'Test',
			rootNodeId: 'root',
			nodes: {
				root: { id: 'root', parentId: null, childIds: ['c1'], content: {}, createdAt: 0, updatedAt: 0 },
				c1: { id: 'c1', parentId: 'root', childIds: [], content: {}, createdAt: 0, updatedAt: 0 }
			},
			createdAt: 0,
			updatedAt: 0,
			schemaVersion: 1
		};

		const { story, migrated } = migrateStory(v1);

		expect(migrated).toBe(true);
		expect(story.edges).toBeUndefined();
	});

	it('skips edge creation for nodes without a parentId (root)', () => {
		const v1: Record<string, unknown> = {
			id: 'story-3',
			title: 'Test',
			rootNodeId: 'root',
			nodes: {
				root: { id: 'root', parentId: null, childIds: [], content: {}, choiceText: 'orphan text', createdAt: 0, updatedAt: 0 }
			},
			createdAt: 0,
			updatedAt: 0,
			schemaVersion: 1
		};

		const { story } = migrateStory(v1);

		expect(story.edges).toBeUndefined();
		expect((story.nodes.root as Record<string, unknown>).choiceText).toBeUndefined();
	});

	it('returns migrated: false and preserves existing edges for a current-version story', () => {
		const current: Record<string, unknown> = {
			id: 'story-4',
			title: 'Test',
			rootNodeId: 'root',
			nodes: {
				root: { id: 'root', parentId: null, childIds: ['c1'], content: {}, createdAt: 0, updatedAt: 0 },
				c1: { id: 'c1', parentId: 'root', childIds: [], content: {}, createdAt: 0, updatedAt: 0 }
			},
			edges: { 'root:c1': { choiceText: 'existing' } },
			createdAt: 0,
			updatedAt: 0,
			schemaVersion: 2
		};

		const { story, migrated } = migrateStory(current);

		expect(migrated).toBe(false);
		expect(story.edges?.['root:c1']?.choiceText).toBe('existing');
	});
});
