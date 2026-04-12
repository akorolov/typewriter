<script lang="ts">
	import type { StoryStore } from '../stores/story.svelte.js';
	import type { JSONContent, Editor } from '@tiptap/core';
	import { getAllChoices } from '../models/path.js';
	import NodeEditor from './NodeEditor.svelte';
	import BranchSelector from './BranchSelector.svelte';

	interface Props {
		store: StoryStore;
		oneditorfocus?: (nodeId: string, editor: Editor) => void;
		oneditbranch?: (nodeId: string) => void;
		onmergestart?: (parentId: string) => void;
	}

	let { store, oneditorfocus, oneditbranch, onmergestart }: Props = $props();

	function handleUpdate(nodeId: string, content: JSONContent) {
		store.updateContent(nodeId, content);
	}

	function handleSelectBranch(parentId: string, childId: string) {
		store.selectBranch(parentId, childId);
	}

	function handleAddBranch(parentId: string) {
		store.addSiblingBranch(parentId);
	}

	function handleRemoveBranch(nodeId: string) {
		store.removeBranch(nodeId);
	}

	function handleRename(nodeId: string, label: string) {
		store.updateNodeLabel(nodeId, label);
	}
</script>

<div class="document-view mx-auto w-full max-w-3xl px-4 py-8">
	{#each store.path as nodeId, i (nodeId + '-' + i)}
		{@const node = store.tree.nodes[nodeId]}
		{@const prevNodeId = i > 0 ? store.path[i - 1] : null}
		{@const arrivedViaMerge = prevNodeId != null && (store.tree.nodes[prevNodeId]?.mergeChildIds ?? []).includes(nodeId)}

		{#if arrivedViaMerge && prevNodeId}
			<!-- Show the fork selector from the node that offered the merge choice (read-only merge-point style) -->
			<BranchSelector
				tree={store.tree}
				parentId={prevNodeId}
				selections={store.selections}
				onselectbranch={handleSelectBranch}
				mergePoint={true}
			/>
		{:else if node.parentId}
			{@const parent = store.tree.nodes[node.parentId]}
			{@const isFork = parent && getAllChoices(store.tree, node.parentId).length > 1}
			{#if isFork}
				<BranchSelector
					tree={store.tree}
					parentId={node.parentId}
					selections={store.selections}
					onselectbranch={handleSelectBranch}
					onaddbranch={handleAddBranch}
					onremovebranch={handleRemoveBranch}
					onrename={handleRename}
					onedit={oneditbranch}
					onmergestart={onmergestart}
					onclearmerge={(parentId, targetId) => store.clearMergeChild(parentId, targetId)}
				/>
			{/if}
		{/if}

		<!-- Render every node inline -->
		<div
			class="node-block"
			role="button"
			tabindex="0"
			onclick={() => store.setActiveNode(nodeId)}
			onkeydown={() => {}}
		>
			<NodeEditor
				content={node.content}
				onupdate={(content) => handleUpdate(nodeId, content)}
				onfocus={(editor) => oneditorfocus?.(nodeId, editor)}
				placeholder={i === 0 ? 'Begin your story...' : 'Continue writing...'}
			/>
		</div>
	{/each}
</div>
