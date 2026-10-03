import { useEffect, useState } from "react";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
	base: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		flexShrink: 0,
		cornerShape: "superellipse(1.85)",
		backgroundColor: "rgba(255, 255, 255, 0.12)",
		boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 4px 10px rgba(0, 0, 0, 0.25)"
	},
	img: {
		width: "66%",
		height: "66%",
		objectFit: "contain",
		pointerEvents: "none",
		userSelect: "none"
	}
});

const FALLBACK_GRADIENT = "linear-gradient(135deg, hsl(215 18% 52%), hsl(215 18% 32%))";
const SAMPLE_SIZE = 16;

// icon src -> gradient. Promises are cached too so one icon is only decoded once.
const gradientCache = new Map<string, string>();
const pendingCache = new Map<string, Promise<string>>();

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	if (max === min) return [0, 0, l];
	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	let h = 0;
	if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
	else if (max === g) h = (b - r) / d + 2;
	else h = (r - g) / d + 4;
	return [h * 60, s, l];
}

function gradientFromHsl(h: number, s: number): string {
	// Clamp so every tile reads as a mid-tone glass tile, whatever the icon colors are.
	const sat = Math.round(Math.min(0.85, Math.max(0.25, s)) * 100);
	const top = `hsl(${Math.round(h)} ${sat}% 58%)`;
	const bottom = `hsl(${Math.round(h)} ${sat}% 36%)`;
	return `linear-gradient(135deg, ${top}, ${bottom})`;
}

function computeGradient(src: string): Promise<string> {
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement("canvas");
			canvas.width = SAMPLE_SIZE;
			canvas.height = SAMPLE_SIZE;
			const ctx = canvas.getContext("2d", { willReadFrequently: true });
			if (!ctx) return resolve(FALLBACK_GRADIENT);
			ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
			const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

			// Hue is averaged as a vector (x, y) so 350deg and 10deg blend to 0deg, not 180deg.
			let x = 0;
			let y = 0;
			let satSum = 0;
			let weightSum = 0;
			for (let i = 0; i < data.length; i += 4) {
				const a = data[i + 3] / 255;
				if (a < 0.5) continue;
				const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
				if (l > 0.93 || l < 0.07) continue; // skip near-white and near-black pixels
				const weight = a * (s + 0.05); // vivid pixels decide the tint
				const rad = (h * Math.PI) / 180;
				x += Math.cos(rad) * weight;
				y += Math.sin(rad) * weight;
				satSum += s * weight;
				weightSum += weight;
			}
			if (weightSum === 0) return resolve(FALLBACK_GRADIENT);
			const hue = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
			resolve(gradientFromHsl(hue, satSum / weightSum));
		};
		img.onerror = () => resolve(FALLBACK_GRADIENT);
		img.src = src;
	});
}

/** Gradient (CSS `background-image` value) derived from the icon's dominant color. */
export function getIconGradient(src: string): Promise<string> {
	const cached = gradientCache.get(src);
	if (cached) return Promise.resolve(cached);
	let pending = pendingCache.get(src);
	if (!pending) {
		pending = computeGradient(src).then((g) => {
			gradientCache.set(src, g);
			pendingCache.delete(src);
			return g;
		});
		pendingCache.set(src, pending);
	}
	return pending;
}

interface SquirclizedDockIconProps {
	/** Icon image URL or data URI. `null` renders the fallback letter. */
	src: string | null;
	alt: string;
	/** Tile size in px (default 32, the size of `.dock-icon`). */
	size?: number;
	className?: string;
}

export function SquirclizedDockIcon({ src, alt, size = 32, className }: SquirclizedDockIconProps) {
	const [gradient, setGradient] = useState<string>(
		() => (src && gradientCache.get(src)) || FALLBACK_GRADIENT
	);

	useEffect(() => {
		if (!src) {
			setGradient(FALLBACK_GRADIENT);
			return;
		}
		let cancelled = false;
		getIconGradient(src).then((g) => {
			if (!cancelled) setGradient(g);
		});
		return () => {
			cancelled = true;
		};
	}, [src]);

	const tile = stylex.props(styles.base);
	return (
		<div
			className={className ? `${tile.className} ${className}` : tile.className}
			style={{
				width: size,
				height: size,
				borderRadius: Math.round(size * 0.44),
				backgroundImage: gradient
			}}
		>
			{src ? (
				<img {...stylex.props(styles.img)} src={src} alt={alt} draggable={false} />
			) : (
				<span style={{ fontSize: size * 0.5, fontWeight: 600, color: "#fff" }}>
					{alt[0]?.toUpperCase()}
				</span>
			)}
		</div>
	);
}

