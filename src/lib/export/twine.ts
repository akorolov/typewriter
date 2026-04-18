import type { JSONContent } from '@tiptap/core';
import type { BranchSelections, StoryTree } from '../models/story.js';
import { resolvePath } from '../models/path.js';
import { getEdge } from '../models/tree.js';

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
	if (node.type === 'variableMention') return `$${node.attrs?.name ?? ''}`;
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

function harloweValue(value: string | number | boolean, isNumber = false): string {
	if (typeof value === 'boolean') return value ? 'true' : 'false';
	// Number-type variables: emit the value raw so expressions like $x + 1 work
	if (isNumber || typeof value === 'number') return String(value);
	return `"${String(value).replace(/"/g, '\\"')}"`;
}

function harloweSetMacro(variableName: string, value: string | number | boolean, tree: StoryTree, rawExpression = false): string {
	// Branch effects are raw Harlowe expressions (unquoted) so $var + 1 and $var + " text" work.
	// Default values in StoryInit use typed quoting.
	const isNumber = tree.variables?.[variableName]?.type === 'number';
	const formatted = rawExpression ? String(value) : harloweValue(value, isNumber);
	return `(set: $${variableName} to ${formatted})`;
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

	// StoryInit: initialize all variables to their defaults
	const vars = Object.values(tree.variables ?? {});
	if (vars.length > 0) {
		const inits = vars.map((v) => harloweSetMacro(v.name, v.defaultValue, tree)).join('\n');
		parts.push(`:: StoryInit [startup]\n${inits}`);
	}

	// One passage per node
	for (const [id, node] of Object.entries(tree.nodes)) {
		const name = names.get(id)!;
		const body = blockToHarlowe(node.content).trim();

		const links: string[] = [];
		const allChoices = [...node.childIds, ...(node.mergeChildIds ?? [])];

		if (allChoices.length === 1) {
			// Linear continuation: transparent forward link
			const childId = allChoices[0];
			const effects = getEdge(tree, id, childId)?.variableEffects ?? [];
			if (effects.length > 0) {
				const setMacros = effects.map((e) => harloweSetMacro(e.variableName, e.value, tree, true)).join('');
				links.push(`${setMacros}[[${names.get(childId)!}]]`);
			} else {
				links.push(`[[${names.get(childId)!}]]`);
			}
		} else {
			// Choice fork: one link per branch (real children + merge children)
			for (const childId of allChoices) {
				const childName = names.get(childId)!;
				const edge = getEdge(tree, id, childId);
				const linkText = edge?.choiceText?.trim() || childName;
				const effects = edge?.variableEffects ?? [];
				if (effects.length > 0) {
					const setMacros = effects.map((e) => harloweSetMacro(e.variableName, e.value, tree, true)).join('');
					links.push(`(link: "${linkText}")[${setMacros}(go-to: "${childName}")]`);
				} else {
					links.push(`[[${linkText}->${childName}]]`);
				}
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

// --- Markdown export (full tree, anchored sections) ---

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\w\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-');
}

function buildSectionAnchors(headings: Map<string, string>): Map<string, string> {
	const anchors = new Map<string, string>();
	const used = new Set<string>();

	for (const [id, heading] of headings) {
		const base = slugify(heading) || id;
		let anchor = base;
		let n = 1;
		while (used.has(anchor)) {
			anchor = `${base}-${n++}`;
		}
		anchors.set(id, anchor);
		used.add(anchor);
	}

	return anchors;
}

/**
 * Exports the full story tree as a single Markdown document with anchored sections.
 * Each node is a ## heading; fork points show choice links; linear continuations flow naturally.
 */
export function exportToMarkdownAll(tree: StoryTree): string {
	// Build headings in BFS order so numbered fallbacks are stable
	const headingMap = new Map<string, string>();
	let unnamed = 0;
	const bfsOrder: string[] = [];
	const visited = new Set<string>();
	const queue = [tree.rootNodeId];

	while (queue.length > 0) {
		const nodeId = queue.shift()!;
		if (visited.has(nodeId)) continue;
		visited.add(nodeId);
		bfsOrder.push(nodeId);

		const node = tree.nodes[nodeId];
		if (!node) continue;

		const heading =
			node.label?.trim() || (nodeId === tree.rootNodeId ? 'Opening' : `Section ${++unnamed}`);
		headingMap.set(nodeId, heading);

		for (const childId of node.childIds) queue.push(childId);
	}

	const anchors = buildSectionAnchors(headingMap);
	const parts: string[] = [`# ${tree.title}`];

	for (const nodeId of bfsOrder) {
		const node = tree.nodes[nodeId];
		if (!node) continue;

		const heading = headingMap.get(nodeId)!;
		const anchor = anchors.get(nodeId)!;

		parts.push(`<a id="${anchor}"></a>\n\n## ${heading}`);

		const content = blockToMarkdown(node.content).trim();
		if (content) parts.push(content);

		const allChoices = [...node.childIds, ...(node.mergeChildIds ?? [])];
		if (allChoices.length > 1) {
			const choiceLines = allChoices.map((childId) => {
				const linkText = getEdge(tree, nodeId, childId)?.choiceText?.trim() || headingMap.get(childId) || childId;
				return `> - [${linkText}](#${anchors.get(childId)})`;
			});
			parts.push(`> **Choose your path:**\n${choiceLines.join('\n')}`);
		}

		parts.push('---');
	}

	return parts.join('\n\n');
}

/**
 * Triggers a browser download of the full story as a .md file.
 */
export function downloadMarkdownAll(tree: StoryTree): void {
	const content = exportToMarkdownAll(tree);
	const blob = new Blob([content], { type: 'text/markdown' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${storyFilename(tree.title)}.md`;
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
