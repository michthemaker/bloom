/**
 * Looks at an icon's pixels and decides, for any icon:
 *   - where the real artwork is        (box)
 *   - how big it should sit in a tile  (fill)
 *   - what the tile behind it looks like (background)
 *
 * No DOM access here, so it can be tested with plain pixel arrays.
 */

type Vec3 = [number, number, number];

export interface IconAnalysis {
	/** CSS `background-image` for the tile. */
	background: string;
	/** Fraction of the tile that the artwork's longer side should span. */
	fill: number;
	/** Tight bounds of the visible artwork, normalised to the natural image (0..1). */
	box: { x: number; y: number; w: number; h: number };
}

export interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

/* ---------------- tunables ---------------- */

const ALPHA_MIN = 0.5; // pixels fainter than this are treated as empty (drops soft shadows)
const GLYPH_FILL = 0.62; // size of a bare glyph inside its tile
const BLEED_FILL = 1.0; // size of an icon that is already a tile
const SAME = 0.1; // OKLab distance under which two colors count as "the same"
const VISIBLE_SAME = 0.08; // OKLab distance a pixel must differ from the tile to be "visible"
const VISIBLE_MIN = 0.02; // below this share of visible pixels, the artwork would vanish
const EDGE_UNIFORM_MIN = 0.55; // share of edge pixels that must agree to trust the edge color
const DEPTH_STRENGTH = 0.05; // OKLab lightness spread of the glyph-tile gradient
const LIGHT_TILE = 0.97;
const DARK_TILE = 0.3;
const NEUTRAL_SWITCH = 0.75; // artwork lighter than this gets a dark neutral tile, otherwise a light one

/** Share of opaque pixels in each bounding-box corner (TL, TR, BL, BR). */
function cornerFills(
	opaque: Uint8Array,
	size: number,
	x0: number,
	y0: number,
	x1: number,
	y1: number
): number[] {
	const cw = Math.max(2, Math.round((x1 - x0 + 1) * 0.2));
	const ch = Math.max(2, Math.round((y1 - y0 + 1) * 0.2));
	const fill = (cx: number, cy: number) => {
		let n = 0;
		for (let y = cy; y < cy + ch; y++) for (let x = cx; x < cx + cw; x++) n += opaque[y * size + x];
		return n / (cw * ch);
	};
	return [
		fill(x0, y0),
		fill(x1 - cw + 1, y0),
		fill(x0, y1 - ch + 1),
		fill(x1 - cw + 1, y1 - ch + 1)
	];
}

/* ---------------- color helpers (OKLab) ---------------- */

const toLinear = (c: number) => {
	c /= 255;
	return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (c: number) => {
	const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
	return Math.round(Math.min(1, Math.max(0, v)) * 255);
};

export function rgbToOklab(r: number, g: number, b: number): Vec3 {
	const lr = toLinear(r);
	const lg = toLinear(g);
	const lb = toLinear(b);
	const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
	const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
	const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
	];
}

export function oklabToRgb([L, a, b]: Vec3): Vec3 {
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [
		fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
		fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
		fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)
	];
}

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const smoothstep = (a: number, b: number, x: number) => {
	const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
};

/** CSS gradient: same hue, a touch lighter top-left and darker bottom-right. */
export function tileGradient(lab: Vec3, spread: number): string {
	const top = oklabToRgb([Math.min(0.99, lab[0] + spread), lab[1], lab[2]]);
	const bottom = oklabToRgb([Math.max(0.02, lab[0] - spread), lab[1], lab[2]]);
	return `linear-gradient(135deg, rgb(${top.join(" ")}), rgb(${bottom.join(" ")}))`;
}

export const FALLBACK_ANALYSIS: IconAnalysis = {
	background: tileGradient([0.58, -0.01, -0.02], DEPTH_STRENGTH),
	fill: GLYPH_FILL,
	box: { x: 0, y: 0, w: 1, h: 1 }
};

/* ---------------- analysis ---------------- */

/** Chebyshev distance from each opaque pixel to the nearest empty pixel (outside the canvas counts as empty). */
function depthMap(opaque: Uint8Array, size: number): Float32Array {
	const d = new Float32Array(size * size);
	const at = (x: number, y: number) =>
		x < 0 || y < 0 || x >= size || y >= size ? 0 : d[y * size + x];
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const i = y * size + x;
			if (!opaque[i]) continue;
			d[i] = Math.min(at(x - 1, y), at(x, y - 1), at(x - 1, y - 1), at(x + 1, y - 1)) + 1;
		}
	}
	for (let y = size - 1; y >= 0; y--) {
		for (let x = size - 1; x >= 0; x--) {
			const i = y * size + x;
			if (!opaque[i]) continue;
			d[i] = Math.min(
				d[i],
				Math.min(at(x + 1, y), at(x, y + 1), at(x + 1, y + 1), at(x - 1, y + 1)) + 1
			);
		}
	}
	return d;
}

/** Number of empty pixels fully enclosed by artwork (cut-outs), found by flood-filling the outside. */
function enclosedHoles(opaque: Uint8Array, size: number): number {
	const outside = new Uint8Array(size * size);
	const stack: number[] = [];
	const push = (x: number, y: number) => {
		if (x < 0 || y < 0 || x >= size || y >= size) return;
		const i = y * size + x;
		if (opaque[i] || outside[i]) return;
		outside[i] = 1;
		stack.push(i);
	};
	for (let k = 0; k < size; k++) {
		push(k, 0);
		push(k, size - 1);
		push(0, k);
		push(size - 1, k);
	}
	while (stack.length) {
		const i = stack.pop()!;
		const x = i % size;
		const y = (i - x) / size;
		push(x + 1, y);
		push(x - 1, y);
		push(x, y + 1);
		push(x, y - 1);
	}
	let holes = 0;
	for (let i = 0; i < size * size; i++) if (!opaque[i] && !outside[i]) holes++;
	return holes;
}

/** Most common color among the given pixels, and the share of pixels that agree with it. */
function dominant(indices: number[], lab: Float32Array): { color: Vec3; share: number } {
	const bins = new Map<string, { n: number; sum: Vec3 }>();
	for (const i of indices) {
		const L = lab[i * 3];
		const a = lab[i * 3 + 1];
		const b = lab[i * 3 + 2];
		const key = `${Math.round(L / 0.08)},${Math.round(a / 0.06)},${Math.round(b / 0.06)}`;
		const bin = bins.get(key) ?? { n: 0, sum: [0, 0, 0] as Vec3 };
		bin.n++;
		bin.sum[0] += L;
		bin.sum[1] += a;
		bin.sum[2] += b;
		bins.set(key, bin);
	}
	let best: { n: number; sum: Vec3 } | null = null;
	for (const bin of bins.values()) if (!best || bin.n > best.n) best = bin;
	let seed: Vec3 = best
		? [best.sum[0] / best.n, best.sum[1] / best.n, best.sum[2] / best.n]
		: [0.5, 0, 0];

	// Two refinement passes: average everything within SAME of the seed.
	let share = 0;
	for (let pass = 0; pass < 2; pass++) {
		const sum: Vec3 = [0, 0, 0];
		let n = 0;
		for (const i of indices) {
			const c: Vec3 = [lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2]];
			if (dist(c, seed) <= SAME) {
				sum[0] += c[0];
				sum[1] += c[1];
				sum[2] += c[2];
				n++;
			}
		}
		if (n) seed = [sum[0] / n, sum[1] / n, sum[2] / n];
		share = n / Math.max(1, indices.length);
	}
	return { color: seed, share };
}

/**
 * @param data  RGBA pixels (non-premultiplied), size*size*4 long
 * @param size  canvas side in pixels
 * @param area  region of the canvas the image actually covers (for letterboxed non-square images)
 */
export function analyzePixels(
	data: ArrayLike<number>,
	size: number,
	area?: Rect
): IconAnalysis | null {
	const n = size * size;
	const opaque = new Uint8Array(n);
	const lab = new Float32Array(n * 3);
	let count = 0;
	let inkL = 0;
	let minX = size;
	let minY = size;
	let maxX = -1;
	let maxY = -1;

	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const i = y * size + x;
			const o = i * 4;
			if (data[o + 3] / 255 < ALPHA_MIN) continue;
			const c = rgbToOklab(data[o], data[o + 1], data[o + 2]);
			opaque[i] = 1;
			lab[i * 3] = c[0];
			lab[i * 3 + 1] = c[1];
			lab[i * 3 + 2] = c[2];
			inkL += c[0];
			count++;
			if (x < minX) minX = x;
			if (x > maxX) maxX = x;
			if (y < minY) minY = y;
			if (y > maxY) maxY = y;
		}
	}
	if (count < 8) return null; // nothing visible
	inkL /= count;

	// 1) How much of its own bounding box does the artwork fill?
	//    ~1 for tiles and full-bleed art, ~0.5-0.8 for glyphs and cut-outs.
	const solidity = count / ((maxX - minX + 1) * (maxY - minY + 1));
	const tileLike = smoothstep(0.7, 0.92, solidity);

	// 2) What color is the silhouette? Sample a band just inside the edge,
	//    skipping the outermost pixels (anti-aliasing, thin rims, highlights).
	const depth = depthMap(opaque, size);
	let band: number[] = [];
	const all: number[] = [];
	for (let i = 0; i < n; i++) {
		if (!opaque[i]) continue;
		all.push(i);
		if (depth[i] >= 2 && depth[i] <= 4) band.push(i);
	}
	if (band.length < 12) band = all; // thin strokes: fall back to every pixel
	const edge = dominant(band, lab);

	const neutral = (): Vec3 => [inkL > NEUTRAL_SWITCH ? DARK_TILE : LIGHT_TILE, 0, 0];
	// 2b) Is it an object rather than a tile?
	//     (a) Uneven outline: a real tile or circle fills all four corners alike,
	//         a folder tab or a monitor's top bar does not.
	const corners = cornerFills(opaque, size, minX, minY, maxX, maxY);
	const unevenCorners = smoothstep(0.15, 0.4, Math.max(...corners) - Math.min(...corners));
	//     (b) Thick frame: the rim is one uniform color but most of the icon is another
	//         (grey bezel, dark screen). Thin rims fall outside the sampled band, so they're ignored.
	const body = dominant(all, lab);
	const framed = edge.share >= 0.5 ? smoothstep(0.1, 0.2, dist(edge.color, body.color)) : 0;
	const uneven = Math.max(unevenCorners, framed);

	// 3) Pick the tile color.
	let own = Math.min(tileLike, 1 - 0.7 * uneven); // objects never fill the tile (cap ≈ 0.3 → ~73%)
	const isTile = own >= 0.85;
	// Objects take their color from what covers most of the icon (the screen), not the rim (the bezel).
	const src = uneven > 0.5 ? body : edge;
	let tile: Vec3 = src.color;
	const trust = isTile || src.share >= (uneven > 0.5 ? 0.35 : EDGE_UNIFORM_MIN);
	if (!trust) {
		tile = neutral(); // multicolor glyph: neutral tile beats a random brand color
		own = 0;
	}

	// 4) Would the artwork disappear into that tile? (black logo on a black tile, or a
	//    logo whose letter is a transparent cut-out showing the tile through it.)
	//    A flat tile with no detail and no cut-outs is fine as it is.
	let visible = 0;
	for (const i of all) {
		const c: Vec3 = [lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2]];
		if (dist(c, tile) > VISIBLE_SAME) visible++;
	}
	const canVanish = own < 0.85 || enclosedHoles(opaque, size) / count > 0.01;
	if (canVanish && visible / count < VISIBLE_MIN) {
		tile = neutral();
		own = 0;
	}

	// 5) Layout and gradient follow from `own`.
	const fill = GLYPH_FILL + (BLEED_FILL - GLYPH_FILL) * own;
	const background = tileGradient(tile, DEPTH_STRENGTH * (1 - own));

	const ax = area?.x ?? 0;
	const ay = area?.y ?? 0;
	const aw = area?.w ?? size;
	const ah = area?.h ?? size;
	const x0 = Math.max(0, (minX - 0.5 - ax) / aw);
	const y0 = Math.max(0, (minY - 0.5 - ay) / ah);
	const x1 = Math.min(1, (maxX + 1.5 - ax) / aw);
	const y1 = Math.min(1, (maxY + 1.5 - ay) / ah);

	return { background, fill, box: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } };
}
