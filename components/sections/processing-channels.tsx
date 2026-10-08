"use client"

import { useState } from "react"
import { EbayButton } from "@ebay/ui-core-react/ebay-button"
import { EbayTextbox } from "@ebay/ui-core-react/ebay-textbox"
import { EbaySelect, EbaySelectOption } from "@ebay/ui-core-react/ebay-select"
import { EbaySwitch } from "@ebay/ui-core-react/ebay-switch"
import { EbayInlineNotice, EbayNoticeContent } from "@ebay/ui-core-react/ebay-inline-notice"
import { EbayIconAdd16 } from "@ebay/ui-core-react/icons/ebay-icon-add-16"
import { EbayIconArrowLeft16 } from "@ebay/ui-core-react/icons/ebay-icon-arrow-left-16"
import { EbayIconClose12 } from "@ebay/ui-core-react/icons/ebay-icon-close-12"
import { EbayIconLock16 } from "@ebay/ui-core-react/icons/ebay-icon-lock-16"
import { EbayIconFile16 } from "@ebay/ui-core-react/icons/ebay-icon-file-16"
import { useStore } from "@/lib/store"
import { getPpe } from "@/lib/data"
import { StatusBadge } from "@/components/status-badge"
import { PageHead } from "@/components/app-shell"
import { Card, CardHead, Def, Field, Drawer } from "@/components/ui-bits"
import { SoftDescriptorSummary } from "./soft-descriptors"
import type { ProcessingChannel, PaymentMethodDef, MethodApplication } from "@/lib/types"
import cards from "@/components/cards.module.css"
import styles from "./channels.module.css"

const METHOD_COLORS: Record<string, string> = {
  visa: "#1a1f71",
  mastercard: "#eb001b",
  amex: "#2e77bc",
  applepay: "#111",
  googlepay: "#4285f4",
  diners: "#0079be",
  klarna: "#ffb3c7",
  clearpay: "#b2fce4",
  affirm: "#4a4af4",
  bacs: "#333",
  sepa: "#0a3d91",
  ach: "#2a7",
  ideal: "#cc0066",
  bancontact: "#005498",
  p24: "#d1122a",
}

const GROUPS: { id: PaymentMethodDef["category"]; label: string }[] = [
  { id: "cards", label: "Cards & Wallets" },
  { id: "bnpl", label: "Buy Now Pay Later" },
  { id: "bank", label: "Bank Transfers & Direct Debit" },
  { id: "regional", label: "Regional Methods" },
]

// Currencies a client may take in and convert into a holding currency.
const ALL_CURRENCIES = ["USD", "EUR", "GBP", "AUD", "NZD", "CAD", "JPY", "CHF", "SEK", "NOK", "DKK", "PLN"]

// Geographies a payment method can be scoped to.
const GEOGRAPHIES = ["United Kingdom", "Ireland", "Germany", "France", "Spain", "Italy", "Netherlands", "United States", "Australia"]

export function ProcessingChannels() {
  const { currentEntity, can } = useStore()
  const [openId, setOpenId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const channel = openId
    ? currentEntity.channels.find((c) => c.id === openId)
    : undefined

  if (creating || channel) {
    return (
      <ChannelDetail
        channel={channel}
        onBack={() => {
          setOpenId(null)
          setCreating(false)
        }}
      />
    )
  }

  return (
    <>
      <PageHead
        title="Processing Channels"
        subtitle="A processing channel defines how a payment is routed: the PPE, MCCs, currencies, methods, and descriptor."
        actions={
          can("configure-channel") ? (
            <EbayButton priority="primary" onClick={() => setCreating(true)}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <EbayIconAdd16 aria-hidden="true" /> New Processing Channel
              </span>
            </EbayButton>
          ) : undefined
        }
      />

      {currentEntity.channels.length === 0 ? (
        <Card>
          <div className={cards.empty}>
            <strong style={{ color: "var(--color-foreground-primary)" }}>No processing channels yet</strong>
            <p style={{ maxWidth: "42ch", margin: 0 }}>
              {can("configure-channel")
                ? "Once your business profile is approved, request a processing channel to start accepting payments."
                : "This entity has not configured any processing channels."}
            </p>
          </div>
        </Card>
      ) : (
        <div className={cards.cardGrid2}>
          {currentEntity.channels.map((c) => {
            // Every holding currency this channel settles into, with its default first.
            const currencies = [...new Set(c.accountMapping.map((m) => m.currency))]
            if (c.defaultCurrency && !currencies.includes(c.defaultCurrency)) currencies.unshift(c.defaultCurrency)
            const holdingCurrencies = currencies.length ? currencies : c.defaultCurrency ? [c.defaultCurrency] : []
            // Methods are named rather than abbreviated: a four-character crop
            // renders "PAYP" / "MAST", which the reader has to decode.
            const methodNames = getPpe(c.ppe)?.methods ?? []
            const enabled = Object.entries(c.methods)
              .filter(([, on]) => on)
              .map(([id]) => ({ id, name: methodNames.find((m) => m.id === id)?.name ?? id }))
            const shown = enabled.slice(0, 6)
            return (
              <Card key={c.id} className={cards.cardPad}>
                <button type="button" className={styles.channelCardBtn} onClick={() => setOpenId(c.id)} aria-label={`Open ${c.name}`}>
                  <div className={cards.stackSm}>
                    <div className={cards.rowBetween}>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{c.name}</div>
                      <StatusBadge status={c.status} />
                    </div>

                    {/* Each fact carries its own label so the value it belongs
                        to is unambiguous. */}
                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>PPE</span>
                      <span className={styles.metaValue}>{c.ppe}</span>
                    </div>

                    {holdingCurrencies.length > 0 && (
                      <div className={styles.metaRow}>
                        <span className={styles.metaLabel}>Currencies</span>
                        <span className={styles.metaChips}>
                          {holdingCurrencies.map((cur) => (
                            <span key={cur} className={styles.metaChip}>
                              <span className={cards.currencyBadge}>{cur}</span>
                              {cur === c.defaultCurrency && <span className={styles.metaDefault}>Default</span>}
                            </span>
                          ))}
                        </span>
                      </div>
                    )}

                    {enabled.length > 0 && (
                      <div className={styles.metaRow}>
                        <span className={styles.metaLabel}>Payment methods</span>
                        <span className={styles.metaChips}>
                          {shown.map((m) => (
                            <span key={m.id} className={styles.methodChip}>
                              <span className={styles.methodDot} style={{ background: METHOD_COLORS[m.id] ?? "#555" }} />
                              {m.name}
                            </span>
                          ))}
                          {enabled.length > shown.length && (
                            <span className={styles.metaMore}>+{enabled.length - shown.length} more</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}

function ChannelDetail({
  channel,
  onBack,
}: {
  channel?: ProcessingChannel
  onBack: () => void
}) {
  const { currentEntity, can } = useStore()
  const isNew = !channel
  const editable = can("configure-channel") && (isNew || channel?.status === "draft")
  const ppeId = channel?.ppe ?? currentEntity.ppe
  const ppe = getPpe(ppeId)

  const [name, setName] = useState(channel?.name ?? "")
  const [description, setDescription] = useState(channel?.description ?? "")
  const [mccs, setMccs] = useState<string[]>(channel?.mccs ?? [])
  const [defaultMcc, setDefaultMcc] = useState(channel?.defaultMcc ?? "")
  const [fx, setFx] = useState<string[]>(channel?.fxPairs ?? [])
  const [pairSrc, setPairSrc] = useState("")
  const [pairTgt, setPairTgt] = useState("")
  const [configMethod, setConfigMethod] = useState<string | null>(null)
  const [methods, setMethods] = useState<Record<string, boolean>>(
    channel?.methods ?? Object.fromEntries((ppe?.methods ?? []).map((m) => [m.id, m.id === "visa" && m.status === "supported"])),
  )
  const [showReview, setShowReview] = useState(false)
  const [addingCurrency, setAddingCurrency] = useState(false)
  const [applications, setApplications] = useState<Record<string, MethodApplication>>(
    () => ({ ...(channel?.methodApplications ?? {}) }),
  )

  // The chosen default logical account per settlement currency. Seeded from the
  // channel's saved mapping, falling back to the entity's first account for
  // that currency.
  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    for (const a of currentEntity.logicalAccounts) {
      const saved = channel?.accountMapping?.find((x) => x.currency === a.currency)?.logicalAccountId
      if (saved) m[a.currency] = saved
      else if (!m[a.currency]) m[a.currency] = a.id
    }
    return m
  })

  // Holding currencies are editable in their own right: a client can take on a
  // new settlement currency without the whole channel being a draft, so this is
  // seeded from the entity rather than derived from it on every render.
  const [holdingCurrencies, setHoldingCurrencies] = useState<string[]>(() => {
    const held = [...new Set(currentEntity.logicalAccounts.map((a) => a.currency))]
    if (channel?.defaultCurrency && !held.includes(channel.defaultCurrency)) held.unshift(channel.defaultCurrency)
    return held
  })

  // A method needing its own agreement only becomes switchable once that
  // application is approved. "Can this be turned on" is one predicate, so the
  // switches, the review summary and the submit gate cannot disagree.
  const applicationOf = (id: string) => applications[id]?.status ?? "not-applied"
  const isSwitchable = (m: PaymentMethodDef) =>
    m.status === "supported" || (m.status === "apply" && applicationOf(m.id) === "approved")

  // Card brands drive the wallets that ride on them (Apple Pay, Google Pay).
  const cardsOn = (ppe?.methods ?? []).some(
    (m) => m.category === "cards" && !m.coupledToCards && isSwitchable(m) && methods[m.id],
  )
  const isLive = (m: PaymentMethodDef) => (m.coupledToCards ? cardsOn : isSwitchable(m) && !!methods[m.id])
  const enabledMethods = (ppe?.methods ?? []).filter(isLive).map((m) => m.id)
  const primaryCurrency = channel?.defaultCurrency ?? holdingCurrencies[0] ?? ""
  // Currencies and conversion pairs stay configurable on an approved channel;
  // the read-only banner covers the contracted settings above.
  const canConfigure = can("configure-channel")
  const addableCurrencies = ALL_CURRENCIES.filter((c) => !holdingCurrencies.includes(c))
  const canSubmit = name.trim() && mccs.length > 0 && enabledMethods.length > 0

  const toggleMcc = (code: string) => {
    setMccs((prev) => {
      const next = prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
      if (!next.includes(defaultMcc)) setDefaultMcc(next[0] ?? "")
      return next
    })
  }

  const methodName = (id: string) => ppe?.methods.find((m) => m.id === id)?.name ?? id

  return (
    <>
      <PageHead
        title={isNew ? "New Processing Channel" : channel!.name}
        subtitle={isNew ? undefined : channel!.id}
        actions={
          <EbayButton priority="tertiary" onClick={onBack}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <EbayIconArrowLeft16 aria-hidden="true" /> Back to channels
            </span>
          </EbayButton>
        }
      />

      {!editable && channel && (
        <div style={{ marginBottom: "var(--spacing-300)" }}>
          <EbayInlineNotice status="information" aria-label="Channel state">
            <EbayNoticeContent>
              Most settings are read-only. To request a change please contact your account manager.
            </EbayNoticeContent>
          </EbayInlineNotice>
        </div>
      )}

      <Card>
        <div className={styles.formSection}>
          {editable ? (
            <div className={styles.identityFields}>
              <div className={cards.formGrid}>
                <div>
                  <label className={styles.fieldTitle} htmlFor="channel-name">
                    Channel Name
                    <span className={cards.req}> *</span>
                  </label>
                  <EbayTextbox
                    id="channel-name"
                    fluid
                    value={name}
                    onInputChange={(_e, p) => setName(p?.value ?? "")}
                    placeholder="e.g. UK Card Payments"
                  />
                </div>

                <div>
                  <label className={styles.fieldTitle}>Payment processing entity</label>
                  <div className={cards.defValue} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <strong>{ppeId}</strong>
                    <EbayIconLock16 aria-hidden="true" style={{ color: "var(--color-foreground-secondary)" }} />
                  </div>
                  <p className={cards.hint}>Filtered to entities you are contracted with.</p>
                </div>
              </div>

              <div>
                <label className={styles.fieldTitle} htmlFor="channel-description">
                  Channel Description
                </label>
                <EbayTextbox
                  id="channel-description"
                  fluid
                  multiline
                  rows={3}
                  value={description}
                  onInputChange={(_e, p) => setDescription(p?.value ?? "")}
                  placeholder="What this channel is used for, e.g. card acceptance for UK buyers."
                />
              </div>
            </div>
          ) : (
            /* Read-only identity: name, PPE, description and status read across
               one row. Status is the channel's own value, not a fixed label. */
            <div className={styles.identityRow}>
              <div>
                <label className={styles.fieldTitle}>Channel Name</label>
                <div className={cards.defValue}>{name}</div>
              </div>
              <div>
                <label className={styles.fieldTitle}>Payment processing entity</label>
                <div className={cards.defValue} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <strong>{ppeId}</strong>
                  <EbayIconLock16 aria-hidden="true" style={{ color: "var(--color-foreground-secondary)" }} />
                </div>
              </div>
              <div>
                <label className={styles.fieldTitle}>Channel Description</label>
                <div className={cards.defValue}>{description || "Not provided"}</div>
              </div>
              <div>
                <label className={styles.fieldTitle}>Status</label>
                <div>
                  <StatusBadge status={channel!.status} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MCC */}
        <div className={styles.formSection}>
          <h2 className={styles.formSectionTitle}>MCC configuration</h2>
          <p className={styles.formSectionSub}>
            Merchant Category Codes identify your business for card-network routing. {ppeId} defines which codes are available.
          </p>
          <Field label="Default MCC" required hint="The code used when a transaction does not specify one.">
            {mccs.length === 0 ? (
              <span style={{ fontSize: 13, color: "var(--color-foreground-secondary)" }}>
                Select the supported MCCs below, then choose which one is the default.
              </span>
            ) : (
              <EbaySelect
                fluid
                value={defaultMcc}
                disabled={!editable}
                onChange={(e) => setDefaultMcc((e.target as HTMLSelectElement).value)}
                style={{ maxWidth: 360 }}
              >
                {mccs.map((code) => {
                  const m = ppe?.mccs.find((x) => x.code === code)
                  return (
                    <EbaySelectOption key={code} value={code}>
                      {code} — {m?.label}
                    </EbaySelectOption>
                  )
                })}
              </EbaySelect>
            )}
          </Field>

          <Field
            label="Supported MCCs"
            required={editable}
            hint={editable ? `Select the codes this channel accepts. ${ppeId} defines what is available.` : undefined}
          >
            <div className={styles.chipRow}>
              {editable ? (
                (ppe?.mccs ?? []).map((m) => {
                  const on = mccs.includes(m.code)
                  return (
                    <button
                      key={m.code}
                      type="button"
                      className={styles.pairOption}
                      data-on={on}
                      onClick={() => toggleMcc(m.code)}
                      style={{ cursor: "pointer" }}
                    >
                      <strong>{m.code}</strong>
                      <span style={{ fontSize: 13, color: "var(--color-foreground-secondary)" }}>{m.label}</span>
                    </button>
                  )
                })
              ) : mccs.length === 0 ? (
                <span style={{ fontSize: 13, color: "var(--color-foreground-secondary)" }}>No MCCs configured.</span>
              ) : (
                mccs.map((code) => {
                  const m = ppe?.mccs.find((x) => x.code === code)
                  return (
                    <span key={code} className={styles.pairOption} data-on style={{ cursor: "default" }}>
                      <strong>{code}</strong>
                      {m && <span style={{ fontSize: 13, color: "var(--color-foreground-secondary)" }}>{m.label}</span>}
                    </span>
                  )
                })
              )}
            </div>
          </Field>
        </div>

        {/* Soft descriptor — entity-level settings summary with an edit drawer */}
        <SoftDescriptorSummary embedded />

        {/* Currencies */}
        <div className={styles.formSection}>
          <h2 className={styles.formSectionTitle}>Currency configuration</h2>
          <p className={`${styles.formSectionSub} ${styles.subOneLine}`}>
            The currencies held in this account, and how incoming currencies are converted into them.
          </p>

          <Field label="Currencies held in this account">
            <div className={styles.chipRow}>
              {holdingCurrencies.map((cur) => {
                const primary = cur === primaryCurrency
                return (
                  <span key={cur} className={styles.pairOption} data-on={primary} style={{ cursor: "default", gap: 8 }}>
                    <span className={cards.currencyBadge}>{cur}</span>
                    {primary && <span className={styles.metaDefault}>Primary</span>}
                  </span>
                )
              })}

              {/* Add another settlement currency from those ePS supports. */}
              {canConfigure && addableCurrencies.length > 0 && (
                <button
                  type="button"
                  className={styles.addChip}
                  aria-label="Add a currency"
                  title="Add a currency"
                  aria-expanded={addingCurrency}
                  onClick={() => setAddingCurrency((v) => !v)}
                >
                  <EbayIconAdd16 aria-hidden="true" />
                </button>
              )}
            </div>

            {holdingCurrencies.length === 0 && (
              <p className={cards.hint} style={{ marginTop: 8 }}>
                A default logical account is created for each settlement currency on approval.
              </p>
            )}

            {canConfigure && addingCurrency && (
              <div className={styles.addPanel}>
                <div className={styles.addPanelHead}>Currencies supported by ePS</div>
                <div className={styles.chipRow}>
                  {addableCurrencies.map((cur) => (
                    <button
                      key={cur}
                      type="button"
                      className={styles.pairOption}
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        setHoldingCurrencies((prev) => [...prev, cur])
                        setAddingCurrency(false)
                      }}
                    >
                      <span className={cards.currencyBadge}>{cur}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Field>

          <div style={{ height: 20 }} />

          <Field label="Currency conversion pairs" hint="Convert an incoming currency into one of the currencies held in this account.">
            {canConfigure && (
              <div className={cards.row} style={{ gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                <EbaySelect
                  value={pairSrc}
                  onChange={(e) => setPairSrc((e.target as HTMLSelectElement).value)}
                  style={{ minWidth: 170 }}
                  aria-label="Incoming currency"
                >
                  <EbaySelectOption value="">Incoming currency</EbaySelectOption>
                  {ALL_CURRENCIES.filter((c) => !holdingCurrencies.includes(c)).map((c) => (
                    <EbaySelectOption key={c} value={c}>{c}</EbaySelectOption>
                  ))}
                </EbaySelect>
                <span style={{ alignSelf: "center", color: "var(--color-foreground-secondary)" }}>converts into</span>
                <EbaySelect
                  value={pairTgt || primaryCurrency}
                  onChange={(e) => setPairTgt((e.target as HTMLSelectElement).value)}
                  style={{ minWidth: 170 }}
                  aria-label="Holding currency"
                >
                  {holdingCurrencies.map((c) => (
                    <EbaySelectOption key={c} value={c}>{c}</EbaySelectOption>
                  ))}
                </EbaySelect>
                <EbayButton
                  priority="secondary"
                  disabled={!pairSrc || !(pairTgt || primaryCurrency)}
                  onClick={() => {
                    const tgt = pairTgt || primaryCurrency
                    if (!pairSrc || !tgt) return
                    const pair = `${pairSrc} → ${tgt}`
                    setFx((prev) => (prev.includes(pair) ? prev : [...prev, pair]))
                    setPairSrc("")
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <EbayIconAdd16 aria-hidden="true" /> Add pair
                  </span>
                </EbayButton>
              </div>
            )}
            <div className={styles.chipRow}>
              {fx.length === 0 && (
                <span style={{ fontSize: 13, color: "var(--color-foreground-secondary)" }}>No conversion pairs added.</span>
              )}
              {fx.map((pair) => (
                <span key={pair} className={styles.tokenChip}>
                  {pair}
                  {canConfigure && (
                    <button type="button" aria-label={`Remove ${pair}`} onClick={() => setFx((prev) => prev.filter((p) => p !== pair))}>
                      <EbayIconClose12 aria-hidden="true" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          </Field>

          <div style={{ marginTop: 16 }}>
            <EbayInlineNotice status="information" aria-label="Settlement note">
              <EbayNoticeContent>
                All other currencies will be settled into your primary currency{primaryCurrency ? `, ${primaryCurrency}` : ""}.
              </EbayNoticeContent>
            </EbayInlineNotice>
          </div>
        </div>

        {/* Payment methods */}
        <div className={styles.formSection}>
          <h2 className={styles.formSectionTitle}>Payment methods</h2>
          <p className={`${styles.formSectionSub} ${styles.subOneLine}`}>
            {canConfigure
              ? `Enable or disable the methods this channel accepts. Some need a separate agreement.`
              : `Methods not supported by ${ppeId} are disabled. Some need a separate agreement.`}
          </p>
          {GROUPS.map((g) => {
            const items = (ppe?.methods ?? []).filter((m) => m.category === g.id)
            if (items.length === 0) return null
            return (
              <div key={g.id}>
                <div className={styles.methodGroup}>{g.label}</div>
                <div className={styles.methodGrid}>
                  {items.map((m) => {
                    // Only a method that needs an agreement has an application
                    // state; for every other method this stays null.
                    const app = m.status === "apply" ? applicationOf(m.id) : null
                    const switchable = isSwitchable(m)
                    // A wallet coupled to cards follows the card brands, so its
                    // state is derived and its switch locked — the row already
                    // says "Enabled with cards", and an independently
                    // switchable control would contradict that.
                    const on = m.coupledToCards ? cardsOn : switchable && !!methods[m.id]
                    // Otherwise methods stay switchable on an approved channel for
                    // anyone who can configure it.
                    const disabled = !canConfigure || !switchable || !!m.coupledToCards
                    return (
                      <div key={m.id} className={styles.methodCard} data-on={on} data-disabled={m.status === "unsupported"}>
                        <span className={styles.methodLogo} style={{ background: METHOD_COLORS[m.id] ?? "#555" }}>
                          {m.id.slice(0, 4).toUpperCase()}
                        </span>
                        <span className={styles.methodName}>
                          {m.name}
                          {m.status === "unsupported" && <span className={styles.methodMeta}>Not available for {ppeId}</span>}
                          {app === "not-applied" && <span className={styles.methodMeta}>Requires a separate agreement</span>}
                          {app === "under-review" && (
                            <span className={styles.methodMeta}>
                              {applications[m.id]?.submittedAt
                                ? `Applied ${applications[m.id]!.submittedAt}`
                                : "Applied just now"}
                            </span>
                          )}
                          {app === "approved" && <span className={styles.methodMeta}>Agreement approved</span>}
                        </span>

                        {m.coupledToCards && m.status === "supported" ? (
                          /* A disabled Evo switch paints grey whether or not it
                             is checked, so a locked-on wallet read as off. Its
                             state is derived, so state it in words instead. */
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                            {on && (
                              <EbayButton size="small" priority="tertiary" onClick={() => setConfigMethod(m.id)}>
                                Configure
                              </EbayButton>
                            )}
                            <span className={styles.methodDerived} data-on={on}>
                              {on ? "On with cards" : "Off with cards"}
                            </span>
                          </span>
                        ) : app === "not-applied" ? (
                          <EbayButton
                            size="small"
                            priority="tertiary"
                            disabled={!canConfigure}
                            onClick={() =>
                              setApplications((prev) => ({ ...prev, [m.id]: { status: "under-review" } }))
                            }
                          >
                            Apply
                          </EbayButton>
                        ) : app === "under-review" ? (
                          /* A pending agreement is a status, not an action —
                             there is nothing to switch and nothing to click. */
                          <span className={styles.methodReview}>Under review</span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                            {on && (
                              <EbayButton size="small" priority="tertiary" onClick={() => setConfigMethod(m.id)}>
                                Configure
                              </EbayButton>
                            )}
                            <EbaySwitch
                              checked={on}
                              disabled={disabled}
                              aria-label={m.name}
                              onChange={(_e, p) => setMethods((prev) => ({ ...prev, [m.id]: Boolean(p?.checked) }))}
                            />
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {editable && enabledMethods.length === 0 && (
            <div style={{ marginTop: 12 }}>
              <EbayInlineNotice status="attention" aria-label="No methods">
                <EbayNoticeContent>Enable at least one payment method before submitting.</EbayNoticeContent>
              </EbayInlineNotice>
            </div>
          )}
        </div>

        {/* Account mapping */}
        <div className={styles.formSection}>
          <h2 className={styles.formSectionTitle}>Default logical account mapping</h2>
          <p className={`${styles.formSectionSub} ${styles.subOneLine}`}>Map settlement currencies to logical accounts. If none exists for a currency, a default is auto-created on approval.</p>
          <div className={cards.tableScroll}>
            <table className={cards.table}>
              <thead>
                <tr><th>Settlement currency</th><th>Default logical account</th><th></th></tr>
              </thead>
              <tbody>
                {holdingCurrencies.map((cur) => {
                  // Every logical account belongs to one currency, so a currency
                  // can hold several. Only then is there a choice to make.
                  const accounts = currentEntity.logicalAccounts.filter((a) => a.currency === cur)
                  const selectedId = mapping[cur]
                  const selected = accounts.find((a) => a.id === selectedId) ?? accounts[0]
                  const canChoose = editable && accounts.length > 1
                  return (
                    <tr key={cur}>
                      <td><span className={cards.currencyBadge}>{cur}</span></td>
                      <td>
                        {accounts.length === 0 ? (
                          <span style={{ color: "var(--color-foreground-secondary)" }}>Auto-create {cur}_DEFAULT on approval</span>
                        ) : canChoose ? (
                          <EbaySelect
                            fluid
                            value={selected?.id ?? ""}
                            aria-label={`Default logical account for ${cur}`}
                            onChange={(e) => setMapping((prev) => ({ ...prev, [cur]: (e.target as HTMLSelectElement).value }))}
                            style={{ maxWidth: 320 }}
                          >
                            {accounts.map((a) => (
                              <EbaySelectOption key={a.id} value={a.id}>{a.name}</EbaySelectOption>
                            ))}
                          </EbaySelect>
                        ) : (
                          selected?.name
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {/* Only a single account leaves nothing to change; the
                            multi-account case is chosen inline above. */}
                        {editable && accounts.length === 1 && (
                          <span style={{ fontSize: 12, color: "var(--color-foreground-secondary)" }}>Only account</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {holdingCurrencies.length === 0 && (
                  <tr><td colSpan={3} style={{ color: "var(--color-foreground-secondary)" }}>No holding currencies yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Submission */}
        {editable && (
          <div className={styles.formSection} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ fontSize: 13, color: "var(--color-foreground-secondary)" }}>
              Saving as draft keeps the channel editable. Submitting sends it to eBay Payment Services for approval.
            </div>
            <div className={cards.row}>
              <EbayButton priority="secondary" onClick={onBack}>Save as Draft</EbayButton>
              <EbayButton priority="primary" disabled={!canSubmit} aria-disabled={!canSubmit} onClick={() => setShowReview(true)}>
                Submit for Approval
              </EbayButton>
            </div>
          </div>
        )}
      </Card>

      {configMethod && (
        <MethodConfigDrawer
          methodId={configMethod}
          methodName={methodName(configMethod)}
          currency={primaryCurrency}
          editable={editable}
          onClose={() => setConfigMethod(null)}
        />
      )}

      {showReview && (
        <ReviewModal
          onClose={() => setShowReview(false)}
          onSubmit={() => {
            setShowReview(false)
            onBack()
          }}
          rows={[
            ["PPE", ppeId],
            ["MCCs", mccs.length ? `${defaultMcc} (default)${mccs.filter((c) => c !== defaultMcc).length ? ", " + mccs.filter((c) => c !== defaultMcc).join(", ") : ""}` : "—"],
            ["Held currencies", holdingCurrencies.join(", ") || "—"],
            ["Currency conversions", fx.join(", ") || "None"],
              ["Payment methods", enabledMethods.map(methodName).join(", ") || "—"],
          ]}
        />
      )}
    </>
  )
}

function MethodConfigDrawer({
  methodId,
  methodName,
  currency,
  editable,
  onClose,
}: {
  methodId: string
  methodName: string
  currency: string
  editable: boolean
  onClose: () => void
}) {
  const wallet = methodId === "applepay" || methodId === "googlepay"
  const curLabel = currency || "default"
  const [geos, setGeos] = useState<string[]>(["United Kingdom"])
  const [min, setMin] = useState("0")
  const [max, setMax] = useState("")

  const certFiles =
    methodId === "applepay"
      ? ["apple-pay-payment-processing.cer", "apple-pay-merchant-identity.cer"]
      : ["google-pay-processing-key.pem"]

  return (
    <Drawer
      title={`Configure ${methodName}`}
      onClose={onClose}
      footer={
        <>
          <EbayButton priority="tertiary" onClick={onClose}>Cancel</EbayButton>
          <EbayButton priority="primary" onClick={onClose}>Save configuration</EbayButton>
        </>
      }
    >
      <p style={{ fontSize: 13, color: "var(--color-foreground-secondary)", marginTop: 0 }}>
        Control where {methodName} is offered and the order amounts it applies to.
      </p>

      {/* Geography */}
      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>Geography</h3>
        <p className={styles.formSectionSub}>Offer {methodName} only to buyers in the selected countries.</p>
        <div className={styles.chipRow}>
          {GEOGRAPHIES.map((g) => {
            const on = geos.includes(g)
            return (
              <button
                key={g}
                type="button"
                className={styles.pairOption}
                data-on={on}
                disabled={!editable}
                onClick={() => editable && setGeos((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))}
                style={{ cursor: editable ? "pointer" : "default" }}
              >
                {g}
              </button>
            )
          })}
        </div>
      </div>

      {/* Amount */}
      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>Amount range</h3>
        <p className={styles.formSectionSub}>Apply {methodName} to orders within this range. Amounts are in {curLabel}.</p>
        <div className={cards.formGrid}>
          <Field label={`Minimum (${curLabel})`}>
            {editable ? (
              <EbayTextbox fluid value={min} onInputChange={(_e, p) => setMin(p?.value ?? "")} placeholder="0" />
            ) : (
              <div className={cards.defValue}>{min || "0"}</div>
            )}
          </Field>
          <Field label={`Maximum (${curLabel})`} hint="Leave blank for no upper limit.">
            {editable ? (
              <EbayTextbox fluid value={max} onInputChange={(_e, p) => setMax(p?.value ?? "")} placeholder="No limit" />
            ) : (
              <div className={cards.defValue}>{max || "No limit"}</div>
            )}
          </Field>
        </div>
      </div>

      {/* Wallet certificates */}
      {wallet && (
        <div className={styles.formSection}>
          <h3 className={styles.formSectionTitle}>Certificates</h3>
          <p className={styles.formSectionSub}>Download the certificate files required to enable {methodName} in your app or website.</p>
          <div className={cards.stackSm}>
            {certFiles.map((f) => (
              <div
                key={f}
                className={cards.rowBetween}
                style={{ border: "1px solid var(--color-border-subtle)", borderRadius: "var(--radius-medium)", padding: "var(--spacing-250) var(--spacing-300)" }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <EbayIconFile16 aria-hidden="true" />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f}</span>
                </span>
                <EbayButton size="small" priority="secondary" onClick={() => downloadCert(f)}>Download</EbayButton>
              </div>
            ))}
          </div>
        </div>
      )}
    </Drawer>
  )
}

function downloadCert(name: string) {
  if (typeof window === "undefined") return
  const blob = new Blob(
    [`-----BEGIN CERTIFICATE-----\nPrototype certificate: ${name}\n-----END CERTIFICATE-----\n`],
    { type: "application/x-x509-ca-cert" },
  )
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function ReviewModal({
  rows,
  onClose,
  onSubmit,
}: {
  rows: [string, string][]
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <div className={cards.modalScrim} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cards.modal} role="dialog" aria-modal="true" aria-label="Review channel configuration">
        <div style={{ padding: "var(--spacing-400)" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 18 }}>Review channel configuration</h2>
          <ul className={styles.reviewList}>
            {rows.map(([k, v]) => (
              <li key={k}><b>{k}</b><span>{v}</span></li>
            ))}
          </ul>
          <div className={cards.row} style={{ justifyContent: "flex-end", marginTop: 24 }}>
            <EbayButton priority="tertiary" onClick={onClose}>Edit</EbayButton>
            <EbayButton priority="primary" onClick={onSubmit}>Submit for Approval</EbayButton>
          </div>
        </div>
      </div>
    </div>
  )
}


