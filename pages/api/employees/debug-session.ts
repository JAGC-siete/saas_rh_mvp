import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const accessToken = req.cookies['sb-access-token']
    const tokenParts = accessToken ? accessToken.split('_') : []
    const extractedEmployeeId = tokenParts[1]

    const debug = {
      cookies: req.cookies,
      headers: {
        authorization: req.headers.authorization,
        cookie: req.headers.cookie
      },
      accessToken: accessToken,
      accessTokenPreview: accessToken ? accessToken.substring(0, 30) + '...' : 'No token',
      refreshToken: req.cookies['sb-refresh-token'],
      hasEmployeeToken: !!(accessToken?.startsWith('emp_')),
      tokenParts: {
        total: tokenParts.length,
        part0: tokenParts[0], // Should be 'emp'
        part1: tokenParts[1], // Should be employee UUID
        part2: tokenParts[2]?.substring(0, 10) + '...', // Should be timestamp
        extractedEmployeeId: extractedEmployeeId,
        isValidUUID: extractedEmployeeId && extractedEmployeeId.length === 36
      },
      environment: process.env.NODE_ENV,
      isProduction: process.env.NODE_ENV === 'production'
    }

    return res.status(200).json({ debug })
  } catch (error) {
    return res.status(500).json({ error: 'Debug error', details: error })
  }
}
