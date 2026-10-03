# Camera Flow Page Overrides

> **PROJECT:** EcoScan AI
> **Generated:** 2026-10-03 13:22:15
> **Page Type:** Camera capture / result flow

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).
> Only deviations from the Master are documented here. For all other rules, refer to the Master.

---

## Page-Specific Rules

### Layout Overrides

- **Max Width:** 1240px
- **Layout:** Camera-first responsive split on desktop; single-column camera card on mobile
- **Sections:** capture screen → loading screen → result screen

### Spacing Overrides

- **Content Density:** Low around the camera; high clarity inside result cards

### Typography Overrides

- No overrides — use Master typography

### Color Overrides

- **Strategy:** Warm white canvas with green primary, mint status, peach caution and restrained gradients

### Component Overrides

- Avoid: putting result cards below the capture screen
- Avoid: oversized hero copy that competes with the camera preview
- Avoid: relying on camera permission without an upload fallback

---

## Page-Specific Components

- No unique components for this page

---

## Recommendations

- Effects: soft gradients, 180ms color transitions, gentle loading spinner, no layout-shifting hover
- Performance: Keep the preview local until the user starts analysis
- Accessibility: 44px touch controls, visible focus ring, semantic heading order, reduced-motion support
- CTA Placement: Apple-like shutter control centered beneath the preview
