export const VERSION = '0.3.0';

export interface ChangelogEntry {
	version: string;
	date: string;
	changes: string[];
}

export const changelog: ChangelogEntry[] = [
	{
		version: '0.3.0',
		date: '2026-04-18',
		changes: [
			'Various UI improvements',
			'Added full story export to markdown, with hyperlinks',
			'Fixed up some issues with merged branches not displaying properly or working as expected',
			'Added basic variable functionality',
			'Added a help page'
		]
	},
	{
		version: '0.2.2',
		date: '2026-04-14',
		changes: [
			'Export current branch as markdown',
			'Expanded story map view',
			'Branch merging improvements',
			'Added back button from editor'
		]
	},
	{
		version: '0.2.1',
		date: '2026-04-12',
		changes: [
			'Allow branches to recombine',
		]
	},
	{
		version: '0.2.0',
		date: '2026-04-10',
		changes: ['Export to Twine format']
	}
];
