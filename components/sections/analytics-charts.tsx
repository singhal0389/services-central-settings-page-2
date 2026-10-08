"use client"

import { useId, useLayoutEffect, useRef, useState } from "react"
import styles from "./analytics.module.css"

const AXIS_GUTTER = 56
const X_LABEL_BAND = 26
const TOP_PAD = 10

export type Axis = { min: number; max: number; values: number[]; format: (v: number) => string }

export type Point = {
  label: string
  rangeLabel: string
  value: number | null
  partial: boolean
}

export type StackedBar = {
  label: string
  rangeLabel: string
  segments: number[]
  total: number
  partial: boolean
}

export type SegmentStyle = { label: string; color: string; striped?: boolean }

/** Measures the rendered width so the SVG can be drawn in real pixels. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    setWidth(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

/**
 * Labels every third tick plus the last, matching the design's x-axis cadence.
 * A short series labels every bucket — thinning 5 weekly bars down to 2 labels
 * leaves most of the chart unreadable.
 */
function labelled(count: number) {
  const keep = new Set<number>()
  if (count <= 8) {
    for (let i = 0; i < count; i++) keep.add(i)
    return keep
  }
  for (let i = 0; i < count; i += 3) keep.add(i)
  keep.add(count - 1)
  keep.delete(count - 2)
  return keep
}

function Gridlines({ axis, plotW, plotH }: { axis: Axis; plotW: number; plotH: number }) {
  const scale = (v: number) => plotH - ((v - axis.min) / (axis.max - axis.min || 1)) * plotH
  return (
    <g aria-hidden="true">
      {axis.values.map((v) => (
        <g key={v}>
          <line x1={0} x2={plotW} y1={scale(v)} y2={scale(v)} className={styles.gridline} />
          <text x={plotW + 10} y={scale(v)} dominantBaseline="middle" className={styles.axisLabel}>
            {axis.format(v)}
          </text>
        </g>
      ))}
    </g>
  )
}

export function LineChart({
  points,
  axis,
  height = 220,
  formatValue,
  description,
}: {
  points: Point[]
  axis: Axis
  height?: number
  formatValue: (v: number) => string
  description: string
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const gid = useId().replace(/[^a-zA-Z0-9]/g, "")

  const plotW = Math.max(0, width - AXIS_GUTTER)
  const plotH = Math.max(0, height - X_LABEL_BAND - TOP_PAD)
  const slot = points.length > 1 ? plotW / (points.length - 1) : 0
  const x = (i: number) => (points.length > 1 ? i * slot : plotW / 2)
  const y = (v: number) => plotH - ((v - axis.min) / (axis.max - axis.min || 1)) * plotH

  // A gap in the data must break the line rather than be interpolated across.
  const runs: { i: number; value: number }[][] = []
  points.forEach((p, i) => {
    if (p.value === null) {
      if (runs.length && runs[runs.length - 1].length) runs.push([])
      return
    }
    if (!runs.length) runs.push([])
    runs[runs.length - 1].push({ i, value: p.value })
  })

  const shown = labelled(points.length)
  const active = hover !== null ? points[hover] : null

  return (
    <div className={styles.chartWrap} ref={ref}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={description}
          className={styles.chartSvg}
          onPointerMove={(e) => {
            if (!slot && points.length > 1) return
            const rect = e.currentTarget.getBoundingClientRect()
            const px = e.clientX - rect.left
            if (px > plotW + 4) return setHover(null)
            const idx = points.length > 1 ? Math.round(px / slot) : 0
            setHover(Math.min(points.length - 1, Math.max(0, idx)))
          }}
          onPointerLeave={() => setHover(null)}
        >
          <g transform={`translate(0,${TOP_PAD})`}>
            <Gridlines axis={axis} plotW={plotW} plotH={plotH} />

            {runs
              .filter((r) => r.length > 1)
              .map((run, ri) => (
                <polyline
                  key={`run-${ri}`}
                  className={styles.line}
                  points={run.map((p) => `${x(p.i)},${y(p.value)}`).join(" ")}
                />
              ))}

            {/* A run of one has no direction, so it is drawn as a marker, not a line. */}
            {runs
              .filter((r) => r.length === 1)
              .map((run) => (
                <circle key={`dot-${run[0].i}`} cx={x(run[0].i)} cy={y(run[0].value)} r={4} className={styles.lineDot} />
              ))}

            {active && active.value !== null && (
              <>
                <line x1={x(hover!)} x2={x(hover!)} y1={0} y2={plotH} className={styles.hoverRule} />
                <circle cx={x(hover!)} cy={y(active.value)} r={4.5} className={styles.lineDot} />
              </>
            )}

            {points.map((p, i) =>
              shown.has(i) ? (
                <text
                  key={`${p.label}-${i}`}
                  x={x(i)}
                  y={plotH + 18}
                  textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
                  className={styles.axisLabel}
                >
                  {p.label}
                </text>
              ) : null,
            )}
            <desc id={`${gid}-desc`}>{description}</desc>
          </g>
        </svg>
      )}

      {active && (
        <div className={styles.readout} role="status">
          <span className={styles.readoutRange}>{active.rangeLabel}</span>
          <span className={styles.readoutValue}>{active.value === null ? "No data" : formatValue(active.value)}</span>
          {active.partial && <span className={styles.readoutFlag}>Incomplete period</span>}
        </div>
      )}
    </div>
  )
}

export function StackedBarChart({
  bars,
  axis,
  segments,
  height = 300,
  formatValue,
  benchmark,
  benchmarkLabel,
  description,
}: {
  bars: StackedBar[]
  axis: Axis
  segments: SegmentStyle[]
  height?: number
  formatValue: (v: number) => string
  benchmark?: number | null
  benchmarkLabel?: string
  description: string
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const rawId = useId()
  const patternId = `hatch-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`

  const plotW = Math.max(0, width - AXIS_GUTTER)
  const plotH = Math.max(0, height - X_LABEL_BAND - TOP_PAD)
  const slot = bars.length > 0 ? plotW / bars.length : 0
  const barW = Math.max(6, Math.min(22, slot * 0.46))
  const centre = (i: number) => slot * i + slot / 2
  const scale = (v: number) => ((v - axis.min) / (axis.max - axis.min || 1)) * plotH

  const shown = labelled(bars.length)
  const active = hover !== null ? bars[hover] : null

  return (
    <div className={styles.chartWrap} ref={ref}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={description}
          className={styles.chartSvg}
          onPointerMove={(e) => {
            if (!slot) return
            const rect = e.currentTarget.getBoundingClientRect()
            const px = e.clientX - rect.left
            if (px > plotW + 4) return setHover(null)
            setHover(Math.min(bars.length - 1, Math.max(0, Math.floor(px / slot))))
          }}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <pattern id={patternId} width={6} height={6} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <rect width={6} height={6} fill="#d4e5fe" />
              <line x1={0} y1={0} x2={0} y2={6} stroke="#0968f6" strokeWidth={2.5} />
            </pattern>
          </defs>

          <g transform={`translate(0,${TOP_PAD})`}>
            <Gridlines axis={axis} plotW={plotW} plotH={plotH} />

            {bars.map((bar, i) => {
              let cursor = 0
              return (
                <g key={`${bar.label}-${i}`}>
                  {bar.segments.map((v, si) => {
                    if (v <= 0) return null
                    const h = scale(v)
                    const yTop = plotH - scale(cursor) - h
                    cursor += v
                    const style = segments[si]
                    return (
                      <rect
                        key={style.label}
                        x={centre(i) - barW / 2}
                        y={yTop}
                        width={barW}
                        height={Math.max(0.5, h)}
                        fill={style.striped ? `url(#${patternId})` : style.color}
                      />
                    )
                  })}
                </g>
              )
            })}

            {typeof benchmark === "number" && benchmark > axis.min && benchmark < axis.max && (
              <line
                x1={0}
                x2={plotW}
                y1={plotH - scale(benchmark)}
                y2={plotH - scale(benchmark)}
                className={styles.benchmark}
              />
            )}

            {bars.map((bar, i) =>
              shown.has(i) ? (
                <text
                  key={`label-${bar.label}-${i}`}
                  x={centre(i)}
                  y={plotH + 18}
                  textAnchor="middle"
                  className={styles.axisLabel}
                >
                  {bar.label}
                </text>
              ) : null,
            )}
          </g>
        </svg>
      )}

      {active && (
        <div className={styles.readout} role="status">
          <span className={styles.readoutRange}>{active.rangeLabel}</span>
          <span className={styles.readoutValue}>{formatValue(active.total)}</span>
          {active.partial && <span className={styles.readoutFlag}>Incomplete period</span>}
        </div>
      )}

      {typeof benchmark === "number" && benchmarkLabel && (
        <p className={styles.benchmarkNote}>
          <span className={styles.benchmarkSwatch} aria-hidden="true" />
          {benchmarkLabel}
        </p>
      )}
    </div>
  )
}

export function ChartLegend({ segments }: { segments: SegmentStyle[] }) {
  return (
    <ul className={styles.legend}>
      {segments.map((s) => (
        <li key={s.label} className={styles.legendItem}>
          <span
            className={styles.legendSwatch}
            style={
              s.striped
                ? { backgroundImage: "repeating-linear-gradient(45deg,#0968f6 0 2.5px,#d4e5fe 2.5px 6px)" }
                : { backgroundColor: s.color }
            }
            aria-hidden="true"
          />
          {s.label}
        </li>
      ))}
    </ul>
  )
}
