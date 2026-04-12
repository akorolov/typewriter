<script lang="ts">
	import { onMount } from 'svelte';
	import type { JSONContent, Editor } from '@tiptap/core';
	import { createEditor } from '../editor/tiptap.js';

	interface Props {
		content: JSONContent;
		onupdate: (content: JSONContent) => void;
		onfocus?: (editor: Editor) => void;
		placeholder?: string;
		editable?: boolean;
	}

	let {
		content,
		onupdate,
		onfocus,
		placeholder = 'Start writing...',
		editable = true
	}: Props = $props();

	let editorElement: HTMLDivElement | undefined = $state();
	let editor: Editor | undefined = $state();

	onMount(() => {
		if (!editorElement) return;

		editor = createEditor(editorElement, {
			content,
			onUpdate: onupdate,
			onFocus: onfocus,
			placeholder,
			editable
		});

		return () => {
			editor?.destroy();
		};
	});

	$effect(() => {
		if (editor && editor.isEditable !== editable) {
			editor.setEditable(editable);
		}
	});

	// Sync TipTap content when the stored node content changes externally
	// (e.g. after splitNode truncates the node during branching).
	// We compare JSON strings to avoid re-setting on every keystroke.
	$effect(() => {
		if (!editor) return;
		const incoming = JSON.stringify(content);
		const current = JSON.stringify(editor.getJSON());
		if (incoming !== current) {
			editor.commands.setContent(content, { emitUpdate: false });
		}
	});

	export function getEditor(): Editor | undefined {
		return editor;
	}
</script>

<div
	class="node-editor prose prose-sm max-w-none focus-within:outline-none sm:prose-base"
	bind:this={editorElement}
></div>

<style>
	.node-editor :global(.tiptap) {
		outline: none;
		min-height: 1.5em;
	}

	.node-editor :global(.tiptap p.is-editor-empty:first-child::before) {
		content: attr(data-placeholder);
		float: left;
		color: oklch(from var(--color-base-content) l c h / 0.35);
		pointer-events: none;
		height: 0;
	}
</style>
