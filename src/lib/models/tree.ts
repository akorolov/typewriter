import type { JSONContent } from '@tiptap/core';
import type { ChoiceEdge, StoryNode, StoryTree } from './story.js';
import { CURRENT_SCHEMA_VERSION } from './story.js';
import { createId } from '../utils/id.js';

export function edgeKey(parentId: string, childId: string): string {
	return `${parentId}:${childId}`;
}

export function getEdge(tree: StoryTree, parentId: string, childId: string): ChoiceEdge | undefined {
	return tree.edges?.[edgeKey(parentId, childId)];
}

export function setEdge(tree: StoryTree, parentId: string, childId: string, update: Partial<ChoiceEdge>): void {
	if (!tree.edges) tree.edges = {};
	const key = edgeKey(parentId, childId);
	tree.edges[key] = { ...tree.edges[key], ...update };
	tree.updatedAt = Date.now();
}

export function deleteEdge(tree: StoryTree, parentId: string, childId: string): void {
	if (!tree.edges) return;
	delete tree.edges[edgeKey(parentId, childId)];
	if (Object.keys(tree.edges).length === 0) delete tree.edges;
}

/**
 * Creates a new empty story tree with a single root node.
 */
export function createStoryTree(title: string): StoryTree {
	const now = Date.now();
	const rootId = createId();

	const root: StoryNode = {
		id: rootId,
		parentId: null,
		childIds: [],
		content: { type: 'doc', content: [{ type: 'paragraph' }] },
		createdAt: now,
		updatedAt: now
	};

	return {
		id: createId(),
		title,
		rootNodeId: rootId,
		nodes: { [rootId]: root },
		createdAt: now,
		updatedAt: now,
		schemaVersion: CURRENT_SCHEMA_VERSION
	};
}

/**
 * Creates a new node and adds it to the tree.
 */
export function createNode(
	tree: StoryTree,
	parentId: string,
	content?: JSONContent,
	label?: string
): StoryNode {
	const now = Date.now();
	const node: StoryNode = {
		id: createId(),
		parentId,
		childIds: [],
		content: content ?? { type: 'doc', content: [{ type: 'paragraph' }] },
		label,
		createdAt: now,
		updatedAt: now
	};

	tree.nodes[node.id] = node;
	tree.nodes[parentId].childIds.push(node.id);
	tree.updatedAt = now;

	return node;
}

/**
 * Splits a node at a paragraph boundary, creating a branch point.
 *
 * Given a node with paragraphs [p1, p2, p3] and splitAtParagraph=2:
 * - The original node keeps [p1, p2]
 * - A "continuation" child gets [p3] plus any existing children
 * - A new empty "branch" child is created
 *
 * Returns { continuation, branch } node ids.
 */
export function splitNode(
	tree: StoryTree,
	nodeId: string,
	splitAtParagraph: number
): { continuationId: string; branchId: string } {
	const node = tree.nodes[nodeId];
	const paragraphs = node.content.content ?? [];
	const now = Date.now();

	if (splitAtParagraph < 1 || splitAtParagraph >= paragraphs.length) {
		// Split at end: no content to move, just create two empty children
		const continuation = createNode(tree, nodeId, undefined, node.label ? `${node.label} (continued)` : undefined);
		const branch = createNode(tree, nodeId, undefined, 'New branch');

		// Move existing children to continuation and migrate their edges
		for (const childId of node.childIds.filter((id) => id !== continuation.id && id !== branch.id)) {
			tree.nodes[childId].parentId = continuation.id;
			continuation.childIds.push(childId);
			migrateEdge(tree, nodeId, continuation.id, childId);
		}
		node.childIds = [continuation.id, branch.id];

		// Transfer mergeChildIds to continuation so the fork is navigable
		if (node.mergeChildIds?.length) {
			continuation.mergeChildIds = node.mergeChildIds;
			delete node.mergeChildIds;
		}

		tree.updatedAt = now;

		return { continuationId: continuation.id, branchId: branch.id };
	}

	// Split content
	const keepContent = paragraphs.slice(0, splitAtParagraph);
	const moveContent = paragraphs.slice(splitAtParagraph);

	// Create continuation with moved content
	const continuation = createNode(
		tree,
		nodeId,
		{ type: 'doc', content: moveContent },
		node.label ? `${node.label} (continued)` : undefined
	);

	// Create empty branch
	const branch = createNode(tree, nodeId, undefined, 'New branch');

	// Move existing children to continuation and migrate their edges
	for (const childId of node.childIds.filter((id) => id !== continuation.id && id !== branch.id)) {
		tree.nodes[childId].parentId = continuation.id;
		continuation.childIds.push(childId);
		migrateEdge(tree, nodeId, continuation.id, childId);
	}

	// Update original node
	node.content = { type: 'doc', content: keepContent };
	node.childIds = [continuation.id, branch.id];

	// Transfer mergeChildIds to continuation so the fork is navigable
	if (node.mergeChildIds?.length) {
		continuation.mergeChildIds = node.mergeChildIds;
		delete node.mergeChildIds;
	}

	node.updatedAt = now;
	tree.updatedAt = now;

	return { continuationId: continuation.id, branchId: branch.id };
}

/**
 * Adds a new branch (sibling) to an existing fork point.
 * The parentId must already have at least one child.
 */
export function addBranch(tree: StoryTree, parentId: string, label?: string): StoryNode {
	return createNode(tree, parentId, undefined, label ?? 'New branch');
}

/**
 * Deletes a branch and all its descendants.
 * Cannot delete the root node or the last child of a parent.
 * If deletion leaves the parent with one child, that child is collapsed
 * back into the parent (content merged, grandchildren re-parented).
 */
export function deleteBranch(tree: StoryTree, nodeId: string): boolean {
	const node = tree.nodes[nodeId];
	if (!node.parentId) return false;

	const parent = tree.nodes[node.parentId];
	if (parent.childIds.length <= 1) return false;

	// Collect all descendant ids of the branch being deleted
	const toDelete = collectDescendants(tree, nodeId);
	toDelete.push(nodeId);

	// Remove from parent
	parent.childIds = parent.childIds.filter((id) => id !== nodeId);

	// Delete all nodes in this branch
	for (const id of toDelete) {
		delete tree.nodes[id];
	}

	// Clear any mergeChildIds references and edges that pointed to deleted nodes
	const deletedSet = new Set(toDelete);
	for (const surviving of Object.values(tree.nodes)) {
		if (surviving.mergeChildIds) {
			surviving.mergeChildIds = surviving.mergeChildIds.filter((id) => !deletedSet.has(id));
			if (surviving.mergeChildIds.length === 0) delete surviving.mergeChildIds;
		}
	}
	if (tree.edges) {
		for (const key of Object.keys(tree.edges)) {
			const [p, c] = key.split(':');
			if (deletedSet.has(p) || deletedSet.has(c)) delete tree.edges[key];
		}
		if (Object.keys(tree.edges).length === 0) delete tree.edges;
	}

	// If parent now has exactly one child, collapse it into the parent
	if (parent.childIds.length === 1) {
		const remainingChildId = parent.childIds[0];
		const child = tree.nodes[remainingChildId];

		// Merge child content into parent
		const parentParagraphs = parent.content.content ?? [];
		const childParagraphs = child.content.content ?? [];
		parent.content = { type: 'doc', content: [...parentParagraphs, ...childParagraphs] };

		// Re-parent grandchildren to parent and migrate their edges
		for (const grandchildId of child.childIds) {
			tree.nodes[grandchildId].parentId = parent.id;
			migrateEdge(tree, remainingChildId, parent.id, grandchildId);
		}
		parent.childIds = child.childIds;

		// Remove the edge from parent to the collapsed child
		deleteEdge(tree, parent.id, remainingChildId);
		delete tree.nodes[remainingChildId];
	}

	tree.updatedAt = Date.now();
	return true;
}

/**
 * Collects all descendant node ids (not including the node itself).
 */
export function collectDescendants(tree: StoryTree, nodeId: string): string[] {
	const result: string[] = [];
	const stack = [...tree.nodes[nodeId].childIds];

	while (stack.length > 0) {
		const id = stack.pop()!;
		result.push(id);
		stack.push(...tree.nodes[id].childIds);
	}

	return result;
}

/**
 * Updates the content of a node.
 */
export function updateNodeContent(tree: StoryTree, nodeId: string, content: JSONContent): void {
	const node = tree.nodes[nodeId];
	node.content = content;
	node.updatedAt = Date.now();
	tree.updatedAt = Date.now();
}

/**
 * Adds a merge child to a node — an existing node elsewhere in the tree
 * that appears as an additional branch choice alongside real children.
 * Returns false if the target doesn't exist, is already a merge child, or would create a cycle.
 */
export function addMergeChild(tree: StoryTree, nodeId: string, targetId: string): boolean {
	const node = tree.nodes[nodeId];
	if (!node) return false;
	if (!tree.nodes[targetId]) return false;
	if (targetId === nodeId) return false;
	if (node.mergeChildIds?.includes(targetId)) return false;
	if (wouldCreateCycle(tree, nodeId, targetId)) return false;

	if (!node.mergeChildIds) node.mergeChildIds = [];
	node.mergeChildIds.push(targetId);
	node.updatedAt = Date.now();
	tree.updatedAt = Date.now();
	return true;
}

/**
 * Removes a merge child from a node.
 */
export function removeMergeChild(tree: StoryTree, nodeId: string, targetId: string): void {
	const node = tree.nodes[nodeId];
	if (!node?.mergeChildIds) return;

	node.mergeChildIds = node.mergeChildIds.filter((id) => id !== targetId);
	if (node.mergeChildIds.length === 0) delete node.mergeChildIds;
	node.updatedAt = Date.now();
	tree.updatedAt = Date.now();
}

/**
 * Moves an edge from one parent to another (used when reparenting children).
 */
function migrateEdge(tree: StoryTree, fromParent: string, toParent: string, childId: string): void {
	const existing = getEdge(tree, fromParent, childId);
	if (existing) {
		deleteEdge(tree, fromParent, childId);
		setEdge(tree, toParent, childId, existing);
	}
}

/**
 * Returns true if adding targetId as a merge child of nodeId would create a cycle.
 * Walks forward from targetId following both childIds and mergeChildIds links.
 */
function wouldCreateCycle(tree: StoryTree, nodeId: string, targetId: string): boolean {
	const visited = new Set<string>();
	const stack = [targetId];

	while (stack.length > 0) {
		const id = stack.pop()!;
		if (id === nodeId) return true;
		if (visited.has(id)) continue;
		visited.add(id);

		const node = tree.nodes[id];
		if (!node) continue;

		for (const childId of node.childIds) stack.push(childId);
		if (node.mergeChildIds) {
			for (const mcId of node.mergeChildIds) stack.push(mcId);
		}
	}

	return false;
}
