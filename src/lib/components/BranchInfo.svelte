<script lang="ts">
	import type { StoryStore } from '../stores/story.svelte.js';
	import type { JSONContent } from '@tiptap/core';

	interface Props {
		store: StoryStore;
	}

	let { store }: Props = $props();

	function extractText(content: JSONContent): string {
		if (content.text) return content.text;
		if (content.content) return content.content.map(extractText).join(' ');
		return '';
	}

	const wordCount = $derived(
		store.path.reduce((count, nodeId) => {
			const node = store.tree.nodes[nodeId];
			const text = extractText(node.content);
			return count + (text.trim() ? text.trim().split(/\s+/).length : 0);
		}, 0)
	);

	// For each fork along the current path, collect { parentId, selectedChildId }
	const forks = $derived.by(() => {
		const result: Array<{ parentId: string; selectedChildId: string; parentPreview: string }> = [];
		const seen = new Set<string>();

		for (const nodeId of store.path) {
			const node = store.tree.nodes[nodeId];
			if (node.parentId && !seen.has(node.parentId)) {
				const parent = store.tree.nodes[node.parentId];
				if (parent.childIds.length > 1) {
					seen.add(node.parentId);
					const raw = extractText(parent.content).trim();
					const parentPreview = raw.length > 30 ? '…' + raw.slice(-30) : raw || '(start)';
					result.push({ parentId: node.parentId, selectedChildId: nodeId, parentPreview });
				}
			}
		}
		return result;
	});

	function handleCardClick(forkParentId: string, childId: string, isSelected: boolean) {
		if (!isSelected) {
			store.selectBranch(forkParentId, childId);
		}
	}
</script>

<div class="branch-info overflow-y-auto p-3">
	<div class="mb-3 text-xs text-base-content/60">
		{wordCount}
		{wordCount === 1 ? 'word' : 'words'} on this path
	</div>

	{#if forks.length === 0}
		<p class="text-center text-xs text-base-content/40">No branch points yet.</p>
	{:else}
		{#each forks as fork, i (fork.parentId)}
			<div class="mb-4">
				<div class="mb-1 text-[10px] font-semibold uppercase tracking-wider text-base-content/40">
					Fork {i + 1}
				</div>
				<div class="mb-1.5 truncate text-[10px] italic text-base-content/30">
					after "{fork.parentPreview}"
				</div>

				{#each store.tree.nodes[fork.parentId].childIds as childId, j (childId)}
					{@const node = store.tree.nodes[childId]}
					{@const isSelected = childId === fork.selectedChildId}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<div
						class="branch-row mb-1.5 rounded-md p-2"
						class:branch-row-selected={isSelected}
						class:branch-row-other={!isSelected}
						role={isSelected ? undefined : 'button'}
						tabindex={isSelected ? undefined : 0}
						onclick={() => handleCardClick(fork.parentId, childId, isSelected)}
						onkeydown={(e) => e.key === 'Enter' && handleCardClick(fork.parentId, childId, isSelected)}
					>
						<div class="mb-1.5 flex items-center gap-1.5">
							<span class="shrink-0 text-[9px]" class:text-primary={isSelected} class:text-base-content={!isSelected} style="opacity: {isSelected ? 1 : 0.4}">
								{isSelected ? '●' : '○'}
							</span>
							<div class="min-w-0 flex-1">
								<div class="mb-0.5 text-[9px] font-semibold uppercase tracking-wider text-base-content/40">Label</div>
								<input
									type="text"
									class="field w-full"
									class:field-selected={isSelected}
									class:field-other={!isSelected}
									value={node.label ?? ''}
									placeholder="Branch {j + 1}"
									oninput={(e) => store.updateNodeLabel(childId, e.currentTarget.value)}
									onclick={(e) => e.stopPropagation()}
									onkeydown={(e) => e.stopPropagation()}
								/>
							</div>
						</div>
						<div class="pl-4">
							<div class="mb-0.5 text-[9px] font-semibold uppercase tracking-wider text-base-content/40">Player choice</div>
							<input
								type="text"
								class="field w-full"
								class:field-selected={isSelected}
								class:field-other={!isSelected}
								value={node.choiceText ?? ''}
								placeholder="Enter choice text…"
								oninput={(e) => store.updateNodeChoiceText(childId, e.currentTarget.value)}
								onclick={(e) => e.stopPropagation()}
								onkeydown={(e) => e.stopPropagation()}
							/>
						</div>
						{#if !isSelected}
							<div class="mt-1.5 pl-4 text-[9px] text-base-content/30">Click to navigate</div>
						{/if}
					</div>
				{/each}
			</div>
		{/each}
	{/if}
</div>

<style>
	.branch-row {
		transition: background-color 0.15s;
	}

	.branch-row-selected {
		background-color: oklch(from var(--color-primary) l c h / 0.12);
		border: 1px solid oklch(from var(--color-primary) l c h / 0.3);
	}

	.branch-row-other {
		background-color: oklch(from var(--color-base-300) l c h / 0.4);
		border: 1px solid transparent;
		cursor: pointer;
	}

	.branch-row-other:hover {
		background-color: oklch(from var(--color-base-300) l c h / 0.8);
	}

	.field {
		background: transparent;
		border: none;
		border-bottom: 1px solid transparent;
		outline: none;
		font-size: 0.7rem;
		padding: 1px 0;
		line-height: 1.4;
	}

	.field:hover {
		border-bottom-color: oklch(from var(--color-base-content) l c h / 0.2);
	}

	.field:focus {
		border-bottom-color: oklch(from var(--color-primary) l c h);
	}

	.field-selected {
		color: oklch(from var(--color-base-content) l c h);
	}

	.field-other {
		color: oklch(from var(--color-base-content) l c h / 0.65);
	}

	.field::placeholder {
		color: oklch(from var(--color-base-content) l c h / 0.25);
		font-style: italic;
	}
</style>
