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
export type { ButtonProps, ButtonSize, ButtonVariant } from "./button";
export { ButtonGroup, ButtonGroupItem } from "./button-group";
export type { ButtonGroupItemProps, ButtonGroupProps } from "./button-group";
export { ToggleGroup, ToggleGroupItem } from "./toggle-group";
export type { ToggleGroupItemProps, ToggleGroupProps } from "./toggle-group";
export { CopyButton } from "./copy-button";
export type { CopyButtonProps } from "./copy-button";
export { default as IconButton } from "./icon-button";
export type {
  IconButtonProps,
  IconButtonSize,
  IconButtonVariant,
} from "./icon-button";
export { SplitButton } from "./split-button";
export type { SplitButtonProps } from "./split-button";
export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  useFieldControl,
} from "./field";
export type { FieldProps, FieldLabelProps, FieldTextProps } from "./field";
export {
  TextField,
  SearchField,
  PasswordField,
  NumberField,
  TextareaField,
  DateField,
  TimeField,
} from "./text-field";
export type {
  FieldSize,
  TextFieldProps,
  NumberFieldProps,
  TextareaFieldProps,
} from "./text-field";
export { Checkbox } from "./checkbox";
export type { CheckboxProps } from "./checkbox";
export { RadioGroup, RadioGroupItem } from "./radio-group";
export type { RadioGroupProps, RadioGroupItemProps } from "./radio-group";
export { Switch } from "./switch";
export type { SwitchProps } from "./switch";
export { Slider } from "./slider";
export type { SliderProps } from "./slider";
export { InlineEdit } from "./inline-edit";
export type { InlineEditProps } from "./inline-edit";
export { FileUpload } from "./file-upload";
export type { FileUploadProps } from "./file-upload";
export { ColorField } from "./color-field";
export type { ColorFieldProps } from "./color-field";
export { TokenInput } from "./token-input";
export type { TokenInputProps } from "./token-input";
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select-field";
export type {
  SelectContentProps,
  SelectItemProps,
  SelectSize,
  SelectTriggerProps,
} from "./select-field";
export { Combobox, MultiSelect } from "./combobox";
export type {
  ComboboxOption,
  ComboboxProps,
  MultiSelectProps,
} from "./combobox";
export { default as Chip } from "./chip";
export { Badge } from "./badge";
export type { BadgeIntent, BadgeProps, BadgeSize } from "./badge";
export { Label, LABEL_COLORS } from "./tag";
export type { LabelColor, LabelProps } from "./tag";
export { CountBadge } from "./count-badge";
export type { CountBadgeProps } from "./count-badge";
export { StatusIcon } from "./status-icon";
export type { StatusIconProps, WorkflowStatus } from "./status-icon";
export { PriorityIcon } from "./priority-icon";
export type { Priority, PriorityIconProps } from "./priority-icon";
export { default as EnvBadge } from "./env-badge";
export { default as StatusDot } from "./status-dot";
export { default as EmptyState } from "./empty-state";
export { Alert, Callout, Skeleton, Progress, Spinner } from "./feedback";
export type {
  AlertProps,
  CalloutProps,
  ProgressProps,
  SkeletonProps,
  SpinnerProps,
} from "./feedback";
export { Toaster, toast } from "./toast";
export type { ToasterProps } from "./toast";
export {
  Box,
  Stack,
  Inline,
  Cluster,
  Grid,
  Container,
  Center,
  Spacer,
  Divider,
  AspectRatio,
  ScrollArea,
  VisuallyHidden,
} from "./layout";
export type {
  Align,
  AspectRatioProps,
  ClusterProps,
  ContainerProps,
  DividerProps,
  Gap,
  GridProps,
  InlineProps,
  Justify,
  ScrollAreaProps,
  StackProps,
} from "./layout";
export {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Stat,
  DescriptionList,
  DescriptionItem,
  KeyValue,
  List,
  ListItem,
  Code,
  TruncatedText,
  Timestamp,
  RelativeTime,
} from "./data-display";
export type {
  CardProps,
  StatProps,
  DescriptionListProps,
  DescriptionItemProps,
  KeyValueProps,
  ListItemProps,
  TruncatedTextProps,
  TimestampProps,
} from "./data-display";
export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./table";
export type {
  SortDirection,
  TableRowProps,
  TableHeadProps,
  TableCellProps,
} from "./table";
export { Tree, TreeItem } from "./tree";
export type { TreeItemProps } from "./tree";
export { Timeline, TimelineItem } from "./timeline";
export type { TimelineItemProps } from "./timeline";
export { CodeBlock } from "./code-block";
export type { CodeBlockProps } from "./code-block";
export {
  Tabs,
  TabList,
  Tab,
  TabPanel,
  SegmentedControl,
  Breadcrumb,
  BreadcrumbItem,
  Pagination,
  PageHeader,
} from "./navigation";
export type {
  TabsProps,
  TabProps,
  SegmentedOption,
  SegmentedControlProps,
  BreadcrumbItemProps,
  PaginationProps,
  PageHeaderProps,
} from "./navigation";
export { AvatarGroup } from "./avatar-group";
export type { AvatarGroupPerson, AvatarGroupProps } from "./avatar-group";
export { DatePicker } from "./date-picker";
export type { DatePickerProps } from "./date-picker";
export { StatusPicker, PriorityPicker, LabelPicker } from "./pickers";
export type { LabelOption } from "./pickers";
export {
  FilterChip,
  FilterBuilder,
  AppliedFilters,
  DisplayOptions,
  DisplayOptionRow,
} from "./filters";
export type { FilterChipProps, FilterField } from "./filters";
export { ViewTabs } from "./view-tabs";
export type { ViewTab } from "./view-tabs";
export { SortBuilder, GroupByPicker, SavedViewPicker } from "./view-controls";
export type { ViewOption, SavedView } from "./view-controls";
export {
  BulkActionBar,
  PropertyRow,
  InspectorPanel,
  SettingsSection,
  SettingsRow,
  DangerZone,
  NotificationItem,
  CommandRow,
} from "./panels";
export type { NotificationItemProps, CommandRowProps } from "./panels";
export {
  ConnectionCard,
  ConnectionStatus,
  VaultSyncStatus,
} from "./connection";
export type { ConnState, SyncState } from "./connection";
export {
  QueryTabBar,
  RunQueryButton,
  QueryToolbar,
  ResultStatusBar,
} from "./query";
export type { QueryTab } from "./query";
export {
  ColumnTypeBadge,
  ProductionEnvironmentBanner,
  WriteConfirmationDialog,
} from "./db";
export { IssueRow } from "./issue-row";
export type { IssueRowProps } from "./issue-row";
export { ProgressDonut, SegmentedProgress } from "./progress-viz";
export type { ProgressSegment } from "./progress-viz";
export { AssigneePicker, EstimatePicker } from "./assignee";
export type { Person } from "./assignee";
export { Reactions, CommentComposer, CommentItem } from "./comments";
export type { Reaction } from "./comments";
export { KeyboardShortcutList } from "./shortcuts";
export type { ShortcutEntry, ShortcutGroup } from "./shortcuts";
export { WorkspaceSwitcher } from "./workspace-switcher";
export type { Workspace } from "./workspace-switcher";
export { BoardColumn, BoardCard } from "./board";
export {
  PeekModal,
  PeekModalTrigger,
  PeekModalContent,
  SubIssueList,
  RelationRow,
} from "./issue-detail";
export type { RelationKind } from "./issue-detail";
export {
  CyclePicker,
  ProjectPicker,
  TeamSwitcher,
  MilestoneMarker,
} from "./pickers2";
export type { Cycle, Project, Team } from "./pickers2";
export { SlashMenu } from "./slash-menu";
export type { SlashCommand } from "./slash-menu";
export {
  MentionMenu,
  EmojiPicker,
  AttachmentRow,
  ActivityFeedItem,
  SubscriberList,
} from "./collab";
export type { Mentionable } from "./collab";
export {
  HealthBadge,
  RoadmapBar,
  InitiativeCard,
  TemplatePicker,
  IntegrationRow,
} from "./project";
export type { Health, Template } from "./project";
export {
  SidebarNavItem,
  SidebarSection,
  SidebarFavorite,
  SidebarButton,
  SidebarToggle,
} from "./sidebar-nav";
export type {
  SidebarNavItemProps,
  SidebarSectionProps,
  SidebarFavoriteProps,
  SidebarButtonProps,
  SidebarToggleProps,
} from "./sidebar-nav";
export {
  CommandMenu,
  CommandInput,
  CommandGroup,
  CommandEmpty,
  CommandFooter,
} from "./command-menu";
export type {
  CommandMenuProps,
  CommandGroupProps,
  CommandHint,
} from "./command-menu";
export { SubscribeToggle } from "./subscribe";
export type { SubscribeToggleProps } from "./subscribe";
export { PresenceDot, PresenceAvatar, PersonChip } from "./presence";
export type {
  Presence,
  PresenceAvatarProps,
  PersonChipProps,
} from "./presence";
export {
  RoleBadge,
  RoleSelect,
  MemberRow,
  PendingInviteRow,
  MemberList,
  InviteField,
} from "./members";
export type { MemberRole, MemberRowProps } from "./members";
export { SettingsGroupHeader } from "./settings-nav";
export {
  LabelRow,
  LabelGroupRow,
  ColorSwatchPicker,
  LabelForm,
} from "./labels-admin";
export type { LabelRowProps, LabelGroupRowProps } from "./labels-admin";
export {
  StatusTypeBadge,
  WorkflowStatusRow,
  StatusTypeSection,
  StatusEditorPanel,
} from "./statuses-admin";
export type { StatusType, WorkflowStatusRowProps } from "./statuses-admin";
export {
  SettingsListHeader,
  SettingsList,
  TemplateRow,
} from "./settings-list";
export type { TemplateRowProps } from "./settings-list";
export {
  EditorToolbarButton,
  FloatingFormatToolbar,
  ToolbarDivider,
  LinkPopover,
  EditorPlaceholder,
  BlockHandle,
} from "./editor";
export type { EditorToolbarButtonProps } from "./editor";
export {
  QuoteBlock,
  ToggleBlock,
  TodoItem,
  ListBlock,
  CodeBlockHeader,
} from "./editor-blocks";
export { default as Block } from "./block";
export { default as Inset } from "./inset";
export { default as Section } from "./section";
export { Avatar } from "./avatar";
export { Input as FieldInput } from "./input";
export { Density } from "./density";
export type { DensityProps } from "./density";
export {
  BREAKPOINTS,
  BRAND_COLORS,
  COLOR_TOKEN_GROUPS,
  DENSITIES,
  DENSITY_METRICS,
  ELEVATION_TOKENS,
  FONT_STACK,
  FONT_WEIGHTS,
  FOUNDATION_MOTION,
  ICON_SIZES,
  INTENT_TOKENS,
  RADIUS_TOKENS,
  SPACING_TOKENS,
  TYPOGRAPHY_TOKENS,
  Z_INDEX,
} from "./foundations";
export type {
  Density as DensityName,
  FoundationToken,
  FoundationTokenGroup,
} from "./foundations";

// Token-styled primitives over Radix (implementation lives in ui/)
export { default as Kbd } from "@/components/ui/kbd";
export { Input } from "@/components/ui/input";

export {
  Tooltip,
  TooltipContent,
  TooltipProvider,
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
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
export { Sheet, SheetTrigger, SheetClose, SheetContent } from "./sheet";
export type { SheetContentProps } from "./sheet";
export { HoverCard, HoverCardTrigger, HoverCardContent } from "./hover-card";
export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
} from "./alert-dialog";
export type { AlertDialogProps } from "./alert-dialog";
export { ConfirmProvider, useConfirm } from "./use-confirm";
export type { ConfirmOptions } from "./use-confirm";
export { Separator } from "@/components/ui/separator";
export { QuickOpen } from "@/components/ui/quick-open";
