// src/tokens.stylex.ts
import * as stylex from "@stylexjs/stylex";

export const bloom_tokens = stylex.defineConsts({
	bloom_bg: "--bloom-bg",
	bloom_bg_expanded: "--bloom-bg-expanded",
	bloom_text: "--bloom-text",
	bloom_text_muted: "--bloom-text-muted",
	bloom_border: "--bloom-border",
	bloom_group_bg: "--bloom-group-bg",
	bloom_accent: "--bloom-accent"
} as const);

export const cursor_tokens = stylex.defineConsts({
	grab: 'url("/cursors/grab.svg"), grab',
	grabbing: 'url("/cursors/grabbing.svg"), grabbing'
});
