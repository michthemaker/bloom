// src/tokens.stylex.ts
import * as stylex from "@stylexjs/stylex";

export const bloom_tokens = stylex.defineVars({
	bloom_bg: "var(--bloom-bg, rgba(0, 0, 0, 0.8))",
	bloom_bg_expanded: "var(--bloom-bg-expanded, rgba(0, 0, 0, 0.92))",
	bloom_text: "var(--bloom-text, #ffffff)",
	bloom_text_muted: "var(--bloom-text-muted, rgba(255, 255, 255, 0.6))",
	bloom_border: "var(--bloom-border, rgba(255, 255, 255, 0.1))",
	bloom_group_bg: "var(--bloom-group-bg, rgba(255, 255, 255, 0.04))",
	bloom_accent: "var(--bloom-accent, #007aff)"
});

export const cursor_tokens = stylex.defineConsts({
	grab: 'url("/cursors/grab.svg"), grab',
	grabbing: 'url("/cursors/grabbing.svg"), grabbing'
});
