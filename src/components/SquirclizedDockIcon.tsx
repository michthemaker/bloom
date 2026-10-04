import { useEffect, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { analyzePixels, FALLBACK_ANALYSIS, type IconAnalysis } from "./icons_analysis";

const styles = stylex.create({
	base: {
		position: "relative",
		overflow: "hidden", // clips full-bleed icons to the squircle
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		flexShrink: 0,
		cornerShape: "superellipse(1.85)",
		backgroundColor: "rgba(255, 255, 255, 0.12)",
		boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 4px 10px rgba(0, 0, 0, 0.25)"
	},
	img: {
		position: "absolute",
		maxWidth: "none",
		objectFit: "contain",
		pointerEvents: "none",
		userSelect: "none",
		transitionProperty: "opacity",
		transitionDuration: "120ms"
	}
});

const SAMPLE_SIZE = 64;

interface LoadedIcon extends IconAnalysis {
	/** Natural image size, used to place the artwork precisely. */
	w: number;
	h: number;
}

const FALLBACK: LoadedIcon = { ...FALLBACK_ANALYSIS, w: 1, h: 1 };

// icon src -> analysis. Promises are cached too so one icon is only decoded once.
const cache = new Map<string, LoadedIcon>();
const pending = new Map<string, Promise<LoadedIcon>>();

function analyze(src: string): Promise<LoadedIcon> {
	return new Promise((resolve) => {
		const img = new Image();
		// Needed to read pixels from remote icons; data:/blob: URLs never taint the canvas.
		if (!/^(data|blob):/i.test(src)) img.crossOrigin = "anonymous";
		img.onload = () => {
			const w = img.naturalWidth || SAMPLE_SIZE;
			const h = img.naturalHeight || SAMPLE_SIZE;
			try {
				// Fit the whole image into the sample canvas without stretching it.
				const k = SAMPLE_SIZE / Math.max(w, h);
				const dw = w * k;
				const dh = h * k;
				const dx = (SAMPLE_SIZE - dw) / 2;
				const dy = (SAMPLE_SIZE - dh) / 2;
				const canvas = document.createElement("canvas");
				canvas.width = SAMPLE_SIZE;
				canvas.height = SAMPLE_SIZE;
				const ctx = canvas.getContext("2d", { willReadFrequently: true });
				if (!ctx) return resolve({ ...FALLBACK, w, h });
				ctx.drawImage(img, dx, dy, dw, dh);
				const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
				const result = analyzePixels(data, SAMPLE_SIZE, { x: dx, y: dy, w: dw, h: dh });
				resolve({ ...(result ?? FALLBACK_ANALYSIS), w, h });
			} catch {
				// Tainted canvas (CORS) or similar: still show the icon on the neutral tile.
				resolve({ ...FALLBACK, w, h });
			}
		};
		img.onerror = () => resolve(FALLBACK);
		img.src = src;
	});
}

function getIconAnalysis(src: string): Promise<LoadedIcon> {
	const hit = cache.get(src);
	if (hit) return Promise.resolve(hit);
	let p = pending.get(src);
	if (!p) {
		p = analyze(src).then((r) => {
			cache.set(src, r);
			pending.delete(src);
			return r;
		});
		pending.set(src, p);
	}
	return p;
}

/** Gradient (CSS `background-image` value) for the icon's tile. Kept for existing callers. */
export function getIconGradient(src: string): Promise<string> {
	return getIconAnalysis(src).then((a) => a.background);
}

/** Where to put the <img> so the artwork's longer side spans `fill` of the tile, centred. */
function place(a: LoadedIcon, size: number) {
	const longest = Math.max(a.box.w * a.w, a.box.h * a.h);
	const k = (size * a.fill) / longest;
	const width = a.w * k;
	const height = a.h * k;
	return {
		width,
		height,
		left: size / 2 - (a.box.x + a.box.w / 2) * width,
		top: size / 2 - (a.box.y + a.box.h / 2) * height
	};
}

interface SquirclizedDockIconProps {
	/** Icon image URL or data URI. `null` renders the fallback letter. */
	src: string | null;
	alt: string;
	/** Tile size in px (default 36, the size of `.dock-icon`). */
	size?: number;
	className?: string;
}

export function SquirclizedDockIcon({ src, alt, size = 36, className }: SquirclizedDockIconProps) {
	const [info, setInfo] = useState<LoadedIcon | null>(() => (src && cache.get(src)) || null);

	useEffect(() => {
		if (!src) {
			setInfo(null);
			return;
		}
		const hit = cache.get(src);
		if (hit) {
			setInfo(hit);
			return;
		}
		setInfo(null);
		let cancelled = false;
		getIconAnalysis(src).then((r) => {
			if (!cancelled) setInfo(r);
		});
		return () => {
			cancelled = true;
		};
	}, [src]);

	const tile = stylex.props(styles.base);
	const imgProps = stylex.props(styles.img);
	// Until the analysis is ready the image stays invisible, so it never jumps into place.
	const box = place(info ?? FALLBACK, size);

	return (
		<div
			className={className ? `${tile.className} ${className}` : tile.className}
			style={{
				width: size,
				height: size,
				borderRadius: Math.round(size * 0.44),
				backgroundImage: (info ?? FALLBACK).background
			}}
		>
			{src ? (
				<img
					{...imgProps}
					src={src}
					alt={alt}
					draggable={false}
					style={{ ...imgProps.style, ...box, opacity: info ? 1 : 0 }}
				/>
			) : (
				<span style={{ fontSize: size * 0.5, fontWeight: 600, color: "#fff" }}>
					{alt[0]?.toUpperCase()}
				</span>
			)}
		</div>
	);
}
