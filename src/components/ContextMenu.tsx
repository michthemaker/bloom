import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./ContextMenu.css";

export interface ContextMenuAction {
	label: string;
	onClick?: () => void;
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

	return (
		<div
			ref={menuRef}
			className="cm"
			style={{ left: x, top: y, zoom: scale }}
			onClick={(e) => e.stopPropagation()}
			onContextMenu={(e) => e.preventDefault()}
		>
			{items.map((item, i) => (
				<MenuEntry key={i} item={item} onClose={onClose} />
			))}
		</div>
	);
}

function MenuEntry({ item, onClose }: { item: ContextMenuAction; onClose: () => void }) {
	const hasSubmenu = item.submenu && item.submenu.length > 0;

	const handleClick = () => {
		if (item.disabled || hasSubmenu) return;
		item.onClick?.();
		onClose();
	};

	return (
		<>
			{item.dividerBefore && <div className="cm-divider" />}
			<div
				className={[
					"cm-item",
					hasSubmenu ? "cm-item-sub" : "",
					item.variant === "quit" ? "cm-item-quit" : "",
					item.disabled ? "cm-item-disabled" : ""
				]
					.filter(Boolean)
					.join(" ")}
				onClick={handleClick}
			>
				{item.icon && <span className="cm-item-icon">{item.icon}</span>}
				{item.label}
				{hasSubmenu && (
					<>
						<svg
							className="cm-sub-arrow"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth={3}
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<polyline points="9 18 15 12 9 6" />
						</svg>
						<div className="cm-submenu">
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
