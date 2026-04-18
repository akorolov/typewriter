import { Node, mergeAttributes, type Editor } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

export interface SuggestionState {
	query: string;
	from: number;
	to: number;
	coords: { left: number; bottom: number };
}

export interface VariableMentionOptions {
	onSuggestionChange: (state: SuggestionState | null) => void;
	onKeyDown: (event: KeyboardEvent) => boolean;
}

const SUGGESTION_KEY = new PluginKey<SuggestionState | null>('variableSuggestion');

export const VariableMention = Node.create<VariableMentionOptions>({
	name: 'variableMention',
	group: 'inline',
	inline: true,
	selectable: true,
	atom: true,

	addOptions() {
		return {
			onSuggestionChange: () => {},
			onKeyDown: () => false
		};
	},

	addAttributes() {
		return {
			name: { default: null }
		};
	},

	parseHTML() {
		return [{ tag: 'span[data-variable]' }];
	},

	renderHTML({ node, HTMLAttributes }) {
		return [
			'span',
			mergeAttributes({ 'data-variable': node.attrs.name }, HTMLAttributes),
			`$${node.attrs.name}`
		];
	},

	addProseMirrorPlugins() {
		const { onSuggestionChange, onKeyDown } = this.options;
		let currentSuggestion: SuggestionState | null = null;

		return [
			new Plugin({
				key: SUGGESTION_KEY,

				props: {
					handleKeyDown(_view: EditorView, event: KeyboardEvent): boolean {
						if (!currentSuggestion) return false;
						return onKeyDown(event);
					}
				},

				view() {
					return {
						update(view: EditorView) {
							const { state } = view;
							const { selection } = state;

							if (!selection.empty) {
								if (currentSuggestion) {
									currentSuggestion = null;
									onSuggestionChange(null);
								}
								return;
							}

							const { from } = selection;
							const $from = state.doc.resolve(from);
							const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);

							// Match $word at end of current text, but not $$ (escape)
							const match = textBefore.match(/\$(\w*)$/);

							if (match) {
								const queryStart = from - match[0].length;
								const coords = view.coordsAtPos(queryStart);
								const next: SuggestionState = {
									query: match[1],
									from: queryStart,
									to: from,
									coords: { left: coords.left, bottom: coords.bottom }
								};

								// Only fire change if something meaningful changed
								if (
									!currentSuggestion ||
									currentSuggestion.query !== next.query ||
									currentSuggestion.from !== next.from
								) {
									currentSuggestion = next;
									onSuggestionChange(next);
								}
							} else {
								if (currentSuggestion) {
									currentSuggestion = null;
									onSuggestionChange(null);
								}
							}
						},

						destroy() {
							currentSuggestion = null;
							onSuggestionChange(null);
						}
					};
				}
			})
		];
	}
});

export function insertVariableMention(editor: Editor, name: string, from: number, to: number) {
	editor
		.chain()
		.focus()
		.deleteRange({ from, to })
		.insertContent({ type: 'variableMention', attrs: { name } })
		.run();
}
