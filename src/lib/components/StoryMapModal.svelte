<script lang="ts">
	import type { StoryStore } from '../stores/story.svelte.js';
	import { computeTreeLayout } from '../utils/tree-layout.js';

	interface Props {
		store: StoryStore;
		mergeSourceId?: string | null;
		onmergetarget?: (targetId: string) => void;
		oncancelmerge?: () => void;
		onclose: () => void;
	}

	let { store, mergeSourceId = null, onmergetarget, oncancelmerge, onclose }: Props = $props();

	const layout = $derived(computeTreeLayout(store.tree));
	const pathSet = $derived(new Set(store.path));

	const invalidPickTargets = $derived(() => {
		if (!mergeSourceId) return new Set<string>();
		const invalid = new Set<string>();
		invalid.add(mergeSourceId);
		const stack = [...(store.tree.nodes[mergeSourceId]?.childIds ?? [])];
		while (stack.length > 0) {
			const id = stack.pop()!;
			invalid.add(id);
			const node = store.tree.nodes[id];
			if (node) stack.push(...node.childIds);
		}
		return invalid;
	});

	const mergeEdges = $derived(
		Object.values(store.tree.nodes)
			.filter((n) => n.mergeChildIds?.length)
			.flatMap((n) => n.mergeChildIds!.filter((tid) => store.tree.nodes[tid]).map((tid) => ({ fromId: n.id, toId: tid })))
	);

	// Zoom & pan state
	let scale = $state(1);
	let panX = $state(0);
	let panY = $state(0);
	let isPanning = $state(false);
	let panStartX = $state(0);
	let panStartY = $state(0);
	let panStartPanX = $state(0);
	let panStartPanY = $state(0);
	let container: HTMLDivElement | undefined = $state();

	const MIN_SCALE = 0.25;
	const MAX_SCALE = 3;
	const NODE_RADIUS = 10;

	function zoomIn() {
		scale = Math.min(MAX_SCALE, scale * 1.25);
	}

	function zoomOut() {
		scale = Math.max(MIN_SCALE, scale / 1.25);
	}

	function resetView() {
		scale = 1;
		panX = 0;
		panY = 0;
	}

	function fitToView() {
		if (!container || layout.nodes.length === 0) return;
		const rect = container.getBoundingClientRect();
		const padding = 60;
		const scaleX = (rect.width - padding * 2) / (layout.width + 40);
		const scaleY = (rect.height - padding * 2) / (layout.height + 40);
		scale = Math.min(scaleX, scaleY, MAX_SCALE);
		panX = (rect.width - (layout.width + 20) * scale) / 2;
		panY = (rect.height - (layout.height + 20) * scale) / 2;
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const delta = e.deltaY > 0 ? 1 / 1.1 : 1.1;
		const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * delta));

		// Zoom toward cursor position
		if (container) {
			const rect = container.getBoundingClientRect();
			const mx = e.clientX - rect.left;
			const my = e.clientY - rect.top;
			panX = mx - ((mx - panX) / scale) * newScale;
			panY = my - ((my - panY) / scale) * newScale;
		}

		scale = newScale;
	}

	function handlePointerDown(e: PointerEvent) {
		// Only pan on middle-click or when clicking the background (not nodes)
		if (e.button === 1 || (e.button === 0 && (e.target as HTMLElement).closest('.map-bg'))) {
			isPanning = true;
			panStartX = e.clientX;
			panStartY = e.clientY;
			panStartPanX = panX;
			panStartPanY = panY;
			(e.target as HTMLElement).setPointerCapture(e.pointerId);
			e.preventDefault();
		}
	}

	function handlePointerMove(e: PointerEvent) {
		if (!isPanning) return;
		panX = panStartPanX + (e.clientX - panStartX);
		panY = panStartPanY + (e.clientY - panStartY);
	}

	function handlePointerUp() {
		isPanning = false;
	}

	function handleNodeClick(nodeId: string) {
		if (mergeSourceId) {
			if (!invalidPickTargets().has(nodeId)) {
				onmergetarget?.(nodeId);
			}
			return;
		}

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

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (mergeSourceId) {
				oncancelmerge?.();
			} else {
				onclose();
			}
			e.preventDefault();
			e.stopPropagation();
		}
	}

	// Fit to view on mount
	$effect(() => {
		if (container && layout.nodes.length > 0) {
			// Run on next tick so container has its dimensions
			requestAnimationFrame(() => fitToView());
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="fixed inset-0 z-50 flex flex-col bg-base-100">
	<!-- Header bar -->
	<div class="flex items-center justify-between border-b border-base-300 bg-base-200 px-4 py-2">
		<div class="flex items-center gap-3">
			<h2 class="text-sm font-semibold">Story Map</h2>
			{#if mergeSourceId}
				<span class="badge badge-warning badge-sm">Click a node to merge into</span>
				<button class="btn btn-ghost btn-xs" onclick={oncancelmerge}>Cancel merge</button>
			{/if}
		</div>

		<div class="flex items-center gap-1">
			<button class="btn btn-ghost btn-sm" onclick={zoomOut} title="Zoom out">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
			</button>
			<span class="min-w-12 text-center text-xs text-base-content/70">{Math.round(scale * 100)}%</span>
			<button class="btn btn-ghost btn-sm" onclick={zoomIn} title="Zoom in">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
			</button>
			<div class="divider divider-horizontal mx-1"></div>
			<button class="btn btn-ghost btn-sm" onclick={fitToView} title="Fit to view">Fit</button>
			<button class="btn btn-ghost btn-sm" onclick={resetView} title="Reset zoom">1:1</button>
			<div class="divider divider-horizontal mx-1"></div>
			<button class="btn btn-ghost btn-sm" onclick={onclose} title="Close (Esc)">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
			</button>
		</div>
	</div>

	<!-- Map viewport -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		bind:this={container}
		class="relative flex-1 overflow-hidden {isPanning ? 'cursor-grabbing' : 'cursor-grab'}"
		onwheel={handleWheel}
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
	>
		{#if layout.nodes.length > 0}
			<svg
				class="map-bg absolute inset-0 h-full w-full"
				style="touch-action: none;"
			>
				<g transform="translate({panX}, {panY}) scale({scale})">
					<defs>
						<marker id="modal-merge-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
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

					<!-- Merge edges -->
					{#each mergeEdges as edge (edge.fromId + '-merge-' + edge.toId)}
						{@const from = layout.nodes.find((n) => n.id === edge.fromId)}
						{@const to = layout.nodes.find((n) => n.id === edge.toId)}
						{#if from && to}
							{@const bow = Math.max(40, Math.abs(to.x - from.x) + 30)}
							{@const d = `M ${from.x} ${from.y} C ${from.x + bow} ${from.y}, ${to.x + bow} ${to.y}, ${to.x + NODE_RADIUS} ${to.y}`}
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
							<path
								{d}
								fill="none"
								stroke="oklch(from var(--color-secondary) l c h)"
								stroke-width="1.5"
								stroke-dasharray="4 3"
								marker-end="url(#modal-merge-arrow)"
								class="pointer-events-none"
							/>
						{/if}
					{/each}

					<!-- Nodes -->
					{#each layout.nodes as node (node.id)}
						{@const onPath = pathSet.has(node.id)}
						{@const isActive = store.activeNodeId === node.id}
						{@const isSource = mergeSourceId === node.id}
						{@const isInvalid = mergeSourceId ? invalidPickTargets().has(node.id) : false}
						{@const isValidTarget = mergeSourceId && !isInvalid}
						<g
							class={mergeSourceId ? (isInvalid ? 'cursor-not-allowed' : 'cursor-crosshair') : 'cursor-pointer'}
							onclick={(e) => { e.stopPropagation(); handleNodeClick(node.id); }}
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
								stroke={isActive
									? 'oklch(from var(--color-accent) l c h)'
									: isSource
										? 'oklch(from var(--color-warning) l c h)'
										: isValidTarget
											? 'oklch(from var(--color-success) l c h)'
											: onPath
												? 'oklch(from var(--color-primary) l c h)'
												: 'oklch(from var(--color-base-300) l c h)'}
								stroke-width={isActive ? 3 : 2}
							/>
							{#if node.label}
								<text
									x={node.x}
									y={node.y + NODE_RADIUS + 14}
									text-anchor="middle"
									class="text-[11px]"
									fill="oklch(from var(--color-base-content) l c h / 0.7)"
								>
									{node.label.length > 20 ? node.label.slice(0, 20) + '...' : node.label}
								</text>
							{/if}
						</g>
					{/each}
				</g>
			</svg>
		{:else}
			<div class="flex h-full items-center justify-center">
				<p class="text-base-content/50">Start writing to see your story map</p>
			</div>
		{/if}
	</div>
</div>
