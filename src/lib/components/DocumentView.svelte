<script lang="ts">
	import type { StoryStore } from '../stores/story.svelte.js';
	import type { JSONContent } from '@tiptap/core';
	import NodeEditor from './NodeEditor.svelte';
	import ForkZone from './ForkZone.svelte';

	interface Props {
		store: StoryStore;
	}

	let { store }: Props = $props();

	function handleUpdate(nodeId: string, content: JSONContent) {
		store.updateContent(nodeId, content);
	}

	function handleSelectBranch(parentId: string, childId: string) {
		store.selectBranch(parentId, childId);
	}

	/**
	 * Renders the path as a sequence of nodes.
	 * At each fork point (node with multiple children), insert a ForkZone.
	 * Nodes without siblings render inline as editable.
	 */
</script>

<div class="document-view mx-auto w-full max-w-3xl px-4 py-8">
	{#each store.path as nodeId, i (nodeId)}
		{@const node = store.tree.nodes[nodeId]}
		{@const parent = node.parentId ? store.tree.nodes[node.parentId] : null}
		{@const isFork = parent && parent.childIds.length > 1}

		{#if isFork && node.parentId}
			<!-- This node is part of a fork — rendered inside a ForkZone above -->
		{:else}
			<!-- Regular node, render inline -->
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
					placeholder={i === 0 ? 'Begin your story...' : 'Continue writing...'}
				/>
			</div>
		{/if}

		<!-- If this node has multiple children, show a ForkZone after it -->
		{#if node.childIds.length > 1}
			<ForkZone
				tree={store.tree}
				parentId={nodeId}
				selections={store.selections}
				onselectbranch={handleSelectBranch}
				onupdatecontent={handleUpdate}
			/>
		{/if}
	{/each}
</div>
