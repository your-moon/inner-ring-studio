/**
 * The Orbit kit — the one import surface for UI components.
 *
 *   import { Button, IconButton, Chip, Input, Tooltip, … } from "@/components/orbit";
 *
 * Rules of the kit:
 * - New UI goes through this barrel; `@/components/ui/*` is the Radix
 *   implementation layer behind it, not an API.
 * - Chroma is meaning: EnvBadge (prod), StatusDot (liveness), destructive red.
 *   Everything else stays in the neutral ramp.
 * - Keyboard hints render through <Kbd>, derived from KEY_BINDING.
 * - Every component has a /storybook page showing states in both themes.
 */

// Owned primitives
export { Button } from "./button";
export { default as IconButton } from "./icon-button";
export { default as Chip } from "./chip";
export { default as EnvBadge } from "./env-badge";
export { default as StatusDot } from "./status-dot";
export { default as EmptyState } from "./empty-state";
export { default as Block } from "./block";
export { default as Inset } from "./inset";
export { default as Section } from "./section";
export { Avatar } from "./avatar";
export { Input as FieldInput } from "./input";

// Token-styled primitives over Radix (implementation lives in ui/)
export { default as Kbd } from "@/components/ui/kbd";
export { Input } from "@/components/ui/input";

export {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
export {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
export {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
export { Checkbox } from "@/components/ui/checkbox";
export { Separator } from "@/components/ui/separator";
export { QuickOpen } from "@/components/ui/quick-open";
