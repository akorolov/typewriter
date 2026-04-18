import type { JSONContent } from '@tiptap/core';
import type { StoryTree } from './story.js';

function contentMentionsVariable(content: JSONContent, name: string): boolean {
	if (content.type === 'variableMention' && content.attrs?.name === name) return true;
	return (content.content ?? []).some((child) => contentMentionsVariable(child, name));
}

/** Returns node IDs whose content contains a reference to the given variable. */
export function findVariableReferences(tree: StoryTree, variableName: string): string[] {
	return Object.entries(tree.nodes)
		.filter(([, node]) => contentMentionsVariable(node.content, variableName))
		.map(([id]) => id);
}

/** Returns node IDs that have a variable effect for the given variable on any outgoing edge. */
export function findVariableEffectNodes(tree: StoryTree, variableName: string): string[] {
	const nodeIds = new Set<string>();
	for (const [key, edge] of Object.entries(tree.edges ?? {})) {
		if (edge.variableEffects?.some((e) => e.variableName === variableName)) {
			const parentId = key.split(':')[0];
			nodeIds.add(parentId);
		}
	}
	return [...nodeIds];
}
