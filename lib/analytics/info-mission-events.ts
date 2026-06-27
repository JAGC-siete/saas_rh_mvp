import { trackGA4Event } from './ga4'

export function trackInfoMissionComplete(params: {
  missionId: number
  choice: string
  alreadyRecorded: boolean
}): void {
  trackGA4Event('info_mission_complete', {
    event_category: 'InfoMission',
    event_label: `m${params.missionId}_${params.choice}`,
    mission_id: params.missionId,
    choice: params.choice,
    already_recorded: params.alreadyRecorded,
  })
}
