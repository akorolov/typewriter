<script lang="ts">
	import type { StoryStore } from '../stores/story.svelte.js';
	import { extractOutline } from '../models/outline.js';

	interface Props {
		store: StoryStore;
		focusedNodeId?: string | null;
	}

	let { store, focusedNodeId = null }: Props = $props();

	const entries = $derived(extractOutline(store.path, store.tree));

	function scrollToNode(nodeId: string) {
		const el = document.querySelector(`[data-node-id="${nodeId}"]`);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}
</script>

<div class="outline p-3">
	<div class="mb-2 text-[10px] font-semibold uppercase tracking-wider text-base-content/40">
		Document Outline
	</div>

	{#if entries.length === 0}
		<p class="text-center text-xs text-base-content/40">No content yet.</p>
	{:else}
		<ul class="menu menu-xs w-full gap-0.5 p-0">
			{#each entries as entry (entry.nodeId)}
				{@const isActive = entry.nodeId === focusedNodeId}
				{@const hasContent = entry.label || entry.headings.length > 0 || entry.preview}

				{#if hasContent}
					<li>
						<!-- Node label row -->
						{#if entry.label}
							<button
								class="outline-entry flex items-center gap-1.5 rounded-md px-2 py-1"
								class:active={isActive}
								onclick={() => scrollToNode(entry.nodeId)}
							>
								<span class="truncate text-xs font-medium">{entry.label}</span>
								{#if entry.isFork}
									<span class="badge badge-ghost badge-xs shrink-0 font-mono text-[9px]">
										⑂ {entry.selectedIndex + 1}/{entry.branchCount}
									</span>
								{/if}
							</button>
						{/if}

						<!-- Headings within this node -->
						{#each entry.headings as heading}
							<button
								class="outline-entry flex items-center rounded-md px-2 py-0.5"
								class:active={isActive}
								class:pl-4={heading.level === 1}
								class:pl-6={heading.level === 2}
								class:pl-8={heading.level === 3}
								onclick={() => scrollToNode(entry.nodeId)}
							>
								<span class="truncate text-[11px]" class:font-semibold={heading.level === 1}>
									{heading.text}
								</span>
							</button>
						{/each}

						<!-- Preview fallback (no label, no headings) -->
						{#if !entry.label && entry.headings.length === 0 && entry.preview}
							<button
								class="outline-entry flex items-center gap-1.5 rounded-md px-2 py-1"
								class:active={isActive}
								onclick={() => scrollToNode(entry.nodeId)}
							>
								<span class="truncate text-[11px] italic text-base-content/40">
									{entry.preview}
								</span>
								{#if entry.isFork}
									<span class="badge badge-ghost badge-xs shrink-0 font-mono text-[9px]">
										⑂ {entry.selectedIndex + 1}/{entry.branchCount}
									</span>
								{/if}
							</button>
						{/if}
					</li>
				{/if}
			{/each}
		</ul>
	{/if}
</div>

<style>
	.outline-entry {
		width: 100%;
		text-align: left;
		background: transparent;
		border: none;
		cursor: pointer;
		transition: background-color 0.15s;
	}

	.outline-entry:hover {
		background-color: oklch(from var(--color-base-300) l c h / 0.6);
	}

	.outline-entry.active {
		background-color: oklch(from var(--color-primary) l c h / 0.12);
		border-left: 2px solid oklch(from var(--color-primary) l c h);
	}
</style>
