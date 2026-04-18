<script lang="ts">
	import type { StoryStore } from '../stores/story.svelte.js';
	import type { JSONContent } from '@tiptap/core';
	import type { VariableEffect } from '../models/story.js';
	import { getAllChoices } from '../models/path.js';

	interface Props {
		store: StoryStore;
		highlightNodeId?: string | null;
	}

	let { store, highlightNodeId = $bindable(null) }: Props = $props();

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

	// For each fork along the current path, collect { parentId, selectedChildId }.
	// Walk consecutive pairs so merge-child jumps are detected correctly — a merge
	// child's structural parentId differs from the navigation parent in the path.
	const forks = $derived.by(() => {
		const result: Array<{ parentId: string; selectedChildId: string; parentPreview: string }> = [];
		const seen = new Set<string>();

		for (let i = 0; i < store.path.length - 1; i++) {
			const parentId = store.path[i];
			const childId = store.path[i + 1];
			if (seen.has(parentId)) continue;
			if (getAllChoices(store.tree, parentId).length > 1) {
				seen.add(parentId);
				const parent = store.tree.nodes[parentId];
				const raw = extractText(parent.content).trim();
				const parentPreview = raw.length > 30 ? '…' + raw.slice(-30) : raw || '(start)';
				result.push({ parentId, selectedChildId: childId, parentPreview });
			}
		}
		return result;
	});

	$effect(() => {
		const id = highlightNodeId;
		if (!id) return;
		setTimeout(() => {
			const el = document.getElementById(`branch-label-${id}`);
			if (el) {
				el.scrollIntoView({ behavior: 'smooth', block: 'center' });
				(el as HTMLInputElement).focus();
				(el as HTMLInputElement).select();
			}
			highlightNodeId = null;
		}, 50);
	});

	function handleCardClick(forkParentId: string, childId: string, isSelected: boolean) {
		if (!isSelected) {
			store.selectBranch(forkParentId, childId);
		}
	}

	const variableNames = $derived(Object.keys(store.tree.variables ?? {}));

	function addEffect(parentId: string, childId: string) {
		const first = variableNames[0];
		if (!first) return;
		const effects = store.getEdgeVariableEffects(parentId, childId);
		store.updateEdgeVariableEffects(parentId, childId, [
			...effects,
			{ variableName: first, value: '' }
		]);
	}

	function updateEffect(parentId: string, childId: string, index: number, patch: Partial<VariableEffect>) {
		const effects = [...store.getEdgeVariableEffects(parentId, childId)];
		effects[index] = { ...effects[index], ...patch };
		store.updateEdgeVariableEffects(parentId, childId, effects);
	}

	function removeEffect(parentId: string, childId: string, index: number) {
		const effects = store.getEdgeVariableEffects(parentId, childId).filter((_, i) => i !== index);
		store.updateEdgeVariableEffects(parentId, childId, effects);
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

				{#each getAllChoices(store.tree, fork.parentId) as childId, j (childId)}
					{@const node = store.tree.nodes[childId]}
					{@const isSelected = childId === fork.selectedChildId}
					<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
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
									id="branch-label-{childId}"
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
								value={store.getEdgeChoiceText(fork.parentId, childId) ?? ''}
								placeholder="Enter choice text…"
								oninput={(e) => store.updateEdgeChoiceText(fork.parentId, childId, e.currentTarget.value)}
								onclick={(e) => e.stopPropagation()}
								onkeydown={(e) => e.stopPropagation()}
							/>
						</div>

						{#if variableNames.length > 0}
							{@const effects = store.getEdgeVariableEffects(fork.parentId, childId)}
							<div class="mt-2 pl-4">
								<div class="mb-1 text-[9px] font-semibold uppercase tracking-wider text-base-content/40">Variable effects</div>
								{#each effects as effect, idx (idx)}
									<div class="mb-1 flex items-center gap-1">
										<select
											class="effect-select"
											value={effect.variableName}
											onchange={(e) => { updateEffect(fork.parentId, childId, idx, { variableName: e.currentTarget.value }); e.stopPropagation(); }}
											onclick={(e) => e.stopPropagation()}
										>
											{#each variableNames as vname (vname)}
												<option value={vname}>${vname}</option>
											{/each}
										</select>
										<span class="text-[9px] text-base-content/30">=</span>
										{#if store.tree.variables?.[effect.variableName]?.type === 'boolean'}
											<select
												class="effect-select flex-1"
												value={String(effect.value)}
												onchange={(e) => { const v = e.currentTarget.value; updateEffect(fork.parentId, childId, idx, { value: v === '__invert__' ? '__invert__' : v === 'true' }); e.stopPropagation(); }}
												onclick={(e) => e.stopPropagation()}
											>
												<option value="false">false</option>
												<option value="true">true</option>
												<option value="__invert__">invert</option>
											</select>
										{:else}
											<input
												type="text"
												class="effect-input flex-1"
												class:field-selected={isSelected}
												class:field-other={!isSelected}
												value={String(effect.value)}
												placeholder={store.tree.variables?.[effect.variableName]?.type === 'number' ? '0 or $var + 1' : store.tree.variables?.[effect.variableName]?.type === 'string' ? '"text" or $var + " more"' : 'value'}
												oninput={(e) => updateEffect(fork.parentId, childId, idx, { value: e.currentTarget.value })}
												onclick={(e) => e.stopPropagation()}
												onkeydown={(e) => e.stopPropagation()}
											/>
										{/if}
										<button
											class="shrink-0 text-base-content/30 hover:text-error"
											onclick={(e) => { removeEffect(fork.parentId, childId, idx); e.stopPropagation(); }}
											title="Remove effect"
										>
											<span class="material-symbols-outlined" style="font-size:12px;">close</span>
										</button>
									</div>
								{/each}
								<button
									class="mt-0.5 text-[9px] text-base-content/30 hover:text-primary"
									onclick={(e) => { addEffect(fork.parentId, childId); e.stopPropagation(); }}
									onkeydown={(e) => e.stopPropagation()}
								>+ add effect</button>
							</div>
						{/if}

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

	.effect-select {
		background: oklch(from var(--color-base-200) l c h);
		border: 1px solid oklch(from var(--color-base-300) l c h);
		border-radius: 3px;
		font-size: 0.65rem;
		padding: 1px 3px;
		outline: none;
		max-width: 90px;
	}

	.effect-input {
		background: transparent;
		border: none;
		border-bottom: 1px solid oklch(from var(--color-base-300) l c h);
		outline: none;
		font-size: 0.65rem;
		padding: 1px 0;
	}

	.effect-input:focus {
		border-bottom-color: oklch(from var(--color-primary) l c h);
	}
</style>
