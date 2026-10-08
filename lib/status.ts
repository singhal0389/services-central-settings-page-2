import type { Status, StatusTone } from "./types"

export const STATUS_LABEL: Record<Status, string> = {
  draft: "Draft",
  submitted: "Submitted",
  pending: "Pending Verification",
  "action-required": "Action Required",
  verified: "Verified",
  active: "Active",
  rejected: "Rejected",
  failed: "Failed",
  archived: "Archived",
  suspended: "Suspended",
  inactive: "Inactive",
  invited: "Invited",
}

export const STATUS_TONE: Record<Status, StatusTone> = {
  draft: "neutral",
  submitted: "info",
  pending: "warning",
  "action-required": "attention",
  verified: "success",
  active: "success",
  rejected: "attention",
  failed: "attention",
  archived: "neutral",
  suspended: "neutral",
  inactive: "neutral",
  invited: "info",
}

// Colors map to Evo semantic tokens. Kept as inline styles so a StatusBadge
// can render anywhere without a dedicated skin component.
export const TONE_STYLE: Record<
  StatusTone,
  { bg: string; fg: string; border: string }
> = {
  neutral: {
    bg: "var(--color-background-tertiary)",
    fg: "var(--color-foreground-secondary)",
    border: "var(--color-border-subtle)",
  },
  info: {
    bg: "var(--color-background-education)",
    fg: "var(--color-foreground-accent)",
    border: "var(--color-border-accent)",
  },
  warning: {
    bg: "#fff7d6",
    fg: "var(--color-foreground-warning)",
    border: "var(--color-background-warning)",
  },
  attention: {
    bg: "var(--color-ai-solid-red-subtle)",
    fg: "var(--color-foreground-attention)",
    border: "var(--color-border-attention)",
  },
  success: {
    bg: "#eefdee",
    fg: "var(--color-foreground-success)",
    border: "var(--color-border-success)",
  },
}
