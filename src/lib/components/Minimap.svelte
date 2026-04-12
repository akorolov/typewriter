<script lang="ts">
	import type { StoryStore } from '../stores/story.svelte.js';
	import { computeTreeLayout } from '../utils/tree-layout.js';
	import { resolvePath } from '../models/path.js';

	interface Props {
		store: StoryStore;
	}

	let { store }: Props = $props();

	const layout = $derived(computeTreeLayout(store.tree));
	const pathSet = $derived(new Set(store.path));

	function handleNodeClick(nodeId: string) {
		// Navigate to this node's path by finding its ancestors and setting selections
		const ancestry = getAncestry(nodeId);

		// Set selections for each fork along the way
		for (const id of ancestry) {
			const node = store.tree.nodes[id];
			if (node.parentId) {
				store.selectBranch(node.parentId, id);
			}
		}
		store.setActiveNode(nodeId);
	}

	function getAncestry(nodeId: string): string[] {
		const path: string[] = [];
		let current: string | null = nodeId;
		while (current) {
			path.unshift(current);
			current = store.tree.nodes[current]?.parentId ?? null;
		}
		return path;
	}

	const NODE_RADIUS = 8;
</script>

<div class="minimap overflow-auto p-4">
	{#if layout.nodes.length > 0}
		<svg
			width={layout.width + 20}
			height={layout.height + 20}
			viewBox="-10 0 {layout.width + 20} {layout.height + 20}"
			class="mx-auto"
		>
			<!-- Edges -->
			{#each layout.edges as edge (edge.fromId + '-' + edge.toId)}
				{@const from = layout.nodes.find((n) => n.id === edge.fromId)}
				{@const to = layout.nodes.find((n) => n.id === edge.toId)}
				{#if from && to}
					<path
						d="M {from.x} {from.y + NODE_RADIUS} C {from.x} {(from.y + to.y) / 2}, {to.x} {(from.y + to.y) / 2}, {to.x} {to.y - NODE_RADIUS}"
						fill="none"
						stroke={pathSet.has(edge.fromId) && pathSet.has(edge.toId) ? 'oklch(from var(--color-primary) l c h)' : 'oklch(from var(--color-base-300) l c h)'}
						stroke-width={pathSet.has(edge.fromId) && pathSet.has(edge.toId) ? 2.5 : 1.5}
					/>
				{/if}
			{/each}

			<!-- Nodes -->
			{#each layout.nodes as node (node.id)}
				{@const onPath = pathSet.has(node.id)}
				<g
					class="cursor-pointer"
					onclick={() => handleNodeClick(node.id)}
					role="button"
					tabindex="0"
					onkeydown={(e) => e.key === 'Enter' && handleNodeClick(node.id)}
				>
					<circle
						cx={node.x}
						cy={node.y}
						r={NODE_RADIUS}
						fill={onPath ? 'oklch(from var(--color-primary) l c h)' : 'oklch(from var(--color-base-200) l c h)'}
						stroke={onPath ? 'oklch(from var(--color-primary) l c h)' : 'oklch(from var(--color-base-300) l c h)'}
						stroke-width="2"
					/>
					{#if node.label}
						<text
							x={node.x}
							y={node.y + NODE_RADIUS + 12}
							text-anchor="middle"
							class="text-[9px]"
							fill="oklch(from var(--color-base-content) l c h / 0.6)"
						>
							{node.label.length > 12 ? node.label.slice(0, 12) + '...' : node.label}
						</text>
					{/if}
				</g>
			{/each}
		</svg>
	{:else}
		<p class="text-center text-sm text-base-content/50">Start writing to see your story map</p>
	{/if}
</div>
