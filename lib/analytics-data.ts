// Analytics dataset for the ePS Services Central "Analytics" page.
//
// Everything on screen — KPI strip, per-metric headline, chart series and the CSV
// export — is derived from the single cell grid built here, so a card and the chart
// underneath it cannot quote different numbers for the same metric.
//
// Two figures are pinned from the Figma design because they are the defensible ones:
// April carried 32,211 authorizations at a 90.95% approval rate, and 200 disputes
// were opened. Every other value is derived.

export type Mode = "count" | "amount"
export type Grain = "daily" | "weekly" | "monthly"

const DAY_COUNT = 30
const MONTH_LABEL = "April"
const MONTH_SHORT = "Apr"
export const YEAR = 2026

const TOTAL_AUTHORIZATIONS = 32_211
const APPROVAL_RATE = 0.9095
const TOTAL_DISPUTES = 200

// ---------------------------------------------------------------------------
// Deterministic noise. Generated at module scope so the server and the client
// build byte-identical data (Math.random here would be a hydration mismatch).
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Distributes `total` across `weights` so the parts sum to exactly `total`.
 * Using largest-remainder rather than rounding each part independently is what
 * keeps a chart's bars summing to the headline above them.
 */
function largestRemainder(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (sum <= 0 || total <= 0) return weights.map(() => 0)
  const exact = weights.map((w) => (w / sum) * total)
  const parts = exact.map((e) => Math.floor(e))
  let left = total - parts.reduce((a, b) => a + b, 0)
  const order = exact
    .map((e, i) => ({ i, frac: e - Math.floor(e) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i)
  for (let k = 0; left > 0; k = (k + 1) % order.length) {
    parts[order[k].i] += 1
    left -= 1
  }
  return parts
}

/**
 * Splits each count in `counts` across `shares`, carrying the rounding error
 * forward so the totals across all rows land on the intended mix.
 *
 * Rounding each row independently does not work here: most rows hold only one
 * or two declines, and largest-remainder on a single unit always hands it to
 * the biggest share — which drove one reason code to ~92% of the total instead
 * of its intended 38%.
 */
function diffuseSplit(counts: number[], shares: number[]): number[][] {
  const carry = shares.map(() => 0)
  return counts.map((n) => {
    if (n <= 0) return shares.map(() => 0)
    const want = shares.map((s, r) => s * n + carry[r])
    // A negative carry can clamp a part to zero, which overshoots `n`, so the
    // drift has to be corrected in both directions.
    const take = want.map((w) => Math.max(0, Math.floor(w)))
    let left = n - take.reduce((a, b) => a + b, 0)
    const order = want
      .map((w, r) => ({ r, frac: w - Math.floor(w) }))
      .sort((a, b) => b.frac - a.frac || a.r - b.r)
    for (let k = 0; left > 0; k = (k + 1) % order.length) {
      take[order[k].r] += 1
      left -= 1
    }
    for (let k = order.length - 1; left < 0; k = (k - 1 + order.length) % order.length) {
      if (take[order[k].r] > 0) {
        take[order[k].r] -= 1
        left += 1
      }
    }
    want.forEach((w, r) => {
      carry[r] = w - take[r]
    })
    return take
  })
}

/**
 * Scales `base` to hit `target` exactly while keeping every entry inside
 * [0, caps[i]]. Drift is spread one unit at a time across entries that have
 * headroom — dumping the whole remainder on one index is what drives a count
 * negative and wrecks the axis.
 */
function fitWithCaps(base: number[], caps: number[], target: number): number[] {
  const out = base.map((v, i) => Math.min(caps[i], Math.max(0, v)))
  let drift = target - out.reduce((a, b) => a + b, 0)
  const order = caps.map((_, i) => i).sort((x, y) => caps[y] - caps[x] || x - y)
  while (drift !== 0) {
    let moved = false
    for (const i of order) {
      if (drift === 0) break
      if (drift > 0 && out[i] < caps[i]) {
        out[i] += 1
        drift -= 1
        moved = true
      } else if (drift < 0 && out[i] > 0) {
        out[i] -= 1
        drift += 1
        moved = true
      }
    }
    if (!moved) break
  }
  return out
}

// ---------------------------------------------------------------------------
// Dimensions and reason codes
// ---------------------------------------------------------------------------

export type DimensionId = "brand" | "channel" | "currency"

export const DIMENSIONS: Record<DimensionId, { label: string; values: string[] }> = {
  brand: { label: "Card brand", values: ["Visa", "Mastercard", "American Express", "Discover"] },
  channel: { label: "Channel", values: ["Web", "Mobile app", "In-store"] },
  currency: { label: "Presentment currency", values: ["USD", "CAD", "EUR"] },
}

export type ReasonSet = "decline" | "dispute"

export type Reason = { id: string; label: string; color: string; striped?: boolean }

// Colours are the design's data-viz ramp. One segment is a diagonal hatch in the
// Figma, reproduced as a real SVG pattern rather than a flat tint.
export const REASONS: Record<ReasonSet, Reason[]> = {
  decline: [
    { id: "insufficient_funds", label: "Insufficient funds", color: "#002a69" },
    { id: "do_not_honor", label: "Do not honor", color: "#0968f6", striped: true },
    { id: "invalid_account", label: "Invalid account number", color: "#0968f6" },
    { id: "expired_card", label: "Expired card", color: "#006f93" },
    { id: "suspected_fraud", label: "Suspected fraud", color: "#d7f4f6" },
  ],
  dispute: [
    { id: "fraud", label: "Fraud", color: "#002a69" },
    { id: "item_not_received", label: "Item not received", color: "#0968f6", striped: true },
    { id: "not_as_described", label: "Not as described", color: "#0968f6" },
    { id: "duplicate", label: "Duplicate processing", color: "#006f93" },
    { id: "subscription_canceled", label: "Subscription canceled", color: "#d7f4f6" },
  ],
}

const DECLINE_SHARES = [0.34, 0.24, 0.18, 0.14, 0.1]
const DISPUTE_SHARES = [0.38, 0.26, 0.18, 0.11, 0.07]

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

export const dayShort = (day: number) => `${MONTH_SHORT} ${day + 1}`
export const dayLong = (day: number) => `${MONTH_LABEL} ${day + 1}`
export const dayIso = (day: number) => `${YEAR}-04-${String(day + 1).padStart(2, "0")}`

// ---------------------------------------------------------------------------
// The cell grid: one row per day x brand x channel x currency
// ---------------------------------------------------------------------------

export type Cell = {
  day: number
  brand: string
  channel: string
  currency: string
  auths: number
  approved: number
  declined: number
  declineByReason: number[]
  authAmount: number
  approvedAmount: number
  disputes: number
  resolved: number
  won: number
  disputeByReason: number[]
  disputeAmount: number
}

const BRAND_WEIGHT: Record<string, number> = {
  Visa: 0.46,
  Mastercard: 0.31,
  "American Express": 0.14,
  Discover: 0.09,
}
const CHANNEL_WEIGHT: Record<string, number> = { Web: 0.44, "Mobile app": 0.41, "In-store": 0.15 }
const CURRENCY_WEIGHT: Record<string, number> = { USD: 0.78, CAD: 0.13, EUR: 0.09 }

// Average ticket in USD-equivalent, so Count and Amount tell a consistent story.
const BASE_TICKET = 42.5
const BRAND_TICKET: Record<string, number> = {
  Visa: 1,
  Mastercard: 0.98,
  "American Express": 1.35,
  Discover: 0.9,
}
const CHANNEL_TICKET: Record<string, number> = { Web: 1, "Mobile app": 0.85, "In-store": 1.2 }
const CURRENCY_TICKET: Record<string, number> = { USD: 1, CAD: 0.78, EUR: 1.12 }

const BRAND_APPROVAL: Record<string, number> = {
  Visa: 0.004,
  Mastercard: 0.001,
  "American Express": -0.006,
  Discover: -0.011,
}
const CHANNEL_APPROVAL: Record<string, number> = { Web: -0.004, "Mobile app": 0.006, "In-store": 0.012 }

export const CELLS: Cell[] = (() => {
  const rnd = mulberry32(20260401)

  type Draft = Omit<
    Cell,
    "auths" | "approved" | "declined" | "declineByReason" | "authAmount" | "approvedAmount" | "disputes" | "resolved" | "won" | "disputeByReason" | "disputeAmount"
  > & { weight: number; approvalRate: number; ticket: number; disputeWeight: number }

  const drafts: Draft[] = []

  // Volume tapers through the month, matching the shape in the design, and dips
  // at weekends. Disputes lag volume, so their weight rises across the month.
  for (let day = 0; day < DAY_COUNT; day++) {
    const dow = (day + 2) % 7 // Apr 1 2026 is a Wednesday
    const weekend = dow === 5 || dow === 6 ? 0.82 : 1
    const taper = 1.55 - 0.85 * (day / (DAY_COUNT - 1))
    const dayWeight = taper * weekend * (0.94 + rnd() * 0.12)
    const dayApproval = (rnd() - 0.5) * 0.05
    const disputeDay = (0.55 + 1.1 * (day / (DAY_COUNT - 1))) * (0.8 + rnd() * 0.4)

    for (const brand of DIMENSIONS.brand.values) {
      for (const channel of DIMENSIONS.channel.values) {
        for (const currency of DIMENSIONS.currency.values) {
          drafts.push({
            day,
            brand,
            channel,
            currency,
            weight:
              dayWeight *
              BRAND_WEIGHT[brand] *
              CHANNEL_WEIGHT[channel] *
              CURRENCY_WEIGHT[currency] *
              (0.9 + rnd() * 0.2),
            approvalRate: Math.min(
              0.98,
              Math.max(
                0.79,
                APPROVAL_RATE + dayApproval + BRAND_APPROVAL[brand] + CHANNEL_APPROVAL[channel] + (rnd() - 0.5) * 0.02,
              ),
            ),
            ticket: BASE_TICKET * BRAND_TICKET[brand] * CHANNEL_TICKET[channel] * CURRENCY_TICKET[currency] * (0.9 + rnd() * 0.2),
            disputeWeight: disputeDay * BRAND_WEIGHT[brand] * CHANNEL_WEIGHT[channel] * CURRENCY_WEIGHT[currency] * (0.7 + rnd() * 0.6),
          })
        }
      }
    }
  }

  const auths = largestRemainder(
    TOTAL_AUTHORIZATIONS,
    drafts.map((d) => d.weight),
  )
  const approved = fitWithCaps(
    drafts.map((d, i) => Math.round(auths[i] * d.approvalRate)),
    auths,
    Math.round(TOTAL_AUTHORIZATIONS * APPROVAL_RATE),
  )
  const disputes = largestRemainder(
    TOTAL_DISPUTES,
    drafts.map((d) => d.disputeWeight),
  )
  // Not every dispute opened in the window has been decided yet, and not every
  // decided one is won. Both are diffused rather than filled cell-by-cell: with
  // one dispute per cell, filling in index order handed every win to early
  // April and none to late April, which reads as a collapsing win rate that
  // the data was never supposed to show.
  const resolved = diffuseSplit(disputes, [0.75, 0.25]).map((s) => s[0])
  const won = diffuseSplit(resolved, [0.42, 0.58]).map((s) => s[0])

  const declinedPerCell = drafts.map((_, i) => auths[i] - approved[i])
  const declineSplit = diffuseSplit(declinedPerCell, DECLINE_SHARES)
  const disputeSplit = diffuseSplit(disputes, DISPUTE_SHARES)

  return drafts.map((d, i) => {
    const cents = (n: number) => Math.round(n * 100) / 100
    return {
      day: d.day,
      brand: d.brand,
      channel: d.channel,
      currency: d.currency,
      auths: auths[i],
      approved: approved[i],
      declined: declinedPerCell[i],
      declineByReason: declineSplit[i],
      authAmount: cents(auths[i] * d.ticket),
      approvedAmount: cents(approved[i] * d.ticket),
      disputes: disputes[i],
      resolved: resolved[i],
      won: won[i],
      disputeByReason: disputeSplit[i],
      disputeAmount: cents(disputes[i] * d.ticket * 1.1),
    }
  })
})()

// ---------------------------------------------------------------------------
// Date ranges
// ---------------------------------------------------------------------------

export type DateRange = {
  id: string
  /** Short form for the picker pill, as in the design's "Apr 1 - Apr 30". */
  label: string
  /** Long form for card captions, as in "from April 1 – April 30". */
  longLabel: string
  from: number
  to: number
}

const range = (id: string, from: number, to: number): DateRange => ({
  id,
  label: `${MONTH_SHORT} ${from + 1} - ${MONTH_SHORT} ${to + 1}`,
  longLabel: `${dayLong(from)} – ${dayLong(to)}`,
  from,
  to,
})

export const DATE_RANGES: DateRange[] = [
  range("full", 0, 29),
  range("first-half", 0, 14),
  range("second-half", 15, 29),
  range("last-7", 23, 29),
]

// The date a row is filed under differs per tab, so the options are scoped to the
// tab rather than shared — a payments view must never offer a dispute date.
export const DATE_RANGE_TYPES: Record<TabId, string[]> = {
  payments: ["Authorization date", "Capture date", "Settlement date"],
  disputes: ["Dispute opened date", "Dispute resolved date"],
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export type Operator = "is" | "is not"
export type Filter = { id: string; dimension: DimensionId; operator: Operator; values: string[] }

export const OPERATORS: Operator[] = ["is", "is not"]

export function filterFields(tab: TabId): DimensionId[] {
  return tab === "payments" ? ["brand", "channel", "currency"] : ["brand", "channel"]
}

export function describeFilter(f: Filter): string {
  return `${DIMENSIONS[f.dimension].label} ${f.operator} ${f.values.join(", ")}`
}

export function selectCells(range: DateRange, filters: Filter[]): Cell[] {
  return CELLS.filter((c) => {
    if (c.day < range.from || c.day > range.to) return false
    return filters.every((f) => {
      if (f.values.length === 0) return true
      const hit = f.values.includes(c[f.dimension])
      return f.operator === "is" ? hit : !hit
    })
  })
}

// ---------------------------------------------------------------------------
// Buckets
// ---------------------------------------------------------------------------

export type Bucket = {
  key: string
  label: string
  rangeLabel: string
  /** True when the bucket covers fewer days than its grain implies. */
  partial: boolean
  days: number
  cells: Cell[]
}

export function bucketize(cells: Cell[], grain: Grain, range: DateRange): Bucket[] {
  const dayList: number[] = []
  for (let d = range.from; d <= range.to; d++) dayList.push(d)
  const byDay = new Map<number, Cell[]>()
  for (const d of dayList) byDay.set(d, [])
  for (const c of cells) byDay.get(c.day)?.push(c)

  const groups: number[][] =
    grain === "daily"
      ? dayList.map((d) => [d])
      : grain === "monthly"
        ? [dayList]
        : dayList.reduce<number[][]>((acc, d, i) => {
            if (i % 7 === 0) acc.push([])
            acc[acc.length - 1].push(d)
            return acc
          }, [])

  // A monthly bucket is only complete when it covers the whole month, so a
  // 7-day range still reports its single bucket as partial.
  const fullSize = grain === "daily" ? 1 : grain === "weekly" ? 7 : DAY_COUNT

  return groups.map((days) => {
    const first = days[0]
    const last = days[days.length - 1]
    const rangeLabel = first === last ? dayLong(first) : `${dayLong(first)} – ${dayLong(last)}`
    return {
      key: `${grain}-${first}`,
      label: grain === "monthly" ? `${MONTH_LABEL} ${YEAR}` : dayShort(first),
      rangeLabel,
      partial: days.length < fullSize,
      days: days.length,
      cells: days.flatMap((d) => byDay.get(d) ?? []),
    }
  })
}

// ---------------------------------------------------------------------------
// Totals + metrics
// ---------------------------------------------------------------------------

export type Totals = {
  auths: number
  approved: number
  declined: number
  authAmount: number
  approvedAmount: number
  declinedAmount: number
  declineByReason: number[]
  declineAmountByReason: number[]
  disputes: number
  resolved: number
  won: number
  disputeByReason: number[]
  disputeAmountByReason: number[]
  disputeAmount: number
  wonAmount: number
  resolvedAmount: number
}

export function totals(cells: Cell[]): Totals {
  const t: Totals = {
    auths: 0,
    approved: 0,
    declined: 0,
    authAmount: 0,
    approvedAmount: 0,
    declinedAmount: 0,
    declineByReason: [0, 0, 0, 0, 0],
    declineAmountByReason: [0, 0, 0, 0, 0],
    disputes: 0,
    resolved: 0,
    won: 0,
    disputeByReason: [0, 0, 0, 0, 0],
    disputeAmountByReason: [0, 0, 0, 0, 0],
    disputeAmount: 0,
    wonAmount: 0,
    resolvedAmount: 0,
  }
  for (const c of cells) {
    const ticket = c.auths > 0 ? c.authAmount / c.auths : 0
    const disputeTicket = c.disputes > 0 ? c.disputeAmount / c.disputes : 0
    t.auths += c.auths
    t.approved += c.approved
    t.declined += c.declined
    t.authAmount += c.authAmount
    t.approvedAmount += c.approvedAmount
    t.declinedAmount += c.authAmount - c.approvedAmount
    t.disputes += c.disputes
    t.resolved += c.resolved
    t.won += c.won
    t.disputeAmount += c.disputeAmount
    t.wonAmount += c.won * disputeTicket
    t.resolvedAmount += c.resolved * disputeTicket
    for (let i = 0; i < 5; i++) {
      t.declineByReason[i] += c.declineByReason[i]
      t.declineAmountByReason[i] += c.declineByReason[i] * ticket
      t.disputeByReason[i] += c.disputeByReason[i]
      t.disputeAmountByReason[i] += c.disputeByReason[i] * disputeTicket
    }
  }
  return t
}

export type TabId = "payments" | "disputes"
export type MetricId =
  | "authorizations"
  | "authorization-rate"
  | "decline-rate"
  | "disputes"
  | "dispute-rate"
  | "win-rate"

export type Unit = "count" | "percent" | "currency"

export type MetricDef = {
  id: MetricId
  label: string
  tooltip: string
  chart: "line" | "stacked"
  /** Rate metrics stay percentages in Amount mode; volume metrics become money. */
  unit: (mode: Mode) => Unit
  reasonSet?: ReasonSet
  /** Rate metrics are capped at 100%; volume metrics scale to the data. */
  fixedDomain?: [number, number]
  caption: string
  /** Sentence shown when the reason-code filter narrows the metric. */
  reasonNote?: string
}

export const METRICS: Record<MetricId, MetricDef> = {
  authorizations: {
    id: "authorizations",
    label: "Authorizations",
    tooltip: "Every authorization request submitted in the selected window, approved or declined.",
    chart: "line",
    unit: (mode) => (mode === "amount" ? "currency" : "count"),
    caption: "Total authorizations from",
  },
  "authorization-rate": {
    id: "authorization-rate",
    label: "Authorization rate",
    tooltip: "Approved authorizations as a share of all authorization requests.",
    chart: "line",
    unit: () => "percent",
    fixedDomain: [0, 1],
    caption: "Approval rate from",
  },
  "decline-rate": {
    id: "decline-rate",
    label: "Decline rate",
    tooltip:
      "Declined authorizations as a share of all requests, split by the reason code the issuer returned. Segments add up to the total decline rate.",
    chart: "stacked",
    unit: () => "percent",
    reasonSet: "decline",
    caption: "Decline rate breakdown from",
    reasonNote: "Showing the share of all authorizations declined for the selected reason codes only.",
  },
  disputes: {
    id: "disputes",
    label: "Disputes",
    tooltip: "Disputes opened against your authorizations in the selected window.",
    chart: "line",
    unit: (mode) => (mode === "amount" ? "currency" : "count"),
    reasonSet: "dispute",
    caption: "Total disputes opened from",
    reasonNote: "Counting disputes filed under the selected reason codes only.",
  },
  "dispute-rate": {
    id: "dispute-rate",
    label: "Dispute rate",
    tooltip:
      "Disputes opened as a share of all authorizations, split by dispute reason. Segments add up to the total dispute rate.",
    chart: "stacked",
    unit: () => "percent",
    reasonSet: "dispute",
    caption: "Dispute rate breakdown from",
    reasonNote: "Showing the share of all authorizations disputed under the selected reason codes only.",
  },
  "win-rate": {
    id: "win-rate",
    label: "Win rate",
    tooltip:
      "Resolved disputes decided in your favour, as a share of all resolved disputes, split by dispute reason. Segments add up to the total win rate.",
    chart: "stacked",
    unit: () => "percent",
    reasonSet: "dispute",
    fixedDomain: [0, 1],
    caption: "Share of resolved disputes won, from",
    reasonNote: "Counting only disputes resolved under the selected reason codes.",
  },
}

export const TAB_METRICS: Record<TabId, MetricId[]> = {
  payments: ["authorizations", "authorization-rate", "decline-rate"],
  disputes: ["disputes", "dispute-rate", "win-rate"],
}

export const TAB_KPIS: Record<TabId, { label: string; metric: MetricId }[]> = {
  payments: [
    { label: "Total authorizations", metric: "authorizations" },
    { label: "Authorization rate", metric: "authorization-rate" },
    { label: "Decline rate", metric: "decline-rate" },
  ],
  disputes: [
    { label: "Total disputes", metric: "disputes" },
    { label: "Dispute rate", metric: "dispute-rate" },
    { label: "Win rate", metric: "win-rate" },
  ],
}

const sum = (xs: number[], keep: boolean[]) => xs.reduce((a, b, i) => (keep[i] ? a + b : a), 0)

/**
 * The single source of truth for a metric's value. The KPI strip and the metric
 * card both call this, so the two can never disagree.
 *
 * Returns null when the metric has no denominator in the window — a rate with
 * nothing underneath it is unknown, not zero.
 */
export function metricValue(id: MetricId, t: Totals, mode: Mode, keep: boolean[]): number | null {
  const money = mode === "amount"
  switch (id) {
    case "authorizations":
      return money ? t.authAmount : t.auths
    case "authorization-rate":
      if (money) return t.authAmount > 0 ? t.approvedAmount / t.authAmount : null
      return t.auths > 0 ? t.approved / t.auths : null
    case "disputes":
      return money ? sum(t.disputeAmountByReason, keep) : sum(t.disputeByReason, keep)
    // Stacked metrics read their headline back off their own segments, so the
    // number above a chart is always exactly the sum of the bars in it.
    case "decline-rate":
    case "dispute-rate":
    case "win-rate": {
      const denom =
        id === "win-rate" ? (money ? t.resolvedAmount : t.resolved) : money ? t.authAmount : t.auths
      if (denom <= 0) return null
      return metricSegments(id, t, mode, keep).reduce((a, b) => a + b, 0)
    }
  }
}

/** Per-reason contribution to a stacked metric, in the metric's own unit. */
export function metricSegments(id: MetricId, t: Totals, mode: Mode, keep: boolean[]): number[] {
  const money = mode === "amount"
  const blank = [0, 0, 0, 0, 0]
  switch (id) {
    case "decline-rate": {
      const denom = money ? t.authAmount : t.auths
      if (denom <= 0) return blank
      const src = money ? t.declineAmountByReason : t.declineByReason
      return src.map((v, i) => (keep[i] ? v / denom : 0))
    }
    case "dispute-rate": {
      const denom = money ? t.authAmount : t.auths
      if (denom <= 0) return blank
      const src = money ? t.disputeAmountByReason : t.disputeByReason
      return src.map((v, i) => (keep[i] ? v / denom : 0))
    }
    case "win-rate": {
      const denom = money ? t.resolvedAmount : t.resolved
      if (denom <= 0) return blank
      const total = money ? t.wonAmount : t.won
      const reasonMix = money ? t.disputeAmountByReason : t.disputeByReason
      const mixTotal = reasonMix.reduce((a, b) => a + b, 0)
      if (mixTotal <= 0) return blank
      return reasonMix.map((v, i) => (keep[i] ? (total * (v / mixTotal)) / denom : 0))
    }
    default:
      return blank
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export const formatCount = (n: number) => n.toLocaleString("en-US")

export const formatCurrency = (n: number, digits = 2) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits })

/** Headline percentages follow the design's two-decimal treatment. */
export function formatPercent(v: number, digits = 2) {
  return `${(v * 100).toFixed(digits)}%`
}

export function formatValue(v: number | null, unit: Unit): string {
  if (v === null) return "—"
  if (unit === "percent") return formatPercent(v)
  if (unit === "currency") return formatCurrency(v, 0)
  return formatCount(v)
}

/** Compact money for a chart axis, where full precision would not fit. */
export function compactCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return `$${Math.round(n)}`
}

// ---------------------------------------------------------------------------
// Axis ticks
// ---------------------------------------------------------------------------

const NICE_STEPS = [1, 2, 2.5, 5, 10]

/**
 * Builds a tick list whose labels are guaranteed to be distinct — picking the
 * precision once per axis from its own step, rather than per value, is what
 * stops two different ticks both printing "1k" or "2%".
 */
export function buildAxis(max: number, unit: Unit, fixed?: [number, number]) {
  const TICKS = 5
  if (fixed) {
    const [lo, hi] = fixed
    const step = (hi - lo) / (TICKS - 1)
    const values = Array.from({ length: TICKS }, (_, i) => lo + step * i)
    return { min: lo, max: hi, values, format: axisFormatter(unit, step) }
  }
  const safeMax = max > 0 ? max : unit === "percent" ? 0.01 : 1
  const rawStep = safeMax / (TICKS - 1)
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const step = (NICE_STEPS.find((s) => s * magnitude >= rawStep) ?? 10) * magnitude
  const top = step * (TICKS - 1)
  const values = Array.from({ length: TICKS }, (_, i) => step * i)
  return { min: 0, max: top, values, format: axisFormatter(unit, step) }
}

function axisFormatter(unit: Unit, step: number) {
  if (unit === "percent") {
    // Smallest precision that keeps adjacent ticks distinct.
    const pctStep = step * 100
    const digits = pctStep >= 1 ? 0 : pctStep >= 0.1 ? 1 : 2
    return (v: number) => `${(v * 100).toFixed(digits)}%`
  }
  if (unit === "currency") return (v: number) => compactCurrency(v)
  // A count axis must never print a fractional tick.
  return (v: number) => formatCount(Math.round(v))
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

const csvCell = (v: string | number) => {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function metricCsv(
  id: MetricId,
  buckets: Bucket[],
  mode: Mode,
  keep: boolean[],
): { filename: string; body: string } {
  const def = METRICS[id]
  const unit = def.unit(mode)
  const reasons = def.reasonSet ? REASONS[def.reasonSet] : []
  const stacked = def.chart === "stacked"

  const head = ["Period", "Range", "Complete period", def.label]
  if (stacked) head.push(...reasons.filter((_, i) => keep[i]).map((r) => r.label))

  const rows = buckets.map((b) => {
    const t = totals(b.cells)
    const value = metricValue(id, t, mode, keep)
    const row: (string | number)[] = [
      b.label,
      b.rangeLabel,
      b.partial ? "no" : "yes",
      value === null ? "" : unit === "percent" ? (value * 100).toFixed(4) : value.toFixed(unit === "currency" ? 2 : 0),
    ]
    if (stacked) {
      const segs = metricSegments(id, t, mode, keep)
      reasons.forEach((_, i) => {
        if (keep[i]) row.push((segs[i] * 100).toFixed(4))
      })
    }
    return row
  })

  const unitNote = unit === "percent" ? " (percent)" : unit === "currency" ? " (USD)" : ""
  const body = [
    head.map((h, i) => csvCell(i >= 3 ? `${h}${unitNote}` : h)).join(","),
    ...rows.map((r) => r.map(csvCell).join(",")),
  ].join("\n")

  return { filename: `${id}-${mode}.csv`, body }
}
