/**
 * Typed metadata for the PMSQL design foundation.
 *
 * CSS custom properties in `app/globals.css` are the rendering source of
 * truth. These exports make the same vocabulary available to JavaScript,
 * tests, documentation, and future component APIs without hard-coding
 * presentation values throughout the product.
 */

export const DENSITIES = ["compact", "default", "comfortable"] as const;

export type Density = (typeof DENSITIES)[number];

export const BREAKPOINTS = {
  xs: 480,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1440,
} as const;

export const ICON_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
} as const;

export const FONT_STACK =
  '"Inter Variable", "SF Pro Display", -apple-system, system-ui, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif';

export const FONT_WEIGHTS = {
  regular: 450,
  medium: 500,
  emphasized: 550,
  semibold: 600,
} as const;

export const BRAND_COLORS = {
  primary: "#5e6ad2",
  hover: "#6974e1",
  focus: "#5e69d1",
} as const;

export const Z_INDEX = {
  base: 0,
  raised: 10,
  sticky: 20,
  dropdown: 40,
  overlay: 50,
  modal: 60,
  toast: 70,
  command: 80,
} as const;

export const FOUNDATION_MOTION = {
  duration: {
    instant: 0,
    fast: 140,
    base: 175,
    slow: 220,
    slower: 300,
  },
  easing: {
    out: [0.25, 0.46, 0.45, 0.94],
    emphasized: [0.2, 0, 0, 1],
    inOut: [0.65, 0, 0.35, 1],
  },
} as const;

export type FoundationToken = {
  readonly name: string;
  readonly variable: `--${string}`;
  readonly value: string;
  readonly description?: string;
};

export type FoundationTokenGroup = {
  readonly name: string;
  readonly description: string;
  readonly tokens: readonly FoundationToken[];
};

export const COLOR_TOKEN_GROUPS = [
  {
    name: "Surfaces",
    description: "Depth comes from adjacent background levels, not heavy shadows.",
    tokens: [
      { name: "Sidebar", variable: "--surface-sidebar", value: "Navigation plane" },
      { name: "Canvas", variable: "--surface-canvas", value: "App backdrop" },
      { name: "Panel", variable: "--surface-panel", value: "Primary work surface" },
      { name: "Raised", variable: "--surface-raised", value: "Cards and inspectors" },
      { name: "Overlay", variable: "--surface-overlay", value: "Menus and dialogs" },
      { name: "Hover", variable: "--surface-hover", value: "Interactive hover" },
      { name: "Selected", variable: "--surface-selected", value: "Selected rows" },
    ],
  },
  {
    name: "Content",
    description: "A restrained text ramp keeps hierarchy readable without excess weight.",
    tokens: [
      { name: "Primary", variable: "--content-primary", value: "Headings and values" },
      { name: "Secondary", variable: "--content-secondary", value: "Body and labels" },
      { name: "Tertiary", variable: "--content-tertiary", value: "Metadata" },
      { name: "Disabled", variable: "--content-disabled", value: "Unavailable controls" },
      { name: "Inverse", variable: "--content-inverse", value: "Text on strong fills" },
      { name: "Link", variable: "--content-link", value: "Links and active accents" },
    ],
  },
  {
    name: "Borders",
    description: "Hairlines define structure; stronger borders are reserved for focus and selection.",
    tokens: [
      { name: "Subtle", variable: "--border-subtle", value: "Section separation" },
      { name: "Default", variable: "--border-default", value: "Controls and panels" },
      { name: "Strong", variable: "--border-strong", value: "Active boundaries" },
      { name: "Focus", variable: "--border-focus", value: "Keyboard focus" },
    ],
  },
] as const satisfies readonly FoundationTokenGroup[];

export const INTENT_TOKENS = [
  { name: "Accent", variable: "--intent-accent", value: "Linear indigo · #5E6AD2" },
  { name: "Info", variable: "--intent-info", value: "Informational state" },
  { name: "Success", variable: "--intent-success", value: "Healthy or complete" },
  { name: "Warning", variable: "--intent-warning", value: "Caution" },
  { name: "Danger", variable: "--intent-danger", value: "Destructive or failed" },
] as const satisfies readonly FoundationToken[];

export const TYPOGRAPHY_TOKENS = [
  { name: "UI micro", variable: "--type-ui-micro", value: "10px / 14px" },
  { name: "UI caption", variable: "--type-ui-caption", value: "11px / 16px" },
  { name: "UI label", variable: "--type-ui-small", value: "12px / 16px" },
  { name: "UI default", variable: "--type-ui-default", value: "13px / 20px" },
  { name: "Body small", variable: "--type-body-small", value: "14px / 22px" },
  { name: "Body", variable: "--type-body", value: "15px / 24px" },
  { name: "Heading small", variable: "--type-heading-small", value: "16px / 24px" },
  { name: "Heading medium", variable: "--type-heading-medium", value: "20px / 28px" },
  { name: "Heading large", variable: "--type-heading-large", value: "28px / 36px" },
] as const satisfies readonly FoundationToken[];

export const SPACING_TOKENS = [
  ["0", "0px"],
  ["1", "4px"],
  ["1.5", "6px"],
  ["2", "8px"],
  ["2.5", "10px"],
  ["3", "12px"],
  ["4", "16px"],
  ["5", "20px"],
  ["6", "24px"],
  ["8", "32px"],
  ["10", "40px"],
  ["12", "48px"],
  ["16", "64px"],
] as const;

export const RADIUS_TOKENS = [
  { name: "Small", variable: "--radius-small", value: "4px" },
  { name: "Control", variable: "--radius-control", value: "8px" },
  { name: "Menu", variable: "--radius-menu", value: "12px" },
  { name: "Panel", variable: "--radius-panel", value: "12px" },
  { name: "Modal", variable: "--radius-modal", value: "16px" },
  { name: "Full", variable: "--radius-full", value: "9999px" },
] as const satisfies readonly FoundationToken[];

export const ELEVATION_TOKENS = [
  { name: "Hairline", variable: "--shadow-hairline", value: "Inset 1px border" },
  { name: "Raised", variable: "--shadow-raised", value: "Floating control" },
  { name: "Menu", variable: "--shadow-menu", value: "Popover and menu" },
  { name: "Modal", variable: "--shadow-modal", value: "Dialog" },
  { name: "Focus", variable: "--shadow-focus", value: "Keyboard focus" },
] as const satisfies readonly FoundationToken[];

export const DENSITY_METRICS = {
  compact: { control: 28, row: 30, gap: 6 },
  default: { control: 32, row: 36, gap: 8 },
  comfortable: { control: 36, row: 42, gap: 10 },
} as const satisfies Record<Density, { control: number; row: number; gap: number }>;
