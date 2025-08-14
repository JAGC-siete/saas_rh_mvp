import { NextApiRequest, NextApiResponse } from 'next'
import { createClient, createAdminClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-helpers'
import { logger } from '../../../lib/logger'
import { sendAdminPayrollEmail, sendEmployeeVoucherEmail } from '../../../lib/email/resend'
import { generateGeneralPayrollPDFBuffer, generateEmployeeVoucherPDFBuffer } from '../../../lib/pdf/payroll'

function chunkArray<T>(arr: T[], size: number): T[][] {
	const chunks: T[][] = []
	for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
	return chunks
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed' })
	}

	// Authn/Authz
	const auth = await authenticateUser(req, res, ['can_generate_payroll', 'can_export_payroll'])
	if (!auth.success || !auth.user || !auth.userProfile) {
		return res.status(401).json({ error: auth.error || 'Unauthorized', message: auth.message })
	}
	const userProfile = auth.userProfile
	const userEmail = auth.user?.email as string | undefined

	const { periodo, quincena, sendAdmin, sendEmployees } = req.body || {}
	if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) {
		return res.status(400).json({ error: 'periodo requerido (YYYY-MM)' })
	}
	if (![1, 2].includes(Number(quincena))) {
		return res.status(400).json({ error: 'quincena inválida (1|2)' })
	}

	try {
		const supabase = createClient(req, res)
		// Obtener registros de nómina del período para la compañía
		const { data: payrollRecords, error: payrollError } = await supabase
			.from('payroll_records')
			.select(`*, employees:employee_id (id, name, employee_code, email, department, position, bank_name, bank_account, company_id)`) // requires view with email
			.gte('period_start', `${periodo}-01`)
			.lt('period_start', `${periodo}-32`)
			.eq('employees.company_id', userProfile.company_id)
			.order('period_start', { ascending: false })

		if (payrollError) {
			logger.error('Error fetching payroll records for email dispatch', payrollError)
			return res.status(500).json({ error: 'Error obteniendo registros de nómina' })
		}
		if (!payrollRecords || payrollRecords.length === 0) {
			return res.status(404).json({ error: 'No hay registros para el período' })
		}

		const startDay = Number(quincena) === 1 ? 1 : 16
		const recordsForQuincena = payrollRecords.filter((r: any) => {
			try { return new Date(r.period_start).getDate() === startDay } catch { return true }
		})

		let adminResults: any = undefined
		let employeeResults: Array<{ to: string; ok: boolean; id?: string }> = []

		// Send to admins
		if (sendAdmin) {
			let adminEmails: string[] = []
			const envList = (process.env.PAYROLL_ADMIN_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean)
			adminEmails.push(...envList)

			if (adminEmails.length === 0) {
				try {
					const { data: adminProfiles } = await supabase
						.from('user_profiles')
						.select('id')
						.in('role', ['company_admin', 'hr_manager'])
						.eq('company_id', userProfile.company_id)

					if (adminProfiles && adminProfiles.length > 0 && process.env.SUPABASE_SERVICE_ROLE_KEY) {
						const admin = createAdminClient()
						const fetched = await Promise.all(
							adminProfiles.map(async (p: any) => {
								try { const { data } = await admin.auth.admin.getUserById(p.id); return data?.user?.email } catch { return undefined }
							})
						)
						adminEmails.push(...fetched.filter(Boolean) as string[])
					}
				} catch (e) {
					logger.warn('Fallo al resolver correos admin; usando fallback', { error: (e as Error)?.message })
				}
			}

			if (adminEmails.length === 0 && userEmail) adminEmails = [userEmail]

			const adminPdf = await generateGeneralPayrollPDFBuffer(recordsForQuincena, periodo)
			const base64 = adminPdf.toString('base64')
			logger.info('Enviando planilla general a administradores', { count: adminEmails.length })
			adminResults = await sendAdminPayrollEmail({
				to: adminEmails,
				subject: `Planilla ${periodo} Q${quincena}`,
				html: `<p>Adjuntamos la planilla general de ${periodo} (Q${quincena}).</p>`,
				attachment: { filename: `planilla_${periodo}_q${quincena}.pdf`, base64, contentType: 'application/pdf' },
			})
		}

		// Send to employees
		if (sendEmployees) {
			const recipients = recordsForQuincena
				.map((r: any) => ({ email: r.employees?.email, record: r }))
				.filter((x: any) => !!x.email)

			const batches = chunkArray(recipients, 5)
			for (const batch of batches) {
				await Promise.all(
					batch.map(async ({ email, record }) => {
						try {
							const pdf = await generateEmployeeVoucherPDFBuffer(record, periodo, Number(quincena))
							const base64 = pdf.toString('base64')
							const resp = await sendEmployeeVoucherEmail({
								to: email as string,
								subject: `Recibo de pago ${periodo} Q${quincena}`,
								html: `<p>Adjuntamos su recibo de pago (${periodo} - Q${quincena}).</p>`,
								attachment: { filename: `recibo_${record.employees?.employee_code}_${periodo}_q${quincena}.pdf`, base64, contentType: 'application/pdf' },
							})
							employeeResults.push({ to: email as string, ok: true, id: (resp as any)?.data?.id })
						} catch (e) {
							logger.error('Error enviando voucher a empleado', e, { email })
							employeeResults.push({ to: email as string, ok: false })
						}
					})
				)
			}
		}

		return res.status(200).json({
			message: 'Proceso de envío completado',
			counts: {
				records: recordsForQuincena.length,
				admins: sendAdmin ? (Array.isArray((adminResults as any)?.to) ? (adminResults as any).to.length : undefined) : 0,
				employees: sendEmployees ? employeeResults.length : 0,
			},
			successEmployees: employeeResults.filter(r => r.ok).length,
			failedEmployees: employeeResults.filter(r => !r.ok).length,
		})
	} catch (error) {
		logger.error('Fallo general en envío de correos de nómina', error as Error)
		return res.status(500).json({ error: 'Error interno al enviar correos' })
	}
}