<script lang="ts">
	import type { StoryTree, BranchSelections } from '../models/story.js';
	import type { JSONContent } from '@tiptap/core';
	import { getSelectedIndex } from '../models/path.js';
	import BranchCard from './BranchCard.svelte';

	interface Props {
		tree: StoryTree;
		parentId: string;
		selections: BranchSelections;
		onselectbranch: (parentId: string, childId: string) => void;
		onupdatecontent: (nodeId: string, content: JSONContent) => void;
	}

	let { tree, parentId, selections, onselectbranch, onupdatecontent }: Props = $props();

	let scrollContainer: HTMLDivElement | undefined = $state();

	const parent = $derived(tree.nodes[parentId]);
	const selectedIndex = $derived(getSelectedIndex(tree, selections, parentId));
	const selectedChildId = $derived(parent.childIds[selectedIndex]);

	$effect(() => {
		// Scroll to the active branch when selection changes
		if (scrollContainer && selectedIndex >= 0) {
			const cards = scrollContainer.children;
			if (cards[selectedIndex]) {
				(cards[selectedIndex] as HTMLElement).scrollIntoView({
					behavior: 'smooth',
					block: 'nearest',
					inline: 'center'
				});
			}
		}
	});
</script>

<div class="fork-zone my-4">
	<div class="mb-2 flex items-center gap-2 px-2">
		<div class="h-px flex-1 bg-accent/30"></div>
		<span class="text-xs font-medium text-accent">
			Branch {selectedIndex + 1} of {parent.childIds.length}
		</span>
		<div class="h-px flex-1 bg-accent/30"></div>
	</div>

	<div
		class="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2"
		bind:this={scrollContainer}
		style="scroll-padding: 1rem;"
	>
		{#each parent.childIds as childId, i (childId)}
			<BranchCard
				content={tree.nodes[childId].content}
				label={tree.nodes[childId].label}
				active={childId === selectedChildId}
				onactivate={() => onselectbranch(parentId, childId)}
				onupdate={(content) => onupdatecontent(childId, content)}
			/>
		{/each}
	</div>
</div>
