<script lang="ts">
	import type { JSONContent } from '@tiptap/core';
	import NodeEditor from './NodeEditor.svelte';
	import NodePreview from './NodePreview.svelte';

	interface Props {
		content: JSONContent;
		label?: string;
		active: boolean;
		onactivate: () => void;
		onupdate: (content: JSONContent) => void;
	}

	let { content, label, active, onactivate, onupdate }: Props = $props();
</script>

<div
	class="branch-card flex-shrink-0 snap-center rounded-lg border-2 transition-all duration-300"
	class:branch-active={active}
	class:branch-preview={!active}
	style="width: min(100%, 42rem);"
>
	{#if label}
		<div
			class="border-b border-base-300 px-3 py-1 text-xs font-medium"
			class:opacity-100={active}
			class:opacity-50={!active}
		>
			{label}
		</div>
	{/if}

	{#if active}
		<div class="p-4">
			<NodeEditor {content} {onupdate} />
		</div>
	{:else}
		<button
			class="group block w-full cursor-pointer p-4 text-left"
			onclick={onactivate}
		>
			<NodePreview {content} />
			<div
				class="mt-2 text-center text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100"
			>
				Click to edit this branch
			</div>
		</button>
	{/if}
</div>

<style>
	.branch-active {
		border-color: oklch(from var(--color-primary) l c h);
		opacity: 1;
		transform: scale(1);
		box-shadow: 0 0 0 1px oklch(from var(--color-primary) l c h / 0.2);
	}

	.branch-preview {
		border-color: oklch(from var(--color-base-300) l c h);
		opacity: 0.6;
		transform: scale(0.95);
	}

	.branch-preview:hover {
		opacity: 0.8;
		border-color: oklch(from var(--color-accent) l c h);
	}
</style>
