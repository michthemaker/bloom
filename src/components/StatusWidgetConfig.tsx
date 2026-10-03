import { useState, useEffect, useCallback, useRef } from "react";
import {
	DndContext,
	DragOverlay,
	PointerSensor,
	useSensor,
	useSensors,
	useDroppable,
	useDraggable,
	rectIntersection,
	type DragEndEvent,
	type DragStartEvent
} from "@dnd-kit/core";
import {
	SortableContext,
	horizontalListSortingStrategy,
	useSortable,
	arrayMove
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { HugeiconsIcon } from "@hugeicons/react";
import { IconSvgObject } from "@hugeicons/core-free-icons/types";
import {
	ArrowDataTransferHorizontalIcon,
	ArrowDataTransferVerticalIcon,
	BatteryCharging01Icon,
	ChevronDownIcon,
	ChevronUpIcon,
	CloudSunRainIcon,
	CpuIcon,
	HardDriveIcon,
	RamMemoryIcon,
	XIcon
} from "@hugeicons/core-free-icons";
import { Draggable } from "./Draggable";
import * as stylex from "@stylexjs/stylex";
import { bloom_tokens } from "../tokens.stylex";

export interface WidgetConfig {
	left: string[];
	right: string[];
}

interface WidgetDef {
	id: string;
	label: string;
	icon: IconSvgObject;
	color: string;
}

const WIDGET_DEFS: WidgetDef[] = [
	{ id: "weather", label: "Weather", icon: CloudSunRainIcon, color: "#60a5fa" },
	{ id: "battery", label: "Battery", icon: BatteryCharging01Icon, color: "#4ade80" },
	{ id: "cpu", label: "CPU", icon: CpuIcon, color: "#f97316" },
	{ id: "ram", label: "RAM", icon: RamMemoryIcon, color: "#a78bfa" },
	{ id: "disk", label: "Disk", icon: HardDriveIcon, color: "#38bdf8" },
	{ id: "net", label: "Net", icon: ArrowDataTransferVerticalIcon, color: "#2dd4bf" }
];

const DEFAULT_CONFIG: WidgetConfig = {
	left: ["weather"],
	right: ["battery"]
};

const MAX_PER_ZONE = 2;

const styles = stylex.create({
	widget_pill: {
		display: "inline-flex",
		alignItems: "center",
		gap: "5px",
		paddingBlock: "4px",
		paddingInline: "6px",
		borderRadius: "12px",
		cornerShape: "superellipse(1.85)",
		fontSize: "11px",
		fontWeight: 500,
		color: `var(${bloom_tokens.bloom_text}, rgba(255, 255, 255, 0.7))`,
		whiteSpace: "nowrap",
		userSelect: "none"
	},
	widget_pill_placed: {
		backgroundColor: "rgba(255, 255, 255, 0.07)",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: "rgba(255, 255, 255, 0.06)",
		cursor: "default",
		gap: 0
	},
	widget_pill_drag_handle: {
		display: "inline-flex",
		alignItems: "center",
		gap: "5px",
		paddingBlock: "2px",
		paddingInline: "4px",
		borderRadius: "4px",
		flexGrow: 1,
		flexShrink: 1,
		flexBasis: "auto",
		minWidth: 0
	},
	widget_pill_available: {
		backgroundColor: {
			default: `var(${bloom_tokens.bloom_group_bg}, rgba(255, 255, 255, 0.03))`,
			":hover": "rgba(255, 255, 255, 0.06)"
		},
		borderWidth: "1px",
		borderStyle: "dashed",
		borderColor: {
			default: `rgba(255, 255, 255, 0.08)`,
			":hover": `rgba(255, 255, 255, 0.12)`
		},
		paddingBlock: "6px",
		paddingInlineStart: "8px",
		paddingInlineEnd: "10px",
		transition: `
			background-color 0.1s,
			border-color 0.1s`
	},
	widget_pill_dragging: {
		opacity: 0.5,
		backgroundColor: `rgba(96, 165, 250, 0.15)`,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: `rgba(96, 165, 250, 0.3)`
	},
	widget_config: {
		marginInline: "14px",
		display: "flex",
		flexDirection: "column",
		gap: "8px"
	},
	widget_config_zone: {
		display: "flex",
		alignItems: "center",
		gap: "10px",
		marginBlockStart: "12px",
		paddingBlock: "4px",
		paddingInline: "8px",
		borderRadius: "18px",
		borderColor: "transparent",
		cornerShape: "superellipse(1.85)",
		borderWidth: "1px",
		borderStyle: "dashed",
		transitionProperty: "border-color, background-color",
		transitionDuration: "0.15s",
		minHeight: "34px"
	},
	widget_config_zone_over: {
		borderColor: "rgba(96, 165, 250, 0.4)",
		backgroundColor: "rgba(96, 165, 250, 0.06)"
	},
	widget_config_side: {
		fontSize: "10px",
		fontWeight: 600,
		textTransform: "uppercase",
		letterSpacing: "0.5px",
		color: `var(${bloom_tokens.bloom_text_muted}, rgba(255, 255, 255, 0.25))`,
		width: "40px",
		flexShrink: 0
	},
	widget_config_chips: {
		display: "flex",
		alignItems: "center",
		flexWrap: "wrap",
		gap: "6px",
		flexGrow: 1,
		flexShrink: 1,
		flexBasis: "0%",
		minHeight: "24px"
	},
	widget_config_empty: {
		fontSize: "11px",
		color: `var(${bloom_tokens.bloom_text_muted}, rgba(255, 255, 255, 0.15))`,
		fontStyle: "italic"
	},
	widget_pill_btns: {
		display: "flex",
		alignItems: "center",
		gap: "1px",
		marginLeft: "2px"
	},
	widget_pill_btn: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		width: "14px",
		height: "14px",
		borderWidth: "0",
		borderStyle: "none",
		borderColor: "transparent",
		borderRadius: "3px",
		backgroundColor: "transparent",
		color: `var(${bloom_tokens.bloom_text_muted}, rgba(255, 255, 255, 0.2))`,
		cursor: "pointer",
		paddingBlock: "0",
		paddingInline: "0",
		transitionProperty: "background-color, color",
		transitionDuration: "0.1s",
		":hover": {
			backgroundColor: "rgba(255, 255, 255, 0.12)",
			color: `var(${bloom_tokens.bloom_text}, rgba(255, 255, 255, 0.7))`
		}
	},
	widget_pill_btn_x: {
		":hover": {
			backgroundColor: "rgba(239, 68, 68, 0.25)",
			color: "#ef4444"
		}
	},
	widget_config_pool: {
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderTopColor: `var(${bloom_tokens.bloom_border}, rgba(255, 255, 255, 0.06))`,
		paddingTop: "8px",
		paddingBlock: "10px"
	},
	widget_config_pool_chips: {
		display: "flex",
		flexWrap: "wrap",
		gap: "6px"
	}
});

/* ── Draggable pool chip ── */
function PoolChip({ id }: { id: string }) {
	const def = WIDGET_DEFS.find((w) => w.id === id)!;
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
	const Icon = def.icon;
	return (
		<Draggable
			ref={setNodeRef}
			className={`${stylex.props(styles.widget_pill, styles.widget_pill_available).className} ${isDragging && "dragging"}`}
			{...listeners}
			{...attributes}
		>
			<HugeiconsIcon icon={Icon} size={12} strokeWidth={2} color={def.color} />
			<span>{def.label}</span>
		</Draggable>
	);
}

/* ── Sortable placed chip ── */
function SortablePlacedChip({
	id,
	idx,
	total,
	onSwap,
	onRemove,
	onMove
}: {
	id: string;
	idx: number;
	total: number;
	onSwap: (id: string) => void;
	onRemove: (id: string) => void;
	onMove: (id: string, dir: -1 | 1) => void;
}) {
	const def = WIDGET_DEFS.find((w) => w.id === id)!;
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.4 : 1,
		zIndex: isDragging ? 50 : ("auto" as const)
	};

	const Icon = def.icon;

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`${stylex.props(styles.widget_pill, styles.widget_pill_placed).className} ${isDragging && "dragging"}`}
		>
			<Draggable
				{...attributes}
				{...listeners}
				className={stylex.props(styles.widget_pill_drag_handle).className}
			>
				<HugeiconsIcon icon={Icon} size={12} strokeWidth={2} color={def.color} />
				<span>{def.label}</span>
			</Draggable>
			<div className={stylex.props(styles.widget_pill_btns).className}>
				{idx > 0 && (
					<button
						className={stylex.props(styles.widget_pill_btn).className}
						onClick={() => onMove(id, -1)}
					>
						<HugeiconsIcon icon={ChevronUpIcon} size={10} strokeWidth={2} />
					</button>
				)}
				{idx < total - 1 && (
					<button
						className={stylex.props(styles.widget_pill_btn).className}
						onClick={() => onMove(id, 1)}
					>
						<HugeiconsIcon icon={ChevronDownIcon} size={10} strokeWidth={2} />
					</button>
				)}
				<button
					className={stylex.props(styles.widget_pill_btn).className}
					title="Swap side"
					onClick={() => onSwap(id)}
				>
					<HugeiconsIcon icon={ArrowDataTransferHorizontalIcon} size={10} strokeWidth={2} />
				</button>
				<button
					className={stylex.props(styles.widget_pill_btn, styles.widget_pill_btn_x).className}
					title="Remove"
					onClick={() => onRemove(id)}
				>
					<HugeiconsIcon icon={XIcon} size={10} strokeWidth={2} />
				</button>
			</div>
		</div>
	);
}

/* ── Droppable zone ── */
function DropZone({
	id,
	side,
	items,
	onSwap,
	onRemove,
	onMove
}: {
	id: string;
	side: "left" | "right";
	items: string[];
	onSwap: (id: string) => void;
	onRemove: (id: string) => void;
	onMove: (id: string, dir: -1 | 1) => void;
}) {
	const { setNodeRef, isOver } = useDroppable({ id });
	return (
		<div
			ref={setNodeRef}
			className={
				stylex.props(styles.widget_config_zone, isOver && styles.widget_config_zone_over).className
			}
		>
			<span className={stylex.props(styles.widget_config_side).className}>
				{side === "left" ? "Left" : "Right"}
			</span>
			<div className={stylex.props(styles.widget_config_chips).className}>
				<SortableContext items={items} strategy={horizontalListSortingStrategy}>
					{items.length > 0 ? (
						items.map((itemId, i) => (
							<SortablePlacedChip
								key={itemId}
								id={itemId}
								idx={i}
								total={items.length}
								onSwap={onSwap}
								onRemove={onRemove}
								onMove={onMove}
							/>
						))
					) : (
						<span className={stylex.props(styles.widget_config_empty).className}>Drop here</span>
					)}
				</SortableContext>
			</div>
		</div>
	);
}

/* ── Main component ── */
interface StatusWidgetConfigProps {
	value: WidgetConfig;
	onChange: (config: WidgetConfig) => void;
}

export function StatusWidgetConfig({ value, onChange }: StatusWidgetConfigProps) {
	const [config, setConfig] = useState<WidgetConfig>(() => value || DEFAULT_CONFIG);
	const [activeId, setActiveId] = useState<string | null>(null);
	const draggedFromZone = useRef<"left" | "right" | null>(null);

	useEffect(() => {
		setConfig(value || DEFAULT_CONFIG);
	}, [value]);

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

	const allPlaced = new Set([...config.left, ...config.right]);
	const pool = WIDGET_DEFS.filter((w) => !allPlaced.has(w.id)).map((w) => w.id);

	const emit = (next: WidgetConfig) => {
		setConfig(next);
		onChange(next);
	};

	const remove = (id: string) => {
		emit({
			left: config.left.filter((x) => x !== id),
			right: config.right.filter((x) => x !== id)
		});
	};

	const swapSide = (id: string) => {
		if (config.left.includes(id)) {
			emit({ left: config.left.filter((x) => x !== id), right: [...config.right, id] });
		} else {
			emit({ right: config.right.filter((x) => x !== id), left: [...config.left, id] });
		}
	};

	const moveInSide = (id: string, dir: -1 | 1) => {
		for (const side of ["left", "right"] as const) {
			const arr = config[side];
			const idx = arr.indexOf(id);
			if (idx === -1) continue;
			const swap = idx + dir;
			if (swap < 0 || swap >= arr.length) return;
			emit({ ...config, [side]: arrayMove(arr, idx, swap) });
			return;
		}
	};

	const getZoneOf = (itemId: string): "left" | "right" | "pool" | null => {
		if (config.left.includes(itemId)) return "left";
		if (config.right.includes(itemId)) return "right";
		if (pool.includes(itemId)) return "pool";
		return null;
	};

	const handleDragStart = useCallback(
		(event: DragStartEvent) => {
			const id = event.active.id as string;
			setActiveId(id);
			const zone = getZoneOf(id);
			draggedFromZone.current = zone === "pool" ? null : (zone as "left" | "right" | null);
		},
		[config, pool]
	);

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			const { active, over } = event;
			setActiveId(null);
			if (!over) return;

			const itemId = active.id as string;
			const overId = over.id as string;
			const sourceZone = draggedFromZone.current;
			const isPoolItem = pool.includes(itemId);

			// Determine target zone
			let targetZone: "left" | "right" | null = null;
			if (overId === "zone-left" || overId === "zone-right") {
				targetZone = overId === "zone-left" ? "left" : "right";
			} else if (config.left.includes(overId)) {
				targetZone = "left";
			} else if (config.right.includes(overId)) {
				targetZone = "right";
			}

			// Pool item → add to zone
			if (isPoolItem && targetZone) {
				if (config[targetZone].length >= MAX_PER_ZONE) return;
				emit({ ...config, [targetZone]: [...config[targetZone], itemId] });
				return;
			}

			// Zone item → reorder or move
			if (sourceZone && targetZone) {
				if (sourceZone === targetZone) {
					// Reorder within zone
					const arr = config[sourceZone];
					const oldIdx = arr.indexOf(itemId);
					const newIdx = arr.indexOf(overId);
					if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
						emit({ ...config, [sourceZone]: arrayMove(arr, oldIdx, newIdx) });
					}
				} else {
					// Move between zones
					if (config[targetZone].length >= MAX_PER_ZONE) return;
					const newSource = config[sourceZone].filter((x) => x !== itemId);
					const targetArr = [...config[targetZone]];
					const insertIdx = targetArr.indexOf(overId);
					if (insertIdx >= 0) {
						targetArr.splice(insertIdx, 0, itemId);
					} else {
						targetArr.push(itemId);
					}
					emit({ ...config, [sourceZone]: newSource, [targetZone]: targetArr });
				}
				return;
			}

			// Pool item missed all zones — check pointer overlap for empty zones
			if (isPoolItem && !targetZone && active.rect.current.initial) {
				const rect = active.rect.current.initial;
				const delta = event.delta;
				const cx = rect.left + rect.width / 2 + delta.x;
				const cy = rect.top + rect.height / 2 + delta.y;

				for (const side of ["left", "right"] as const) {
					if (config[side].length >= MAX_PER_ZONE) continue;
					const el = document.getElementById(`zone-${side}`);
					if (!el) continue;
					const r = el.getBoundingClientRect();
					if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) {
						emit({ ...config, [side]: [...config[side], itemId] });
						return;
					}
				}
			}
		},
		[config, pool]
	);

	const activeDef = activeId ? WIDGET_DEFS.find((w) => w.id === activeId) : null;

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={rectIntersection}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
		>
			<div className={stylex.props(styles.widget_config).className}>
				<DropZone
					id="zone-left"
					side="left"
					items={config.left}
					onSwap={swapSide}
					onRemove={remove}
					onMove={moveInSide}
				/>
				<DropZone
					id="zone-right"
					side="right"
					items={config.right}
					onSwap={swapSide}
					onRemove={remove}
					onMove={moveInSide}
				/>

				{pool.length > 0 && (
					<div className={stylex.props(styles.widget_config_pool).className}>
						<div className={stylex.props(styles.widget_config_pool_chips).className}>
							{pool.map((id) => (
								<PoolChip key={id} id={id} />
							))}
						</div>
					</div>
				)}
			</div>

			<DragOverlay>
				{activeDef ? (
					<div className={stylex.props(styles.widget_pill, styles.widget_pill_dragging).className}>
						<HugeiconsIcon
							icon={activeDef.icon}
							size={12}
							strokeWidth={2}
							color={activeDef.color}
						/>
						<span>{activeDef.label}</span>
					</div>
				) : null}
			</DragOverlay>
		</DndContext>
	);
}
