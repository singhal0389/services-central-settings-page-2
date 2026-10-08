"use client"

import { EbayButton } from "@ebay/ui-core-react/ebay-button"
import { EbayIconCheckmark24 } from "@ebay/ui-core-react/icons/ebay-icon-checkmark-24"
import { EbayIconClock16 } from "@ebay/ui-core-react/icons/ebay-icon-clock-16"
import type { BusinessEntity } from "@/lib/types"
import type { Section } from "@/components/app-shell"
import { Card } from "@/components/ui-bits"
import cards from "@/components/cards.module.css"
import styles from "./onboarding.module.css"

type StepState = "complete" | "current" | "upcoming" | "attention"

interface Step {
  id: string
  title: string
  description: string
  state: StepState
  who: string
  cta: string
  ctaDisabled?: boolean
  section?: Section
  required?: string
}

function deriveSteps(entity: BusinessEntity): Step[] {
  const profileDone = entity.profileStatus === "verified"
  const profileAttention =
    entity.profileStatus === "action-required" || entity.profileStatus === "rejected"
  const kycSubmitted = entity.profileStatus === "pending" || entity.profileStatus === "submitted"
  const hasActiveChannel = entity.channels.some((c) => c.status === "active")
  const hasVerifiedBank = entity.bankAccounts.some((b) => b.status === "verified")

  const steps: Step[] = [
    {
      id: "profile",
      title: "Business Profile",
      description: "Provide your legal entity details, address, and business activity.",
      state: profileDone || kycSubmitted ? "complete" : profileAttention ? "attention" : "current",
      who: "Business Entity Administrator",
      cta: profileDone || kycSubmitted ? "Review" : "Complete now",
      section: "profile",
    },
    {
      id: "kyc",
      title: "KYC & Documents",
      description: "Add beneficial owners and upload verification documents.",
      state: profileDone
        ? "complete"
        : profileAttention
          ? "attention"
          : kycSubmitted
            ? "current"
            : "upcoming",
      who: "Business Entity Administrator",
      cta: profileAttention ? "Address issues" : profileDone ? "Verified" : kycSubmitted ? "Under review" : "Continue",
      ctaDisabled: kycSubmitted && !profileAttention,
      section: "profile",
    },
    {
      id: "channel",
      title: "Processing Channel",
      description: "Configure how payments are routed — methods, currencies, and your descriptor.",
      state: hasActiveChannel ? "complete" : profileDone ? "current" : "upcoming",
      who: "Business Entity Administrator",
      required: profileDone ? undefined : "Business profile must be approved first.",
      cta: hasActiveChannel ? "Done" : "Request Processing Channel",
      ctaDisabled: !profileDone,
      section: "channels",
    },
    {
      id: "bank",
      title: "Bank Account",
      description: "Add and verify a settlement bank account owned by this entity.",
      state: hasVerifiedBank ? "complete" : "upcoming",
      who: "Treasury Administrator",
      cta: hasVerifiedBank ? "Done" : "Add bank account",
      ctaDisabled: !profileDone,
      section: "bank",
    },
    {
      id: "golive",
      title: "Go Live",
      description: "Once KYC is approved with an active channel and a verified bank account, you're live.",
      state:
        profileDone && hasActiveChannel && hasVerifiedBank ? "complete" : "upcoming",
      who: "Automatic",
      cta: "Awaiting requirements",
      ctaDisabled: true,
    },
  ]
  return steps
}

const STATE_LABEL: Record<StepState, string> = {
  complete: "Done",
  current: "In progress",
  attention: "Action required",
  upcoming: "Not started",
}

export function OnboardingStepper({
  entity,
  onNavigate,
}: {
  entity: BusinessEntity
  onNavigate: (s: Section) => void
}) {
  const steps = deriveSteps(entity)
  const completed = steps.filter((s) => s.state === "complete").length

  return (
    <Card className={cards.cardPad}>
      <div className={cards.stackSm}>
        <div className={cards.rowBetween}>
          <div>
            <h2 className={cards.cardTitle}>Getting started</h2>
            <p className={cards.cardSub}>
              Complete these steps to activate {entity.name}. {completed} of {steps.length} done.
            </p>
          </div>
        </div>

        <ol className={styles.stepper}>
          {steps.map((step, i) => (
            <li key={step.id} className={styles.step} data-state={step.state}>
              <div className={styles.stepRail}>
                <span className={styles.stepDot} data-state={step.state}>
                  {step.state === "complete" ? (
                    <EbayIconCheckmark24 aria-hidden="true" />
                  ) : step.state === "current" ? (
                    <EbayIconClock16 aria-hidden="true" />
                  ) : (
                    <span className={styles.stepNum}>{i + 1}</span>
                  )}
                </span>
                {i < steps.length - 1 && <span className={styles.stepLine} data-done={step.state === "complete"} />}
              </div>
              <div className={styles.stepBody}>
                <div className={styles.stepHead}>
                  <span className={styles.stepTitle}>{step.title}</span>
                  <span className={styles.stepState} data-state={step.state}>
                    {STATE_LABEL[step.state]}
                  </span>
                </div>
                <p className={styles.stepDesc}>{step.description}</p>
                <div className={styles.stepMeta}>
                  Who: {step.who}
                  {step.required && (
                    <span className={styles.stepRequired}> · {step.required}</span>
                  )}
                </div>
                <div style={{ marginTop: 10 }}>
                  <EbayButton
                    size="small"
                    priority={
                      step.state === "current" || step.state === "attention"
                        ? "primary"
                        : "secondary"
                    }
                    disabled={step.ctaDisabled}
                    aria-disabled={step.ctaDisabled}
                    onClick={() => step.section && onNavigate(step.section)}
                  >
                    {step.cta}
                  </EbayButton>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  )
}
