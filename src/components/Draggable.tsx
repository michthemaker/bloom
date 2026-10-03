import * as stylex from "@stylexjs/stylex";
import { cursor_tokens } from "../tokens.stylex";
import { ComponentPropsWithRef } from "react";

export const draggable_styles = stylex.create({
	base: {
		cursor: cursor_tokens.grab,
		":active": {
			cursor: cursor_tokens.grabbing
		},
		userSelect: "none",
		touchAction: "none"
	}
});

interface DraggableProps extends ComponentPropsWithRef<"div"> {}

export function Draggable({ children, className, ...props }: DraggableProps) {
	return (
		<div {...props} className={`${className} ${stylex.props(draggable_styles.base).className}`}>
			{children}
		</div>
	);
}
