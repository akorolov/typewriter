import type { BranchSelections, StoryTree } from './story.js';

/**
 * Resolves the active linear path from root to leaf,
 * using the branch selections to choose at each fork.
 * Defaults to the first child when no selection exists.
 */
export function resolvePath(tree: StoryTree, selections: BranchSelections): string[] {
	const path: string[] = [];
	const visited = new Set<string>();
	let currentId: string | null = tree.rootNodeId;

	while (currentId) {
		if (visited.has(currentId)) break; // cycle guard
		visited.add(currentId);

		const node = tree.nodes[currentId];
		if (!node) break;

		path.push(currentId);

		// Follow merge pointer if present, bypassing childIds
		if (node.mergeTargetId && tree.nodes[node.mergeTargetId]) {
			currentId = node.mergeTargetId;
			continue;
		}

		if (node.childIds.length === 0) break;

		// Use selection if available, otherwise default to first child
		const selectedChild = selections[currentId];
		if (selectedChild && node.childIds.includes(selectedChild)) {
			currentId = selectedChild;
		} else {
			currentId = node.childIds[0];
		}
	}

	return path;
}

/**
 * Switches to a sibling branch at a given fork point.
 * Returns updated selections, or null if the switch is invalid.
 */
export function switchBranch(
	tree: StoryTree,
	selections: BranchSelections,
	parentId: string,
	targetChildId: string
): BranchSelections | null {
	const parent = tree.nodes[parentId];
	if (!parent || !parent.childIds.includes(targetChildId)) return null;

	return { ...selections, [parentId]: targetChildId };
}

/**
 * Switches to the next or previous sibling at a fork point.
 * Returns updated selections, or null if at the boundary.
 */
export function switchBranchByDirection(
	tree: StoryTree,
	selections: BranchSelections,
	parentId: string,
	direction: 'prev' | 'next'
): BranchSelections | null {
	const parent = tree.nodes[parentId];
	if (!parent || parent.childIds.length < 2) return null;

	const currentChild = selections[parentId] ?? parent.childIds[0];
	const currentIndex = parent.childIds.indexOf(currentChild);
	if (currentIndex === -1) return null;

	const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
	if (newIndex < 0 || newIndex >= parent.childIds.length) return null;

	return { ...selections, [parentId]: parent.childIds[newIndex] };
}

/**
 * Finds all fork points (nodes with multiple children) along the current path.
 */
export function findForksOnPath(tree: StoryTree, path: string[]): string[] {
	return path.filter((id) => tree.nodes[id]?.childIds.length > 1);
}

/**
 * Gets the currently selected child index at a fork point.
 */
export function getSelectedIndex(
	tree: StoryTree,
	selections: BranchSelections,
	parentId: string
): number {
	const parent = tree.nodes[parentId];
	if (!parent) return 0;

	const selected = selections[parentId] ?? parent.childIds[0];
	const index = parent.childIds.indexOf(selected);
	return index === -1 ? 0 : index;
}
