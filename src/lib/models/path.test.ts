import { describe, it, expect } from 'vitest';
import { resolvePath, switchBranch, switchBranchByDirection, findForksOnPath, getSelectedIndex, getAllChoices } from './path.js';
import { createStoryTree, createNode, addMergeChild } from './tree.js';

function buildTestTree() {
	// root → [A, B]
	// A → [A1, A2]
	// B → (leaf)
	const tree = createStoryTree('Test');
	const a = createNode(tree, tree.rootNodeId, undefined, 'A');
	const b = createNode(tree, tree.rootNodeId, undefined, 'B');
	const a1 = createNode(tree, a.id, undefined, 'A1');
	const a2 = createNode(tree, a.id, undefined, 'A2');
	return { tree, a, b, a1, a2 };
}

describe('getAllChoices', () => {
	it('returns childIds when no merge children', () => {
		const { tree, a, b } = buildTestTree();
		expect(getAllChoices(tree, tree.rootNodeId)).toEqual([a.id, b.id]);
	});

	it('returns childIds + mergeChildIds', () => {
		const { tree, a, b, a1 } = buildTestTree();
		addMergeChild(tree, tree.rootNodeId, a1.id);
		expect(getAllChoices(tree, tree.rootNodeId)).toEqual([a.id, b.id, a1.id]);
	});
});

describe('resolvePath', () => {
	it('resolves default path (first child at each fork)', () => {
		const { tree, a, a1 } = buildTestTree();
		const path = resolvePath(tree, {});

		expect(path).toEqual([tree.rootNodeId, a.id, a1.id]);
	});

	it('follows selections at forks', () => {
		const { tree, b } = buildTestTree();
		const selections = { [tree.rootNodeId]: b.id };
		const path = resolvePath(tree, selections);

		expect(path).toEqual([tree.rootNodeId, b.id]);
	});

	it('follows selections at multiple levels', () => {
		const { tree, a, a2 } = buildTestTree();
		const selections = { [tree.rootNodeId]: a.id, [a.id]: a2.id };
		const path = resolvePath(tree, selections);

		expect(path).toEqual([tree.rootNodeId, a.id, a2.id]);
	});

	it('ignores invalid selections and defaults to first child', () => {
		const { tree, a, a1 } = buildTestTree();
		const selections = { [tree.rootNodeId]: 'nonexistent' };
		const path = resolvePath(tree, selections);

		expect(path).toEqual([tree.rootNodeId, a.id, a1.id]);
	});

	it('follows a merge child selection and continues from that node', () => {
		// root → [a, b], a → a1; root has mergeChild → a1
		// selecting a1 at root: root → a1
		const { tree, a, b, a1 } = buildTestTree();
		addMergeChild(tree, tree.rootNodeId, a1.id);
		const selections = { [tree.rootNodeId]: a1.id };

		const path = resolvePath(tree, selections);

		expect(path).toEqual([tree.rootNodeId, a1.id]);
	});

	it('continues past the merge child target if it has children', () => {
		// root → [a, b], a → a1 → a1child; root has mergeChild → a1
		// selecting a1 at root: root → a1 → a1child
		const tree = createStoryTree('Test');
		const a = createNode(tree, tree.rootNodeId, undefined, 'A');
		const b = createNode(tree, tree.rootNodeId, undefined, 'B');
		const a1 = createNode(tree, a.id, undefined, 'A1');
		const a1child = createNode(tree, a1.id, undefined, 'A1Child');
		addMergeChild(tree, tree.rootNodeId, a1.id);
		const selections = { [tree.rootNodeId]: a1.id };

		const path = resolvePath(tree, selections);

		expect(path).toEqual([tree.rootNodeId, a1.id, a1child.id]);
	});

	it('does not loop on a corrupt merge cycle', () => {
		// Manually corrupt the tree to force a cycle; resolvePath should terminate
		const tree = createStoryTree('Test');
		const a = createNode(tree, tree.rootNodeId, undefined, 'A');
		tree.nodes[tree.rootNodeId].mergeChildIds = [a.id];
		tree.nodes[a.id].mergeChildIds = [tree.rootNodeId];
		const selections = { [tree.rootNodeId]: a.id, [a.id]: tree.rootNodeId };

		const path = resolvePath(tree, selections);

		// Should terminate without throwing; exact path doesn't matter
		expect(path.length).toBeGreaterThan(0);
	});
});

describe('switchBranch', () => {
	it('switches to a valid sibling', () => {
		const { tree, b } = buildTestTree();
		const result = switchBranch(tree, {}, tree.rootNodeId, b.id);

		expect(result).not.toBeNull();
		expect(result![tree.rootNodeId]).toBe(b.id);
	});

	it('switches to a merge child', () => {
		const { tree, a1 } = buildTestTree();
		addMergeChild(tree, tree.rootNodeId, a1.id);
		const result = switchBranch(tree, {}, tree.rootNodeId, a1.id);

		expect(result).not.toBeNull();
		expect(result![tree.rootNodeId]).toBe(a1.id);
	});

	it('returns null for invalid target', () => {
		const { tree } = buildTestTree();
		const result = switchBranch(tree, {}, tree.rootNodeId, 'fake');

		expect(result).toBeNull();
	});
});

describe('switchBranchByDirection', () => {
	it('switches to next sibling', () => {
		const { tree, b } = buildTestTree();
		const result = switchBranchByDirection(tree, {}, tree.rootNodeId, 'next');

		expect(result).not.toBeNull();
		expect(result![tree.rootNodeId]).toBe(b.id);
	});

	it('switches to prev sibling', () => {
		const { tree, a, b } = buildTestTree();
		const selections = { [tree.rootNodeId]: b.id };
		const result = switchBranchByDirection(tree, selections, tree.rootNodeId, 'prev');

		expect(result).not.toBeNull();
		expect(result![tree.rootNodeId]).toBe(a.id);
	});

	it('switches into merge children with next', () => {
		const { tree, a, b, a1 } = buildTestTree();
		addMergeChild(tree, tree.rootNodeId, a1.id);
		// Currently on b (index 1), next should go to a1 (merge child, index 2)
		const selections = { [tree.rootNodeId]: b.id };
		const result = switchBranchByDirection(tree, selections, tree.rootNodeId, 'next');

		expect(result).not.toBeNull();
		expect(result![tree.rootNodeId]).toBe(a1.id);
	});

	it('returns null when at boundary', () => {
		const { tree } = buildTestTree();
		// Already at first child, can't go prev
		const result = switchBranchByDirection(tree, {}, tree.rootNodeId, 'prev');
		expect(result).toBeNull();
	});

	it('returns null for nodes without siblings', () => {
		const tree = createStoryTree('Single');
		createNode(tree, tree.rootNodeId);
		const result = switchBranchByDirection(tree, {}, tree.rootNodeId, 'next');
		expect(result).toBeNull();
	});
});

describe('findForksOnPath', () => {
	it('finds fork points', () => {
		const { tree, a, a1 } = buildTestTree();
		const path = [tree.rootNodeId, a.id, a1.id];
		const forks = findForksOnPath(tree, path);

		// root (2 children) and A (2 children) are forks, A1 is a leaf
		expect(forks).toEqual([tree.rootNodeId, a.id]);
	});

	it('includes nodes with merge children as forks', () => {
		// root → a → a1, root → b; a has a merge child → b
		// a has one real child (a1) + one merge child (b) → counts as fork
		const tree = createStoryTree('Test');
		const a = createNode(tree, tree.rootNodeId, undefined, 'A');
		const b = createNode(tree, tree.rootNodeId, undefined, 'B');
		const a1 = createNode(tree, a.id, undefined, 'A1');
		addMergeChild(tree, a.id, b.id);
		const path = [tree.rootNodeId, a.id, a1.id];
		const forks = findForksOnPath(tree, path);

		expect(forks).toContain(a.id);
	});
});

describe('getSelectedIndex', () => {
	it('returns 0 by default', () => {
		const { tree } = buildTestTree();
		expect(getSelectedIndex(tree, {}, tree.rootNodeId)).toBe(0);
	});

	it('returns correct index for selection', () => {
		const { tree, b } = buildTestTree();
		expect(getSelectedIndex(tree, { [tree.rootNodeId]: b.id }, tree.rootNodeId)).toBe(1);
	});

	it('returns correct index for merge child selection', () => {
		const { tree, a1 } = buildTestTree();
		addMergeChild(tree, tree.rootNodeId, a1.id);
		// choices: [a, b, a1] → a1 is index 2
		expect(getSelectedIndex(tree, { [tree.rootNodeId]: a1.id }, tree.rootNodeId)).toBe(2);
	});
});
