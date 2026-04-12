<script lang="ts">
	import type { StoryStore } from '../stores/story.svelte.js';
	import Toolbar from './Toolbar.svelte';
	import DocumentView from './DocumentView.svelte';
	import Minimap from './Minimap.svelte';

	interface Props {
		store: StoryStore;
	}

	let { store }: Props = $props();
	let minimapOpen = $state(true);

	// Word count: sum up text content across all nodes in the current path
	const wordCount = $derived(
		store.path.reduce((count, nodeId) => {
			const node = store.tree.nodes[nodeId];
			const text = extractText(node.content);
			return count + (text.trim() ? text.trim().split(/\s+/).length : 0);
		}, 0)
	);

	function extractText(content: import('@tiptap/core').JSONContent): string {
		if (content.text) return content.text;
		if (content.content) return content.content.map(extractText).join(' ');
		return '';
	}

	// Get the active editor for the toolbar
	// For now, we'll pass null — the toolbar buttons will use the editor's own commands
	// In a future iteration, we can wire this up more tightly
	let activeEditor: import('@tiptap/core').Editor | null = $state(null);

	function handleBranch() {
		const activeId = store.activeNodeId;
		const node = store.tree.nodes[activeId];
		// Branch at end of current node
		const paragraphCount = node.content.content?.length ?? 0;
		store.branch(activeId, paragraphCount);
	}

	function handleKeydown(e: KeyboardEvent) {
		// Ctrl+Arrow left/right to switch branches
		if (e.ctrlKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
			const direction = e.key === 'ArrowLeft' ? 'prev' : 'next';

			// Find the nearest fork point on the current path
			const path = store.path;
			for (let i = path.length - 1; i >= 0; i--) {
				const nodeId = path[i];
				const node = store.tree.nodes[nodeId];
				if (node.parentId) {
					const parent = store.tree.nodes[node.parentId];
					if (parent.childIds.length > 1) {
						store.switchDirection(node.parentId, direction);
						e.preventDefault();
						return;
					}
				}
			}
		}

		// Ctrl+S to save
		if (e.ctrlKey && e.key === 's') {
			e.preventDefault();
			store.forceSave();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex h-full flex-col">
	<Toolbar
		editor={activeEditor}
		onbranch={handleBranch}
		title={store.tree.title}
		onupdatetitle={(t) => store.updateTitle(t)}
		{wordCount}
	/>

	<div class="flex flex-1 overflow-hidden">
		<div class="flex-1 overflow-y-auto bg-base-100">
			<DocumentView {store} />
		</div>

		{#if minimapOpen}
			<div class="w-64 shrink-0 border-l border-base-300 bg-base-200">
				<div class="flex items-center justify-between border-b border-base-300 px-3 py-1.5">
					<span class="text-xs font-medium text-base-content/70">Story Map</span>
					<button
						class="btn btn-ghost btn-xs"
						onclick={() => (minimapOpen = false)}
						title="Close minimap"
					>
						&times;
					</button>
				</div>
				<Minimap {store} />
			</div>
		{:else}
			<button
				class="absolute bottom-4 right-4 btn btn-secondary btn-sm"
				onclick={() => (minimapOpen = true)}
				title="Open story map"
			>
				Map
			</button>
		{/if}
	</div>
</div>
