import { ServicesCentralShell } from "@/components/services-central/services-central-shell"

// The settings experience lives inside the Services Central shell so the top
// and left navigation stay visible.
export default function SettingsPage() {
  return <ServicesCentralShell initialItem="Settings" />
}
