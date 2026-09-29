import { SettingRow } from "./SettingRow";
import {
	BatteryLowIcon,
	Clock01Icon,
	LogOutIcon,
	PowerIcon,
	Refresh01Icon
} from "@hugeicons/core-free-icons";

interface GeneralTabProps {
	autostart: boolean;
	toggleAutostart: () => void;
	timeFormat24h: boolean;
	toggleTimeFormat24h: () => void;
	lowBatteryThreshold: number;
	handleThresholdChange: (val: number) => void;
	restartBloom: () => void;
	quitBloom: () => void;
}

export function GeneralTab({
	autostart,
	toggleAutostart,
	timeFormat24h,
	toggleTimeFormat24h,
	lowBatteryThreshold,
	handleThresholdChange,
	restartBloom,
	quitBloom
}: GeneralTabProps) {
	return (
		<>
			<div className="setting-group-label">System</div>
			<div className="setting-group">
				<SettingRow icon={PowerIcon} label="Launch at Login" desc="Open Bloom automatically">
					<label className="toggle-switch">
						<input type="checkbox" checked={autostart} onChange={toggleAutostart} />
						<span className="slider"></span>
					</label>
				</SettingRow>

				<SettingRow icon={Clock01Icon} label="24-Hour Time" desc="Use 24-hour clock format">
					<label className="toggle-switch">
						<input type="checkbox" checked={timeFormat24h} onChange={toggleTimeFormat24h} />
						<span className="slider"></span>
					</label>
				</SettingRow>

				<SettingRow
					icon={BatteryLowIcon}
					label="Low Battery Alert"
					desc={`Trigger at ${lowBatteryThreshold}%`}
					divider={false}
				>
					<input
						type="range"
						min="5"
						max="50"
						step="5"
						value={lowBatteryThreshold}
						onChange={(e) => handleThresholdChange(parseInt(e.target.value))}
						className="settings-slider"
					/>
				</SettingRow>
			</div>

			<div className="setting-group-label">App</div>
			<div className="setting-group">
				<SettingRow
					icon={Refresh01Icon}
					label="Restart Bloom"
					desc="Reinitialize all components"
					action
					onClick={restartBloom}
				/>
				<SettingRow
					icon={LogOutIcon}
					label="Quit Bloom"
					desc="Exit application completely"
					action
					danger
					onClick={quitBloom}
					divider={false}
				/>
			</div>
		</>
	);
}
