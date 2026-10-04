import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { createPortal } from "react-dom";
import * as stylex from "@stylexjs/stylex";
import { bloom_tokens } from "../tokens.stylex";

const styles = stylex.create({
	menu: {
		position: "fixed",
		backgroundColor: bloom_tokens.bloom_bg,
		backdropFilter: `blur(20px)`,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: bloom_tokens.bloom_border,
		cornerShape: `superellipse(1.85)`,
		padding: `6px`,
		zIndex: `9999`,
		boxShadow: `0 10px 30px rgba(0, 0, 0, 0.5)`,
		minWidth: `160px`,
		pointerEvents: `auto`,
		display: `flex`,
		flexDirection: `column`,
		fontFamily: `inherit`
	},
	item: {
		paddingInline: "12px",
		paddingBlock: "8px",
		color: bloom_tokens.bloom_text,
		fontSize: `13px`,
		borderRadius: `22px`,
		cornerShape: `superellipse(1.85)`,
		cursor: `pointer`,
		fontWeight: 500,
		userSelect: `none`,
		transition: `background 0.15s ease`,
		backgroundColor: {
			default: "transparent",
			":hover": "#fff"
		}
	},
	item_quit: {
		backgroundColor: {
			default: null,
			":hover": "#ef4444"
		}
	},
	item_disabled: {
		opacity: 0.4,
		pointerEvents: "none"
	},
	divider: {
		height: `1px`,
		backgroundColor: bloom_tokens.bloom_border,
		marginInline: "8px",
		marginBlock: "4px",
		flexShrink: 0
	},
	// submenu trigger row
	item_sub: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		position: "relative",
		backgroundColor: {
			default: "transparent",
			":hover": "#3b82f6"
		},
		color: {
			default: null,
			":hover": "#fff"
		}
	},
	sub_arrow: {
		width: "14px",
		height: "14px",
		opacity: {
			default: 0.5,
			[stylex.when.ancestor(":hover")]: 1
		},
		flexShrink: 0,
		marginLeft: "10px"
	},
	submenu: {
		"::before": {
			content: "",
			position: "absolute",
			left: "-20px",
			top: "-20px",
			bottom: "-20px",
			width: "24px",
			zIndex: -1
		},
		display: {
			default: "none",
			[stylex.when.ancestor(":hover")]: "flex"
		},
		position: "absolute",
		left: "calc(100% + 4px)",
		top: "-6px",
		backgroundColor: bloom_tokens.bloom_bg_expanded,
		backdropFilter: "blur(25px)",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: bloom_tokens.bloom_border,
		borderRadius: "28px",
		cornerShape: "superellipse(1.85)",
		paddingInline: "6px",
		paddingBlock: "6px",
		minWidth: "140px",
		flexDirection: "column",
		boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
		zIndex: 10000
	},
	item_icon: {}
});

export interface ContextMenuAction {
	label: string;
	onClick?: (event: Pick<React.MouseEvent<HTMLDivElement>, "stopPropagation">) => void;
	/** Red destructive highlight on hover */
	variant?: "default" | "quit";
	disabled?: boolean;
	/** Renders a divider line above this item */
	dividerBefore?: boolean;
	submenu?: ContextMenuAction[];
	icon?: React.ReactNode;
}

interface ContextMenuProps {
	x: number;
	y: number;
	items: ContextMenuAction[];
	onClose: () => void;
	/** Scale factor of the parent window (default 1) */
	scale?: number;
}

export function ContextMenu({ x, y, items, onClose, scale = 1 }: ContextMenuProps) {
	const menuRef = useRef<HTMLDivElement>(null);

	// Tell Bloom's backend the menu rect so the notch stays open
	useEffect(() => {
		if (!menuRef.current) return;
		const r = menuRef.current.getBoundingClientRect();
		invoke("set_menu_open", {
			open: true,
			rect: {
				x: Math.round(r.x),
				y: Math.round(r.y),
				width: Math.round(r.width),
				height: Math.round(r.height)
			}
		}).catch(() => {});

		return () => {
			invoke("set_menu_open", { open: false, rect: null }).catch(() => {});
		};
	}, []);

	// Close on outside click or Escape
	useEffect(() => {
		const handlePointerDown = (e: PointerEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				onClose();
			}
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("pointerdown", handlePointerDown);
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("pointerdown", handlePointerDown);
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [onClose]);

	return createPortal(
		<div
			ref={menuRef}
			className={stylex.props(styles.menu).className}
			style={{ left: x, top: y, zoom: scale }}
			onClick={(e) => e.stopPropagation()}
			onContextMenu={(e) => e.preventDefault()}
		>
			{items.map((item, i) => (
				<MenuEntry key={i} item={item} onClose={onClose} />
			))}
		</div>,
		document.body
	);
}

function MenuEntry({ item, onClose }: { item: ContextMenuAction; onClose: () => void }) {
	const hasSubmenu = item.submenu && item.submenu.length > 0;

	const handleClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
		if (item.disabled || hasSubmenu) return;
		item.onClick?.(event);
		onClose();
	};

	return (
		<>
			{item.dividerBefore && <div className={stylex.props(styles.divider).className} />}
			<div
				className={
					stylex.props(
						styles.item,
						hasSubmenu && styles.item_sub,
						item.variant === "quit" && styles.item_quit,
						item.disabled && styles.item_disabled
					).className
				}
				onClick={handleClick}
			>
				{item.icon && <span className={stylex.props(styles.item_icon).className}>{item.icon}</span>}
				{item.label}
				{hasSubmenu && (
					<>
						<svg
							className={stylex.props(styles.sub_arrow).className}
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth={3}
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<polyline points="9 18 15 12 9 6" />
						</svg>
						<div className={stylex.props(styles.submenu).className}>
							{item.submenu!.map((sub, j) => (
								<MenuEntry key={j} item={sub} onClose={onClose} />
							))}
						</div>
					</>
				)}
			</div>
		</>
	);
}

/**
 * Hook — manages open/close state and cursor position.
 *
 * Usage:
 *   const menu = useMenu();
 *   <button onClick={menu.open}>Trigger</button>
 *   {menu.isOpen && (
 *     <ContextMenu x={menu.x} y={menu.y} items={[...]} onClose={menu.close} />
 *   )}
 */
export function useMenu() {
	const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

	const open = (e: React.MouseEvent) => {
		e.stopPropagation();
		setPos({ x: e.clientX, y: e.clientY });
	};

	const openAt = (x: number, y: number) => setPos({ x, y });

	const close = () => setPos(null);

	return {
		isOpen: pos !== null,
		x: pos?.x ?? 0,
		y: pos?.y ?? 0,
		open,
		openAt,
		close
	};
}
