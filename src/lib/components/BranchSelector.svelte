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
		onrename?: (nodeId: string, label: string) => void;
	}

	let { tree, parentId, selections, onselectbranch, onaddbranch, onremovebranch, onrename }: Props =
		$props();

	const parent = $derived(tree.nodes[parentId]);
	const selectedIndex = $derived(getSelectedIndex(tree, selections, parentId));

	// Context menu state
	let contextMenu = $state<{ x: number; y: number; childId: string; index: number } | null>(null);

	// Rename state
	let renamingId = $state<string | null>(null);
	let renameValue = $state('');
	let renameInput = $state<HTMLInputElement | null>(null);

	// Delete confirmation state
	let confirmDeleteId = $state<string | null>(null);

	function handleContextMenu(e: MouseEvent, childId: string, index: number) {
		e.preventDefault();
		contextMenu = { x: e.clientX, y: e.clientY, childId, index };
	}

	function closeContextMenu() {
		contextMenu = null;
	}

	function startRename(childId: string) {
		const node = tree.nodes[childId];
		renameValue = node.label ?? '';
		renamingId = childId;
		closeContextMenu();
		// Focus the input after it renders
		requestAnimationFrame(() => {
			renameInput?.focus();
			renameInput?.select();
		});
	}

	function commitRename() {
		if (renamingId && onrename && renameValue.trim()) {
			onrename(renamingId, renameValue.trim());
		}
		renamingId = null;
		renameValue = '';
	}

	function cancelRename() {
		renamingId = null;
		renameValue = '';
	}

	function handleRenameKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			commitRename();
		} else if (e.key === 'Escape') {
			cancelRename();
		}
	}

	function requestDelete(childId: string) {
		closeContextMenu();
		confirmDeleteId = childId;
	}

	function confirmDelete() {
		if (confirmDeleteId && onremovebranch) {
			onremovebranch(confirmDeleteId);
		}
		confirmDeleteId = null;
	}

	function cancelDelete() {
		confirmDeleteId = null;
	}
</script>

<svelte:window
	onclick={closeContextMenu}
	onkeydown={(e) => {
		if (e.key === 'Escape') {
			closeContextMenu();
			cancelDelete();
		}
	}}
/>

<div class="branch-selector my-6">
	<div class="flex items-center gap-2 px-2">
		<div class="h-px flex-1 bg-accent/30"></div>
		<div class="flex items-center gap-1">
			{#each parent.childIds as childId, i (childId)}
				{@const node = tree.nodes[childId]}
				{@const isSelected = i === selectedIndex}
				{#if renamingId === childId}
					<input
						bind:this={renameInput}
						type="text"
						class="branch-rename-input rounded-full border border-primary px-3 py-0.5 text-xs font-medium outline-none"
						bind:value={renameValue}
						onkeydown={handleRenameKeydown}
						onblur={commitRename}
					/>
				{:else}
					<button
						class="branch-tab rounded-full px-3 py-0.5 text-xs font-medium transition-all"
						class:branch-tab-active={isSelected}
						class:branch-tab-inactive={!isSelected}
						onclick={() => onselectbranch(parentId, childId)}
						oncontextmenu={(e) => handleContextMenu(e, childId, i)}
						title={node.label ?? `Branch ${i + 1}`}
					>
						{node.label ?? `Branch ${i + 1}`}
					</button>
				{/if}
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
		</div>
		<div class="h-px flex-1 bg-accent/30"></div>
	</div>
</div>

<!-- Context menu -->
{#if contextMenu}
	{@const canDelete = parent.childIds.length > 1}
	{@const menuChildId = contextMenu.childId}
	<div
		class="context-menu fixed z-50 min-w-36 rounded-lg border border-base-300 bg-base-100 py-1 shadow-lg"
		style="left: {contextMenu.x}px; top: {contextMenu.y}px;"
		role="menu"
	>
		<button
			class="context-menu-item flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-base-200"
			role="menuitem"
			onclick={() => startRename(menuChildId)}
		>
			Rename
		</button>
		{#if canDelete}
			<button
				class="context-menu-item flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-error hover:bg-base-200"
				role="menuitem"
				onclick={() => requestDelete(menuChildId)}
			>
				Delete
			</button>
		{/if}
	</div>
{/if}

<!-- Delete confirmation dialog -->
{#if confirmDeleteId}
	{@const deleteNode = tree.nodes[confirmDeleteId]}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
		<div class="w-80 rounded-lg border border-base-300 bg-base-100 p-5 shadow-xl">
			<h3 class="text-sm font-semibold">Delete branch?</h3>
			<p class="mt-2 text-sm text-base-content/70">
				This will permanently delete
				<strong>{deleteNode?.label ?? 'this branch'}</strong>
				and all its content. This cannot be undone.
			</p>
			<div class="mt-4 flex justify-end gap-2">
				<button class="btn btn-ghost btn-sm" onclick={cancelDelete}>Cancel</button>
				<button class="btn btn-error btn-sm" onclick={confirmDelete}>Delete</button>
			</div>
		</div>
	</div>
{/if}

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

	.branch-rename-input {
		width: 8rem;
		background-color: oklch(from var(--color-base-100) l c h);
		color: oklch(from var(--color-base-content) l c h);
	}
</style>
