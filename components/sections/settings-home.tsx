"use client"

import { useStore } from "@/lib/store"
import { PageHead } from "@/components/app-shell"
import type { Section } from "@/components/app-shell"
import styles from "@/components/shell.module.css"

type LinkItem = { label: string; section?: Section; show?: boolean; comingSoon?: boolean }
type Group = { title: string; links: LinkItem[]; empty?: string }
type SettingsSection = { title: string; groups: Group[] }

export function SettingsHome({ onNavigate }: { onNavigate: (s: Section) => void }) {
  const { can } = useStore()

  const sections: SettingsSection[] = [
    {
      title: "Company settings",
      groups: [
        {
          title: "Business entity settings",
          links: [{ label: "Entity Settings", section: "entities" }],
        },
        {
          title: "User access",
          links: [{ label: "Access settings", section: "users", show: can("manage-users") }],
        },
        {
          title: "Invoices",
          links: [],
          empty: "Nothing here yet.",
        },
      ],
    },
    {
      title: "Product settings",
      groups: [
        {
          title: "Payment settings",
          links: [
            { label: "Payments profile", section: "payments-profile", show: can("subscribe-services") },
            { label: "Manage processing channels", section: "channels", show: can("subscribe-services") },
            { label: "Checkout settings", comingSoon: true },
            { label: "Pay by Link", comingSoon: true },
          ],
        },
        {
          title: "Balance settings",
          links: [
            {
              label: "Payout schedule",
              section: "payouts",
              show: can("request-payout") || can("configure-payout"),
            },
            { label: "Configure bank accounts", section: "bank" },
            { label: "Logical accounts", section: "logical" },
          ],
        },
        {
          title: "Marketplace settings",
          links: [],
          empty: "Nothing here yet.",
        },
        {
          title: "Risk settings",
          links: [],
          empty: "Nothing here yet.",
        },
        {
          title: "Shipping settings",
          links: [],
          empty: "Nothing here yet.",
        },
        {
          title: "Authenticity Guarantee",
          links: [],
          empty: "Nothing here yet.",
        },
      ],
    },
  ]

  return (
    <>
      <PageHead title="Settings" subtitle="Manage everything for your business from one place." />

      <div className={styles.settingsSections}>
        {sections.map((s) => (
          <section key={s.title} className={styles.settingsSection}>
            <h2 className={styles.settingsSectionTitle}>{s.title}</h2>
            <div className={styles.settingsColumns}>
              {s.groups.map((g) => {
                const links = g.links.filter((l) => l.show !== false)
                return (
                  <div key={g.title} className={styles.settingsColGroup}>
                    <h3 className={styles.settingsGroupTitle}>{g.title}</h3>
                    {links.length > 0 ? (
                      <div className={styles.settingsLinkList}>
                        {links.map((l) =>
                          l.comingSoon ? (
                            <span key={l.label} className={styles.settingsComingSoonLabel}>
                              {l.label}
                            </span>
                          ) : (
                            <button
                              key={l.label}
                              className={styles.settingsLink}
                              onClick={() => l.section && onNavigate(l.section)}
                            >
                              {l.label}
                            </button>
                          ),
                        )}
                      </div>
                    ) : (
                      <span className={styles.settingsEmpty}>{g.empty ?? "Nothing here yet."}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}
