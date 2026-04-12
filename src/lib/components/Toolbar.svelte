<script lang="ts">
	import type { Editor } from '@tiptap/core';

	interface Props {
		editor: Editor | null;
		onbranch: () => void;
		onexport: () => void;
		title: string;
		onupdatetitle: (title: string) => void;
		wordCount: number;
	}

	let { editor, onbranch, onexport, title, onupdatetitle, wordCount }: Props = $props();

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

	type ToolbarButton = { command: string; label: string; icon: string; materialIcon?: string };
	type ToolbarGroup = ToolbarButton[];

	const groups: ToolbarGroup[] = [
		[
			{ command: 'bold', label: 'Bold', icon: 'B', materialIcon: 'format_bold' },
			{ command: 'italic', label: 'Italic', icon: 'I', materialIcon: 'format_italic' },
			{ command: 'underline', label: 'Underline', icon: 'U', materialIcon: 'format_underlined' },
			{ command: 'strike', label: 'Strikethrough', icon: 'S', materialIcon: 'format_strikethrough' },
			{ command: 'highlight', label: 'Highlight', icon: 'H', materialIcon: 'format_ink_highlighter' }
		],
		[
			{ command: 'h1', label: 'Heading 1', icon: 'H1', materialIcon: 'format_h1' },
			{ command: 'h2', label: 'Heading 2', icon: 'H2', materialIcon: 'format_h2' },
			{ command: 'h3', label: 'Heading 3', icon: 'H3', materialIcon: 'format_h3' }
		],
		[
			{ command: 'bulletList', label: 'Bullet List', icon: '•', materialIcon: 'format_list_bulleted' },
			{ command: 'orderedList', label: 'Ordered List', icon: '1.', materialIcon: 'format_list_numbered' },
			{ command: 'blockquote', label: 'Blockquote', icon: '"', materialIcon: 'format_quote' }
		],
		[
			{ command: 'alignLeft', label: 'Align Left', icon: '⫷', materialIcon: 'format_align_left' },
			{ command: 'alignCenter', label: 'Align Center', icon: '⫿', materialIcon: 'format_align_center' },
			{ command: 'alignRight', label: 'Align Right', icon: '⫸', materialIcon: 'format_align_right' }
		]
	];
</script>

<div class="toolbar flex items-center gap-0.5 border-b border-base-300 bg-base-200 px-3 py-1">
	<input
		type="text"
		class="input input-ghost input-sm mr-2 w-44 font-semibold"
		value={title}
		oninput={(e) => onupdatetitle(e.currentTarget.value)}
		aria-label="Story title"
	/>

	<div class="mx-1.5 h-5 w-px bg-base-300"></div>

	{#each groups as group, gi (gi)}
		{#if gi > 0}
			<div class="mx-1.5 h-5 w-px bg-base-300"></div>
		{/if}
		{#each group as btn (btn.command)}
			<button
				class="btn btn-ghost btn-xs min-h-0 h-7 w-7 p-0"
				class:btn-active={isActive(btn.command)}
				title={btn.label}
				onclick={() => toggleFormat(btn.command)}
			>
				{#if btn.materialIcon}
					<span class="material-symbols-outlined" style="font-size: 18px;">{btn.materialIcon}</span>
				{:else}
					<span class="text-xs font-bold">{btn.icon}</span>
				{/if}
			</button>
		{/each}
	{/each}

	<div class="mx-1.5 h-5 w-px bg-base-300"></div>

	<div class="dropdown dropdown-bottom">
		<button tabindex="0" class="btn btn-ghost btn-xs gap-1" title="Export story">
			<span class="material-symbols-outlined" style="font-size: 16px;">file_export</span>
			Export
		</button>
		<ul
			class="dropdown-content menu bg-base-100 rounded-box z-10 w-44 p-1 shadow-md border border-base-300 text-sm"
		>
			<li>
				<button
					onclick={() => {
						onexport();
						(document.activeElement as HTMLElement)?.blur();
					}}
				>
					<span class="material-symbols-outlined" style="font-size: 15px;">download</span>
					Twine 2 / Twee 3
				</button>
			</li>
		</ul>
	</div>

	<div class="mx-1.5 h-5 w-px bg-base-300"></div>

	<button
		class="btn btn-primary btn-xs gap-1"
		title="Create new branch (splits at current paragraph)"
		onclick={onbranch}
	>
		<span class="material-symbols-outlined" style="font-size: 16px;">arrow_split</span>
		Branch
	</button>

	<div class="ml-auto text-xs text-base-content/50">
		{wordCount} words
	</div>
</div>
