import { describe, it, expect } from 'vitest';
import { resolvePath, switchBranch, switchBranchByDirection, findForksOnPath, getSelectedIndex } from './path.js';
import { createStoryTree, createNode } from './tree.js';

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
});

describe('switchBranch', () => {
	it('switches to a valid sibling', () => {
		const { tree, b } = buildTestTree();
		const result = switchBranch(tree, {}, tree.rootNodeId, b.id);

		expect(result).not.toBeNull();
		expect(result![tree.rootNodeId]).toBe(b.id);
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
});
