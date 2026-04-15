<script lang="ts">
	import type { StoryStore } from '../stores/story.svelte.js';
	import { computeTreeLayout } from '../utils/tree-layout.js';

	interface Props {
		store: StoryStore;
		mergeSourceId?: string | null;
		onmergetarget?: (targetId: string) => void;
		oncancelmerge?: () => void;
	}

	let { store, mergeSourceId = null, onmergetarget, oncancelmerge }: Props = $props();

	const layout = $derived(computeTreeLayout(store.tree));
	const pathSet = $derived(new Set(store.path));

	// Nodes that are invalid pick targets: the source itself and all its descendants
	const invalidPickTargets = $derived(() => {
		if (!mergeSourceId) return new Set<string>();
		const invalid = new Set<string>();
		invalid.add(mergeSourceId);
		// Can't merge into own descendants
		const stack = [...(store.tree.nodes[mergeSourceId]?.childIds ?? [])];
		while (stack.length > 0) {
			const id = stack.pop()!;
			invalid.add(id);
			const node = store.tree.nodes[id];
			if (node) stack.push(...node.childIds);
		}
		return invalid;
	});

	// Merge edges: from parent nodes to their merge child targets
	const mergeEdges = $derived(
		Object.values(store.tree.nodes)
			.filter((n) => n.mergeChildIds?.length)
			.flatMap((n) => n.mergeChildIds!.filter((tid) => store.tree.nodes[tid]).map((tid) => ({ fromId: n.id, toId: tid })))
	);

	function handleNodeClick(nodeId: string) {
		if (mergeSourceId) {
			if (!invalidPickTargets().has(nodeId)) {
				onmergetarget?.(nodeId);
			}
			return;
		}

		// Normal navigation: find ancestors and set selections
		const ancestry = getAncestry(nodeId);
		for (const id of ancestry) {
			const node = store.tree.nodes[id];
			if (node.parentId) {
				store.selectBranch(node.parentId, id);
			}
		}
		store.setActiveNode(nodeId);
	}

	function handleMergeEdgeClick(fromId: string, toId: string) {
		if (mergeSourceId) return;
		// Navigate to the fork node's ancestors first, then select the merge child
		const ancestry = getAncestry(fromId);
		for (const id of ancestry) {
			const node = store.tree.nodes[id];
			if (node.parentId) {
				store.selectBranch(node.parentId, id);
			}
		}
		store.selectBranch(fromId, toId);
		store.setActiveNode(toId);
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

{#if mergeSourceId}
	<div class="flex items-center justify-between border-b border-base-300 bg-warning/10 px-3 py-2">
		<span class="text-xs text-warning-content/80">Click a node to merge into</span>
		<button class="btn btn-ghost btn-xs" onclick={oncancelmerge}>Cancel</button>
	</div>
{/if}

<div class="minimap overflow-auto p-4">
	{#if layout.nodes.length > 0}
		<svg
			width={layout.width + 20}
			height={layout.height + 20}
			viewBox="-10 0 {layout.width + 20} {layout.height + 20}"
			class="mx-auto"
		>
			<defs>
				<marker id="merge-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
					<path d="M 0 0 L 6 3 L 0 6 Z" fill="oklch(from var(--color-secondary) l c h)" />
				</marker>
			</defs>

			<!-- Tree edges -->
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

			<!-- Merge edges (dashed curved arrows bowing to the right) -->
			{#each mergeEdges as edge (edge.fromId + '-merge-' + edge.toId)}
				{@const from = layout.nodes.find((n) => n.id === edge.fromId)}
				{@const to = layout.nodes.find((n) => n.id === edge.toId)}
				{#if from && to}
					{@const bow = Math.max(40, Math.abs(to.x - from.x) + 30)}
					{@const d = `M ${from.x} ${from.y} C ${from.x + bow} ${from.y}, ${to.x + bow} ${to.y}, ${to.x + NODE_RADIUS} ${to.y}`}
					<!-- Invisible wider hit area -->
					<path
						{d}
						fill="none"
						stroke="transparent"
						stroke-width="12"
						class="cursor-pointer"
						onclick={() => handleMergeEdgeClick(edge.fromId, edge.toId)}
						role="button"
						tabindex="0"
						onkeydown={(e) => e.key === 'Enter' && handleMergeEdgeClick(edge.fromId, edge.toId)}
					/>
					<!-- Visible dashed arrow -->
					<path
						{d}
						fill="none"
						stroke="oklch(from var(--color-secondary) l c h)"
						stroke-width="1.5"
						stroke-dasharray="4 3"
						marker-end="url(#merge-arrow)"
						class="pointer-events-none"
					/>
				{/if}
			{/each}

			<!-- Nodes -->
			{#each layout.nodes as node (node.id)}
				{@const onPath = pathSet.has(node.id)}
				{@const isSource = mergeSourceId === node.id}
				{@const isInvalid = mergeSourceId ? invalidPickTargets().has(node.id) : false}
				{@const isValidTarget = mergeSourceId && !isInvalid}
				<g
					class={mergeSourceId ? (isInvalid ? 'cursor-not-allowed' : 'cursor-crosshair') : 'cursor-pointer'}
					onclick={() => handleNodeClick(node.id)}
					role="button"
					tabindex="0"
					onkeydown={(e) => e.key === 'Enter' && handleNodeClick(node.id)}
					opacity={isInvalid ? 0.3 : 1}
				>
					<circle
						cx={node.x}
						cy={node.y}
						r={NODE_RADIUS}
						fill={isSource
							? 'oklch(from var(--color-warning) l c h)'
							: isValidTarget
								? 'oklch(from var(--color-success) l c h / 0.3)'
								: onPath
									? 'oklch(from var(--color-primary) l c h)'
									: 'oklch(from var(--color-base-200) l c h)'}
						stroke={isSource
							? 'oklch(from var(--color-warning) l c h)'
							: isValidTarget
								? 'oklch(from var(--color-success) l c h)'
								: onPath
									? 'oklch(from var(--color-primary) l c h)'
									: 'oklch(from var(--color-base-300) l c h)'}
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
