import { describe, it, expect } from 'vitest';
import { createStoryTree, createNode, splitNode, addBranch, deleteBranch, collectDescendants, updateNodeContent } from './tree.js';

describe('createStoryTree', () => {
	it('creates a tree with a single root node', () => {
		const tree = createStoryTree('Test Story');

		expect(tree.title).toBe('Test Story');
		expect(Object.keys(tree.nodes)).toHaveLength(1);

		const root = tree.nodes[tree.rootNodeId];
		expect(root.parentId).toBeNull();
		expect(root.childIds).toEqual([]);
		expect(root.content).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] });
	});
});

describe('createNode', () => {
	it('creates a child node linked to parent', () => {
		const tree = createStoryTree('Test');
		const child = createNode(tree, tree.rootNodeId, undefined, 'Branch A');

		expect(child.parentId).toBe(tree.rootNodeId);
		expect(child.label).toBe('Branch A');
		expect(tree.nodes[tree.rootNodeId].childIds).toContain(child.id);
		expect(Object.keys(tree.nodes)).toHaveLength(2);
	});
});

describe('splitNode', () => {
	it('splits at a paragraph boundary, moving content to continuation', () => {
		const tree = createStoryTree('Test');
		const root = tree.nodes[tree.rootNodeId];
		root.content = {
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'Para 1' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'Para 2' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'Para 3' }] }
			]
		};

		const { continuationId, branchId } = splitNode(tree, tree.rootNodeId, 2);

		// Root keeps first 2 paragraphs
		expect(root.content.content).toHaveLength(2);
		expect(root.content.content![0]).toEqual({ type: 'paragraph', content: [{ type: 'text', text: 'Para 1' }] });
		expect(root.content.content![1]).toEqual({ type: 'paragraph', content: [{ type: 'text', text: 'Para 2' }] });

		// Continuation gets paragraph 3
		const continuation = tree.nodes[continuationId];
		expect(continuation.content.content).toHaveLength(1);
		expect(continuation.content.content![0]).toEqual({ type: 'paragraph', content: [{ type: 'text', text: 'Para 3' }] });

		// Branch is empty
		const branch = tree.nodes[branchId];
		expect(branch.content).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] });

		// Root has exactly 2 children
		expect(root.childIds).toEqual([continuationId, branchId]);
	});

	it('splits at end when splitAtParagraph >= content length', () => {
		const tree = createStoryTree('Test');
		const root = tree.nodes[tree.rootNodeId];
		root.content = {
			type: 'doc',
			content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Para 1' }] }]
		};

		const { continuationId, branchId } = splitNode(tree, tree.rootNodeId, 5);

		expect(root.childIds).toEqual([continuationId, branchId]);
		// Original content unchanged
		expect(root.content.content).toHaveLength(1);
	});

	it('reparents existing children to continuation', () => {
		const tree = createStoryTree('Test');
		const child = createNode(tree, tree.rootNodeId, undefined, 'Existing child');

		const { continuationId } = splitNode(tree, tree.rootNodeId, 0);

		// Child should now be under continuation
		expect(tree.nodes[child.id].parentId).toBe(continuationId);
		expect(tree.nodes[continuationId].childIds).toContain(child.id);
		// Root should not have the old child
		expect(tree.nodes[tree.rootNodeId].childIds).not.toContain(child.id);
	});
});

describe('addBranch', () => {
	it('adds a sibling branch to an existing fork', () => {
		const tree = createStoryTree('Test');
		createNode(tree, tree.rootNodeId, undefined, 'A');
		const b = addBranch(tree, tree.rootNodeId, 'B');

		expect(tree.nodes[tree.rootNodeId].childIds).toHaveLength(2);
		expect(b.label).toBe('B');
		expect(b.parentId).toBe(tree.rootNodeId);
	});
});

describe('deleteBranch', () => {
	it('deletes a branch and its descendants', () => {
		const tree = createStoryTree('Test');
		const a = createNode(tree, tree.rootNodeId, undefined, 'A');
		const b = createNode(tree, tree.rootNodeId, undefined, 'B');
		const a1 = createNode(tree, a.id, undefined, 'A1');

		const deleted = deleteBranch(tree, a.id);

		expect(deleted).toBe(true);
		expect(tree.nodes[a.id]).toBeUndefined();
		expect(tree.nodes[a1.id]).toBeUndefined();
		expect(tree.nodes[tree.rootNodeId].childIds).toEqual([b.id]);
	});

	it('refuses to delete the root node', () => {
		const tree = createStoryTree('Test');
		expect(deleteBranch(tree, tree.rootNodeId)).toBe(false);
	});

	it('refuses to delete the last child', () => {
		const tree = createStoryTree('Test');
		const only = createNode(tree, tree.rootNodeId);

		expect(deleteBranch(tree, only.id)).toBe(false);
	});
});

describe('collectDescendants', () => {
	it('collects all descendants', () => {
		const tree = createStoryTree('Test');
		const a = createNode(tree, tree.rootNodeId);
		const a1 = createNode(tree, a.id);
		const a2 = createNode(tree, a.id);
		const a1x = createNode(tree, a1.id);

		const desc = collectDescendants(tree, a.id);
		expect(desc).toHaveLength(3);
		expect(desc).toContain(a1.id);
		expect(desc).toContain(a2.id);
		expect(desc).toContain(a1x.id);
	});
});

describe('updateNodeContent', () => {
	it('updates content and timestamps', () => {
		const tree = createStoryTree('Test');
		const oldUpdated = tree.nodes[tree.rootNodeId].updatedAt;

		const newContent = { type: 'doc' as const, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Updated' }] }] };
		updateNodeContent(tree, tree.rootNodeId, newContent);

		expect(tree.nodes[tree.rootNodeId].content).toEqual(newContent);
		expect(tree.nodes[tree.rootNodeId].updatedAt).toBeGreaterThanOrEqual(oldUpdated);
	});
});
