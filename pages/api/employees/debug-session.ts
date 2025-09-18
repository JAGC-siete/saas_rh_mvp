import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const debug = {
      cookies: req.cookies,
      headers: {
        authorization: req.headers.authorization,
        cookie: req.headers.cookie
      },
      accessToken: req.cookies['sb-access-token'],
      refreshToken: req.cookies['sb-refresh-token'],
      hasEmployeeToken: !!(req.cookies['sb-access-token']?.startsWith('emp_')),
      environment: process.env.NODE_ENV,
      isProduction: process.env.NODE_ENV === 'production'
    }

    return res.status(200).json({ debug })
  } catch (error) {
    return res.status(500).json({ error: 'Debug error', details: error })
  }
}
