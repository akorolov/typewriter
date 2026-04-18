import { describe, it, expect } from 'vitest';
import { extractOutline } from './outline.js';
import type { StoryTree } from './story.js';

function makeTree(overrides: Partial<StoryTree> = {}): StoryTree {
	return {
		id: 'tree-1',
		title: 'Test Story',
		rootNodeId: 'root',
		nodes: {},
		createdAt: 0,
		updatedAt: 0,
		schemaVersion: 1,
		...overrides
	};
}

describe('extractOutline', () => {
	it('returns empty array for empty path', () => {
		const tree = makeTree();
		expect(extractOutline([], tree)).toEqual([]);
	});

	it('extracts node label', () => {
		const tree = makeTree({
			nodes: {
				root: {
					id: 'root',
					parentId: null,
					childIds: [],
					content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }] },
					label: 'Chapter 1',
					createdAt: 0,
					updatedAt: 0
				}
			}
		});
		const entries = extractOutline(['root'], tree);
		expect(entries).toHaveLength(1);
		expect(entries[0].label).toBe('Chapter 1');
		expect(entries[0].preview).toBeNull();
	});

	it('extracts headings from content', () => {
		const tree = makeTree({
			nodes: {
				root: {
					id: 'root',
					parentId: null,
					childIds: [],
					content: {
						type: 'doc',
						content: [
							{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
							{ type: 'paragraph', content: [{ type: 'text', text: 'body' }] },
							{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Subtitle' }] }
						]
					},
					createdAt: 0,
					updatedAt: 0
				}
			}
		});
		const entries = extractOutline(['root'], tree);
		expect(entries[0].headings).toEqual([
			{ level: 1, text: 'Title' },
			{ level: 2, text: 'Subtitle' }
		]);
	});

	it('falls back to first paragraph preview when no label or headings', () => {
		const tree = makeTree({
			nodes: {
				root: {
					id: 'root',
					parentId: null,
					childIds: [],
					content: {
						type: 'doc',
						content: [
							{ type: 'paragraph', content: [{ type: 'text', text: 'Once upon a time' }] }
						]
					},
					createdAt: 0,
					updatedAt: 0
				}
			}
		});
		const entries = extractOutline(['root'], tree);
		expect(entries[0].label).toBeNull();
		expect(entries[0].headings).toEqual([]);
		expect(entries[0].preview).toBe('Once upon a time');
	});

	it('truncates long preview text', () => {
		const longText = 'A'.repeat(100);
		const tree = makeTree({
			nodes: {
				root: {
					id: 'root',
					parentId: null,
					childIds: [],
					content: {
						type: 'doc',
						content: [{ type: 'paragraph', content: [{ type: 'text', text: longText }] }]
					},
					createdAt: 0,
					updatedAt: 0
				}
			}
		});
		const entries = extractOutline(['root'], tree);
		expect(entries[0].preview).toBe('A'.repeat(60) + '…');
	});

	it('detects fork points', () => {
		const tree = makeTree({
			nodes: {
				root: {
					id: 'root',
					parentId: null,
					childIds: ['a', 'b'],
					content: { type: 'doc', content: [] },
					label: 'Start',
					createdAt: 0,
					updatedAt: 0
				},
				a: {
					id: 'a',
					parentId: 'root',
					childIds: [],
					content: { type: 'doc', content: [] },
					label: 'Path A',
					createdAt: 0,
					updatedAt: 0
				},
				b: {
					id: 'b',
					parentId: 'root',
					childIds: [],
					content: { type: 'doc', content: [] },
					label: 'Path B',
					createdAt: 0,
					updatedAt: 0
				}
			}
		});
		const entries = extractOutline(['root', 'a'], tree);
		expect(entries[0].isFork).toBe(false); // root has no parent
		expect(entries[1].isFork).toBe(true);
		expect(entries[1].branchCount).toBe(2);
		expect(entries[1].selectedIndex).toBe(0);
	});
});
