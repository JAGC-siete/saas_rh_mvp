import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Check Twilio environment variables
  const twilioVars = {
    SUPABASE_AUTH_SMS_TWILIO_ACCOUNT_SID: process.env.SUPABASE_AUTH_SMS_TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing',
    SUPABASE_AUTH_SMS_TWILIO_MESSAGE_SERVICE_SID: process.env.SUPABASE_AUTH_SMS_TWILIO_MESSAGE_SERVICE_SID ? '✅ Set' : '❌ Missing',
    SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN: process.env.SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing',
  }

  res.status(200).json({
    message: 'Twilio Environment Variables Check',
    twilio: twilioVars,
    allEnvVars: Object.keys(process.env).filter(key => key.includes('TWILIO') || key.includes('SMS'))
  })
}
