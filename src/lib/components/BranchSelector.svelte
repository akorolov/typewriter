<script lang="ts">
	import type { StoryTree, BranchSelections } from '../models/story.js';
	import { getSelectedIndex } from '../models/path.js';

	interface Props {
		tree: StoryTree;
		parentId: string;
		selections: BranchSelections;
		onselectbranch: (parentId: string, childId: string) => void;
		onaddbranch?: (parentId: string) => void;
		onremovebranch?: (nodeId: string) => void;
	}

	let { tree, parentId, selections, onselectbranch, onaddbranch, onremovebranch }: Props =
		$props();

	const parent = $derived(tree.nodes[parentId]);
	const selectedIndex = $derived(getSelectedIndex(tree, selections, parentId));
</script>

<div class="branch-selector my-6">
	<div class="flex items-center gap-2 px-2">
		<div class="h-px flex-1 bg-accent/30"></div>
		<div class="flex items-center gap-1">
			{#each parent.childIds as childId, i (childId)}
				{@const node = tree.nodes[childId]}
				{@const isSelected = i === selectedIndex}
				<button
					class="branch-tab rounded-full px-3 py-0.5 text-xs font-medium transition-all"
					class:branch-tab-active={isSelected}
					class:branch-tab-inactive={!isSelected}
					onclick={() => onselectbranch(parentId, childId)}
					title={node.label ?? `Branch ${i + 1}`}
				>
					{node.label ?? `Branch ${i + 1}`}
				</button>
			{/each}
			{#if onaddbranch}
				<button
					class="btn btn-ghost btn-xs rounded-full px-2 text-accent/60 hover:text-accent"
					title="Add branch"
					onclick={() => onaddbranch(parentId)}
				>
					+
				</button>
			{/if}
			{#if onremovebranch && parent.childIds.length > 2}
				<button
					class="btn btn-ghost btn-xs rounded-full px-2 text-error/40 hover:text-error"
					title="Remove current branch"
					onclick={() => onremovebranch(parent.childIds[selectedIndex])}
				>
					&times;
				</button>
			{/if}
		</div>
		<div class="h-px flex-1 bg-accent/30"></div>
	</div>
</div>

<style>
	.branch-tab-active {
		background-color: oklch(from var(--color-primary) l c h);
		color: oklch(from var(--color-primary-content) l c h);
	}

	.branch-tab-inactive {
		background-color: oklch(from var(--color-base-200) l c h);
		color: oklch(from var(--color-base-content) l c h / 0.6);
	}

	.branch-tab-inactive:hover {
		background-color: oklch(from var(--color-base-300) l c h);
		color: oklch(from var(--color-base-content) l c h);
	}
</style>
