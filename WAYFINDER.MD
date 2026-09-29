---

🧭 **Current Destination:** Feature planning — 9 items triaged

✅ **The Known (ready to execute, no blockers):**

- [x] **#1 — Remove updater dot**
  - [x] `App.tsx` L2282–2286 — remove `.update-dot` div + conditional
  - [x] `App.tsx` L503–523 — remove state + `listen("update-available")` effect
  - [x] `App.tsx` L1729 — remove `showUpdatePulse` from pulse width logic
  - [x] `App.tsx` L2168–2183 — remove the update pulse animation view
  - [x] `GeneralTab.tsx` — remove toggle row + prop
  - [x] `Settings.tsx` — remove prop pass-through
  - [x] `useSettings.ts` — remove the toggle handler
  - [x] `SETTINGS.md` — remove the key from documentation

- [ ] **#5 — Lucide audit (replace progressively with HugeIcons)**
  - [ ] `App.tsx`: `Cpu, MemoryStick, HardDrive, ArrowUpDown, BellRing, Play, Pause, RotateCcw`
  - [ ] `Dock.tsx`: `ChevronRightIcon, PinIcon`
  - [ ] `Settings.tsx`: `X, Settings, Palette, PanelTop, Monitor, Layers, Info`
  - [ ] `StatusWidgetConfig.tsx`
  - [ ] `AboutTab.tsx`
  - [ ] `AppearanceTab.tsx`
  - [ ] `DockTab.tsx`
  - [ ] `GeneralTab.tsx`
  - [ ] `NotchTab.tsx`
  - [ ] `OverlaysTab.tsx`

- [x] **#10 — Reusable left-click context menu (Select component)**
  - [x] Create `src/components/ContextMenu.tsx` — port pattern from `Dock.tsx` L1164–1344
  - [x] Create styles in `src/components/ContextMenu.css` — port from `Dock.css` `.context-menu`, `.menu-item`, `.submenu` etc.
  - [x] Wire up `set_menu_open` invoke on open/close so Bloom doesn't auto-hide while menu is open

- [x] **#11 — Completion of ui/command-center-layout-redesign branch**
  - [x] Notch and Dock mode pills in command center redesigned
  - [x] Wifi and Bluetooth Icon showing on status mode left side

🌫️ **The Fog (need answers before coding):**

- **#3 — Brightness slider:** The `set_brightness` Rust command pipes to `BRIGHTNESS_SENDER` → WMI worker. Does it fail silently (WMI permission / laptop-only panel issue), or does the UI slider not even call `invoke("set_brightness")`? *Is this a desktop or laptop monitor?*
- **#3a — Fn keys:** Hook intercepts VK `0x216`/`0x217` — OEM codes that may not match your keyboard. Do the Fn brightness keys work normally without Bloom running?
- **#4 — File shelf:** Do you want a temporary drag-drop holding area to park files and drop them into apps? Or something else?
- **#9 — Live activities:** Camera/mic detection needs Windows privacy APIs. Which notch mode should it appear in — always-on tray-style, or peek/pulse like battery?

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
