import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Effect } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import {
	useSettings,
	GeneralTab,
	AppearanceTab,
	NotchTab,
	DockTab,
	OverlaysTab,
	AboutTab
} from "./settings/index";
import type { SettingsTab } from "./settings/index";
import { initTheme } from "./theme";
import "./Settings.css";
import "./index.css";
import { IconSvgObject } from "@hugeicons/core-free-icons/types";
import {
	InfoIcon,
	LayersIcon,
	MonitorIcon,
	PaletteIcon,
	PanelTopIcon,
	Settings01Icon,
	XIcon
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

const appWindow = getCurrentWebviewWindow();

const TABS: { id: SettingsTab; label: string; icon: IconSvgObject }[] = [
	{ id: "general", label: "General", icon: Settings01Icon },
	{ id: "appearance", label: "Appearance", icon: PaletteIcon },
	{ id: "notch", label: "Notch", icon: PanelTopIcon },
	{ id: "dock", label: "Dock", icon: MonitorIcon },
	{ id: "overlays", label: "Overlays", icon: LayersIcon },
	{ id: "about", label: "About", icon: InfoIcon }
];

function SettingsApp() {
	const [activeTab, setActiveTab] = useState<SettingsTab>("general");
	const settings = useSettings();

	useEffect(() => {
		return initTheme();
	}, []);

	useEffect(() => {
		const preventContext = (e: MouseEvent) => e.preventDefault();
		document.addEventListener("contextmenu", preventContext as any);

		appWindow
			.setEffects({
				effects: ["mica" as Effect],
				state: "active" as any
			})
			.catch(() => {});

		return () => {
			document.removeEventListener("contextmenu", preventContext as any);
		};
	}, []);

	useEffect(() => {
		invoke("resize_settings_window", {
			width: 620 * settings.scale,
			height: 480 * settings.scale
		}).catch(console.error);
	}, [settings.scale]);

	const handleClose = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		try {
			await appWindow.hide();
		} catch {}
	};

	return (
		<div className="settings-container" style={{ zoom: settings.scale }}>
			<div className="title-bar" data-tauri-drag-region>
				<span className="title-text" data-tauri-drag-region>
					Settings
				</span>
				<button className="close-btn" onClick={handleClose} title="Close Settings">
					<HugeiconsIcon icon={XIcon} size={12} strokeWidth={1.5} className="close-btn-icon" />
				</button>
			</div>

			<div className="settings-body">
				<div className="settings-sidebar">
					{TABS.map(({ id, label, icon: Icon }) => (
						<button
							key={id}
							className={`sidebar-tab ${activeTab === id ? "active" : ""}`}
							onClick={() => setActiveTab(id)}
						>
							<div className="sidebar-tab-icon">
								<HugeiconsIcon icon={Icon} size={14} strokeWidth={1.5} />
							</div>
							<span>{label}</span>
						</button>
					))}
				</div>

				<div className="settings-content">
					{activeTab === "general" && (
						<GeneralTab
							autostart={settings.autostart}
							toggleAutostart={settings.toggleAutostart}
							timeFormat24h={settings.timeFormat24h}
							toggleTimeFormat24h={settings.toggleTimeFormat24h}
							lowBatteryThreshold={settings.lowBatteryThreshold}
							handleThresholdChange={settings.handleThresholdChange}
							restartBloom={settings.restartBloom}
							quitBloom={settings.quitBloom}
						/>
					)}
					{activeTab === "appearance" && (
						<AppearanceTab
							themeMode={settings.themeMode}
							handleThemeModeChange={settings.handleThemeModeChange}
							themeColor={settings.themeColor}
							handleThemeColorChange={settings.handleThemeColorChange}
							themeOpacity={settings.themeOpacity}
							handleOpacityChange={settings.handleOpacityChange}
							themeSaturation={settings.themeSaturation}
							handleSaturationChange={settings.handleSaturationChange}
							themeBrightness={settings.themeBrightness}
							handleBrightnessChange={settings.handleBrightnessChange}
							cornersEnabled={settings.cornersEnabled}
							toggleCorners={settings.toggleCorners}
							scale={settings.scale}
							handleScaleChange={settings.handleScaleChange}
						/>
					)}
					{activeTab === "notch" && (
						<NotchTab
							notchMode={settings.notchMode}
							setNotchModeValue={settings.setNotchModeValue}
							calendarEnabled={settings.calendarEnabled}
							toggleCalendar={settings.toggleCalendar}
							timerSoundEnabled={settings.timerSoundEnabled}
							toggleTimerSound={settings.toggleTimerSound}
							musicModeEnabled={settings.musicModeEnabled}
							toggleMusicMode={settings.toggleMusicMode}
							musicCompactNotch={settings.musicCompactNotch}
							toggleMusicCompactNotch={settings.toggleMusicCompactNotch}
							mediaLayout={settings.mediaLayout}
							toggleMediaLayout={settings.toggleMediaLayout}
							mediaAmbienceEnabled={settings.mediaAmbienceEnabled}
							toggleAmbience={settings.toggleAmbience}
							mediaCompactGlowEnabled={settings.mediaCompactGlowEnabled}
							toggleCompactGlow={settings.toggleCompactGlow}
							weatherEnabled={settings.weatherEnabled}
							toggleWeather={settings.toggleWeather}
							tempUnitFahrenheit={settings.tempUnitFahrenheit}
							toggleTempUnit={settings.toggleTempUnit}
							cityName={settings.cityName}
							setCityName={settings.setCityName}
							citySearchResults={settings.citySearchResults}
							showCityDropdown={settings.showCityDropdown}
							setShowCityDropdown={settings.setShowCityDropdown}
							selectCity={settings.selectCity}
							handleCityClear={settings.handleCityClear}
							statusWidgets={settings.statusWidgets}
							handleWidgetsChange={settings.handleWidgetsChange}
						/>
					)}
					{activeTab === "dock" && (
						<DockTab
							dockEnabled={settings.dockEnabled}
							toggleDock={settings.toggleDock}
							dockMode={settings.dockMode}
							setDockModeValue={settings.setDockModeValue}
							dockPreviewEnabled={settings.dockPreviewEnabled}
							toggleDockPreview={settings.toggleDockPreview}
							dockIconOnly={settings.dockIconOnly}
							toggleDockIconOnly={settings.toggleDockIconOnly}
							dockAdaptive={settings.dockAdaptive}
							toggleDockAdaptive={settings.toggleDockAdaptive}
						/>
					)}
					{activeTab === "overlays" && (
						<OverlaysTab
							volumeOverlayEnabled={settings.volumeOverlayEnabled}
							toggleVolumeOverlay={settings.toggleVolumeOverlay}
							volumeEdgeEnabled={settings.volumeEdgeEnabled}
							toggleVolumeEdge={settings.toggleVolumeEdge}
							brightnessOverlayEnabled={settings.brightnessOverlayEnabled}
							toggleBrightnessOverlay={settings.toggleBrightnessOverlay}
							brightnessEdgeEnabled={settings.brightnessEdgeEnabled}
							toggleBrightnessEdge={settings.toggleBrightnessEdge}
						/>
					)}
					{activeTab === "about" && (
						<AboutTab
							appVersion={settings.appVersion}
							autoUpdate={settings.autoUpdate}
							toggleAutoUpdate={settings.toggleAutoUpdate}
							updateStatus={settings.updateStatus}
							updateVersion={settings.updateVersion}
							checkForUpdates={settings.checkForUpdates}
							installUpdate={settings.installUpdate}
							exportStatus={settings.exportStatus}
							importStatus={settings.importStatus}
							handleExportSettings={settings.handleExportSettings}
							handleImportSettings={settings.handleImportSettings}
						/>
					)}
				</div>
			</div>
		</div>
	);
}

createRoot(document.getElementById("root") as HTMLElement).render(
	<StrictMode>
		<SettingsApp />
	</StrictMode>
);
