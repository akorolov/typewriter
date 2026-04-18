import { Editor, type JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { VariableMention, type SuggestionState } from './VariableMention.js';

export type { SuggestionState };

export interface CreateEditorOptions {
	content: JSONContent;
	onUpdate: (content: JSONContent) => void;
	onFocus?: (editor: Editor) => void;
	placeholder?: string;
	editable?: boolean;
	onSuggestionChange?: (state: SuggestionState | null) => void;
	onSuggestionKeyDown?: (event: KeyboardEvent) => boolean;
}

export function createEditor(
	element: HTMLElement,
	{
		content,
		onUpdate,
		onFocus,
		placeholder,
		editable = true,
		onSuggestionChange,
		onSuggestionKeyDown
	}: CreateEditorOptions
): Editor {
	return new Editor({
		element,
		editable,
		content,
		extensions: [
			StarterKit.configure({
				heading: { levels: [1, 2, 3] }
			}),
			Underline,
			TextAlign.configure({
				types: ['heading', 'paragraph']
			}),
			Highlight.configure({ multicolor: false }),
			Image,
			Typography,
			Placeholder.configure({
				placeholder: placeholder ?? 'Start writing...'
			}),
			CharacterCount,
			VariableMention.configure({
				onSuggestionChange: onSuggestionChange ?? (() => {}),
				onKeyDown: onSuggestionKeyDown ?? (() => false)
			})
		],
		onUpdate: ({ editor }) => {
			onUpdate(editor.getJSON());
		},
		onFocus: ({ editor }) => {
			onFocus?.(editor);
		}
	});
}
