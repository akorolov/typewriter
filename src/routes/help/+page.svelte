<svelte:head>
	<title>Help — Typewriter</title>
</svelte:head>

<div class="flex h-full flex-col items-center overflow-y-auto p-8">
	<div class="w-full max-w-2xl">
		<div class="mb-8 flex items-center gap-4">
			<a href="/" class="btn btn-ghost btn-sm gap-1">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
					<path fill-rule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clip-rule="evenodd" />
				</svg>
				Back
			</a>
			<h1 class="text-3xl font-bold">Help</h1>
		</div>

			<!-- Exporting -->
			<section>
				<h2 class="mb-4 text-xl font-semibold">Exporting</h2>
				<div class="prose prose-sm max-w-none text-base-content/80 space-y-3">
					<p>
						The main goal of this app is to provide you a more comfortable writing experience for Twine stories. However, you can also export to markdown or raw json, if you would like to use the text in another application or game engine. 
						</p><p>
						Click the <strong>Export</strong> button in the editor toolbar to download your story. There are four options:
					</p>
				</div>
				<div class="mt-4 space-y-3">

					<div class="rounded-lg border border-base-300 bg-base-200 p-4">
						<h3 class="font-semibold text-sm">Twine 2 / Twee 3 <span class="ml-2 badge badge-sm badge-outline font-normal">.twee</span></h3>
						<p class="mt-1 text-sm text-base-content/70">
							Exports the full story as a Twee 3 file in Harlowe format. Import it into <a href="https://twinery.org" target="_blank" rel="noopener noreferrer" class="link">Twine 2</a> to build and publish a playable game. Variable chips become live Harlowe variable references, and player choices with variable effects use Harlowe's link macro.
						</p>
					</div>

					<div class="rounded-lg border border-base-300 bg-base-200 p-4">
						<h3 class="font-semibold text-sm">Markdown <span class="ml-2 badge badge-sm badge-outline font-normal">.md</span></h3>
						<p class="mt-1 text-sm text-base-content/70">
							Exports the full story tree as a single Markdown file. Each branch section becomes a heading, and player choices become hyperlinks between sections.
						</p>
					</div>

					<div class="rounded-lg border border-base-300 bg-base-200 p-4">
						<h3 class="font-semibold text-sm">Raw JSON <span class="ml-2 badge badge-sm badge-outline font-normal">.json</span></h3>
						<p class="mt-1 text-sm text-base-content/70">
							Exports the raw story data as JSON. Useful for debugging, custom tooling, or creating your own export pipeline.
						</p>
					</div>

					<div class="rounded-lg border border-base-300 bg-base-200 p-4">
						<h3 class="font-semibold text-sm">Export current branch <span class="ml-2 badge badge-sm badge-outline font-normal">.md</span></h3>
						<p class="mt-1 text-sm text-base-content/70">
							Exports only the branch path you are currently reading as a single linear Markdown document.
						</p>
					</div>

				</div>
			</section>

			<div class="divider"></div>

		<div class="space-y-8">

			<!-- How branches work -->
			<section>
				<h2 class="mb-4 text-xl font-semibold">How Branches Work</h2>
				<div class="prose prose-sm max-w-none text-base-content/80 space-y-3">
					<p>
						The ethos behind Typewriter is that you can write an interactive story in a more linear format, focusing on one complete branch at a time, or jumping between different branches as makes sense for your writing style.
					</p>
					<p>
						To create a branch, place the cursor on the paragraph that you want the branch created after, then click the "Branch" button in the top bar. The new branch will be created after the paragraph where the cursor is. 
					</p>
					<p>
						You can see more information about branches in the sidebar, under the branch info panel. You can also right click a branch name in the editor to edit, rename, or delete the branch. 
					</p>
					<p>
						You can also merge branches back together. Right click on a branch in the editor, and then select "Merge into..." You will then select the destination node in the story map.
					</p>
					<p>
						To see an overview of your whole story, use the story minimap in the right sidebar. 
					</p>
				</div>
			</section>

			<div class="divider"></div>

			<!-- Using Variables -->
			<section>
				<h2 class="mb-4 text-xl font-semibold">Using Variables</h2>
				<div class="prose prose-sm max-w-none text-base-content/80 space-y-3">
					<p>
						You can also use variables that will be functional when you export into Twine.
					</p>

					<h3 class="text-base font-semibold mt-4">Defining variables</h3>
					<p>
						In the <strong>Variables</strong> tab in the side panel, define your variables and choose a type: string, number, or boolean (true/false).
					</p>

					<h3 class="text-base font-semibold mt-4">Referencing a variable in text</h3>
					<p>
						Type <code class="bg-base-300 px-1 rounded text-xs">$</code> anywhere in the editor to open the variable autocomplete. Select a variable to insert a variable chip into your text. When exported, the chip becomes a live Harlowe variable reference that interpolates the current value.
					</p>

					<h3 class="text-base font-semibold mt-4">Setting a variable on a player choice</h3>
					<p>
						Open the <strong>Branch Info</strong> panel and find the branch you want. Under each player choice there is a <em>Variable Effects</em> section. Click <em>Add Effect</em>, choose a variable, and enter the value or expression to set when the player picks that choice.
					</p>
					<p>The value field accepts raw Harlowe expressions:</p>

					<div class="overflow-x-auto">
						<table class="table table-sm text-xs">
							<thead>
								<tr>
									<th>Variable type</th>
									<th>Example value</th>
									<th>What it does</th>
								</tr>
							</thead>
							<tbody>
								<tr><td>boolean</td><td><code>true</code></td><td>Sets the variable to true</td></tr>
								<tr><td>boolean</td><td><code>invert</code></td><td>Toggles the variable to its opposite</td></tr>
								<tr><td>number</td><td><code>5</code></td><td>Sets to a number</td></tr>
								<tr><td>number</td><td><code>$score + 10</code></td><td>Increments by 10</td></tr>
								<tr><td>string</td><td><code>"Alice"</code></td><td>Sets to a string</td></tr>
								<tr><td>string</td><td><code>$name + " and Henry"</code></td><td>Appends a string</td></tr>
							</tbody>
						</table>
					</div>

					<h3 class="text-base font-semibold mt-4">How this exports to Twine</h3>
					<p>When you export to <code class="bg-base-300 px-1 rounded text-xs">.twee</code> (Harlowe format):</p>
					<ul class="list-disc ml-5 space-y-1">
						<li>A <code class="bg-base-300 px-1 rounded text-xs">StoryInit [startup]</code> passage sets all variables to their defaults before the story begins.</li>
						<li>Variable chips in text export as <code class="bg-base-300 px-1 rounded text-xs">$variableName</code> — Harlowe interpolates them automatically.</li>
						<li>Branch choices with no effects export as standard <code class="bg-base-300 px-1 rounded text-xs">[[Choice->Passage]]</code> links.</li>
						<li>Branch choices with effects use Harlowe's link macro so variables are set at the moment the player clicks.</li>
					</ul>
				</div>
			</section>

			<div class="divider"></div>

			<!-- Find and Replace -->
			<section>
				<h2 class="mb-4 text-xl font-semibold">Find and Replace</h2>
				<div class="prose prose-sm max-w-none text-base-content/80">
					<p>
						Use <kbd class="kbd kbd-sm">Cmd+H</kbd> (macOS) or <kbd class="kbd kbd-sm">Ctrl+H</kbd> (Windows/Linux) to open Find &amp; Replace. You can search for any text across all passages and replace it with either plain text or a variable chip.
					</p>
				</div>
			</section>

			<div class="divider"></div>

			<!-- FAQ -->
			<section>
				<h2 class="mb-4 text-xl font-semibold">FAQ</h2>
				<div class="space-y-4">

					<div class="collapse collapse-arrow bg-base-200">
						<input type="checkbox" />
						<div class="collapse-title font-medium text-sm">Who is this for?</div>
						<div class="collapse-content text-sm text-base-content/70">
							<p>Writers and game developers who want a clean place to write branching stories before exporting them to a game engine like Twine or Ren'Py. Typewriter is a writing tool, not a deployment platform.</p>
						</div>
					</div>

					<div class="collapse collapse-arrow bg-base-200">
						<input type="checkbox" />
						<div class="collapse-title font-medium text-sm">Where is my data stored?</div>
						<div class="collapse-content text-sm text-base-content/70">
							<p>Your data is stored in your browser's <strong>IndexedDB</strong> — no cloud storage, no external database, no cookies. Your data fully belongs to you. Make sure to back up your stories regularly!</p>
						</div>
					</div>

					<div class="collapse collapse-arrow bg-base-200">
						<input type="checkbox" />
						<div class="collapse-title font-medium text-sm">Is there any AI in this?</div>
						<div class="collapse-content text-sm text-base-content/70">
							<p>The app itself has no AI features. Claude Code was used to help build it, but your writing is entirely your own.</p>
						</div>
					</div>

					<div class="collapse collapse-arrow bg-base-200">
						<input type="checkbox" />
						<div class="collapse-title font-medium text-sm">How do I report a bug?</div>
						<div class="collapse-content text-sm text-base-content/70">
							<p>Open an issue on the <a href="https://github.com/akorolov/typewriter" target="_blank" rel="noopener noreferrer" class="link">GitHub project</a>.</p>
						</div>
					</div>

				</div>
			</section>

		</div>
	</div>
</div>
