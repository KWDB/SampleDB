---
name: KWDB Smart Meter Sample
description: A focused KWDB learning console for smart meter relational, time-series, and cross-model examples.
colors:
  bg: "#f7f8fa"
  surface: "#ffffff"
  surface-subtle: "#f3f4f6"
  surface-hover: "#eef1f5"
  border: "#e5e7eb"
  border-strong: "#d1d5db"
  ink: "#111827"
  muted: "#4b5563"
  subtle: "#6b7280"
  faint: "#9ca3af"
  accent: "#3f5fdb"
  accent-hover: "#2f48ad"
  success: "#18794e"
  warning: "#8a5a00"
  error: "#c02525"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 650
    lineHeight: 1.18
    letterSpacing: "0"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "0"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0"
rounded:
  xs: "5px"
  sm: "8px"
  md: "10px"
  lg: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "38px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "38px"
  navigation-item-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "34px"
  status-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "20px"
---

# Design System: KWDB Smart Meter Sample

## 1. Overview

**Creative North Star: "Calibrated Learning Console"**

This interface is a focused technical learning surface for developers exploring KWDB through a smart meter example. It should feel like a calibrated console: precise, quiet, readable, and obviously connected to relational data, time-series data, and cross-model SQL. The UI serves the learning path, not the other way around.

The visual system rejects the look of a generated admin backend. Navigation is shallow and visible, surfaces are mostly flat, and hierarchy comes from spacing, typography, state, and real KWDB labels rather than decorative dashboard widgets. The user should always know whether they are in overview mode or query mode, what status KWDB is in, and what to try next.

**Key Characteristics:**
- Restrained product UI with a light neutral workspace and one blue accent.
- Top-level learning path navigation instead of a persistent admin sidebar.
- Dense but breathable panels, tables, query cards, and status rows.
- WCAG AA-minded contrast, visible focus, keyboard-friendly controls.
- Real smart meter and KWDB language, not generic CRUD vocabulary.

## 2. Colors

The palette is a restrained technical neutral system with a single calibrated blue accent for current position, focus, and high-signal actions.

### Primary
- **Calibrated Blue** (`{colors.accent}`): used for focus context, selected states, links, and subtle technical emphasis. It must remain scarce.
- **Deep Ink** (`{colors.ink}`): used for primary text, primary buttons, headings, and table text that developers must scan without strain.

### Neutral
- **Workspace Gray** (`{colors.bg}`): the app background and page canvas.
- **Clean Surface** (`{colors.surface}`): cards, panels, headers, dialogs, inputs, and table bodies.
- **Subtle Surface** (`{colors.surface-subtle}`): segmented navigation, empty states, secondary toolbars, and low-emphasis areas.
- **Line Border** (`{colors.border}`): default strokes and dividers.
- **Strong Border** (`{colors.border-strong}`): active state outlines and hover borders.
- **Readable Muted** (`{colors.muted}`): body copy and helper text. Do not lighten it below this role for normal text.
- **Subtle Label** (`{colors.subtle}`): compact labels and secondary metadata.

### Tertiary
- **Success Green** (`{colors.success}`): connected KWDB status and successful execution.
- **Warning Amber** (`{colors.warning}`): unchecked, offline, or degraded status.
- **Error Red** (`{colors.error}`): failed connection, query errors, and destructive warnings.

### Named Rules

**The One Accent Rule.** Blue is for navigation, focus, and primary actions only. Decorative blue gradients, blue card washes, and accent-heavy dashboards are prohibited.

**The State Is Text Rule.** Success, warning, and error colors must be paired with text or icons. Never rely on color alone to communicate KWDB status.

## 3. Typography

**Display Font:** System sans stack with Chinese system fallbacks.
**Body Font:** System sans stack with Chinese system fallbacks.
**Label/Mono Font:** Monaco, Menlo, Ubuntu Mono for SQL and code only.

**Character:** Product typography is compact, even, and technical. It uses weight and spacing rather than display flourishes, so the interface feels like a working tool for developers.

### Hierarchy
- **Display** (650, `1.75rem`, `1.18`): page-level headings such as overview and query titles.
- **Title** (650, `1rem`, `1.3`): panel titles, card headings, result headers, and modal titles.
- **Body** (400, `0.9375rem`, `1.6`): explanatory copy, query descriptions, and learning context. Keep prose around 65 to 75 characters per line when possible.
- **Label** (600, `0.8125rem`, `1.4`): section labels, metadata labels, table headers, and compact status names.
- **Code** (monospace, `0.8125rem` to `0.875rem`, `1.5`): SQL editor content, snippets, and query output.

### Named Rules

**The Product Scale Rule.** Do not use fluid hero typography. This is an application surface, so type sizes stay fixed and predictable across viewports.

**The Label Restraint Rule.** Labels may be compact, but never low-contrast. Muted text must remain readable against the light neutral background.

## 4. Elevation

The system is flat by default and uses tonal layering plus one-pixel borders for most depth. Shadows are structural, not decorative: they appear on cards at low intensity and on overlays or dropdowns where stacking needs to be obvious.

### Shadow Vocabulary
- **Surface Hairline** (`0 1px 2px rgba(15, 23, 42, 0.06)`): low card separation where a border alone is not enough.
- **Dropdown Layer** (`0 10px 30px rgba(15, 23, 42, 0.12)`): floating menus and select content.
- **Modal Layer** (`0 16px 48px rgba(15, 23, 42, 0.18)`): dialogs and blocking overlays only.

### Named Rules

**The Flat-At-Rest Rule.** Panels, tables, and navigation are calm at rest. Avoid broad decorative shadows on cards and buttons.

**The Overlay Earns Lift Rule.** Large shadows are reserved for popovers, dropdowns, modals, and tooltips that need clear stacking.

## 5. Components

### Buttons
- **Shape:** gently squared product controls with restrained corners (`8px`).
- **Primary:** deep ink background with white text, used for the main query or confirm action.
- **Hover / Focus:** hover shifts tonally; focus uses a visible two-pixel blue ring. Motion stays within `160ms`.
- **Secondary / Ghost:** white or transparent surfaces with readable muted text. They must not look disabled unless disabled.

### Chips
- **Style:** compact pill tags with semantic tints for RDB, TSDB, Mixed, success, warning, and error.
- **State:** tags are informational unless they are built as filters. If interactive, they must use the same focus ring vocabulary as buttons.

### Cards / Containers
- **Corner Style:** restrained rounded rectangles (`8px` to `10px` for cards, `12px` for dialogs).
- **Background:** clean white surfaces on workspace gray.
- **Shadow Strategy:** flat by default with one-pixel borders; use the Surface Hairline shadow only where content density needs separation.
- **Border:** neutral border by default, strong border on hover or active state.
- **Internal Padding:** `16px` for dense cards, `20px` for panels, `32px` for page-level breathing room.

### Inputs / Fields
- **Style:** white surface, one-pixel border, `8px` radius, compact height.
- **Focus:** strong border plus accessible blue focus ring.
- **Error / Disabled:** error must include text; disabled uses muted ink and subdued surface, not opacity alone.

### Navigation
- **Desktop:** a top app bar with brand, two learning-path links, and KWDB status on the right. The active link sits in a segmented control.
- **Mobile:** brand and status stay visible, navigation becomes a full-width segmented row. No side rail, no drawer, no collapsed icon-only menu.
- **States:** selected route uses white surface, strong border, and `aria-current="page"`. Keyboard focus remains visible.

### Tables
- **Style:** high-density, scan-friendly rows with subtle borders.
- **Headers:** label-weight text and neutral background.
- **Empty / Loading:** empty states teach what to do next; skeletons are preferred over centered spinners inside data regions.

## 6. Do's and Don'ts

### Do:
- **Do** keep the top-level app interaction shallow: Overview and Example SQL Query are the two primary paths.
- **Do** use real KWDB, RDB, TSDB, cross-model query, smart meter, alarm, area, and meter language.
- **Do** preserve WCAG AA contrast for body text, helper text, status text, and buttons.
- **Do** pair every status color with an icon or text label.
- **Do** keep components restrained: `8px` to `12px` radius, one-pixel borders, short transitions, and no decorative motion.
- **Do** use Base UI components underneath when a primitive interaction needs accessibility behavior.

### Don't:
- **Don't** make the product look like a "模板生成的后台管理系统".
- **Don't** use "通用仪表盘装饰", decorative gradients, metric-card theater, or noisy widget grids.
- **Don't** restore Ant Design's default visual style, even if Ant Design-like component structure remains familiar.
- **Don't** add a persistent left sidebar for two primary routes.
- **Don't** use generic CRUD labels where a KWDB-specific term would teach the sample better.
- **Don't** use color alone to communicate connection, error, or query status.
- **Don't** add modal-first flows when inline guidance or progressive disclosure can solve the task.
