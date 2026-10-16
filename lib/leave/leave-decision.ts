export type LeaveDecisionStatus = 'approved' | 'rejected'

export type LeaveDecisionCheck =
  | { ok: true }
  | { ok: false; httpStatus: 403 | 409; error: string; message: string }

/**
 * Approve/reject is a one-way step out of `pending`, and nobody decides on their
 * own request (department managers and HR included). The DB trigger
 * `enforce_leave_request_transition` applies the same rule to direct writes.
 */
export function checkLeaveDecision(params: {
  currentStatus: string | null | undefined
  requestEmployeeId: string | null | undefined
  actorEmployeeId: string | null | undefined
}): LeaveDecisionCheck {
  const { currentStatus, requestEmployeeId, actorEmployeeId } = params

  if (actorEmployeeId && requestEmployeeId && actorEmployeeId === requestEmployeeId) {
    return {
      ok: false,
      httpStatus: 403,
      error: 'Self approval not allowed',
      message: 'No puedes aprobar ni rechazar tu propia solicitud. Pídele a otra persona autorizada que la revise.'
    }
  }

  if (currentStatus !== 'pending') {
    return {
      ok: false,
      httpStatus: 409,
      error: 'Leave request already decided',
      message: 'Esta solicitud ya no está pendiente (fue aprobada, rechazada o cancelada). Recarga la página para ver su estado.'
    }
  }

  return { ok: true }
}
