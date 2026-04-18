<script lang="ts">
	import type { StoryStore } from '../stores/story.svelte.js';
	import { getAllChoices } from '../models/path.js';
	import { downloadTwee, downloadJson, downloadMarkdown } from '../export/twine.js';
	import Toolbar from './Toolbar.svelte';
	import DocumentView from './DocumentView.svelte';
	import Minimap from './Minimap.svelte';
	import StoryMapModal from './StoryMapModal.svelte';
	import BranchInfo from './BranchInfo.svelte';
	import Outline from './Outline.svelte';

	interface Props {
		store: StoryStore;
	}

	let { store }: Props = $props();

	const sidebarTabs = [
		{ id: 'map', label: 'Story Map', icon: 'map' },
		{ id: 'branch', label: 'Branch Info', icon: 'account_tree' },
		{ id: 'outline', label: 'Outline', icon: 'toc' }
	] as const;
	type SidebarTabId = (typeof sidebarTabs)[number]['id'];

	let minimapOpen = $state(true);
	let sidebarTab = $state<SidebarTabId>('map');
	const activeTab = $derived(sidebarTabs.find((t) => t.id === sidebarTab)!);
	let highlightNodeId = $state<string | null>(null);
	let mergeSourceId = $state<string | null>(null);
	let mapModalOpen = $state(false);

	function handleEditBranch(nodeId: string) {
		minimapOpen = true;
		sidebarTab = 'branch';
		highlightNodeId = nodeId;
	}

	function handleMergeStart(parentId: string) {
		mergeSourceId = parentId;
		minimapOpen = true;
		sidebarTab = 'map';
	}

	function handleMergeTarget(targetId: string) {
		if (mergeSourceId) {
			store.mergeBranch(mergeSourceId, targetId);
			mergeSourceId = null;
		}
	}

	function handleCancelMerge() {
		mergeSourceId = null;
	}

	// Word count: sum up text content across all nodes in the tree
	const wordCount = $derived(
		Object.values(store.tree.nodes).reduce((count, node) => {
			const text = extractText(node.content);
			return count + (text.trim() ? text.trim().split(/\s+/).length : 0);
		}, 0)
	);

	function extractText(content: import('@tiptap/core').JSONContent): string {
		if (content.text) return content.text;
		if (content.content) return content.content.map(extractText).join(' ');
		return '';
	}

	let activeEditor: import('@tiptap/core').Editor | null = $state(null);
	let focusedNodeId: string | null = $state(null);

	function handleEditorFocus(nodeId: string, editor: import('@tiptap/core').Editor) {
		focusedNodeId = nodeId;
		activeEditor = editor;
	}

	function handleBranch() {
		const nodeId = focusedNodeId ?? store.activeNodeId;
		const editor = activeEditor;

		if (editor && focusedNodeId === nodeId) {
			// Find which top-level block the cursor is in and split after it
			const { from } = editor.state.selection;
			let splitAfter = 0;
			let childIndex = 0;
			editor.state.doc.forEach((node, offset) => {
				// offset is relative to doc start (after the opening token),
				// but `from` is absolute — doc open token is at position 0,
				// so first child starts at offset 1 in absolute terms.
				const absStart = offset + 1;
				const absEnd = absStart + node.nodeSize;
				if (from >= absStart && from <= absEnd) {
					splitAfter = childIndex + 1;
				}
				childIndex++;
			});
			// If cursor wasn't resolved (e.g. at very start), split after first paragraph
			if (splitAfter === 0) splitAfter = 1;
			store.branch(nodeId, splitAfter);
		} else {
			// Fallback: branch at end
			const node = store.tree.nodes[nodeId];
			const paragraphCount = node.content.content?.length ?? 0;
			store.branch(nodeId, paragraphCount);
		}
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
					if (getAllChoices(store.tree, node.parentId).length > 1) {
						store.switchDirection(node.parentId, direction);
						e.preventDefault();
						return;
					}
				}
			}
		}

		// Escape to cancel merge pick mode
		if (e.key === 'Escape' && mergeSourceId) {
			handleCancelMerge();
			e.preventDefault();
			return;
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
		onexport={() => downloadTwee($state.snapshot(store.tree))}
		onexportjson={() => downloadJson($state.snapshot(store.tree))}
		onexportmarkdown={() => downloadMarkdown($state.snapshot(store.tree), $state.snapshot(store.selections))}
		title={store.tree.title}
		onupdatetitle={(t) => store.updateTitle(t)}
		{wordCount}
	/>

	<div class="flex flex-1 overflow-hidden">
		<div class="flex-1 overflow-y-auto bg-base-100">
			<DocumentView {store} oneditorfocus={handleEditorFocus} oneditbranch={handleEditBranch} onmergestart={handleMergeStart} />
		</div>

		{#if minimapOpen}
			<div class="flex w-72 shrink-0 border-l border-base-300 bg-base-200">
				<div class="flex w-10 shrink-0 flex-col border-r border-base-300 py-1">
					{#each sidebarTabs as tab (tab.id)}
						<div class="tooltip tooltip-right" data-tip={tab.label}>
							<button
								class="flex h-10 w-10 cursor-pointer items-center justify-center border-r-2 transition-colors {sidebarTab === tab.id ? 'border-primary bg-base-100 text-base-content' : 'border-transparent text-base-content/50 hover:bg-base-100/50 hover:text-base-content'}"
								onclick={() => (sidebarTab = tab.id)}
								aria-label={tab.label}
								aria-pressed={sidebarTab === tab.id}
							>
								<span class="material-symbols-outlined" style="font-size: 20px;">{tab.icon}</span>
							</button>
						</div>
					{/each}
				</div>
				<div class="flex min-w-0 flex-1 flex-col">
					<div class="flex items-center border-b border-base-300 py-1 pl-3 pr-1">
						<span class="flex-1 text-xs font-medium">{activeTab.label}</span>
						{#if sidebarTab === 'map'}
							<button
								class="btn btn-ghost btn-xs px-2"
								onclick={() => (mapModalOpen = true)}
								title="Expand story map"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
							</button>
						{/if}
						<button
							class="btn btn-ghost btn-xs px-2"
							onclick={() => (minimapOpen = false)}
							title="Close sidebar"
						>
							&times;
						</button>
					</div>
					<div class="min-h-0 flex-1 overflow-y-auto">
						{#if sidebarTab === 'map'}
							<Minimap {store} {mergeSourceId} onmergetarget={handleMergeTarget} oncancelmerge={handleCancelMerge} />
						{:else if sidebarTab === 'branch'}
							<BranchInfo {store} bind:highlightNodeId />
						{:else}
							<Outline {store} {focusedNodeId} />
						{/if}
					</div>
				</div>
			</div>
		{:else}
			<button
				class="absolute bottom-4 right-4 btn btn-secondary btn-sm"
				onclick={() => (minimapOpen = true)}
				title="Open sidebar"
			>
				Map
			</button>
		{/if}
	</div>
</div>

{#if mapModalOpen}
	<StoryMapModal
		{store}
		{mergeSourceId}
		onmergetarget={handleMergeTarget}
		oncancelmerge={handleCancelMerge}
		onclose={() => (mapModalOpen = false)}
	/>
{/if}
