import LandingRenderer from '../landings/LandingRenderer'
import type { PublicLandingPage } from '../../types/landing'

export default function WebycitasLivePreview({ page }: { page: PublicLandingPage }) {
  return (
    <div className="lg:sticky lg:top-24">
      <p className="mb-3 text-center text-xs uppercase tracking-[0.2em] text-slate-400">
        Vista previa
      </p>
      <div className="mx-auto w-full max-w-[390px] rounded-[1.75rem] border border-white/15 bg-black/40 p-2.5">
        <div
          className="max-h-[70vh] overflow-y-auto overflow-x-hidden rounded-[1.25rem] bg-white"
          aria-hidden="true"
        >
          <div className="pointer-events-none origin-top">
            <LandingRenderer page={page} />
          </div>
        </div>
      </div>
    </div>
  )
}
