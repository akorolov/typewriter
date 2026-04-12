<script lang="ts">
	import type { Editor } from '@tiptap/core';

	interface Props {
		editor: Editor | null;
		onbranch: () => void;
		title: string;
		onupdatetitle: (title: string) => void;
		wordCount: number;
	}

	let { editor, onbranch, title, onupdatetitle, wordCount }: Props = $props();

	function toggleFormat(command: string) {
		if (!editor) return;
		switch (command) {
			case 'bold':
				editor.chain().focus().toggleBold().run();
				break;
			case 'italic':
				editor.chain().focus().toggleItalic().run();
				break;
			case 'underline':
				editor.chain().focus().toggleUnderline().run();
				break;
			case 'strike':
				editor.chain().focus().toggleStrike().run();
				break;
			case 'highlight':
				editor.chain().focus().toggleHighlight().run();
				break;
			case 'h1':
				editor.chain().focus().toggleHeading({ level: 1 }).run();
				break;
			case 'h2':
				editor.chain().focus().toggleHeading({ level: 2 }).run();
				break;
			case 'h3':
				editor.chain().focus().toggleHeading({ level: 3 }).run();
				break;
			case 'bulletList':
				editor.chain().focus().toggleBulletList().run();
				break;
			case 'orderedList':
				editor.chain().focus().toggleOrderedList().run();
				break;
			case 'blockquote':
				editor.chain().focus().toggleBlockquote().run();
				break;
			case 'alignLeft':
				editor.chain().focus().setTextAlign('left').run();
				break;
			case 'alignCenter':
				editor.chain().focus().setTextAlign('center').run();
				break;
			case 'alignRight':
				editor.chain().focus().setTextAlign('right').run();
				break;
		}
	}

	function isActive(command: string): boolean {
		if (!editor) return false;
		switch (command) {
			case 'bold': return editor.isActive('bold');
			case 'italic': return editor.isActive('italic');
			case 'underline': return editor.isActive('underline');
			case 'strike': return editor.isActive('strike');
			case 'highlight': return editor.isActive('highlight');
			case 'h1': return editor.isActive('heading', { level: 1 });
			case 'h2': return editor.isActive('heading', { level: 2 });
			case 'h3': return editor.isActive('heading', { level: 3 });
			case 'bulletList': return editor.isActive('bulletList');
			case 'orderedList': return editor.isActive('orderedList');
			case 'blockquote': return editor.isActive('blockquote');
			case 'alignLeft': return editor.isActive({ textAlign: 'left' });
			case 'alignCenter': return editor.isActive({ textAlign: 'center' });
			case 'alignRight': return editor.isActive({ textAlign: 'right' });
			default: return false;
		}
	}

	type ToolbarButton = { command: string; label: string; icon: string };
	type ToolbarGroup = ToolbarButton[];

	const groups: ToolbarGroup[] = [
		[
			{ command: 'bold', label: 'Bold', icon: 'B' },
			{ command: 'italic', label: 'Italic', icon: 'I' },
			{ command: 'underline', label: 'Underline', icon: 'U' },
			{ command: 'strike', label: 'Strikethrough', icon: 'S' },
			{ command: 'highlight', label: 'Highlight', icon: 'H' }
		],
		[
			{ command: 'h1', label: 'Heading 1', icon: 'H1' },
			{ command: 'h2', label: 'Heading 2', icon: 'H2' },
			{ command: 'h3', label: 'Heading 3', icon: 'H3' }
		],
		[
			{ command: 'bulletList', label: 'Bullet List', icon: '•' },
			{ command: 'orderedList', label: 'Ordered List', icon: '1.' },
			{ command: 'blockquote', label: 'Blockquote', icon: '"' }
		],
		[
			{ command: 'alignLeft', label: 'Align Left', icon: '⫷' },
			{ command: 'alignCenter', label: 'Align Center', icon: '⫿' },
			{ command: 'alignRight', label: 'Align Right', icon: '⫸' }
		]
	];
</script>

<div class="toolbar flex items-center gap-1 border-b border-base-300 bg-base-200 px-3 py-1.5">
	<input
		type="text"
		class="input input-ghost input-sm mr-3 w-48 font-semibold"
		value={title}
		oninput={(e) => onupdatetitle(e.currentTarget.value)}
		aria-label="Story title"
	/>

	<div class="divider divider-horizontal mx-0.5"></div>

	{#each groups as group, gi (gi)}
		{#if gi > 0}
			<div class="divider divider-horizontal mx-0.5"></div>
		{/if}
		{#each group as btn (btn.command)}
			<button
				class="btn btn-ghost btn-xs"
				class:btn-active={isActive(btn.command)}
				title={btn.label}
				onclick={() => toggleFormat(btn.command)}
			>
				<span class="text-xs font-bold" class:italic={btn.command === 'italic'} class:underline={btn.command === 'underline'} class:line-through={btn.command === 'strike'}>
					{btn.icon}
				</span>
			</button>
		{/each}
	{/each}

	<div class="divider divider-horizontal mx-0.5"></div>

	<button
		class="btn btn-primary btn-xs gap-1"
		title="Create new branch (splits at current paragraph)"
		onclick={onbranch}
	>
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="h-3.5 w-3.5">
			<path
				fill-rule="evenodd"
				d="M4.75 2a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 4.75 2Zm0 9a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM2 12.5a2.75 2.75 0 1 1 3.5 2.635V15a.75.75 0 0 1-1.5 0v.135A2.751 2.751 0 0 1 2 12.5Zm9.75-1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM8.5 12.5a3.251 3.251 0 0 1 2.75-3.213V7.5A1.75 1.75 0 0 0 9.5 5.75h-1a.75.75 0 0 1 0-1.5h1A3.25 3.25 0 0 1 12.75 7.5v1.787A3.251 3.251 0 0 1 11.75 16a3.25 3.25 0 0 1-3.25-3.5Z"
				clip-rule="evenodd"
			/>
		</svg>
		Branch
	</button>

	<div class="ml-auto text-xs text-base-content/50">
		{wordCount} words
	</div>
</div>
