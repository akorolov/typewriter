import type { StoryTree } from '../models/story.js';

export interface LayoutNode {
	id: string;
	x: number;
	y: number;
	label?: string;
}

export interface LayoutEdge {
	fromId: string;
	toId: string;
}

export interface TreeLayout {
	nodes: LayoutNode[];
	edges: LayoutEdge[];
	width: number;
	height: number;
}

const NODE_H_SPACING = 50;
const NODE_V_SPACING = 60;

/**
 * Simple top-down tree layout.
 * Assigns x positions by computing subtree widths, then centers parents above children.
 */
export function computeTreeLayout(tree: StoryTree): TreeLayout {
	const nodes: LayoutNode[] = [];
	const edges: LayoutEdge[] = [];

	if (!tree.nodes[tree.rootNodeId]) {
		return { nodes, edges, width: 0, height: 0 };
	}

	// Compute subtree widths (number of leaves in each subtree)
	const widths = new Map<string, number>();

	function computeWidth(nodeId: string): number {
		const node = tree.nodes[nodeId];
		if (!node || node.childIds.length === 0) {
			widths.set(nodeId, 1);
			return 1;
		}
		const w = node.childIds.reduce((sum, cid) => sum + computeWidth(cid), 0);
		widths.set(nodeId, w);
		return w;
	}

	computeWidth(tree.rootNodeId);

	// Assign positions
	function layout(nodeId: string, x: number, depth: number): void {
		const node = tree.nodes[nodeId];
		if (!node) return;

		const w = widths.get(nodeId) ?? 1;
		const centerX = x + (w * NODE_H_SPACING) / 2;

		nodes.push({
			id: nodeId,
			x: centerX,
			y: depth * NODE_V_SPACING + 20,
			label: node.label
		});

		let childX = x;
		for (const childId of node.childIds) {
			edges.push({ fromId: nodeId, toId: childId });
			const childW = widths.get(childId) ?? 1;
			layout(childId, childX, depth + 1);
			childX += childW * NODE_H_SPACING;
		}
	}

	layout(tree.rootNodeId, 0, 0);

	const totalWidth = (widths.get(tree.rootNodeId) ?? 1) * NODE_H_SPACING;
	const maxDepth = Math.max(...nodes.map((n) => n.y));

	return {
		nodes,
		edges,
		width: totalWidth,
		height: maxDepth + 40
	};
}
