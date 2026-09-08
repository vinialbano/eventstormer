import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  fetchModelArtifact,
  fetchSummaryArtifact,
  fetchTranscriptArtifact,
} from '../transport/artifacts.ts'
import type {
  ArtifactKind,
  ModelArtifact,
  SummaryArtifact,
  TranscriptArtifact,
} from '../types.ts'

interface ArtifactStamp {
  boardPosition: number | null
  sessionRecordPosition: number | null
  renderedAt: string | null
}

interface ArtifactDownload {
  filename: string
  mime: string
  contents: string
}

/**
 * The `artifacts` store — backs the live artifacts panel. It holds the three
 * derived artifacts and the one currently selected, and re-fetches the selected
 * one on every applied operation (wired through `board-dirty`, the same signal
 * the readable account uses). A re-fetch that lands on top of an existing render
 * shows a quiet `catchingUp` state, never an error flash. The panel never
 * transforms artifact bytes: the download is the bytes on screen. No import of a
 * sibling store — the session id is injected.
 */
export const useArtifactsStore = defineStore('artifacts', () => {
  const workshopId = ref<string | null>(null)
  const sessionId = ref<string | null>(null)
  const selected = ref<ArtifactKind>('model')
  const model = ref<ModelArtifact | null>(null)
  const summary = ref<SummaryArtifact | null>(null)
  const transcript = ref<TranscriptArtifact | null>(null)
  const loading = ref(false)
  const catchingUp = ref(false)
  const error = ref<string | null>(null)

  const hasCurrentValue = (): boolean => {
    if (selected.value === 'model') return model.value !== null
    if (selected.value === 'summary') return summary.value !== null
    return transcript.value !== null
  }

  /** Transcript needs an explicit session; the JSON/summary segments do not. */
  const transcriptUnavailable = computed(
    () => selected.value === 'transcript' && sessionId.value === null,
  )

  const fetchSelected = async (): Promise<void> => {
    const workshop = workshopId.value
    const session = sessionId.value
    if (workshop === null) return
    if (selected.value === 'transcript' && session === null) return
    if (hasCurrentValue()) catchingUp.value = true
    else loading.value = true
    try {
      if (selected.value === 'model') {
        model.value = await fetchModelArtifact(workshop)
      } else if (selected.value === 'summary') {
        summary.value = await fetchSummaryArtifact(workshop)
      } else if (session !== null) {
        transcript.value = await fetchTranscriptArtifact(workshop, session)
      }
      error.value = null
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'load failed'
    } finally {
      loading.value = false
      catchingUp.value = false
    }
  }

  const load = async (id: string, session: string | null = null): Promise<void> => {
    workshopId.value = id
    sessionId.value = session
    await fetchSelected()
  }

  const setSession = (session: string | null): void => {
    sessionId.value = session
  }

  const select = async (kind: ArtifactKind): Promise<void> => {
    selected.value = kind
    await fetchSelected()
  }

  const refetch = (): Promise<void> => fetchSelected()

  const stamp = computed<ArtifactStamp>(() => {
    if (selected.value === 'model' && model.value !== null) {
      return {
        boardPosition: model.value.boardPosition,
        sessionRecordPosition: model.value.sessionRecordPosition,
        renderedAt: model.value.renderedAt,
      }
    }
    if (selected.value === 'summary' && summary.value !== null) {
      return {
        boardPosition: summary.value.boardPosition,
        sessionRecordPosition: summary.value.sessionRecordPosition,
        renderedAt: null,
      }
    }
    if (selected.value === 'transcript' && transcript.value !== null) {
      return { boardPosition: transcript.value.position, sessionRecordPosition: null, renderedAt: null }
    }
    return { boardPosition: null, sessionRecordPosition: null, renderedAt: null }
  })

  /** The rendered body: pretty JSON for the model, the markdown string otherwise. */
  const body = computed<string>(() => {
    if (selected.value === 'model') {
      return model.value === null ? '' : `${JSON.stringify(model.value, null, 2)}\n`
    }
    const document = selected.value === 'summary' ? summary.value : transcript.value
    return document?.markdown ?? ''
  })

  const download = computed<ArtifactDownload | null>(() => {
    if (workshopId.value === null || !hasCurrentValue()) return null
    const position = stamp.value.boardPosition ?? 0
    if (selected.value === 'model') {
      return {
        filename: `${workshopId.value}-model-${String(position)}.json`,
        mime: 'application/json',
        contents: body.value,
      }
    }
    return {
      filename: `${workshopId.value}-${selected.value}-${String(position)}.md`,
      mime: 'text/markdown',
      contents: body.value,
    }
  })

  return {
    workshopId,
    sessionId,
    selected,
    model,
    summary,
    transcript,
    loading,
    catchingUp,
    error,
    transcriptUnavailable,
    stamp,
    body,
    download,
    load,
    setSession,
    select,
    refetch,
  }
})
