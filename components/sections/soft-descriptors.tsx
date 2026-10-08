"use client"

import { useState } from "react"
import { EbayButton } from "@ebay/ui-core-react/ebay-button"
import { EbayTextbox } from "@ebay/ui-core-react/ebay-textbox"
import { EbayInlineNotice, EbayNoticeContent } from "@ebay/ui-core-react/ebay-inline-notice"
import { EbayIconPencil16 } from "@ebay/ui-core-react/icons/ebay-icon-pencil-16"
import { useStore } from "@/lib/store"
import { Card, CardHead, Def, Field, Drawer } from "@/components/ui-bits"
import { resolveDescriptor, STATIC_MAX, PREFIX_MAX } from "@/lib/descriptors"
import type { SoftDescriptorConfig, SoftDescriptorMode } from "@/lib/types"
import cards from "@/components/cards.module.css"
import styles from "./channels.module.css"

// Summary of the entity's soft-descriptor configuration, with a preview and an
// Edit button that opens the full config drawer. Rendered inline as a form
// section inside the Processing Channel detail (`embedded`), or as a standalone
// card elsewhere.
export function SoftDescriptorSummary({ embedded }: { embedded?: boolean }) {
  const { currentEntity, can } = useStore()
  const editable = can("configure-channel")
  const cfg = currentEntity.softDescriptor
  const [open, setOpen] = useState(false)

  const dynamicBlocked = cfg.mode === "dynamic" && cfg.prefixApproval !== "approved"

  // Two representative resolved values: a dynamic one (prefix * statement
  // descriptor) and the default one used as the static fallback.
  const dynamicExample = resolveDescriptor({ ...cfg, mode: "dynamic" }, "ORDER 12345")
  const defaultExample = resolveDescriptor(cfg, null)

  const editBtn = editable ? (
    <EbayButton priority="secondary" size="small" onClick={() => setOpen(true)}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <EbayIconPencil16 aria-hidden="true" /> Edit
      </span>
    </EbayButton>
  ) : null

  const body = (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px, 320px) 1fr",
          gap: "var(--spacing-500)",
          alignItems: "start",
        }}
      >
        {/* Column 1 — configuration. Dynamic mode also exposes the prefix and
            operations; static mode is just the fixed default descriptor. */}
        <dl className={cards.defGrid} style={{ margin: 0 }}>
          <Def label="Descriptor mode">{cfg.mode === "dynamic" ? "Dynamic" : "Static"}</Def>
          {cfg.mode === "dynamic" ? (
            <Def label="Prefix">{cfg.prefix || "—"}</Def>
          ) : (
            <Def label="Static descriptor">{cfg.staticDescriptor || "—"}</Def>
          )}
        </dl>

        {/* Column 2 — previews. Dynamic shows both the prefixed and fallback
            values; static has only the one fixed descriptor. */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--spacing-300)" }}>
          {cfg.mode === "dynamic" && (
            <div>
              <label className={cards.fieldLabel}>Dynamic preview</label>
              <div className={styles.statement}>
                <div className={styles.statementHead}>Your bank statement</div>
                <div className={styles.statementRow}>
                  <span>{dynamicExample.result || "YOUR DESCRIPTOR"}</span>
                  <span>-$49.00</span>
                </div>
              </div>
              <p style={{ fontSize: 12, color: "var(--color-foreground-secondary)", margin: "6px 0 0" }}>
                Example for statement descriptor <code>ORDER 12345</code>.
              </p>
            </div>
          )}

          <div>
            <label className={cards.fieldLabel}>Default preview</label>
            <div className={styles.statement}>
              <div className={styles.statementHead}>Your bank statement</div>
              <div className={styles.statementRow}>
                <span>{defaultExample.result || "YOUR DESCRIPTOR"}</span>
                <span>-$49.00</span>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "var(--color-foreground-secondary)", margin: "6px 0 0" }}>
              Used when no statement descriptor is sent.
            </p>
          </div>
        </div>
      </div>

      {dynamicBlocked && (
        <div style={{ marginTop: "var(--spacing-300)" }}>
          <EbayInlineNotice status="attention" aria-label="Prefix approval required">
            <EbayNoticeContent>
              Dynamic descriptors stay inactive until eBay Payment Services approves your prefix. Until then, the static
              descriptor is used for all operations.
            </EbayNoticeContent>
          </EbayInlineNotice>
        </div>
      )}

      {open && <SoftDescriptorDrawer config={cfg} onClose={() => setOpen(false)} />}
    </>
  )

  if (embedded) {
    return (
      <div className={styles.formSection}>
        {/* Edit sits directly beside the heading rather than pushed to the far
            right, so it reads as this section's action. */}
        <h2 className={styles.formSectionTitle}>
          Statement descriptor
          {editBtn}
        </h2>
        <p className={`${styles.formSectionSub} ${styles.subOneLine}`} style={{ marginBottom: 0 }}>
          The statement descriptor shown on the cardholder&apos;s bank statement for Auth, Capture and Refund.
        </p>
        <div style={{ marginTop: "var(--spacing-300)" }}>{body}</div>
      </div>
    )
  }

  return (
    <Card>
      <CardHead
        title="Statement descriptor"
        subtitle="The statement descriptor shown on the cardholder's bank statement for Auth, Capture and Refund."
        actions={editBtn ?? undefined}
      />
      <div className={cards.cardPad}>{body}</div>
    </Card>
  )
}

// Full configuration surface — descriptor mode, static descriptor, dynamic
// prefix, and a live resolver — presented in a right-side drawer.
function SoftDescriptorDrawer({ config: cfg, onClose }: { config: SoftDescriptorConfig; onClose: () => void }) {
  const [mode, setMode] = useState<SoftDescriptorMode>(cfg.mode)
  const [staticDescriptor, setStaticDescriptor] = useState(cfg.staticDescriptor)
  const [prefix, setPrefix] = useState(cfg.prefix)

  const isDynamic = mode === "dynamic"
  const dynamicBlocked = isDynamic && cfg.prefixApproval !== "approved"

  return (
    <Drawer
      title="Configure soft descriptors"
      onClose={onClose}
      footer={
        <>
          <EbayButton priority="tertiary" onClick={onClose}>
            Cancel
          </EbayButton>
          <EbayButton priority="primary" onClick={onClose}>
            Save descriptor settings
          </EbayButton>
        </>
      }
    >
      <p style={{ fontSize: 13, color: "var(--color-foreground-secondary)", marginTop: 0 }}>
        Applied to every Auth, Capture and Refund operation for this entity. Changes to the static descriptor or prefix
        require eBay Payment Services approval before they take effect.
      </p>

      {/* The one choice: static or dynamic. It decides which single block
          below is shown. */}
      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>What descriptor do you want?</h3>
        <ModeOptions value={mode} onChange={setMode} />
      </div>

      {dynamicBlocked && (
        <EbayInlineNotice status="attention" aria-label="Prefix approval required">
          <EbayNoticeContent>
            Dynamic descriptors stay inactive until eBay Payment Services approves your prefix. Until then, the static
            descriptor is used for all operations.
          </EbayNoticeContent>
        </EbayInlineNotice>
      )}

      {isDynamic ? (
        /* Dynamic — collect the prefix. */
        <div className={styles.formSection}>
          <h3 className={styles.formSectionTitle}>Dynamic prefix</h3>
          <p className={styles.formSectionSub}>
            A shortened legal or DBA name prepended to the per-transaction descriptor as{" "}
            <code>{"{Prefix}*{Statement Descriptor}"}</code>. Max {PREFIX_MAX} characters.
          </p>
          <Field label="Prefix" hint={<span className={styles.counter}>{prefix.length}/{PREFIX_MAX} characters</span>}>
            <EbayTextbox
              fluid
              value={prefix}
              maxLength={PREFIX_MAX}
              onInputChange={(_e, p) => setPrefix((p?.value ?? "").slice(0, PREFIX_MAX))}
              placeholder="TISE"
            />
          </Field>
        </div>
      ) : (
        /* Static — collect the one fixed descriptor. */
        <div className={styles.formSection}>
          <h3 className={styles.formSectionTitle}>Static descriptor</h3>
          <p className={styles.formSectionSub}>
            Your legal or DBA name, used for every transaction. Max {STATIC_MAX} characters.
          </p>
          <Field label="Static descriptor" required hint={<span className={styles.counter}>{staticDescriptor.length}/{STATIC_MAX} characters</span>}>
            <EbayTextbox
              fluid
              value={staticDescriptor}
              maxLength={STATIC_MAX}
              onInputChange={(_e, p) => setStaticDescriptor((p?.value ?? "").slice(0, STATIC_MAX))}
              placeholder="TISE MARKETPLACE"
            />
          </Field>
        </div>
      )}
    </Drawer>
  )
}

// The static / dynamic choice.
function ModeOptions({ value, onChange }: { value: SoftDescriptorMode; onChange: (m: SoftDescriptorMode) => void }) {
  return (
    <div className={cards.stackSm}>
      {(
        [
          { id: "static", title: "Static", desc: "Always use one fixed descriptor." },
          { id: "dynamic", title: "Dynamic", desc: "Send a per-transaction descriptor in the API, prefixed with your approved prefix." },
        ] as const
      ).map((opt) => (
        <button
          key={opt.id}
          type="button"
          className={styles.pairOption}
          data-on={value === opt.id}
          onClick={() => onChange(opt.id)}
          style={{ cursor: "pointer", flexDirection: "column", alignItems: "flex-start", gap: 4 }}
        >
          <strong>{opt.title}</strong>
          <span style={{ fontSize: 13, color: "var(--color-foreground-secondary)" }}>{opt.desc}</span>
        </button>
      ))}
    </div>
  )
}
