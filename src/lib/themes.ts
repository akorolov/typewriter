/**
 * Theme definitions for the Typewriter app.
 * Add new themes by adding objects to the `themes` array.
 */

export interface ThemeColors {
	'base-100': string;
	'base-200': string;
	'base-300': string;
	'base-content': string;
	primary: string;
	'primary-content': string;
	secondary: string;
	'secondary-content': string;
	accent: string;
	'accent-content': string;
	neutral: string;
	'neutral-content': string;
	error: string;
	'error-content': string;
}

export interface Theme {
	name: string;
	label: string;
	colors: ThemeColors;
}

export const themes: Theme[] = [
	{
		name: 'typewriter-light',
		label: 'Light',
		colors: {
			'base-100': '#f0eeeb',
			'base-200': '#ebdfce',
			'base-300': '#d6cdbf',
			'base-content': '#010c15',
			primary: '#006898',
			'primary-content': '#f0eeeb',
			secondary: '#204b65',
			'secondary-content': '#f0eeeb',
			accent: '#63a7b2',
			'accent-content': '#010c15',
			neutral: '#010c15',
			'neutral-content': '#f0eeeb',
			error: '#ce1921',
			'error-content': '#f0eeeb'
		}
	},
	{
		name: 'typewriter-dark',
		label: 'Dark',
		colors: {
			// Placeholder — swap these out later
			'base-100': '#0f1923',
			'base-200': '#162231',
			'base-300': '#1e2d3d',
			'base-content': '#f0eeeb',
			primary: '#63a7b2',
			'primary-content': '#010c15',
			secondary: '#006898',
			'secondary-content': '#f0eeeb',
			accent: '#63a7b2',
			'accent-content': '#010c15',
			neutral: '#f0eeeb',
			'neutral-content': '#010c15',
			error: '#ce1921',
			'error-content': '#f0eeeb'
		}
	}
];

export const defaultTheme = themes[0].name;
