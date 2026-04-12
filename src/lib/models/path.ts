import type { BranchSelections, StoryTree } from './story.js';

/**
 * Returns all selectable choices at a node: real children + merge children.
 */
export function getAllChoices(tree: StoryTree, nodeId: string): string[] {
	const node = tree.nodes[nodeId];
	if (!node) return [];
	return [...node.childIds, ...(node.mergeChildIds ?? [])];
}

/**
 * Resolves the active linear path from root to leaf,
 * using the branch selections to choose at each fork.
 * Defaults to the first child when no selection exists.
 * When a merge child is selected, the path jumps to that node
 * and continues from there.
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

		const choices = getAllChoices(tree, currentId);
		if (choices.length === 0) break;

		// Use selection if available, otherwise default to first child
		const selected = selections[currentId];
		if (selected && choices.includes(selected)) {
			currentId = selected;
		} else {
			currentId = node.childIds[0] ?? null;
		}
	}

	return path;
}

/**
 * Switches to a sibling branch at a given fork point.
 * Accepts both real children and merge children as valid targets.
 * Returns updated selections, or null if the switch is invalid.
 */
export function switchBranch(
	tree: StoryTree,
	selections: BranchSelections,
	parentId: string,
	targetChildId: string
): BranchSelections | null {
	const choices = getAllChoices(tree, parentId);
	if (choices.length === 0 || !choices.includes(targetChildId)) return null;

	return { ...selections, [parentId]: targetChildId };
}

/**
 * Switches to the next or previous sibling at a fork point.
 * Considers both real children and merge children.
 * Returns updated selections, or null if at the boundary.
 */
export function switchBranchByDirection(
	tree: StoryTree,
	selections: BranchSelections,
	parentId: string,
	direction: 'prev' | 'next'
): BranchSelections | null {
	const choices = getAllChoices(tree, parentId);
	if (choices.length < 2) return null;

	const currentChild = selections[parentId] ?? choices[0];
	const currentIndex = choices.indexOf(currentChild);
	if (currentIndex === -1) return null;

	const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
	if (newIndex < 0 || newIndex >= choices.length) return null;

	return { ...selections, [parentId]: choices[newIndex] };
}

/**
 * Finds all fork points (nodes with multiple choices) along the current path.
 */
export function findForksOnPath(tree: StoryTree, path: string[]): string[] {
	return path.filter((id) => getAllChoices(tree, id).length > 1);
}

/**
 * Gets the currently selected child index at a fork point.
 */
export function getSelectedIndex(
	tree: StoryTree,
	selections: BranchSelections,
	parentId: string
): number {
	const choices = getAllChoices(tree, parentId);
	if (choices.length === 0) return 0;

	const selected = selections[parentId] ?? choices[0];
	const index = choices.indexOf(selected);
	return index === -1 ? 0 : index;
}
