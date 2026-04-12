<script lang="ts">
	import { onMount } from 'svelte';
	import { listStories, deleteStory } from '$lib/persistence/indexeddb.js';
	import type { StoryTree } from '$lib/models/story.js';

	let stories = $state<StoryTree[]>([]);
	let loading = $state(true);

	onMount(async () => {
		stories = await listStories();
		loading = false;
	});

	function formatDate(ts: number): string {
		return new Date(ts).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function countNodes(story: StoryTree): number {
		return Object.keys(story.nodes).length;
	}

	function countBranches(story: StoryTree): number {
		return Object.values(story.nodes).filter((n) => n.childIds.length > 1).length;
	}

	async function handleDelete(id: string, title: string) {
		if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
		await deleteStory(id);
		stories = stories.filter((s) => s.id !== id);
	}
</script>

<svelte:head>
	<title>Typewriter — Branching Narrative Editor</title>
</svelte:head>

<div class="flex h-full flex-col items-center justify-center p-8">
	<div class="w-full max-w-2xl">
		<div class="mb-8 text-center">
			<h1 class="mb-2 text-4xl font-bold text-base-content">Typewriter</h1>
			<p class="text-base-content/60">A branching narrative editor for interactive fiction</p>
		</div>

		<div class="mb-6 text-center">
			<a href="/story/new" class="btn btn-primary btn-lg gap-2">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5">
					<path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
				</svg>
				New Story
			</a>
		</div>

		{#if loading}
			<div class="flex justify-center">
				<span class="loading loading-spinner loading-md text-primary"></span>
			</div>
		{:else if stories.length === 0}
			<div class="rounded-lg border border-base-300 bg-base-200 p-8 text-center">
				<p class="text-base-content/60">No stories yet. Create your first one!</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each stories as story (story.id)}
					<div class="card bg-base-200 shadow-sm transition-shadow hover:shadow-md">
						<div class="card-body flex-row items-center gap-4 p-4">
							<a href="/story/{story.id}" class="flex-1">
								<h2 class="card-title text-base">{story.title}</h2>
								<div class="flex gap-4 text-xs text-base-content/50">
									<span>{countNodes(story)} nodes</span>
									<span>{countBranches(story)} branch points</span>
									<span>Updated {formatDate(story.updatedAt)}</span>
								</div>
							</a>
							<button
								class="btn btn-ghost btn-sm text-error"
								onclick={() => handleDelete(story.id, story.title)}
								title="Delete story"
							>
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="h-4 w-4">
									<path fill-rule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clip-rule="evenodd" />
								</svg>
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
