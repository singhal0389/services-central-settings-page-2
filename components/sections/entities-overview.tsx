"use client"

import { EbayButton } from "@ebay/ui-core-react/ebay-button"
import { EbayIconChevronRight16 } from "@ebay/ui-core-react/icons/ebay-icon-chevron-right-16"
import { EbayIconAdd16 } from "@ebay/ui-core-react/icons/ebay-icon-add-16"
import { useStore } from "@/lib/store"
import { StatusBadge } from "@/components/status-badge"
import { PageHead } from "@/components/app-shell"
import { Card } from "@/components/ui-bits"
import type { Section } from "@/components/app-shell"
import cards from "@/components/cards.module.css"

export function EntitiesOverview({ onOpen }: { onOpen: (s: Section, entityId?: string) => void }) {
  const { scopedEntities, can, setEntityId } = useStore()

  return (
    <>
      <PageHead
        title="Business Entities"
        subtitle="Each Business Entity is one legal entity in one jurisdiction, with its own KYC, processing channels, and accounts."
        actions={
          can("create-entity") ? (
            <EbayButton priority="primary" onClick={() => onOpen("entity-new")}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <EbayIconAdd16 aria-hidden="true" /> New Business Entity
              </span>
            </EbayButton>
          ) : undefined
        }
      />

      <div className={cards.cardGrid2}>
        {scopedEntities.map((e) => {
          return (
            <Card key={e.id} className={cards.cardPad}>
              <div className={cards.stackSm}>
                <div className={cards.rowBetween}>
                  <div className={cards.row} style={{ gap: 12 }}>
                    <span className={cards.currencyBadge} style={{ fontSize: 14, padding: "6px 10px" }}>
                      {e.name.split(" ").map((w) => w[0]).join("").toUpperCase()}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{e.name}</div>
                      <div style={{ fontSize: 13, color: "var(--color-foreground-secondary)" }}>
                        {e.jurisdiction}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={e.profileStatus} />
                </div>

                <div className={cards.rowBetween} style={{ marginTop: 4 }}>
                  <EbayButton
                    priority="secondary"
                    size="small"
                    onClick={() => {
                      setEntityId(e.id)
                      onOpen("profile", e.id)
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      Manage entity <EbayIconChevronRight16 aria-hidden="true" />
                    </span>
                  </EbayButton>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </>
  )
}
