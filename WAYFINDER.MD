---

🧭 **Current Destination:** Feature planning — 9 items triaged

✅ **The Known (ready to execute, no blockers):**

- [x] **#3 — Fix brightness slider (laptop)**
  - [x] **Step 1 — `CoSetProxyBlanket`:** `ExecQuery` was silently rejected because COM requires `CoSetProxyBlanket()` to be called on the `IWbemServices` proxy after `ConnectServer`. PowerShell handles this automatically; raw COM does not. Added call with `RPC_C_AUTHN_WINNT`, `RPC_C_IMP_LEVEL_IMPERSONATE` before the recv loop.
  - [x] **Step 2 — `GetObject` on class, not instance:** `GetMethod("WmiSetBrightness")` was called on the WMI **instance** object returned by `ExecQuery`. `GetMethod` only works on a **class definition**. Fixed by calling `services.GetObject("WmiMonitorBrightnessMethods")` separately to get the class def, then calling `GetMethod` on that — using the instance's `__RELPATH` only for the final `ExecMethod` target path.
  - [x] **Step 3 — WMI pipeline confirmed working.** Two remaining UX issues identified (no code yet):
    - `handleBrightnessChange` throttle drops the final pointer value — slider shows 100% but last `invoke` never fires. Fix: always flush on `pointerup` regardless of throttle.
    - WMI read-back poll interval is 500ms — HUD lags when brightness is changed externally (Windows quick settings). Fix: tighten poll to ~150ms.
  - [x] Fix throttle flush on `pointerup` in `App.tsx`
  - [x] Tighten WMI poll interval in `setup_system_worker` (`services.rs`)

- [x] **#1 — Remove updater dot**
  - [x] `App.tsx` L2282–2286 — remove `.update-dot` div + conditional
  - [x] `App.tsx` L503–523 — remove state + `listen("update-available")` effect
  - [x] `App.tsx` L1729 — remove `showUpdatePulse` from pulse width logic
  - [x] `App.tsx` L2168–2183 — remove the update pulse animation view
  - [x] `GeneralTab.tsx` — remove toggle row + prop
  - [x] `Settings.tsx` — remove prop pass-through
  - [x] `useSettings.ts` — remove the toggle handler
  - [x] `SETTINGS.md` — remove the key from documentation

- [x] **#5 — Lucide audit (replace progressively with HugeIcons)**
  - [x] `App.tsx`: `Cpu, MemoryStick, HardDrive, ArrowUpDown, BellRing, Play, Pause, RotateCcw`
  - [x] `Dock.tsx`: `ChevronRightIcon, PinIcon`
  - [x] `Settings.tsx`: `X, Settings, Palette, PanelTop, Monitor, Layers, Info`
  - [x] `StatusWidgetConfig.tsx`
  - [x] `AboutTab.tsx`
  - [x] `AppearanceTab.tsx`
  - [x] `DockTab.tsx`
  - [x] `GeneralTab.tsx`
  - [x] `NotchTab.tsx`
  - [x] `OverlaysTab.tsx`

- [x] **#10 — Reusable left-click context menu (Select component)**
  - [x] Create `src/components/ContextMenu.tsx` — port pattern from `Dock.tsx` L1164–1344
  - [x] Create styles in `src/components/ContextMenu.css` — port from `Dock.css` `.context-menu`, `.menu-item`, `.submenu` etc.
  - [x] Wire up `set_menu_open` invoke on open/close so Bloom doesn't auto-hide while menu is open

- [x] **#11 — Completion of ui/command-center-layout-redesign branch**
  - [x] Notch and Dock mode pills in command center redesigned
  - [x] Wifi and Bluetooth Icon showing on status mode left side


🌫️ **The Fog (need answers before coding):**

- **#3a — Fn keys:** Hook intercepts VK `0x216`/`0x217` — OEM codes that may not match your keyboard. Do the Fn brightness keys work normally without Bloom running?
- **#4 — File shelf:** Do you want a temporary drag-drop holding area to park files and drop them into apps? Or something else?
- **#9 — Live activities:** Camera/mic detection needs Windows privacy APIs. Which notch mode should it appear in — always-on tray-style, or peek/pulse like battery?
- **#12 — Squirclized dock icons (haven't found how apple does it based on the colors in the icon**
- **#13 — Listener for bluetooth and wifi to status and command center**

🌑 **The Deep Dark (park for later):**

- **#2** Settings redesign
- **#6** Code refactor + consistent file naming
- **#7** StyleX migration (StyleX = atomic CSS at build time; Framer Motion = runtime inline styles — they coexist but
 StyleX won't cover Motion's styles. Needs a spike.)
- **#8** Dependency updates (`framer-motion` → `motion` rename, low risk)
- **#9** Full live activities implementation

---

**Recommended order of attack:**
1. **#1** — self-contained, zero risk, clean removal
2. **#10** — reusable component, needed by other features
3. **#5** — progressive, file by file
4. **#11** — complete the ui/command-center-layout-redesign branch
5. **#3** — after fog is cleared
