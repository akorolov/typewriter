<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { createStoryStore } from '$lib/stores/story.svelte.js';
	import { loadStory } from '$lib/persistence/indexeddb.js';
	import { createStoryTree } from '$lib/models/tree.js';
	import Editor from '$lib/components/Editor.svelte';

	let store = createStoryStore();
	let loading = $state(true);

	onMount(async () => {
		const id = page.params.id;

		if (id === 'new') {
			// Create a fresh story
			store.setTree(createStoryTree('Untitled Story'));
			await store.forceSave();
			// Redirect to the actual ID
			goto(`/story/${store.tree.id}`, { replaceState: true });
			loading = false;
			return;
		}

		const saved = await loadStory(id);
		if (saved) {
			store.setTree(saved);
		} else {
			// Story not found, go home
			goto('/');
			return;
		}

		loading = false;
	});
</script>

<svelte:head>
	<title>{store.tree.title} — Typewriter</title>
</svelte:head>

{#if loading}
	<div class="flex h-full items-center justify-center">
		<span class="loading loading-spinner loading-lg text-primary"></span>
	</div>
{:else}
	<Editor {store} />
{/if}
