import { IconSvgObject } from "@hugeicons/core-free-icons/types";
import type { SettingRowProps } from "./types";
import { HugeiconsIcon } from "@hugeicons/react";

function isIconSvgObject(icon: any): icon is IconSvgObject {
	return Array.isArray(icon) && typeof icon[0][0] === "string";
}

export function SettingRow({
	icon: Icon,
	label,
	desc,
	action,
	danger,
	divider = true,
	onClick,
	children
}: SettingRowProps) {
	const className = ["setting-item", action ? "action" : "", danger ? "danger" : ""]
		.filter(Boolean)
		.join(" ");

	return (
		<>
			<div className={className} onClick={onClick}>
				<div className="setting-icon-bg">
					{isIconSvgObject(Icon) ? (
						<HugeiconsIcon icon={Icon} size={16} strokeWidth={1.5} />
					) : (
						<Icon size={14} strokeWidth={1.5} />
					)}
				</div>
				<div className="setting-info">
					<span className="setting-label">{label}</span>
					{desc && <span className="setting-desc">{desc}</span>}
				</div>
				{children}
			</div>
			{divider && <div className="setting-divider" />}
		</>
	);
}
