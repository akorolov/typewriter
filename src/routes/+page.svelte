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
			<a
				href="https://github.com/akorolov/typewriter"
				target="_blank"
				rel="noopener noreferrer"
				class="mt-2 inline-flex items-center gap-1.5 text-sm text-base-content/40 hover:text-base-content/70 transition-colors"
			>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
					<path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
				</svg>
				akorolov/typewriter
			</a>
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
