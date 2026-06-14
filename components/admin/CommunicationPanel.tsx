import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import {
  SEGMENT_LABELS,
  type CommSegment,
} from '../../lib/communications/schema'

type FeedbackKind = 'idle' | 'success' | 'error'

export default function CommunicationPanel() {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [segment, setSegment] = useState<CommSegment>('active_admins')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: FeedbackKind; message: string }>({ kind: 'idle', message: '' })

  const handleSend = async () => {
    setLoading(true)
    setFeedback({ kind: 'idle', message: 'Enviando…' })
    try {
      const res = await fetch('/api/super-admin/communications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, segment }),
      })
      const data = await res.json()
      if (res.ok) {
        setFeedback({
          kind: 'success',
          message: `Campaña disparada. ${data.recipientCount} destinatarios en cola.`,
        })
        setSubject('')
        setBody('')
      } else {
        const detail = Array.isArray(data.details) ? `: ${data.details.join(', ')}` : ''
        setFeedback({ kind: 'error', message: `${data.error || 'Error'}${detail}` })
      }
    } catch {
      setFeedback({ kind: 'error', message: 'Error de red al enviar la campaña.' })
    } finally {
      setLoading(false)
    }
  }

  const disabled = loading || subject.trim().length < 3 || body.trim().length < 5

  return (
    <Card className="border-white/10 bg-white/5">
      <CardHeader>
        <CardTitle className="text-white">Centro de Comunicaciones</CardTitle>
        <p className="text-sm text-gray-400">
          Envía secuencias de adopción y anuncios a administradores de empresas.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">Segmento</label>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value as CommSegment)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {(Object.keys(SEGMENT_LABELS) as CommSegment[]).map((value) => (
              <option key={value} value={value}>
                {SEGMENT_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">Asunto</label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ej. Bienvenido a Humano SISU"
            maxLength={200}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">Mensaje (HTML permitido)</label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Escribe el contenido de la campaña…"
            rows={8}
            maxLength={50000}
          />
        </div>

        {feedback.kind !== 'idle' || loading ? (
          <p
            className={
              feedback.kind === 'success'
                ? 'text-sm text-emerald-400'
                : feedback.kind === 'error'
                  ? 'text-sm text-red-400'
                  : 'text-sm text-gray-400'
            }
          >
            {feedback.message}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button onClick={handleSend} disabled={disabled}>
            {loading ? 'Procesando…' : 'Disparar campaña'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
