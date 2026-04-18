<script lang="ts">
	import { onMount } from 'svelte';
	import type { JSONContent, Editor } from '@tiptap/core';
	import { createEditor } from '../editor/tiptap.js';
	import { insertVariableMention, type SuggestionState } from '../editor/VariableMention.js';

	interface Props {
		content: JSONContent;
		onupdate: (content: JSONContent) => void;
		onfocus?: (editor: Editor) => void;
		placeholder?: string;
		editable?: boolean;
		variables?: string[];
	}

	let {
		content,
		onupdate,
		onfocus,
		placeholder = 'Start writing...',
		editable = true,
		variables = []
	}: Props = $props();

	let editorElement: HTMLDivElement | undefined = $state();
	let editor: Editor | undefined = $state();

	let suggestion: SuggestionState | null = $state(null);
	let selectedIndex = $state(0);

	const filteredVars = $derived(
		variables.filter((v) => !suggestion?.query || v.toLowerCase().startsWith(suggestion.query.toLowerCase()))
	);

	$effect(() => {
		// Reset selection when filter changes
		selectedIndex = 0;
	});

	function handleSuggestionKeyDown(event: KeyboardEvent): boolean {
		if (!suggestion) return false;
		if (event.key === 'ArrowDown') {
			selectedIndex = (selectedIndex + 1) % Math.max(filteredVars.length, 1);
			return true;
		}
		if (event.key === 'ArrowUp') {
			selectedIndex = (selectedIndex - 1 + Math.max(filteredVars.length, 1)) % Math.max(filteredVars.length, 1);
			return true;
		}
		if (event.key === 'Enter' || event.key === 'Tab') {
			const name = filteredVars[selectedIndex];
			if (name && editor && suggestion) {
				insertVariableMention(editor, name, suggestion.from, suggestion.to);
				suggestion = null;
			}
			return !!name;
		}
		if (event.key === 'Escape') {
			suggestion = null;
			return true;
		}
		return false;
	}

	function selectVariable(name: string) {
		if (editor && suggestion) {
			insertVariableMention(editor, name, suggestion.from, suggestion.to);
			suggestion = null;
		}
	}

	onMount(() => {
		if (!editorElement) return;

		editor = createEditor(editorElement, {
			content,
			onUpdate: onupdate,
			onFocus: onfocus,
			placeholder,
			editable,
			onSuggestionChange: (s) => { suggestion = s; },
			onSuggestionKeyDown: handleSuggestionKeyDown
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

{#if suggestion && filteredVars.length > 0}
	<div
		class="variable-suggestion"
		style="left: {suggestion.coords.left}px; top: {suggestion.coords.bottom + 4}px;"
	>
		{#each filteredVars as name, i (name)}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="suggestion-item"
				class:suggestion-item-active={i === selectedIndex}
				onmousedown={(e) => { e.preventDefault(); selectVariable(name); }}
			>
				<span class="suggestion-sigil">$</span>{name}
			</div>
		{/each}
	</div>
{/if}

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

	.node-editor :global(span[data-variable]) {
		display: inline-flex;
		align-items: center;
		background: oklch(from var(--color-primary) l c h / 0.15);
		border: 1px solid oklch(from var(--color-primary) l c h / 0.35);
		border-radius: 3px;
		padding: 0 4px;
		font-size: 0.85em;
		font-family: monospace;
		color: oklch(from var(--color-primary) l c h);
		white-space: nowrap;
		user-select: none;
	}

	.variable-suggestion {
		position: fixed;
		z-index: 1000;
		background: oklch(from var(--color-base-100) l c h);
		border: 1px solid oklch(from var(--color-base-300) l c h);
		border-radius: 6px;
		box-shadow: 0 4px 12px oklch(from var(--color-base-content) l c h / 0.12);
		min-width: 140px;
		max-width: 220px;
		max-height: 200px;
		overflow-y: auto;
		padding: 2px;
	}

	.suggestion-item {
		padding: 5px 8px;
		font-size: 0.75rem;
		font-family: monospace;
		border-radius: 4px;
		cursor: pointer;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.suggestion-item-active {
		background: oklch(from var(--color-primary) l c h / 0.15);
		color: oklch(from var(--color-primary) l c h);
	}

	.suggestion-item:not(.suggestion-item-active):hover {
		background: oklch(from var(--color-base-200) l c h);
	}

	.suggestion-sigil {
		opacity: 0.5;
		margin-right: 1px;
	}
</style>
