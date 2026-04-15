import type { JSONContent } from '@tiptap/core';
import type { StoryNode, StoryTree } from './story.js';
import { getAllChoices } from './path.js';

export interface OutlineHeading {
	level: 1 | 2 | 3;
	text: string;
}

export interface OutlineEntry {
	nodeId: string;
	label: string | null;
	headings: OutlineHeading[];
	preview: string | null;
	isFork: boolean;
	branchCount: number;
	selectedIndex: number;
}

function extractTextFromContent(content: JSONContent): string {
	if (content.text) return content.text;
	if (content.content) return content.content.map(extractTextFromContent).join('');
	return '';
}

function extractHeadings(content: JSONContent): OutlineHeading[] {
	const headings: OutlineHeading[] = [];
	if (content.type === 'heading' && content.attrs?.level) {
		const level = content.attrs.level as 1 | 2 | 3;
		if (level >= 1 && level <= 3) {
			const text = extractTextFromContent(content).trim();
			if (text) {
				headings.push({ level, text });
			}
		}
	}
	if (content.content) {
		for (const child of content.content) {
			headings.push(...extractHeadings(child));
		}
	}
	return headings;
}

function extractFirstParagraph(content: JSONContent): string | null {
	if (!content.content) return null;
	for (const child of content.content) {
		if (child.type === 'paragraph') {
			const text = extractTextFromContent(child).trim();
			if (text) {
				return text.length > 60 ? text.slice(0, 60) + '…' : text;
			}
		}
	}
	return null;
}

/**
 * Build a flat outline from the current path through the story tree.
 */
export function extractOutline(
	path: string[],
	tree: StoryTree
): OutlineEntry[] {
	return path.map((nodeId) => {
		const node: StoryNode = tree.nodes[nodeId];
		const headings = extractHeadings(node.content);
		const label = node.label?.trim() ? node.label : null;
		const preview = !label && headings.length === 0 ? extractFirstParagraph(node.content) : null;

		const choices = node.parentId ? getAllChoices(tree, node.parentId) : [];
		const isFork = choices.length > 1;
		const branchCount = isFork ? choices.length : 0;
		const selectedIndex = isFork ? choices.indexOf(nodeId) : 0;

		return { nodeId, label, headings, preview, isFork, branchCount, selectedIndex };
	});
}
