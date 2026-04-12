<script lang="ts">
	import type { JSONContent } from '@tiptap/core';
	import { generateHTML } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Underline from '@tiptap/extension-underline';
	import TextAlign from '@tiptap/extension-text-align';
	import Highlight from '@tiptap/extension-highlight';
	import Image from '@tiptap/extension-image';

	interface Props {
		content: JSONContent;
		maxHeight?: number;
	}

	let { content, maxHeight = 200 }: Props = $props();

	const extensions = [
		StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
		Underline,
		TextAlign.configure({ types: ['heading', 'paragraph'] }),
		Highlight,
		Image
	];

	const html = $derived(generateHTML(content, extensions));
</script>

<div
	class="prose prose-sm max-w-none overflow-hidden"
	style="max-height: {maxHeight}px; mask-image: linear-gradient(to bottom, black 60%, transparent 100%);"
>
	{@html html}
</div>
