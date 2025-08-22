import * as L from "lucide-react"
import React from "react"

const ICONS = {
  download: L.Download,
  user: L.UserRound,
  alert: L.AlertTriangle,
  building: L.Building2,
  users: L.Users,
  calendar: L.Calendar,
  clock: L.Clock3,
  money: L.BadgeDollarSign,
  check: L.Check,
  warning: L.AlertTriangle,
  gear: L.Settings,
  edit: L.Pencil,
  send: L.Send,
  rocket: L.Rocket,
  refresh: L.RefreshCw,
  close: L.X,
  search: L.Search,
  filter: L.Filter,
  chart: L.ChartSpline,
  receipt: L.ReceiptText,
  envelope: L.Mail,
  whatsapp: L.MessageSquare,
  target: L.Crosshair,
  document: L.FileText,
  calculator: L.Calculator,
  database: L.Database,
  shield: L.ShieldCheck,
  trophy: L.Trophy,
  lightbulb: L.Lightbulb,
  party: L.PartyPopper,
  phone: L.Phone
} as const

export type IconName = keyof typeof ICONS

export function Icon({ name, className, ...props }: { name: IconName; className?: string } & React.SVGProps<SVGSVGElement>) {
  const C = ICONS[name]
  if (!C) return null
  return <C className={className} {...props} />
}


