import React from 'react'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import ProtectedRoute from '../../../components/ProtectedRoute'
import DashboardLayout from '../../../components/DashboardLayout'
import { useCompanyContext } from '../../../lib/useCompanyContext'
import { CalculatorIcon } from '@heroicons/react/24/outline'

const AccountingMappingTable = dynamic(
  () =>
    import('../../../components/accounting/AccountingMappingTable').then(
      (mod) => mod.AccountingMappingTable
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-400" />
      </div>
    )
  }
)

export default function AccountingPage() {
  const { companyId, loading: companyLoading, error: companyError } =
    useCompanyContext()

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-brand-500/20 p-2.5">
              <CalculatorIcon className="h-7 w-7 text-brand-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Mapeo Contable
              </h1>
              <p className="text-gray-300 mt-1">
                Configure el catálogo de cuentas y vincule los conceptos de
                nómina con las cuentas NIIF de su empresa.
              </p>
            </div>
          </div>

          {companyLoading && (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-400" />
            </div>
          )}

          {companyError && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-red-300">
              {companyError}
            </div>
          )}

          {!companyLoading && !companyError && (
            <Suspense
              fallback={
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-400" />
                </div>
              }
            >
              <AccountingMappingTable companyId={companyId ?? null} />
            </Suspense>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
