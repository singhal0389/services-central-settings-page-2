import type { SoftDescriptorConfig } from "./types"

// Field limits from the soft-descriptor spec.
export const DESCRIPTOR_MAX = 22 // total resolved length
export const STATIC_MAX = 22 // static descriptor
export const PREFIX_MAX = 10 // dynamic prefix

// The three operations a resolved descriptor is applied to.
export const DESCRIPTOR_OPERATIONS = ["Auth", "Capture", "Refund"] as const
export type DescriptorOperation = (typeof DESCRIPTOR_OPERATIONS)[number]

export type ResolutionSource = "static" | "dynamic" | "fallback-static"

export interface DescriptorResolution {
  full: string // concatenated value before the 22-char cap
  result: string // final value after truncation
  truncated: boolean
  source: ResolutionSource
}

/**
 * Resolve the descriptor that appears on the cardholder statement for a single
 * operation, following the onboarding spec:
 *
 * - Static mode always uses the static descriptor.
 * - Dynamic mode concatenates `{Prefix}*{Statement Descriptor}` (no spaces).
 * - If no statement descriptor is sent (dynamic mode), fall back to static.
 * - The total may not exceed 22 characters; anything beyond is truncated.
 */
export function resolveDescriptor(
  config: SoftDescriptorConfig,
  statementDescriptor: string | null | undefined,
): DescriptorResolution {
  const sent = (statementDescriptor ?? "").trim()

  let full: string
  let source: ResolutionSource

  if (config.mode === "static") {
    full = config.staticDescriptor
    source = "static"
  } else if (sent === "") {
    // Dynamic mode, but the API request omitted the statement descriptor.
    full = config.staticDescriptor
    source = "fallback-static"
  } else {
    full = `${config.prefix}*${sent}`
    source = "dynamic"
  }

  const result = full.slice(0, DESCRIPTOR_MAX)
  return { full, result, truncated: full.length > DESCRIPTOR_MAX, source }
}
