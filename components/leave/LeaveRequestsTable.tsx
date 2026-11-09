import React, { useMemo, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useLeaveText } from './useLeaveText'
import type {
  LeaveAttendanceSummaryPayload,
  LeaveRequest,
  LeaveType,
} from '../../lib/types/leave'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { formatDateForHonduras } from '../../lib/timezone'
import EmployeeCell from '../common/EmployeeCell'
import {
  attendanceDashboardHref,
  displayEmployeeDni,
  displayEmployeeName,
  getLeaveTypeName,
  getStatusColorClass,
} from './leaveUtils'
import { cn } from '../../lib/utils'

type SortKey = 'employee' | 'type' | 'start' | 'status' | 'created'
type SortDir = 'asc' | 'desc'

export interface LeaveRequestsTableProps {
  leaveRequests: LeaveRequest[]
  leaveTypes: LeaveType[]
  userRole: string | null | undefined
  isSubmitting: boolean
  updateLeaveRequest: (id: string, data: { status: 'approved' | 'rejected' }) => Promise<unknown>
  deleteLeaveRequest: (id: string) => Promise<unknown>
  onAttendanceSummary: (requestId: string) => Promise<void>
  summaryExpandedId: string | null
  summaryData: LeaveAttendanceSummaryPayload | null
  summaryLoading: boolean
}

export default function LeaveRequestsTable({
  leaveRequests,
  leaveTypes,
  userRole,
  isSubmitting,
  updateLeaveRequest,
  deleteLeaveRequest,
  onAttendanceSummary,
  summaryExpandedId,
  summaryData,
  summaryLoading,
}: LeaveRequestsTableProps) {
  const { t, status, summary, duration, typeName } = useLeaveText()
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [pendingOnly, setPendingOnly] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('created')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    const r = (userRole || '').toLowerCase()
    if (r === 'manager') {
      setPendingOnly(true)
      setStatusFilter('pending')
    }
  }, [userRole])

  const pendingCount = useMemo(() => leaveRequests.filter((x) => x.status === 'pending').length, [leaveRequests])

  const filtered = useMemo(() => {
    let rows = [...leaveRequests]
    if (pendingOnly) {
      rows = rows.filter((r) => r.status === 'pending')
    } else if (statusFilter !== 'all') {
      rows = rows.filter((r) => r.status === statusFilter)
    }
    if (typeFilter !== 'all') {
      rows = rows.filter((r) => r.leave_type_id === typeFilter)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter((r) => {
        const name = displayEmployeeName(r).toLowerCase()
        const dni = displayEmployeeDni(r).toLowerCase()
        return name.includes(q) || dni.includes(q)
      })
    }
    if (dateFrom) {
      rows = rows.filter((r) => r.start_date.slice(0, 10) >= dateFrom)
    }
    if (dateTo) {
      rows = rows.filter((r) => r.end_date.slice(0, 10) <= dateTo)
    }

    const dir = sortDir === 'asc' ? 1 : -1
    rows.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'employee':
          cmp = displayEmployeeName(a).localeCompare(displayEmployeeName(b))
          break
        case 'type':
          cmp = getLeaveTypeName(a, leaveTypes).localeCompare(getLeaveTypeName(b, leaveTypes))
          break
        case 'start':
          cmp = a.start_date.localeCompare(b.start_date)
          break
        case 'status':
          cmp = a.status.localeCompare(b.status)
          break
        case 'created':
        default:
          cmp = (a.created_at || '').localeCompare(b.created_at || '')
          break
      }
      return cmp * dir
    })
    return rows
  }, [
    leaveRequests,
    pendingOnly,
    statusFilter,
    typeFilter,
    search,
    dateFrom,
    dateTo,
    sortKey,
    sortDir,
    leaveTypes,
  ])

  const toggleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDir(key === 'created' ? 'desc' : 'asc')
      return key
    })
  }, [])

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  const thBtn = (key: SortKey, label: string) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => toggleSort(key)}
      className="h-auto min-h-0 px-0 py-0 text-xs font-medium text-white uppercase tracking-wide hover:bg-transparent hover:text-brand-300"
    >
      {label}
      {sortIndicator(key)}
    </Button>
  )

  const rowActions = (request: LeaveRequest) => (
    <div className="flex flex-wrap gap-1.5">
      {request.status === 'pending' && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isSubmitting}
            onClick={() => updateLeaveRequest(request.id, { status: 'approved' })}
            className="text-emerald-300 hover:bg-emerald-500/15 hover:text-emerald-200"
          >
            {t('table.approve')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isSubmitting}
            onClick={() => updateLeaveRequest(request.id, { status: 'rejected' })}
            className="text-rose-300 hover:bg-rose-500/15 hover:text-rose-200"
          >
            {t('table.reject')}
          </Button>
        </>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isSubmitting}
        onClick={() => deleteLeaveRequest(request.id)}
        className="text-gray-400 hover:bg-white/10 hover:text-rose-300"
      >
        {t('table.delete')}
      </Button>
    </div>
  )

  const renderSummaryRow = (requestId: string) => {
    if (summaryExpandedId !== requestId) return null
    return (
      <tr>
        <td colSpan={8} className="px-6 py-4 bg-black/25 border-t border-white/10">
          {summaryLoading && <p className="text-sm text-gray-300">{t('table.loadingSummary')}</p>}
          {!summaryLoading && summaryData && (
            <div className="flex flex-wrap gap-2">
              {summaryData.days.length === 0 ? (
                <span className="text-gray-400 text-sm">{t('table.noDates')}</span>
              ) : (
                summaryData.days.map((d) => (
                  <span
                    key={d.date}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs border',
                      d.summary === 'presente' && 'bg-emerald-500/15 border-emerald-400/40 text-emerald-100',
                      d.summary === 'ausente' && 'bg-red-500/15 border-red-400/40 text-red-100',
                      d.summary === 'permiso_pagado' && 'bg-violet-500/15 border-violet-400/40 text-violet-100',
                      d.summary === 'sin_datos' && 'bg-gray-500/15 border-gray-400/30 text-gray-200'
                    )}
                    title={d.record_status || undefined}
                  >
                    <span className="font-mono">{d.date}</span>
                    <span>{summary(d.summary)}</span>
                  </span>
                ))
              )}
            </div>
          )}
        </td>
      </tr>
    )
  }

  return (
    <Card variant="liquid" className="border border-white/10">
      <CardHeader className="border-b border-white/10 pb-3 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-white text-lg font-semibold tracking-tight inline-flex items-center gap-2">
              {t('table.title')}
              {pendingCount > 0 && (
                <span className="text-xs font-normal rounded-full bg-amber-500/20 text-amber-100 px-2 py-0.5 border border-amber-400/30">
                  {t('table.pendingBadge', { count: pendingCount })}
                </span>
              )}
            </CardTitle>
            <p className="text-xs text-gray-400 mt-1 font-normal">{t('table.subtitle')}</p>
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={pendingOnly}
              onChange={(e) => {
                const on = e.target.checked
                setPendingOnly(on)
                if (on) setStatusFilter('pending')
                else setStatusFilter('all')
              }}
              className="rounded border-white/30 bg-white/10"
            />
            {t('table.pendingOnly')}
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('table.searchPlaceholder')}
            className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm text-white placeholder:text-gray-500 min-w-0"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              const v = e.target.value as typeof statusFilter
              setStatusFilter(v)
              if (v !== 'pending') setPendingOnly(false)
              if (v === 'pending') setPendingOnly(true)
            }}
            disabled={pendingOnly}
            className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm text-white disabled:opacity-50"
          >
            <option value="all">{t('table.statusAll')}</option>
            <option value="pending">{t('status.pending')}</option>
            <option value="approved">{t('status.approved')}</option>
            <option value="rejected">{t('status.rejected')}</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm text-white"
          >
            <option value="all">{t('table.typeAll')}</option>
            {leaveTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm text-white"
            aria-label={t('table.fromAria')}
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm text-white"
            aria-label={t('table.toAria')}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="text-xs"
            onClick={() => {
              setSearch('')
              setStatusFilter('all')
              setTypeFilter('all')
              setDateFrom('')
              setDateTo('')
              setPendingOnly(false)
            }}
          >
            {t('table.clearFilters')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300/30">
            <thead className="bg-white/10 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-3 text-left">{thBtn('employee', t('table.cols.employee'))}</th>
                <th className="px-6 py-3 text-left">{thBtn('type', t('table.cols.type'))}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">{t('table.cols.duration')}</th>
                <th className="px-6 py-3 text-left">{thBtn('start', t('table.cols.dates'))}</th>
                <th className="px-6 py-3 text-left">{thBtn('status', t('table.cols.status'))}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">{t('table.cols.file')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">{t('table.cols.attendance')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">{t('table.cols.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300/30">
              {filtered.map((request) => (
                <React.Fragment key={request.id}>
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <EmployeeCell name={displayEmployeeName(request)} dni={displayEmployeeDni(request)} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-400/20 text-blue-200 border border-blue-400/30">
                        {typeName(request, leaveTypes)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{duration(request)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      <div>{t('table.start', { date: formatDateForHonduras(request.start_date) })}</div>
                      <div>{t('table.end', { date: formatDateForHonduras(request.end_date) })}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColorClass(request.status)}`}
                      >
                        {status(request.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {request.attachment_url ? (
                        <a
                          href={request.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-400 font-medium hover:text-brand-300 underline-offset-2 hover:underline"
                        >
                          {t('table.viewFile')}
                        </a>
                      ) : (
                        <span className="text-gray-400">{t('table.noFile')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-col gap-1">
                        {(request.employee_id || request.employee?.id) && (
                          <Link
                            href={attendanceDashboardHref(request)}
                            className="text-brand-400 font-medium hover:text-brand-300 underline-offset-2 hover:underline"
                          >
                            {t('table.viewDashboard')}
                          </Link>
                        )}
                        <Button
                          type="button"
                          variant="link"
                          onClick={() => onAttendanceSummary(request.id)}
                          className="h-auto min-h-0 justify-start p-0 text-sm font-normal"
                        >
                          {summaryExpandedId === request.id ? t('table.hideSummary') : t('table.summaryDays')}
                        </Button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{rowActions(request)}</td>
                  </tr>
                  {renderSummaryRow(request.id)}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {filtered.map((request) => (
            <div key={request.id} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="flex justify-between gap-2">
                <EmployeeCell name={displayEmployeeName(request)} dni={displayEmployeeDni(request)} />
                <span
                  className={`shrink-0 self-start inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColorClass(request.status)}`}
                >
                  {status(request.status)}
                </span>
              </div>
              <p className="text-sm text-white">
                <span className="text-gray-400">{t('table.typeLabel')}</span> {typeName(request, leaveTypes)}
              </p>
              <p className="text-sm text-white">
                <span className="text-gray-400">{t('table.durationLabel')}</span> {duration(request)}
              </p>
              <p className="text-xs text-gray-300">
                {formatDateForHonduras(request.start_date)} → {formatDateForHonduras(request.end_date)}
              </p>
              <div className="flex flex-wrap gap-2">
                {request.attachment_url ? (
                  <a
                    href={request.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-brand-400 font-medium"
                  >
                    {t('table.viewFile')}
                  </a>
                ) : null}
                {(request.employee_id || request.employee?.id) && (
                  <Link href={attendanceDashboardHref(request)} className="text-sm text-brand-400 font-medium">
                    {t('table.attendance')}
                  </Link>
                )}
                <Button type="button" variant="link" size="sm" className="text-sm h-auto p-0" onClick={() => onAttendanceSummary(request.id)}>
                  {summaryExpandedId === request.id ? t('table.hideSummary') : t('table.summaryDays')}
                </Button>
              </div>
              {summaryExpandedId === request.id && (
                <div className="border-t border-white/10 pt-2">
                  {summaryLoading && <p className="text-xs text-gray-400">{t('table.loading')}</p>}
                  {!summaryLoading && summaryData && (
                    <div className="flex flex-wrap gap-1">
                      {summaryData.days.map((d) => (
                        <span
                          key={d.date}
                          className={cn(
                            'text-[10px] rounded px-1.5 py-0.5 border',
                            d.summary === 'presente' && 'bg-emerald-500/15 border-emerald-400/40',
                            d.summary === 'ausente' && 'bg-red-500/15 border-red-400/40',
                            d.summary === 'sin_datos' && 'bg-gray-500/15 border-gray-400/30'
                          )}
                        >
                          {d.date} {summary(d.summary)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="pt-1 border-t border-white/10">{rowActions(request)}</div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-300 text-lg font-medium">{t('table.noMatches')}</div>
            <div className="text-gray-400 text-sm mt-2">{t('table.noMatchesHint')}</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
