import Link from 'next/link'
import { useEffect, useRef, useState, type ComponentType, type SVGProps } from 'react'
import {
  ArrowRightOnRectangleIcon,
  BanknotesIcon,
  BuildingOffice2Icon,
  CalculatorIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  GiftIcon,
  HomeIcon,
  LifebuoyIcon,
  ReceiptPercentIcon,
  ScaleIcon,
  UsersIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import NotificationBell from '../ui/NotificationBell'
import { SessionStatusIndicator } from '../SessionStatusIndicator'
import type { NavIconKey, NavItem, NavStructure } from '../../lib/navigation/sidebar'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

const ICONS: Record<NavIconKey, Icon> = {
  home: HomeIcon,
  users: UsersIcon,
  building: BuildingOffice2Icon,
  evaluations: ClipboardDocumentCheckIcon,
  jobs: DocumentTextIcon,
  clock: ClockIcon,
  leave: CalendarDaysIcon,
  payroll: BanknotesIcon,
  deductions: ReceiptPercentIcon,
  severance: ScaleIcon,
  bonus: GiftIcon,
  accounting: CalculatorIcon,
  reports: ChartBarIcon,
  settings: Cog6ToothIcon,
  support: LifebuoyIcon,
}

export interface SidebarAccount {
  name: string
  email: string | null
  roleLabel: string
  companyName: string | null
  initials: string
}

interface SidebarContentProps {
  nav: NavStructure
  activeId: string | null
  badges: Record<string, number>
  /** 'rail': solo íconos (escritorio colapsado). 'full': etiquetas y grupos. */
  variant: 'full' | 'rail'
  /** Grupos abiertos (los cerrados muestran la suma de pendientes). */
  openGroups: Record<string, boolean>
  onToggleGroup: (groupId: string) => void
  account: SidebarAccount
  onSignOut: () => void
  /** Escritorio: botón para colapsar/fijar. Móvil: botón para cerrar el panel. */
  headerAction: { kind: 'collapse' | 'pin' | 'close'; onClick: () => void }
  /** Clases del panel de notificaciones según dónde está el menú. */
  notificationPanelClassName?: string
  /** Móvil: objetivos táctiles de 44 px. */
  touch?: boolean
}

function Badge({ count, compact }: { count: number; compact?: boolean }) {
  if (count <= 0) return null
  if (compact) {
    return (
      <span
        aria-hidden
        className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-[#0e1628]"
      />
    )
  }
  return (
    <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold leading-none text-stone-900">
      {count > 99 ? '99+' : count}
    </span>
  )
}

function NavLink({
  item,
  active,
  badge,
  variant,
  touch,
}: {
  item: NavItem
  active: boolean
  badge: number
  variant: 'full' | 'rail'
  touch?: boolean
}) {
  const Icon = ICONS[item.icon]
  const label = badge > 0 ? `${item.label} (${badge} pendientes)` : item.label
  if (variant === 'rail') {
    return (
      <Link
        href={item.href}
        aria-label={label}
        title={item.label}
        aria-current={active ? 'page' : undefined}
        className={`relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
          active ? 'bg-brand-900 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'
        }`}
      >
        <Icon className={`h-5 w-5 ${active ? 'text-brand-200' : ''}`} aria-hidden />
        <Badge count={badge} compact />
      </Link>
    )
  }
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      aria-label={badge > 0 ? label : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 text-sm transition-colors ${touch ? 'min-h-[44px] text-[15px]' : 'min-h-[40px]'} ${
        active ? 'bg-brand-900 font-semibold text-white' : 'font-medium text-slate-300 hover:bg-white/10 hover:text-white'
      }`}
    >
      <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-brand-200' : 'text-slate-400'}`} aria-hidden />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      <Badge count={badge} />
    </Link>
  )
}

function AccountMenu({
  account,
  onSignOut,
  variant,
}: {
  account: SidebarAccount
  onSignOut: () => void
  variant: 'full' | 'rail'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const subtitle = [account.roleLabel, account.companyName].filter(Boolean).join(' · ')

  return (
    <div ref={ref} className="relative">
      {variant === 'rail' ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Cuenta de ${account.name}`}
          title={`${account.name} · ${subtitle}`}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-900 text-xs font-bold text-white"
        >
          {account.initials}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex min-h-[52px] w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-white/5"
        >
          <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-900 text-xs font-bold text-white">
            {account.initials}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold text-white">{account.name}</span>
            <span className="truncate text-xs text-slate-400">{subtitle}</span>
          </span>
          <ChevronUpDownIcon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        </button>
      )}

      {open && (
        <div
          role="menu"
          aria-label="Cuenta"
          className={`absolute z-50 flex flex-col gap-0.5 rounded-xl border border-white/10 bg-slate-900 p-1.5 shadow-2xl ${
            variant === 'rail' ? 'bottom-0 left-full ml-2 w-64' : 'bottom-full left-0 right-0 mb-2'
          }`}
        >
          {account.email && <span className="truncate px-3 pb-1.5 pt-2 text-xs text-slate-400">{account.email}</span>}
          <div className="px-3 py-1.5">
            <SessionStatusIndicator />
          </div>
          <span className="mx-1.5 my-1 h-px bg-white/10" />
          <button
            type="button"
            role="menuitem"
            onClick={onSignOut}
            className="flex min-h-[44px] items-center gap-2.5 rounded-lg px-3 text-left text-sm text-red-300 hover:bg-red-500/10"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" aria-hidden />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

export default function SidebarContent({
  nav,
  activeId,
  badges,
  variant,
  openGroups,
  onToggleGroup,
  account,
  onSignOut,
  headerAction,
  notificationPanelClassName,
  touch,
}: SidebarContentProps) {
  const HeaderIcon =
    headerAction.kind === 'close' ? XMarkIcon : headerAction.kind === 'collapse' ? ChevronDoubleLeftIcon : ChevronDoubleRightIcon
  const headerLabel =
    headerAction.kind === 'close' ? 'Cerrar menú' : headerAction.kind === 'collapse' ? 'Colapsar menú' : 'Fijar menú abierto'

  if (variant === 'rail') {
    const items = [...nav.top, ...nav.groups.flatMap((g) => g.items)]
    return (
      <div className="flex h-full flex-col items-center">
        <div className="flex h-16 w-full shrink-0 items-center justify-center border-b border-[#1c2740]">
          <button
            type="button"
            onClick={headerAction.onClick}
            aria-label="Expandir menú"
            aria-expanded={false}
            title="Expandir menú"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#22304d] bg-[#121a2c] text-slate-300 hover:text-white"
          >
            <ChevronDoubleRightIcon className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <nav aria-label="Secciones" className="flex min-h-0 w-full flex-1 flex-col items-center gap-1 overflow-y-auto py-2.5">
          {items.map((item) => (
            <NavLink key={item.id} item={item} active={item.id === activeId} badge={badges[item.id] ?? 0} variant="rail" />
          ))}
        </nav>
        <div className="flex w-full shrink-0 flex-col items-center gap-1 border-t border-[#1c2740] py-2">
          {nav.footer.map((item) => (
            <NavLink key={item.id} item={item} active={item.id === activeId} badge={0} variant="rail" />
          ))}
          <NotificationBell panelClassName={notificationPanelClassName} />
          <AccountMenu account={account} onSignOut={onSignOut} variant="rail" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-[#1c2740] pl-3.5 pr-2.5">
        <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-900 text-[13px] font-bold text-white">
          HS
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-bold text-white">Humano SISU</span>
          {account.companyName && <span className="truncate text-xs text-slate-400">{account.companyName}</span>}
        </div>
        <button
          type="button"
          onClick={headerAction.onClick}
          aria-label={headerLabel}
          title={headerLabel}
          aria-expanded={headerAction.kind === 'collapse' ? true : undefined}
          className={`flex shrink-0 items-center justify-center rounded-lg border border-[#22304d] bg-[#121a2c] text-slate-300 hover:text-white ${
            touch ? 'h-11 w-11' : 'h-9 w-9'
          }`}
        >
          <HeaderIcon className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <nav aria-label="Secciones" className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-3 pt-2.5">
        {nav.top.map((item) => (
          <NavLink key={item.id} item={item} active={item.id === activeId} badge={badges[item.id] ?? 0} variant="full" touch={touch} />
        ))}
        {nav.groups.map((group) => {
          const open = openGroups[group.id] ?? true
          const hasActive = group.items.some((i) => i.id === activeId)
          const pending = group.items.reduce((s, i) => s + (badges[i.id] ?? 0), 0)
          const listId = `nav-group-${group.id}`
          return (
            <div key={group.id} className="mt-2 flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => onToggleGroup(group.id)}
                aria-expanded={open}
                aria-controls={listId}
                className={`flex min-h-[36px] items-center gap-2 rounded-md px-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] hover:text-white ${
                  hasActive && !open ? 'text-brand-200' : 'text-slate-400'
                }`}
              >
                <span className="flex-1">{group.label}</span>
                {!open && pending > 0 && <Badge count={pending} />}
                <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${open ? '' : '-rotate-90'}`} aria-hidden />
              </button>
              {open && (
                <div id={listId} className="flex flex-col gap-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.id}
                      item={item}
                      active={item.id === activeId}
                      badge={badges[item.id] ?? 0}
                      variant="full"
                      touch={touch}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="flex shrink-0 flex-col gap-0.5 border-t border-[#1c2740] p-2">
        {nav.footer.map((item) => (
          <NavLink key={item.id} item={item} active={item.id === activeId} badge={0} variant="full" touch={touch} />
        ))}
        <div className="mt-1.5 flex items-center gap-1 border-t border-[#1c2740] pt-1.5">
          <div className="min-w-0 flex-1">
            <AccountMenu account={account} onSignOut={onSignOut} variant="full" />
          </div>
          {!touch && <NotificationBell panelClassName={notificationPanelClassName} />}
        </div>
      </div>
    </div>
  )
}
