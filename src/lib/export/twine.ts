import type { JSONContent } from '@tiptap/core';
import type { BranchSelections, StoryTree } from '../models/story.js';
import { resolvePath } from '../models/path.js';

type Mark = { type: string; attrs?: Record<string, unknown> };

function inlineToHarlowe(node: JSONContent): string {
	if (node.type === 'text') {
		let text = node.text ?? '';
		for (const mark of (node.marks as Mark[] | undefined) ?? []) {
			switch (mark.type) {
				case 'bold':
					text = `''${text}''`;
					break;
				case 'italic':
					text = `//${text}//`;
					break;
				case 'underline':
					text = `__${text}__`;
					break;
				case 'strike':
					text = `~~${text}~~`;
					break;
				case 'code':
					text = `\`${text}\``;
					break;
				// 'highlight' has no Harlowe equivalent — render plain
			}
		}
		return text;
	}
	if (node.type === 'hardBreak') return '\n';
	if (node.type === 'image') return '';
	return (node.content ?? []).map(inlineToHarlowe).join('');
}

function blockToHarlowe(node: JSONContent): string {
	switch (node.type) {
		case 'paragraph':
			return (node.content ?? []).map(inlineToHarlowe).join('');

		case 'heading': {
			const level = (node.attrs?.level as number) ?? 1;
			return '#'.repeat(level) + ' ' + (node.content ?? []).map(inlineToHarlowe).join('');
		}

		case 'bulletList':
			return (node.content ?? [])
				.map((item) => {
					const text = (item.content ?? []).map(blockToHarlowe).join(' ').trim();
					return `* ${text}`;
				})
				.join('\n');

		case 'orderedList':
			return (node.content ?? [])
				.map((item) => {
					const text = (item.content ?? []).map(blockToHarlowe).join(' ').trim();
					return `0. ${text}`;
				})
				.join('\n');

		case 'listItem':
			return (node.content ?? []).map(blockToHarlowe).join(' ');

		case 'blockquote':
			return (node.content ?? [])
				.map(blockToHarlowe)
				.flatMap((s) => s.split('\n'))
				.map((line) => `>${line}`)
				.join('\n');

		case 'horizontalRule':
			return '---';

		case 'codeBlock': {
			const code = (node.content ?? []).map((n) => n.text ?? '').join('');
			return '```\n' + code + '\n```';
		}

		case 'doc':
			return (node.content ?? [])
				.map(blockToHarlowe)
				.filter(Boolean)
				.join('\n\n');

		default:
			return (node.content ?? []).map(blockToHarlowe).join('\n\n');
	}
}

/**
 * Derives a stable UUID-format IFID from a nanoid story ID.
 * Encodes each character as two hex bytes and formats as 8-4-4-4-12.
 */
function deriveIfid(storyId: string): string {
	let hex = '';
	for (const c of storyId) {
		hex += c.charCodeAt(0).toString(16).padStart(2, '0');
		if (hex.length >= 32) break;
	}
	hex = hex.padEnd(32, '0').slice(0, 32);
	return [
		hex.slice(0, 8),
		hex.slice(8, 12),
		hex.slice(12, 16),
		hex.slice(16, 20),
		hex.slice(20, 32)
	]
		.join('-')
		.toUpperCase();
}

/**
 * Builds a map of node ID → unique Twee passage name.
 * Uses node.label when available, falls back to node ID.
 * Disambiguates duplicate labels by appending (2), (3), etc.
 */
function buildPassageNames(tree: StoryTree): Map<string, string> {
	const names = new Map<string, string>();
	const used = new Set<string>();

	for (const [id, node] of Object.entries(tree.nodes)) {
		const base = node.label?.trim() || id;
		let name = base;
		let n = 2;
		while (used.has(name)) {
			name = `${base} (${n++})`;
		}
		names.set(id, name);
		used.add(name);
	}

	return names;
}

/**
 * Exports a StoryTree as a Twee 3 string suitable for importing into Twine.
 * Each node becomes one Harlowe passage. Linear continuations (single child)
 * are kept as separate passages with a plain forward link.
 */
export function exportToTwee(tree: StoryTree): string {
	const names = buildPassageNames(tree);
	const ifid = deriveIfid(tree.id);
	const startName = names.get(tree.rootNodeId)!;

	const parts: string[] = [];

	// Special passages
	parts.push(`:: StoryTitle\n${tree.title}`);
	parts.push(
		`:: StoryData\n` +
			JSON.stringify({
				ifid,
				format: 'Harlowe',
				'format-version': '3.3.9',
				start: startName,
				zoom: 1
			})
	);

	// One passage per node
	for (const [id, node] of Object.entries(tree.nodes)) {
		const name = names.get(id)!;
		const body = blockToHarlowe(node.content).trim();

		const links: string[] = [];
		const allChoices = [...node.childIds, ...(node.mergeChildIds ?? [])];

		if (allChoices.length === 1) {
			// Linear continuation: transparent forward link
			links.push(`[[${names.get(allChoices[0])!}]]`);
		} else {
			// Choice fork: one link per branch (real children + merge children)
			for (const childId of allChoices) {
				const child = tree.nodes[childId];
				const childName = names.get(childId)!;
				const linkText = child.choiceText?.trim() || childName;
				links.push(`[[${linkText}->${childName}]]`);
			}
		}

		const passageParts = [body, ...links].filter(Boolean);
		parts.push(`:: ${name}\n${passageParts.join('\n\n')}`);
	}

	return parts.join('\n\n\n');
}

function storyFilename(title: string): string {
	return title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'story';
}

/**
 * Triggers a browser download of the story as a .twee file.
 */
export function downloadTwee(tree: StoryTree): void {
	const content = exportToTwee(tree);
	const blob = new Blob([content], { type: 'text/plain' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${storyFilename(tree.title)}.twee`;
	a.click();
	URL.revokeObjectURL(url);
}

/**
 * Triggers a browser download of the story as a raw JSON file.
 */
export function downloadJson(tree: StoryTree): void {
	const content = JSON.stringify(tree, null, 2);
	const blob = new Blob([content], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${storyFilename(tree.title)}.json`;
	a.click();
	URL.revokeObjectURL(url);
}

// --- Markdown export (current branch) ---

function inlineToMarkdown(node: JSONContent): string {
	if (node.type === 'text') {
		let text = node.text ?? '';
		for (const mark of (node.marks as Mark[] | undefined) ?? []) {
			switch (mark.type) {
				case 'bold':
					text = `**${text}**`;
					break;
				case 'italic':
					text = `*${text}*`;
					break;
				case 'underline':
					text = `<u>${text}</u>`;
					break;
				case 'strike':
					text = `~~${text}~~`;
					break;
				case 'code':
					text = `\`${text}\``;
					break;
			}
		}
		return text;
	}
	if (node.type === 'hardBreak') return '\n';
	if (node.type === 'image') return '';
	return (node.content ?? []).map(inlineToMarkdown).join('');
}

function blockToMarkdown(node: JSONContent): string {
	switch (node.type) {
		case 'paragraph':
			return (node.content ?? []).map(inlineToMarkdown).join('');

		case 'heading': {
			const level = (node.attrs?.level as number) ?? 1;
			return '#'.repeat(level) + ' ' + (node.content ?? []).map(inlineToMarkdown).join('');
		}

		case 'bulletList':
			return (node.content ?? [])
				.map((item) => {
					const text = (item.content ?? []).map(blockToMarkdown).join('\n').trim();
					return `- ${text}`;
				})
				.join('\n');

		case 'orderedList':
			return (node.content ?? [])
				.map((item, i) => {
					const text = (item.content ?? []).map(blockToMarkdown).join('\n').trim();
					return `${i + 1}. ${text}`;
				})
				.join('\n');

		case 'listItem':
			return (node.content ?? []).map(blockToMarkdown).join(' ');

		case 'blockquote':
			return (node.content ?? [])
				.map(blockToMarkdown)
				.flatMap((s) => s.split('\n'))
				.map((line) => `> ${line}`)
				.join('\n');

		case 'horizontalRule':
			return '---';

		case 'codeBlock': {
			const code = (node.content ?? []).map((n) => n.text ?? '').join('');
			return '```\n' + code + '\n```';
		}

		case 'doc':
			return (node.content ?? [])
				.map(blockToMarkdown)
				.filter(Boolean)
				.join('\n\n');

		default:
			return (node.content ?? []).map(blockToMarkdown).join('\n\n');
	}
}

/**
 * Exports the current branch (resolved path) as a single Markdown document.
 * Concatenates each node's content in path order, separated by blank lines.
 */
export function exportToMarkdown(tree: StoryTree, selections: BranchSelections): string {
	const path = resolvePath(tree, selections);
	const parts: string[] = [];

	parts.push(`# ${tree.title}`);

	for (const nodeId of path) {
		const node = tree.nodes[nodeId];
		if (!node) continue;
		const text = blockToMarkdown(node.content).trim();
		if (text) parts.push(text);
	}

	return parts.join('\n\n');
}

/**
 * Triggers a browser download of the current branch as a .md file.
 */
export function downloadMarkdown(tree: StoryTree, selections: BranchSelections): void {
	const content = exportToMarkdown(tree, selections);
	const blob = new Blob([content], { type: 'text/markdown' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${storyFilename(tree.title)}.md`;
	a.click();
	URL.revokeObjectURL(url);
}
