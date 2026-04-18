import type { JSONContent } from '@tiptap/core';

export const CURRENT_SCHEMA_VERSION = 3;

export interface VariableDef {
	name: string;
	type: 'string' | 'number' | 'boolean';
	defaultValue: string | number | boolean;
	description?: string;
}

export interface VariableEffect {
	variableName: string;
	value: string | number | boolean;
}

export interface ChoiceEdge {
	choiceText?: string;
	variableEffects?: VariableEffect[];
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
	/** Story variables available to use in passages and branch effects. */
	variables?: Record<string, VariableDef>;
	createdAt: number;
	updatedAt: number;
	schemaVersion: number;
}

/**
 * Tracks which branch is selected at each fork point.
 * Key = parent node id, Value = selected child node id.
 */
export type BranchSelections = Record<string, string>;
