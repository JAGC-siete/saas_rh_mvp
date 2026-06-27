import Link from 'next/link'
import { useEffect } from 'react'
import type { GetServerSideProps } from 'next'
import { motion } from 'framer-motion'
import PublicPageShell from '../../../components/landing/PublicPageShell'
import PublicPageHead from '../../../components/SEO/PublicPageHead'
import { Button } from '../../../components/ui/button'
import { trackInfoMissionComplete } from '../../../lib/analytics/info-mission-events'
import type { MissionFeedback } from '../../../lib/info-game/mission-feedback'
import { MISSIONS, parseMissionId, isValidMissionChoice, type MissionId } from '../../../lib/marketing/mission-config'
import { recordMissionChoice } from '../../../lib/marketing/record-mission-choice'

type PageProps = {
  missionId: MissionId
  choice: string
  feedback: MissionFeedback
  alreadyRecorded: boolean
}

export default function InfoMissionPage({ missionId, choice, feedback, alreadyRecorded }: PageProps) {
  const mission = MISSIONS[missionId]

  useEffect(() => {
    trackInfoMissionComplete({ missionId, choice, alreadyRecorded })
  }, [missionId, choice, alreadyRecorded])

  return (
    <PublicPageShell showSpotlight loginAlwaysVisible>
      <PublicPageHead
        title={`${feedback.title} | Humano SISU`}
        description={feedback.headline}
        canonicalPath={`/info/m/${missionId}`}
        noindex
      />

      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4 max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="text-center mb-8"
          >
            <span className="inline-block px-3 py-1 mb-4 text-xs rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25">
              {mission.badge}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{feedback.title}</h1>
            {alreadyRecorded && (
              <p className="text-xs text-brand-300/70">Ya habías completado esta misión — aquí está tu resultado.</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.45 }}
            className="glass-modern rounded-2xl border border-cyan-500/30 p-6 sm:p-8"
          >
            <h2 className="text-xl font-bold text-white mb-3 text-center">{feedback.headline}</h2>
            <p className="text-sm sm:text-base text-brand-200/90 leading-relaxed text-center mb-6">{feedback.body}</p>

            {feedback.stat && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 py-6 px-4 text-center mb-6">
                <div className="text-4xl sm:text-5xl font-bold text-amber-300 tabular-nums">{feedback.stat.value}</div>
                <div className="text-xs sm:text-sm text-brand-200/80 mt-2 uppercase tracking-wide">{feedback.stat.label}</div>
              </div>
            )}

            {feedback.cta && (
              <Link href={feedback.cta.href} className="block mb-4">
                <Button variant="modern" className="w-full">
                  {feedback.cta.label}
                </Button>
              </Link>
            )}

            <Link
              href="/info"
              className="block text-center text-sm text-brand-300 hover:text-white underline"
            >
              Volver al Tablón de la Intriga
            </Link>
          </motion.div>
        </div>
      </section>
    </PublicPageShell>
  )
}

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const missionId = parseMissionId(ctx.params?.id)
  const leadToken = typeof ctx.query.lead === 'string' ? ctx.query.lead.trim() : ''
  const choice = typeof ctx.query.choice === 'string' ? ctx.query.choice.trim() : ''

  if (!missionId || !leadToken || !choice || !isValidMissionChoice(missionId, choice)) {
    return { notFound: true }
  }

  const { getMissionFeedback } = await import('../../../lib/info-game/mission-feedback')
  const recorded = await recordMissionChoice({ missionId, leadToken, choice })

  if (!recorded.ok) {
    return { notFound: true }
  }

  const feedback = getMissionFeedback(missionId, choice, recorded.firstName ?? 'Curioso', leadToken)

  return {
    props: {
      missionId,
      choice,
      feedback,
      alreadyRecorded: recorded.alreadyRecorded,
    },
  }
}
