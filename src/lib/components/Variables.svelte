<script lang="ts">
	import type { StoryStore } from '../stores/story.svelte.js';
	import type { VariableDef } from '../models/story.js';
	import { findVariableReferences, findVariableEffectNodes } from '../models/variables.js';

	interface Props {
		store: StoryStore;
		onnavigatetonode?: (nodeId: string) => void;
	}

	let { store, onnavigatetonode }: Props = $props();

	const variables = $derived(Object.values(store.tree.variables ?? {}));

	// --- Creating ---
	let creating = $state(false);
	let newName = $state('');
	let newType = $state<VariableDef['type']>('string');
	let newDefault = $state('');
	let newDesc = $state('');
	let createError = $state('');

	// --- Editing ---
	let editingOriginalName: string | null = $state(null);
	let editName = $state('');
	let editType = $state<VariableDef['type']>('string');
	let editDefault = $state('');
	let editDesc = $state('');
	let editError = $state('');

	// --- Expanded refs ---
	let expandedVar: string | null = $state(null);

	function validateName(name: string, exclude?: string): string {
		if (!name.trim()) return 'Name is required.';
		if (!/^\w+$/.test(name)) return 'Only letters, numbers, underscores.';
		if (/^\d/.test(name)) return 'Cannot start with a number.';
		if (name !== exclude && store.tree.variables?.[name]) return 'Name already exists.';
		return '';
	}

	function coerceDefault(raw: string, type: VariableDef['type']): string | number | boolean {
		if (type === 'number') return raw === '' ? 0 : Number(raw) || 0;
		if (type === 'boolean') return raw === 'true';
		return raw;
	}

	function startCreate() {
		creating = true;
		editingOriginalName = null;
		newName = '';
		newType = 'string';
		newDefault = '';
		newDesc = '';
		createError = '';
	}

	function submitCreate() {
		const err = validateName(newName);
		if (err) { createError = err; return; }
		store.addVariable({
			name: newName.trim(),
			type: newType,
			defaultValue: coerceDefault(newDefault, newType),
			description: newDesc.trim() || undefined
		});
		creating = false;
	}

	function startEdit(v: VariableDef) {
		creating = false;
		editingOriginalName = v.name;
		editName = v.name;
		editType = v.type;
		editDefault = String(v.defaultValue);
		editDesc = v.description ?? '';
		editError = '';
		expandedVar = null;
	}

	function submitEdit() {
		const original = editingOriginalName!;
		const err = validateName(editName, original);
		if (err) { editError = err; return; }
		const def: VariableDef = {
			name: editName.trim(),
			type: editType,
			defaultValue: coerceDefault(editDefault, editType),
			description: editDesc.trim() || undefined
		};
		if (editName.trim() !== original) {
			store.deleteVariable(original);
			store.addVariable(def);
		} else {
			store.updateVariable(original, { type: def.type, defaultValue: def.defaultValue, description: def.description });
		}
		editingOriginalName = null;
	}

	function deleteVar(name: string) {
		if (expandedVar === name) expandedVar = null;
		if (editingOriginalName === name) editingOriginalName = null;
		store.deleteVariable(name);
	}

	function nodeName(nodeId: string): string {
		return store.tree.nodes[nodeId]?.label?.trim() || nodeId.slice(0, 8);
	}
</script>

<div class="p-3">
	<div class="mb-3 flex items-center justify-between">
		<span class="text-[10px] font-semibold uppercase tracking-wider text-base-content/40">
			{variables.length} variable{variables.length === 1 ? '' : 's'}
		</span>
		{#if !creating}
			<button class="btn btn-ghost btn-xs" onclick={startCreate}>+ New</button>
		{/if}
	</div>

	<!-- Create form -->
	{#if creating}
		<div class="mb-3 rounded-md border border-primary/30 bg-primary/5 p-2">
			<div class="mb-1 text-[9px] font-semibold uppercase tracking-wider text-base-content/40">New Variable</div>
			<input class="var-field w-full" placeholder="variableName" bind:value={newName} onkeydown={(e) => e.key === 'Enter' && submitCreate()} />
			{#if createError}<div class="mt-0.5 text-[9px] text-error">{createError}</div>{/if}
			<div class="mt-1.5 flex gap-1.5">
				<select class="var-select flex-1" bind:value={newType}>
					<option value="string">string</option>
					<option value="number">number</option>
					<option value="boolean">boolean</option>
				</select>
				{#if newType === 'boolean'}
					<select class="var-select flex-1" bind:value={newDefault}>
						<option value="false">false</option>
						<option value="true">true</option>
					</select>
				{:else}
					<input type={newType === 'number' ? 'number' : 'text'} class="var-field flex-1" placeholder="default" bind:value={newDefault} />
				{/if}
			</div>
			<input class="var-field mt-1.5 w-full" placeholder="Description (optional)" bind:value={newDesc} />
			<div class="mt-1.5 flex gap-1">
				<button class="btn btn-primary btn-xs flex-1" onclick={submitCreate}>Add</button>
				<button class="btn btn-ghost btn-xs" onclick={() => (creating = false)}>Cancel</button>
			</div>
		</div>
	{/if}

	{#if variables.length === 0 && !creating}
		<p class="text-center text-xs text-base-content/40">No variables yet.<br />Click + New to add one.</p>
	{/if}

	<!-- Variable list -->
	{#each variables as v (v.name)}
		<div class="var-row mb-2 rounded-md border border-base-300 bg-base-100">
			<!-- Header row -->
			<div class="flex items-center gap-1 px-2 py-1.5">
				<button
					class="flex min-w-0 flex-1 items-center gap-1.5 text-left"
					onclick={() => { expandedVar = expandedVar === v.name ? null : v.name; editingOriginalName = null; }}
				>
					<span class="font-mono text-[11px] font-semibold text-primary">$</span>
					<span class="min-w-0 flex-1 truncate font-mono text-[11px]">{v.name}</span>
					<span class="shrink-0 rounded bg-base-200 px-1 py-0.5 text-[9px] text-base-content/50">{v.type}</span>
					<span class="text-[9px] text-base-content/30">{expandedVar === v.name ? '▴' : '▾'}</span>
				</button>
				<button class="btn btn-ghost btn-xs px-1" onclick={() => startEdit(v)} title="Edit">
					<span class="material-symbols-outlined" style="font-size:14px;">edit_square</span>
				</button>
				<button class="btn btn-ghost btn-xs px-1 text-error/60 hover:text-error" onclick={() => deleteVar(v.name)} title="Delete">
					<span class="material-symbols-outlined" style="font-size:14px;">delete</span>
				</button>
			</div>

			<!-- Edit form -->
			{#if editingOriginalName === v.name}
				<div class="border-t border-base-300 px-2 pb-2 pt-1.5">
					<input class="var-field w-full" placeholder="variableName" bind:value={editName} />
					{#if editError}<div class="mt-0.5 text-[9px] text-error">{editError}</div>{/if}
					<div class="mt-1.5 flex gap-1.5">
						<select class="var-select flex-1" bind:value={editType}>
							<option value="string">string</option>
							<option value="number">number</option>
							<option value="boolean">boolean</option>
						</select>
						{#if editType === 'boolean'}
							<select class="var-select flex-1" bind:value={editDefault}>
								<option value="false">false</option>
								<option value="true">true</option>
							</select>
						{:else}
							<input type={editType === 'number' ? 'number' : 'text'} class="var-field flex-1" placeholder="default" bind:value={editDefault} />
						{/if}
					</div>
					<input class="var-field mt-1.5 w-full" placeholder="Description (optional)" bind:value={editDesc} />
					<div class="mt-1.5 flex gap-1">
						<button class="btn btn-primary btn-xs flex-1" onclick={submitEdit}>Save</button>
						<button class="btn btn-ghost btn-xs" onclick={() => (editingOriginalName = null)}>Cancel</button>
					</div>
				</div>
			{/if}

			<!-- Expanded references -->
			{#if expandedVar === v.name && editingOriginalName !== v.name}
				{@const textRefs = findVariableReferences(store.tree, v.name)}
				{@const effectRefs = findVariableEffectNodes(store.tree, v.name)}
				<div class="border-t border-base-300 px-2 pb-2 pt-1.5">
					{#if v.description}
						<p class="mb-1.5 text-[10px] italic text-base-content/50">{v.description}</p>
					{/if}
					<div class="text-[9px] text-base-content/30">Default: <span class="font-mono">{v.defaultValue}</span></div>

					{#if textRefs.length > 0}
						<div class="mt-2 text-[9px] font-semibold uppercase tracking-wider text-base-content/30">In text</div>
						{#each textRefs as nodeId (nodeId)}
							<button class="mt-0.5 flex w-full items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-base-200" onclick={() => onnavigatetonode?.(nodeId)}>
								<span class="material-symbols-outlined text-base-content/30" style="font-size:11px;">article</span>
								<span class="truncate font-mono text-[10px]">{nodeName(nodeId)}</span>
							</button>
						{/each}
					{/if}

					{#if effectRefs.length > 0}
						<div class="mt-2 text-[9px] font-semibold uppercase tracking-wider text-base-content/30">Set on choice</div>
						{#each effectRefs as nodeId (nodeId)}
							<button class="mt-0.5 flex w-full items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-base-200" onclick={() => onnavigatetonode?.(nodeId)}>
								<span class="material-symbols-outlined text-base-content/30" style="font-size:11px;">call_split</span>
								<span class="truncate font-mono text-[10px]">{nodeName(nodeId)}</span>
							</button>
						{/each}
					{/if}

					{#if textRefs.length === 0 && effectRefs.length === 0}
						<p class="mt-1 text-[10px] text-base-content/30">No references yet.</p>
					{/if}
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	.var-field {
		background: transparent;
		border: none;
		border-bottom: 1px solid oklch(from var(--color-base-300) l c h);
		outline: none;
		font-size: 0.7rem;
		padding: 1px 0;
		line-height: 1.4;
	}

	.var-field:focus {
		border-bottom-color: oklch(from var(--color-primary) l c h);
	}

	.var-field::placeholder {
		color: oklch(from var(--color-base-content) l c h / 0.25);
		font-style: italic;
	}

	.var-select {
		background: oklch(from var(--color-base-200) l c h);
		border: 1px solid oklch(from var(--color-base-300) l c h);
		border-radius: 4px;
		font-size: 0.7rem;
		padding: 1px 4px;
		outline: none;
	}

	.var-select:focus {
		border-color: oklch(from var(--color-primary) l c h);
	}
</style>
