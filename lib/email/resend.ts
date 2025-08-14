import { Resend } from 'resend'

// Minimal env access; env-validation ensures presence in dev/build
const RESEND_API_KEY = process.env.RESEND_API_KEY as string
const RESEND_FROM = process.env.RESEND_FROM as string

if (!RESEND_API_KEY || !RESEND_FROM) {
	// Do not throw at import time in case of serverless cold starts; fail on send
	console.warn('Resend env vars missing: RESEND_API_KEY or RESEND_FROM')
}

export const resend = new Resend(RESEND_API_KEY || 'invalid')

export type AttachmentInput = {
	filename: string
	base64: string
	contentType?: string
}

export async function sendAdminPayrollEmail(params: {
	to: string[]
	subject: string
	html: string
	attachment?: AttachmentInput
}) {
	if (!RESEND_API_KEY || !RESEND_FROM) {
		throw new Error('Email not configured: set RESEND_API_KEY and RESEND_FROM')
	}
	const attachments = params.attachment
		? [
			{
				filename: params.attachment.filename,
				content: Buffer.from(params.attachment.base64, 'base64'),
				contentType: params.attachment.contentType || 'application/pdf',
			},
		]
		: undefined

	return await resend.emails.send({
		from: RESEND_FROM,
		to: params.to,
		subject: params.subject,
		html: params.html,
		attachments,
	})
}

export async function sendEmployeeVoucherEmail(params: {
	to: string
	subject: string
	html: string
	attachment?: AttachmentInput
}) {
	if (!RESEND_API_KEY || !RESEND_FROM) {
		throw new Error('Email not configured: set RESEND_API_KEY and RESEND_FROM')
	}
	const attachments = params.attachment
		? [
			{
				filename: params.attachment.filename,
				content: Buffer.from(params.attachment.base64, 'base64'),
				contentType: params.attachment.contentType || 'application/pdf',
			},
		]
		: undefined

	return await resend.emails.send({
		from: RESEND_FROM,
		to: [params.to],
		subject: params.subject,
		html: params.html,
		attachments,
	})
}