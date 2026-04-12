import type { JSONContent } from '@tiptap/core';
import type { BranchSelections, StoryTree } from '../models/story.js';
import { resolvePath, switchBranch, switchBranchByDirection } from '../models/path.js';
import { createStoryTree, splitNode, addBranch, deleteBranch, updateNodeContent, setMergeTarget } from '../models/tree.js';
import { saveStory } from '../persistence/indexeddb.js';

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function debouncedSave(tree: StoryTree) {
	if (saveTimeout) clearTimeout(saveTimeout);
	saveTimeout = setTimeout(() => {
		saveStory($state.snapshot(tree) as StoryTree);
	}, 500);
}

export function createStoryStore(initial?: StoryTree) {
	const initialTree = initial ?? createStoryTree('Untitled Story');
	let tree = $state<StoryTree>(initialTree);
	let selections = $state<BranchSelections>({});
	let activeNodeId = $state<string>(initialTree.rootNodeId);

	const path = $derived(resolvePath(tree, selections));

	function setTree(t: StoryTree) {
		tree = t;
		selections = {};
		activeNodeId = t.rootNodeId;
	}

	function setActiveNode(nodeId: string) {
		if (tree.nodes[nodeId]) {
			activeNodeId = nodeId;
		}
	}

	function updateContent(nodeId: string, content: JSONContent) {
		updateNodeContent(tree, nodeId, content);
		debouncedSave(tree);
	}

	function branch(nodeId: string, atParagraph: number) {
		const { branchId } = splitNode(tree, nodeId, atParagraph);
		// Select the new branch
		selections = { ...selections, [nodeId]: branchId };
		activeNodeId = branchId;
		debouncedSave(tree);
	}

	function branchAtEnd(nodeId: string) {
		const node = tree.nodes[nodeId];
		const paragraphCount = node.content.content?.length ?? 0;
		branch(nodeId, paragraphCount);
	}

	function addSiblingBranch(parentId: string, label?: string) {
		const newNode = addBranch(tree, parentId, label);
		selections = { ...selections, [parentId]: newNode.id };
		activeNodeId = newNode.id;
		debouncedSave(tree);
	}

	function removeBranch(nodeId: string) {
		const node = tree.nodes[nodeId];
		if (!node?.parentId) return;
		const parentId = node.parentId;
		const parent = tree.nodes[parentId];

		// If currently selected, switch to sibling before deleting
		if (selections[parentId] === nodeId || (!selections[parentId] && parent.childIds[0] === nodeId)) {
			const sibling = parent.childIds.find((id) => id !== nodeId);
			if (sibling) {
				selections = { ...selections, [parentId]: sibling };
			}
		}

		deleteBranch(tree, nodeId);

		// Remove stale selections pointing to nodes that no longer exist
		// (collapse may have merged the remaining child into its parent)
		const cleaned: BranchSelections = {};
		for (const [pId, cId] of Object.entries(selections)) {
			if (tree.nodes[pId] && tree.nodes[cId]) {
				cleaned[pId] = cId;
			}
		}
		selections = cleaned;

		// If activeNodeId was merged away, fall back to the parent node
		if (!tree.nodes[activeNodeId]) {
			activeNodeId = tree.nodes[parentId] ? parentId : tree.rootNodeId;
		}

		debouncedSave(tree);
	}

	function selectBranch(parentId: string, childId: string) {
		const result = switchBranch(tree, selections, parentId, childId);
		if (result) {
			selections = result;
			activeNodeId = childId;
		}
	}

	function switchDirection(parentId: string, direction: 'prev' | 'next') {
		const result = switchBranchByDirection(tree, selections, parentId, direction);
		if (result) {
			selections = result;
			// Update active node to the newly selected child
			const newChildId = result[parentId];
			if (newChildId) activeNodeId = newChildId;
		}
	}

	function updateTitle(title: string) {
		tree.title = title;
		tree.updatedAt = Date.now();
		debouncedSave(tree);
	}

	function updateNodeLabel(nodeId: string, label: string) {
		const node = tree.nodes[nodeId];
		if (node) {
			node.label = label;
			node.updatedAt = Date.now();
			debouncedSave(tree);
		}
	}

	function updateNodeChoiceText(nodeId: string, choiceText: string) {
		const node = tree.nodes[nodeId];
		if (node) {
			node.choiceText = choiceText;
			node.updatedAt = Date.now();
			debouncedSave(tree);
		}
	}

	function mergeBranch(nodeId: string, targetId: string): boolean {
		const result = setMergeTarget(tree, nodeId, targetId);
		if (result) debouncedSave(tree);
		return result;
	}

	function clearMergeTarget(nodeId: string): void {
		setMergeTarget(tree, nodeId, null);
		debouncedSave(tree);
	}

	function forceSave() {
		if (saveTimeout) clearTimeout(saveTimeout);
		return saveStory($state.snapshot(tree) as StoryTree);
	}

	return {
		get tree() { return tree; },
		get selections() { return selections; },
		get path() { return path; },
		get activeNodeId() { return activeNodeId; },
		setTree,
		setActiveNode,
		updateContent,
		branch,
		branchAtEnd,
		addSiblingBranch,
		removeBranch,
		selectBranch,
		switchDirection,
		updateTitle,
		updateNodeLabel,
		updateNodeChoiceText,
		mergeBranch,
		clearMergeTarget,
		forceSave
	};
}

export type StoryStore = ReturnType<typeof createStoryStore>;
