"use client"

import type { Status } from "@/lib/types"
import { STATUS_LABEL, STATUS_TONE, TONE_STYLE } from "@/lib/status"

export function StatusBadge({
  status,
  label,
  size = "default",
}: {
  status: Status
  label?: string
  size?: "default" | "small"
}) {
  const tone = STATUS_TONE[status]
  const s = TONE_STYLE[tone]
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        whiteSpace: "nowrap",
        backgroundColor: s.bg,
        color: s.fg,
        border: `1px solid ${s.border}`,
        borderRadius: "var(--radius-medium)",
        padding: size === "small" ? "1px 8px" : "3px 10px",
        fontSize: size === "small" ? 12 : 13,
        fontWeight: 600,
        lineHeight: 1.5,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: s.fg,
        }}
      />
      {label ?? STATUS_LABEL[status]}
    </span>
  )
}
