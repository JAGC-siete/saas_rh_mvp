import type { NextApiRequest, NextApiResponse } from 'next'
import { sendPublicAttendanceKioskGone } from '../../../lib/attendance/kiosk-disabled'

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  return sendPublicAttendanceKioskGone(res)
}
