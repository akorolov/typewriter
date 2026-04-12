import { openDB, type IDBPDatabase } from 'idb';
import type { StoryTree } from '../models/story.js';

const DB_NAME = 'typewriter';
const DB_VERSION = 1;
const STORE_NAME = 'stories';

interface TypewriterDB {
	stories: {
		key: string;
		value: StoryTree;
		indexes: { 'by-updated': number };
	};
}

let dbPromise: Promise<IDBPDatabase<TypewriterDB>> | null = null;

function getDb(): Promise<IDBPDatabase<TypewriterDB>> {
	if (!dbPromise) {
		dbPromise = openDB<TypewriterDB>(DB_NAME, DB_VERSION, {
			upgrade(db) {
				const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
				store.createIndex('by-updated', 'updatedAt');
			}
		});
	}
	return dbPromise;
}

export async function saveStory(story: StoryTree): Promise<void> {
	const db = await getDb();
	await db.put(STORE_NAME, story);
}

export async function loadStory(id: string): Promise<StoryTree | undefined> {
	const db = await getDb();
	return db.get(STORE_NAME, id);
}

export async function deleteStory(id: string): Promise<void> {
	const db = await getDb();
	await db.delete(STORE_NAME, id);
}

export async function listStories(): Promise<StoryTree[]> {
	const db = await getDb();
	const stories = await db.getAllFromIndex(STORE_NAME, 'by-updated');
	return stories.reverse(); // Most recently updated first
}
