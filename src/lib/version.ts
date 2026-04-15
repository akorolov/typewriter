export const VERSION = '0.2.2';

export interface ChangelogEntry {
	version: string;
	date: string;
	changes: string[];
}

export const changelog: ChangelogEntry[] = [
	{
		version: '0.2.2',
		date: '2026-04-14',
		changes: [
			'Export current branch as markdown',
			'Expanded story map view',
			'Branch merging improvements'
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
