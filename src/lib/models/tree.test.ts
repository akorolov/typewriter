import { describe, it, expect } from 'vitest';
import { createStoryTree, createNode, splitNode, addBranch, deleteBranch, collectDescendants, updateNodeContent, addMergeChild, removeMergeChild, getEdge, setEdge } from './tree.js';

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

	it('transfers mergeChildIds to continuation when splitting a node with merge children', () => {
		const tree = createStoryTree('Test');
		const a = createNode(tree, tree.rootNodeId, undefined, 'A');
		const b = createNode(tree, tree.rootNodeId, undefined, 'B');
		// Add a as a merge child of root (root forks to [A, B] + merge→A)
		// Actually: let's create a structure where root has mergeChildIds
		const target = createNode(tree, a.id, undefined, 'Target');
		addMergeChild(tree, tree.rootNodeId, target.id);

		const { continuationId, branchId } = splitNode(tree, tree.rootNodeId, 0);

		// mergeChildIds should move from root to continuation
		expect(tree.nodes[tree.rootNodeId].mergeChildIds).toBeUndefined();
		expect(tree.nodes[continuationId].mergeChildIds).toEqual([target.id]);
		expect(tree.nodes[branchId].mergeChildIds).toBeUndefined();
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
	it('deletes a branch and its descendants when siblings remain', () => {
		const tree = createStoryTree('Test');
		const a = createNode(tree, tree.rootNodeId, undefined, 'A');
		const b = createNode(tree, tree.rootNodeId, undefined, 'B');
		const c = createNode(tree, tree.rootNodeId, undefined, 'C');
		const a1 = createNode(tree, a.id, undefined, 'A1');

		const deleted = deleteBranch(tree, a.id);

		expect(deleted).toBe(true);
		expect(tree.nodes[a.id]).toBeUndefined();
		expect(tree.nodes[a1.id]).toBeUndefined();
		expect(tree.nodes[tree.rootNodeId].childIds).toEqual([b.id, c.id]);
	});

	it('collapses the fork when only one branch remains after deletion', () => {
		const tree = createStoryTree('Test');
		const a = createNode(tree, tree.rootNodeId, { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'branch a' }] }] }, 'A');
		const b = createNode(tree, tree.rootNodeId, { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'branch b' }] }] }, 'B');
		const b1 = createNode(tree, b.id, undefined, 'B1');

		deleteBranch(tree, a.id);

		// b should be merged into root, not exist as a separate node
		expect(tree.nodes[a.id]).toBeUndefined();
		expect(tree.nodes[b.id]).toBeUndefined();
		// root should have b's content appended and b's children re-parented
		expect(tree.nodes[tree.rootNodeId].childIds).toEqual([b1.id]);
		expect(tree.nodes[b1.id].parentId).toBe(tree.rootNodeId);
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

describe('addMergeChild', () => {
	it('adds a merge child to a node', () => {
		const tree = createStoryTree('Test');
		const a = createNode(tree, tree.rootNodeId, undefined, 'A');
		const b = createNode(tree, tree.rootNodeId, undefined, 'B');
		const shared = createNode(tree, a.id, undefined, 'Shared');

		const result = addMergeChild(tree, tree.rootNodeId, shared.id);

		expect(result).toBe(true);
		expect(tree.nodes[tree.rootNodeId].mergeChildIds).toEqual([shared.id]);
	});

	it('allows multiple merge children', () => {
		const tree = createStoryTree('Test');
		const a = createNode(tree, tree.rootNodeId, undefined, 'A');
		const b = createNode(tree, tree.rootNodeId, undefined, 'B');
		const t1 = createNode(tree, a.id, undefined, 'T1');
		const t2 = createNode(tree, b.id, undefined, 'T2');

		addMergeChild(tree, tree.rootNodeId, t1.id);
		addMergeChild(tree, tree.rootNodeId, t2.id);

		expect(tree.nodes[tree.rootNodeId].mergeChildIds).toEqual([t1.id, t2.id]);
	});

	it('rejects a duplicate merge child', () => {
		const tree = createStoryTree('Test');
		const a = createNode(tree, tree.rootNodeId, undefined, 'A');
		addMergeChild(tree, tree.rootNodeId, a.id);

		expect(addMergeChild(tree, tree.rootNodeId, a.id)).toBe(false);
	});

	it('rejects a non-existent target', () => {
		const tree = createStoryTree('Test');
		createNode(tree, tree.rootNodeId, undefined, 'A');

		expect(addMergeChild(tree, tree.rootNodeId, 'nonexistent')).toBe(false);
		expect(tree.nodes[tree.rootNodeId].mergeChildIds).toBeUndefined();
	});

	it('rejects a direct self-cycle', () => {
		const tree = createStoryTree('Test');

		expect(addMergeChild(tree, tree.rootNodeId, tree.rootNodeId)).toBe(false);
	});

	it('rejects a cycle through childIds', () => {
		// root → a → b, trying to add root as merge child of b would cycle
		const tree = createStoryTree('Test');
		const a = createNode(tree, tree.rootNodeId, undefined, 'A');
		const b = createNode(tree, a.id, undefined, 'B');

		expect(addMergeChild(tree, b.id, tree.rootNodeId)).toBe(false);
	});

	it('rejects a cycle through existing merge children', () => {
		// root has merge child → a, trying to add root as merge child of a would cycle
		const tree = createStoryTree('Test');
		const a = createNode(tree, tree.rootNodeId, undefined, 'A');
		const b = createNode(tree, tree.rootNodeId, undefined, 'B');
		addMergeChild(tree, a.id, b.id);

		expect(addMergeChild(tree, b.id, a.id)).toBe(false);
	});
});

describe('removeMergeChild', () => {
	it('removes a merge child', () => {
		const tree = createStoryTree('Test');
		const a = createNode(tree, tree.rootNodeId, undefined, 'A');
		addMergeChild(tree, tree.rootNodeId, a.id);

		removeMergeChild(tree, tree.rootNodeId, a.id);

		expect(tree.nodes[tree.rootNodeId].mergeChildIds).toBeUndefined();
	});

	it('removes only the specified merge child', () => {
		const tree = createStoryTree('Test');
		const a = createNode(tree, tree.rootNodeId, undefined, 'A');
		const b = createNode(tree, tree.rootNodeId, undefined, 'B');
		const t1 = createNode(tree, a.id, undefined, 'T1');
		const t2 = createNode(tree, b.id, undefined, 'T2');
		addMergeChild(tree, tree.rootNodeId, t1.id);
		addMergeChild(tree, tree.rootNodeId, t2.id);

		removeMergeChild(tree, tree.rootNodeId, t1.id);

		expect(tree.nodes[tree.rootNodeId].mergeChildIds).toEqual([t2.id]);
	});
});

describe('deleteBranch (merge child cleanup)', () => {
	it('clears mergeChildIds on surviving nodes when the target is deleted', () => {
		const tree = createStoryTree('Test');
		const a = createNode(tree, tree.rootNodeId, undefined, 'A');
		const b = createNode(tree, tree.rootNodeId, undefined, 'B');
		const c = createNode(tree, tree.rootNodeId, undefined, 'C');
		const a1 = createNode(tree, a.id, undefined, 'A1');
		addMergeChild(tree, b.id, a1.id);

		deleteBranch(tree, a.id);

		expect(tree.nodes[b.id].mergeChildIds).toBeUndefined();
	});
});

describe('getEdge / setEdge', () => {
	it('returns undefined for an edge with no data', () => {
		const tree = createStoryTree('Test');
		const a = createNode(tree, tree.rootNodeId);
		expect(getEdge(tree, tree.rootNodeId, a.id)).toBeUndefined();
	});

	it('sets and reads back choice text on an edge', () => {
		const tree = createStoryTree('Test');
		const a = createNode(tree, tree.rootNodeId);
		setEdge(tree, tree.rootNodeId, a.id, { choiceText: 'Go left' });
		expect(getEdge(tree, tree.rootNodeId, a.id)?.choiceText).toBe('Go left');
	});

	it('allows two different parents to have different choice texts for the same target node', () => {
		const tree = createStoryTree('Test');
		const a = createNode(tree, tree.rootNodeId, undefined, 'A');
		const b = createNode(tree, tree.rootNodeId, undefined, 'B');
		const shared = createNode(tree, a.id, undefined, 'Shared');
		addMergeChild(tree, b.id, shared.id);

		setEdge(tree, a.id, shared.id, { choiceText: 'From A: visit shared' });
		setEdge(tree, b.id, shared.id, { choiceText: 'From B: visit shared' });

		expect(getEdge(tree, a.id, shared.id)?.choiceText).toBe('From A: visit shared');
		expect(getEdge(tree, b.id, shared.id)?.choiceText).toBe('From B: visit shared');
	});

	it('overwrites only the fields passed to setEdge', () => {
		const tree = createStoryTree('Test');
		const a = createNode(tree, tree.rootNodeId);
		setEdge(tree, tree.rootNodeId, a.id, { choiceText: 'Original' });
		setEdge(tree, tree.rootNodeId, a.id, { choiceText: 'Updated' });
		expect(getEdge(tree, tree.rootNodeId, a.id)?.choiceText).toBe('Updated');
	});
});

describe('deleteBranch (edge cleanup)', () => {
	it('removes edges where the deleted node is the child', () => {
		// 3 children so deleting one does not trigger a collapse
		const tree = createStoryTree('Test');
		const a = createNode(tree, tree.rootNodeId, undefined, 'A');
		const b = createNode(tree, tree.rootNodeId, undefined, 'B');
		createNode(tree, tree.rootNodeId, undefined, 'C');
		setEdge(tree, tree.rootNodeId, a.id, { choiceText: 'Go to A' });
		setEdge(tree, tree.rootNodeId, b.id, { choiceText: 'Go to B' });

		deleteBranch(tree, a.id);

		expect(getEdge(tree, tree.rootNodeId, a.id)).toBeUndefined();
		expect(getEdge(tree, tree.rootNodeId, b.id)?.choiceText).toBe('Go to B');
	});

	it('removes edges where a deleted node is the parent', () => {
		const tree = createStoryTree('Test');
		const a = createNode(tree, tree.rootNodeId, undefined, 'A');
		const b = createNode(tree, tree.rootNodeId, undefined, 'B');
		const a1 = createNode(tree, a.id, undefined, 'A1');
		createNode(tree, a.id, undefined, 'A2');
		setEdge(tree, a.id, a1.id, { choiceText: 'Down to A1' });

		deleteBranch(tree, a.id);

		expect(getEdge(tree, a.id, a1.id)).toBeUndefined();
	});

	it('moves edges from collapsed child to parent when fork collapses', () => {
		// root → [a, b], b → b1; delete a → fork collapses, b merges into root, b1 re-parented to root
		// edge b:b1 should become root:b1
		const tree = createStoryTree('Test');
		const a = createNode(tree, tree.rootNodeId, undefined, 'A');
		const b = createNode(tree, tree.rootNodeId, undefined, 'B');
		const b1 = createNode(tree, b.id, undefined, 'B1');
		setEdge(tree, b.id, b1.id, { choiceText: 'Continue' });

		deleteBranch(tree, a.id);

		// b was merged into root, b1 is now root's child
		expect(getEdge(tree, tree.rootNodeId, b1.id)?.choiceText).toBe('Continue');
		expect(getEdge(tree, b.id, b1.id)).toBeUndefined();
	});
});

describe('splitNode (edge migration)', () => {
	it('moves edges from original node to continuation when children are reparented', () => {
		const tree = createStoryTree('Test');
		const child = createNode(tree, tree.rootNodeId, undefined, 'Child');
		setEdge(tree, tree.rootNodeId, child.id, { choiceText: 'Go to child' });

		const { continuationId } = splitNode(tree, tree.rootNodeId, 0);

		// child was reparented to continuation; edge should follow
		expect(getEdge(tree, continuationId, child.id)?.choiceText).toBe('Go to child');
		// old edge on original node should be gone
		expect(getEdge(tree, tree.rootNodeId, child.id)).toBeUndefined();
	});

	it('does not move edges for the newly created continuation and branch nodes', () => {
		const tree = createStoryTree('Test');
		setEdge(tree, tree.rootNodeId, 'some-other', { choiceText: 'Unrelated' });

		const { continuationId, branchId } = splitNode(tree, tree.rootNodeId, 0);

		// No spurious edges created for the new continuation/branch nodes
		expect(getEdge(tree, tree.rootNodeId, continuationId)).toBeUndefined();
		expect(getEdge(tree, tree.rootNodeId, branchId)).toBeUndefined();
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
