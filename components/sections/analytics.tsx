"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Calendar, Check, ChevronDown, Info, SlidersHorizontal, X } from "lucide-react"
import {
  DATE_RANGES,
  DATE_RANGE_TYPES,
  DIMENSIONS,
  METRICS,
  OPERATORS,
  REASONS,
  TAB_KPIS,
  TAB_METRICS,
  bucketize,
  buildAxis,
  compactCurrency,
  describeFilter,
  filterFields,
  formatCount,
  formatCurrency,
  formatPercent,
  formatValue,
  metricCsv,
  metricSegments,
  metricValue,
  selectCells,
  totals,
  type DateRange,
  type DimensionId,
  type Filter,
  type Grain,
  type MetricId,
  type Mode,
  type Operator,
  type TabId,
} from "@/lib/analytics-data"
import { ChartLegend, LineChart, StackedBarChart, type SegmentStyle } from "./analytics-charts"
import styles from "./analytics.module.css"

const TABS: { id: TabId | "tbd-1" | "tbd-2"; label: string; enabled: boolean }[] = [
  { id: "payments", label: "Payments", enabled: true },
  { id: "disputes", label: "Disputes", enabled: true },
  // Two tabs in the design are literally labelled "TBD" — they have no content
  // to build, so they stay visible and inert rather than being invented.
  { id: "tbd-1", label: "TBD", enabled: false },
  { id: "tbd-2", label: "TBD", enabled: false },
]

const GRAINS: { id: Grain; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
]

export function Analytics({ tab, onTabChange }: { tab: TabId; onTabChange: (t: TabId) => void }) {
  // The shell's own top bar is sticky and its height varies, so the page header
  // has to be told where the bottom of it is rather than assuming a constant.
  const [stickyTop, setStickyTop] = useState(0)
  useEffect(() => {
    const top = document.querySelector<HTMLElement>("[data-sc-top]")
    if (!top) return
    const measure = () => setStickyTop(top.getBoundingClientRect().height)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(top)
    return () => ro.disconnect()
  }, [])

  return (
    <div className={styles.page} style={{ ["--sticky-top" as string]: `${stickyTop}px` }}>
      {/* Keyed on the tab so date-range type, filters and per-card state cannot
          leak across tabs that do not share the same fields. */}
      <AnalyticsTab key={tab} tab={tab} onTabChange={onTabChange} />
    </div>
  )
}

function AnalyticsTab({ tab, onTabChange }: { tab: TabId; onTabChange: (t: TabId) => void }) {
  const [rangeTypeIndex, setRangeTypeIndex] = useState(0)
  const [rangeId, setRangeId] = useState(DATE_RANGES[0].id)
  const [filters, setFilters] = useState<Filter[]>([])
  const [mode, setMode] = useState<Mode>("count")

  const range = DATE_RANGES.find((r) => r.id === rangeId) ?? DATE_RANGES[0]
  const cells = useMemo(() => selectCells(range, filters), [range, filters])
  const scope = useMemo(() => totals(cells), [cells])
  const rangeTypes = DATE_RANGE_TYPES[tab]

  return (
    <>
      <div className={styles.stickyHead}>
        <h2 className={styles.title}>Analytics</h2>

        <div className={styles.tabs} role="tablist" aria-label="Analytics views">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={t.id === tab}
              className={`${styles.tab} ${t.id === tab ? styles.tabActive : ""}`}
              disabled={!t.enabled}
              title={t.enabled ? undefined : "Not yet defined"}
              onClick={() => t.enabled && onTabChange(t.id as TabId)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={styles.controls}>
          <SelectPill
            ariaLabel="Date range type"
            title="Date range type"
            value={rangeTypes[rangeTypeIndex]}
            options={rangeTypes}
            onSelect={(i) => setRangeTypeIndex(i)}
          />
          <SelectPill
            ariaLabel="Date range"
            title="Date range"
            value={range.label}
            options={DATE_RANGES.map((r) => r.label)}
            icon={<Calendar size={18} aria-hidden="true" />}
            onSelect={(i) => setRangeId(DATE_RANGES[i].id)}
          />
          <FiltersPopover tab={tab} filters={filters} onChange={setFilters} />

          <div className={styles.modeToggle}>
            <span className={`${styles.modeLabel} ${mode === "count" ? styles.modeLabelActive : ""}`}>Count</span>
            <button
              type="button"
              role="switch"
              aria-checked={mode === "amount"}
              aria-label="Show amounts instead of counts"
              className={`${styles.switch} ${mode === "amount" ? styles.switchOn : ""}`}
              onClick={() => setMode(mode === "count" ? "amount" : "count")}
            >
              <span className={styles.knob} />
            </button>
            <span className={`${styles.modeLabel} ${mode === "amount" ? styles.modeLabelActive : ""}`}>Amount</span>
          </div>
        </div>

        {filters.length > 0 && (
          <div className={styles.chips}>
            {filters.map((f) => (
              <span key={f.id} className={styles.chip}>
                {describeFilter(f)}
                <button
                  type="button"
                  className={styles.chipRemove}
                  aria-label={`Remove filter ${describeFilter(f)}`}
                  onClick={() => setFilters((prev) => prev.filter((p) => p.id !== f.id))}
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </span>
            ))}
            <button type="button" className={styles.linkBtn} onClick={() => setFilters([])}>
              Clear all
            </button>
            <span className={styles.scopeNote}>
              {formatCount(scope.auths)} of {formatCount(totals(selectCells(range, [])).auths)} authorizations in range
            </span>
          </div>
        )}

        <div className={styles.kpis}>
          {TAB_KPIS[tab].map((kpi) => {
            const def = METRICS[kpi.metric]
            // The KPI reads the same compute the card below it uses, with every
            // reason code in scope, so the strip and the cards cannot disagree.
            const value = metricValue(kpi.metric, scope, mode, [true, true, true, true, true])
            return (
              <div key={kpi.metric} className={styles.kpi}>
                <p className={styles.kpiLabel}>
                  {kpi.label}
                  <InfoTip text={def.tooltip} label={`About ${kpi.label}`} />
                </p>
                <div className={styles.kpiValue}>{formatValue(value, def.unit(mode))}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div className={styles.cards}>
        {TAB_METRICS[tab].map((id) => (
          <MetricCard key={id} id={id} cells={cells} range={range} mode={mode} />
        ))}
      </div>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* Metric card                                                                */
/* -------------------------------------------------------------------------- */

const ALL_REASONS = [true, true, true, true, true]

function MetricCard({
  id,
  cells,
  range,
  mode,
}: {
  id: MetricId
  cells: ReturnType<typeof selectCells>
  range: DateRange
  mode: Mode
}) {
  const def = METRICS[id]
  const [grain, setGrain] = useState<Grain>("daily")
  const [keep, setKeep] = useState<boolean[]>(ALL_REASONS)

  const unit = def.unit(mode)
  const reasons = def.reasonSet ? REASONS[def.reasonSet] : []
  const segmentStyles: SegmentStyle[] = reasons.map((r) => ({ label: r.label, color: r.color, striped: r.striped }))
  const activeKeep = def.reasonSet ? keep : ALL_REASONS

  const scope = useMemo(() => totals(cells), [cells])
  const headline = metricValue(id, scope, mode, activeKeep)
  const buckets = useMemo(() => bucketize(cells, grain, range), [cells, grain, range])

  const formatOne = (v: number) =>
    unit === "percent" ? formatPercent(v) : unit === "currency" ? formatCurrency(v, 2) : formatCount(v)

  const series = useMemo(() => {
    if (def.chart === "line") {
      const points = buckets.map((b) => ({
        label: b.label,
        rangeLabel: b.rangeLabel,
        value: metricValue(id, totals(b.cells), mode, activeKeep),
        partial: b.partial,
      }))
      const max = points.reduce((m, p) => (p.value !== null && p.value > m ? p.value : m), 0)
      return { kind: "line" as const, points, axis: buildAxis(max, unit, def.fixedDomain) }
    }
    const bars = buckets.map((b) => {
      const t = totals(b.cells)
      const segments = metricSegments(id, t, mode, activeKeep)
      return {
        label: b.label,
        rangeLabel: b.rangeLabel,
        segments,
        total: segments.reduce((a, c) => a + c, 0),
        partial: b.partial,
      }
    })
    const max = bars.reduce((m, b) => Math.max(m, b.total), 0)
    return { kind: "stacked" as const, bars, axis: buildAxis(max, unit, def.fixedDomain) }
  }, [buckets, id, mode, activeKeep, unit, def.chart, def.fixedDomain])

  const partialCount = buckets.filter((b) => b.partial).length
  const partialNames = buckets.filter((b) => b.partial).map((b) => b.rangeLabel)
  const narrowed = activeKeep.some((k) => !k)
  const noData = def.chart === "line" && series.kind === "line" && series.points.every((p) => p.value === null)

  const download = () => {
    const { filename, body } = metricCsv(id, buckets, mode, activeKeep)
    const blob = new Blob([body], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const reasonLabel = activeKeep.every(Boolean)
    ? "All"
    : reasons
        .filter((_, i) => activeKeep[i])
        .map((r) => r.label)
        .join(", ")

  return (
    <section className={styles.card} aria-label={def.label}>
      <div className={styles.cardHead}>
        <h3 className={styles.cardLabel}>
          {def.label}
          <InfoTip text={def.tooltip} label={`About ${def.label}`} />
        </h3>
        <button type="button" className={styles.csvBtn} onClick={download}>
          Generate CSV
        </button>
      </div>

      <div className={styles.valueRow}>
        <span className={styles.value}>{formatValue(headline, unit)}</span>
        <span className={styles.caption}>
          {def.caption} <span className={styles.captionStrong}>{range.longLabel}</span>
        </span>
      </div>

      <div className={styles.cardControls}>
        <div className={styles.segmented} role="group" aria-label={`${def.label} period`}>
          {GRAINS.map((g) => (
            <button
              key={g.id}
              type="button"
              aria-pressed={g.id === grain}
              className={`${styles.segBtn} ${g.id === grain ? styles.segBtnActive : ""}`}
              onClick={() => setGrain(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>

        {def.reasonSet && (
          <ReasonSelect
            title={`${def.reasonSet === "decline" ? "Decline" : "Dispute"} reason code`}
            reasons={reasons}
            keep={keep}
            onChange={setKeep}
            valueLabel={reasonLabel}
          />
        )}
      </div>

      {series.kind === "line" ? (
        <LineChart
          points={series.points}
          axis={series.axis}
          formatValue={formatOne}
          description={`${def.label} by ${grain} period, ${range.label}`}
        />
      ) : (
        <>
          <StackedBarChart
            bars={series.bars}
            axis={series.axis}
            segments={segmentStyles}
            formatValue={formatOne}
            benchmark={headline}
            benchmarkLabel={`Period average — ${formatValue(headline, unit)}`}
            description={`${def.label} by ${grain} period broken down by reason code, ${range.label}`}
          />
          <ChartLegend segments={segmentStyles.filter((_, i) => activeKeep[i])} />
        </>
      )}

      {noData && <p className={styles.note}>No {def.label.toLowerCase()} recorded in this range.</p>}

      {narrowed && def.reasonNote && <p className={styles.note}>{def.reasonNote}</p>}

      {partialCount > 0 && (
        <p className={styles.note}>
          {partialCount === 1
            ? `${partialNames[0]} is a partial ${grain === "monthly" ? "month" : "week"}, so it is lower than a complete one.`
            : `${partialCount} periods cover fewer days than the rest, so they read lower than complete ones.`}
        </p>
      )}
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* Controls                                                                   */
/* -------------------------------------------------------------------------- */

function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        close()
      }
    }
    document.addEventListener("pointerdown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open, close])
  return ref
}

function SelectPill({
  value,
  options,
  onSelect,
  ariaLabel,
  title,
  icon,
}: {
  value: string
  options: string[]
  onSelect: (index: number) => void
  ariaLabel: string
  title: string
  icon?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useDismiss(open, () => setOpen(false))
  return (
    <div className={styles.popoverHost} ref={ref}>
      <button
        type="button"
        className={`${styles.pill} ${open ? styles.pillActive : ""}`}
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {icon}
        {value}
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      {open && (
        <div className={styles.popover} role="dialog" aria-label={title}>
          <p className={styles.popoverTitle}>{title}</p>
          <div className={styles.optionList}>
            {options.map((o, i) => (
              <button
                key={o}
                type="button"
                className={`${styles.option} ${o === value ? styles.optionSelected : ""}`}
                onClick={() => {
                  onSelect(i)
                  setOpen(false)
                }}
              >
                <span className={`${styles.radio} ${o === value ? styles.boxOn : ""}`}>
                  {o === value && <Check size={12} aria-hidden="true" />}
                </span>
                {o}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ReasonSelect({
  title,
  reasons,
  keep,
  onChange,
  valueLabel,
}: {
  title: string
  reasons: { id: string; label: string; color: string; striped?: boolean }[]
  keep: boolean[]
  onChange: (next: boolean[]) => void
  valueLabel: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useDismiss(open, () => setOpen(false))
  const selectedCount = keep.filter(Boolean).length

  return (
    <div className={styles.popoverHost} ref={ref}>
      <button
        type="button"
        className={`${styles.reasonPill} ${open ? styles.pillActive : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {title}: <span className={styles.reasonValue}>{valueLabel}</span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      {open && (
        <div className={`${styles.popover} ${styles.popoverWide}`} role="dialog" aria-label={title}>
          <p className={styles.popoverTitle}>{title}</p>
          <div className={styles.optionList}>
            {reasons.map((r, i) => {
              const on = keep[i]
              // The last remaining code cannot be unchecked: a chart with no
              // reason codes selected has nothing to show and no useful headline.
              const locked = on && selectedCount === 1
              return (
                <button
                  key={r.id}
                  type="button"
                  className={`${styles.option} ${on ? styles.optionSelected : ""}`}
                  aria-pressed={on}
                  disabled={locked}
                  title={locked ? "At least one reason code must stay selected" : undefined}
                  onClick={() => onChange(keep.map((k, ki) => (ki === i ? !k : k)))}
                >
                  <span className={`${styles.box} ${on ? styles.boxOn : ""}`}>
                    {on && <Check size={12} aria-hidden="true" />}
                  </span>
                  <span
                    className={styles.swatchDot}
                    style={
                      r.striped
                        ? { backgroundImage: "repeating-linear-gradient(45deg,#0968f6 0 2.5px,#d4e5fe 2.5px 6px)" }
                        : { backgroundColor: r.color }
                    }
                    aria-hidden="true"
                  />
                  {r.label}
                </button>
              )
            })}
          </div>
          <div className={styles.popoverFooter}>
            <button type="button" className={styles.linkBtn} onClick={() => onChange(ALL_REASONS)}>
              Select all
            </button>
            <button type="button" className={styles.ghostBtn} onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function FiltersPopover({
  tab,
  filters,
  onChange,
}: {
  tab: TabId
  filters: Filter[]
  onChange: (next: Filter[]) => void
}) {
  const fields = filterFields(tab)
  const [open, setOpen] = useState(false)
  const ref = useDismiss(open, () => setOpen(false))
  const [dimension, setDimension] = useState<DimensionId>(fields[0])
  const [operator, setOperator] = useState<Operator>(OPERATORS[0])
  const [values, setValues] = useState<string[]>([])

  const reset = () => {
    setDimension(fields[0])
    setOperator(OPERATORS[0])
    setValues([])
  }

  const apply = () => {
    if (values.length === 0) return
    onChange([
      ...filters.filter((f) => f.dimension !== dimension),
      { id: `${dimension}-${Date.now()}`, dimension, operator, values },
    ])
    reset()
    setOpen(false)
  }

  return (
    <div className={styles.popoverHost} ref={ref}>
      <button
        type="button"
        className={`${styles.pill} ${open ? styles.pillActive : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <SlidersHorizontal size={18} aria-hidden="true" />
        Filters
        {filters.length > 0 && <span className={styles.pillCount}>{filters.length}</span>}
      </button>
      {open && (
        <div className={`${styles.popover} ${styles.popoverWide}`} role="dialog" aria-label="Add a filter">
          <p className={styles.popoverTitle}>Add a filter</p>
          <div className={styles.builderRow}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Field</span>
              <select
                className={styles.select}
                value={dimension}
                onChange={(e) => {
                  setDimension(e.target.value as DimensionId)
                  setValues([])
                }}
              >
                {fields.map((f) => (
                  <option key={f} value={f}>
                    {DIMENSIONS[f].label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Condition</span>
              <select
                className={styles.select}
                value={operator}
                onChange={(e) => setOperator(e.target.value as Operator)}
              >
                {OPERATORS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.optionList}>
            {DIMENSIONS[dimension].values.map((v) => {
              const on = values.includes(v)
              return (
                <button
                  key={v}
                  type="button"
                  className={`${styles.option} ${on ? styles.optionSelected : ""}`}
                  aria-pressed={on}
                  onClick={() => setValues((prev) => (on ? prev.filter((p) => p !== v) : [...prev, v]))}
                >
                  <span className={`${styles.box} ${on ? styles.boxOn : ""}`}>
                    {on && <Check size={12} aria-hidden="true" />}
                  </span>
                  {v}
                </button>
              )
            })}
          </div>

          <div className={styles.popoverFooter}>
            <button type="button" className={styles.linkBtn} onClick={reset}>
              Reset
            </button>
            <button type="button" className={styles.ghostBtn} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className={styles.primaryBtn} disabled={values.length === 0} onClick={apply}>
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoTip({ text, label }: { text: string; label: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span
      className={styles.info}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
      role="note"
      aria-label={`${label}: ${text}`}
    >
      <Info size={16} aria-hidden="true" />
      {open && <span className={styles.infoBubble}>{text}</span>}
    </span>
  )
}
