import type { JSONContent } from '@tiptap/core';

export const CURRENT_SCHEMA_VERSION = 2;

export interface ChoiceEdge {
	choiceText?: string;
}

export interface StoryNode {
	id: string;
	parentId: string | null;
	childIds: string[];
	content: JSONContent;
	label?: string;
	/** IDs of existing nodes elsewhere in the tree offered as branch choices (merge-back links). */
	mergeChildIds?: string[];
	createdAt: number;
	updatedAt: number;
}

export interface StoryTree {
	id: string;
	title: string;
	rootNodeId: string;
	nodes: Record<string, StoryNode>;
	/** Per-edge metadata keyed by "${parentId}:${childId}". */
	edges?: Record<string, ChoiceEdge>;
	createdAt: number;
	updatedAt: number;
	schemaVersion: number;
}

/**
 * Tracks which branch is selected at each fork point.
 * Key = parent node id, Value = selected child node id.
 */
export type BranchSelections = Record<string, string>;
