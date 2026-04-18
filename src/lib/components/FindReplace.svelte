<script lang="ts">
	import type { JSONContent } from '@tiptap/core';
	import type { StoryTree } from '../models/story.js';

	interface Props {
		tree: StoryTree;
		onreplace: (nodeId: string, newContent: JSONContent) => void;
		onclose: () => void;
	}

	let { tree, onreplace, onclose }: Props = $props();

	let searchText = $state('');
	let replaceMode: 'text' | 'variable' = $state('text');
	let replaceText = $state('');
	let replaceVar = $state('');
	let matchCount = $state(0);
	let replaced = $state(false);

	const variableNames = $derived(Object.keys(tree.variables ?? {}));

	$effect(() => {
		if (variableNames.length > 0 && !replaceVar) {
			replaceVar = variableNames[0];
		}
	});

	$effect(() => {
		if (searchText.trim()) {
			matchCount = countMatches(tree, searchText);
		} else {
			matchCount = 0;
		}
		replaced = false;
	});

	function countMatches(t: StoryTree, search: string): number {
		let total = 0;
		for (const node of Object.values(t.nodes)) {
			total += countInContent(node.content, search);
		}
		return total;
	}

	function countInContent(content: JSONContent, search: string): number {
		if (content.type === 'text' && content.text) {
			let count = 0;
			let idx = 0;
			const lower = content.text.toLowerCase();
			const searchLower = search.toLowerCase();
			while ((idx = lower.indexOf(searchLower, idx)) !== -1) { count++; idx++; }
			return count;
		}
		return (content.content ?? []).reduce((sum, c) => sum + countInContent(c, search), 0);
	}

	function replaceInContent(content: JSONContent, search: string, replacement: JSONContent | string): JSONContent {
		if (content.type === 'text' && content.text) {
			const parts = content.text.split(new RegExp(escapeRegex(search), 'gi'));
			if (parts.length <= 1) return content;

			const nodes: JSONContent[] = [];
			parts.forEach((part, i) => {
				if (part) nodes.push({ type: 'text', text: part, marks: content.marks });
				if (i < parts.length - 1) {
					if (typeof replacement === 'string') {
						if (replacement) nodes.push({ type: 'text', text: replacement, marks: content.marks });
					} else {
						nodes.push(replacement);
					}
				}
			});
			return nodes.length === 1 ? nodes[0] : { type: 'fragment', content: nodes };
		}

		if (content.content) {
			const newChildren: JSONContent[] = [];
			for (const child of content.content) {
				const result = replaceInContent(child, search, replacement);
				if (result.type === 'fragment') {
					newChildren.push(...(result.content ?? []));
				} else {
					newChildren.push(result);
				}
			}
			return { ...content, content: newChildren };
		}

		return content;
	}

	function escapeRegex(s: string): string {
		return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	function handleReplaceAll() {
		const search = searchText.trim();
		if (!search) return;

		const replacement: JSONContent | string =
			replaceMode === 'variable'
				? { type: 'variableMention', attrs: { name: replaceVar } }
				: replaceText;

		let count = 0;
		for (const [nodeId, node] of Object.entries(tree.nodes)) {
			const before = JSON.stringify(node.content);
			const newContent = replaceInContent(node.content, search, replacement);
			if (JSON.stringify(newContent) !== before) {
				onreplace(nodeId, newContent);
				count++;
			}
		}
		replaced = true;
		matchCount = 0;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
		if (e.key === 'Enter' && searchText.trim()) handleReplaceAll();
	}
</script>

<dialog
	class="modal modal-open"
	tabindex="-1"
	onkeydown={handleKeydown}
	open
>
	<div class="modal-box max-w-sm">
		<div class="mb-3 flex items-center justify-between">
			<h3 class="text-sm font-semibold">Find &amp; Replace</h3>
			<button class="btn btn-ghost btn-xs" onclick={onclose}>&times;</button>
		</div>

		<div class="mb-3">
			<label for="fr-search" class="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-base-content/40">Find</label>
			<input
				id="fr-search"
				type="text"
				class="input input-sm input-bordered w-full font-mono"
				placeholder="Search text…"
				bind:value={searchText}
			/>
			{#if searchText.trim()}
				<div class="mt-0.5 text-[10px] text-base-content/40">
					{matchCount} match{matchCount === 1 ? '' : 'es'}
				</div>
			{/if}
		</div>

		<div class="mb-3">
			<div class="mb-1 text-[10px] font-semibold uppercase tracking-wider text-base-content/40">Replace with</div>
			<div class="mb-2 flex gap-2">
				<label class="flex cursor-pointer items-center gap-1 text-xs">
					<input type="radio" class="radio radio-xs" bind:group={replaceMode} value="text" />
					Text
				</label>
				<label class="flex cursor-pointer items-center gap-1 text-xs" class:opacity-40={variableNames.length === 0}>
					<input type="radio" class="radio radio-xs" bind:group={replaceMode} value="variable" disabled={variableNames.length === 0} />
					Variable
				</label>
			</div>

			{#if replaceMode === 'text'}
				<input
					type="text"
					class="input input-sm input-bordered w-full"
					placeholder="Replacement text…"
					bind:value={replaceText}
				/>
			{:else}
				<select class="select select-sm select-bordered w-full font-mono" bind:value={replaceVar}>
					{#each variableNames as name (name)}
						<option value={name}>${name}</option>
					{/each}
				</select>
			{/if}
		</div>

		{#if replaced}
			<div class="mb-2 text-[10px] text-success">Replacement complete.</div>
		{/if}

		<div class="modal-action mt-2">
			<button class="btn btn-ghost btn-sm" onclick={onclose}>Cancel</button>
			<button
				class="btn btn-primary btn-sm"
				disabled={!searchText.trim() || matchCount === 0}
				onclick={handleReplaceAll}
			>
				Replace All {matchCount > 0 ? `(${matchCount})` : ''}
			</button>
		</div>
	</div>
	<button class="modal-backdrop" onclick={onclose} aria-label="Close dialog"></button>
</dialog>
