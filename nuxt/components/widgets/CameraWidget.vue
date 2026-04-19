<template>
  <div class="h-100 d-flex flex-column">
    <div class="d-flex align-center ga-2 px-3 pt-3 pb-1">
      <v-icon icon="mdi-camera" size="14" color="medium-emphasis" />
      <span class="text-caption text-medium-emphasis text-truncate flex-grow-1">{{ name }}</span>
      <template v-if="streamState === 'playing'">
        <v-btn
          :icon="muted ? 'mdi-volume-off' : 'mdi-volume-high'"
          size="x-small" variant="text" density="compact"
          :color="muted ? undefined : 'primary'"
          @click="toggleMute"
        />
      </template>
      <v-btn
        v-if="streamState !== 'idle'"
        icon="mdi-stop"
        size="x-small" variant="text" density="compact"
        :title="t('camera.stop_stream')"
        @click="stopStream"
      />
    </div>

    <div class="flex-grow-1 position-relative overflow-hidden d-flex align-center justify-center"
      style="border-radius: 0 0 12px 12px; background: #000">

      <!-- Idle: snapshot preview + play button -->
      <template v-if="streamState === 'idle'">
        <img v-if="snapshotSrc" :src="snapshotSrc" :alt="name"
          class="w-100 h-100 position-absolute" style="object-fit: cover; opacity: 0.5" />
        <v-btn icon="mdi-play-circle" size="large" variant="flat" color="primary"
          style="position: relative; z-index: 1" @click="startStream" />
      </template>

      <!-- Connecting -->
      <template v-else-if="streamState === 'waking'">
        <img v-if="snapshotSrc" :src="snapshotSrc" :alt="name"
          class="w-100 h-100 position-absolute" style="object-fit: cover; opacity: 0.3" />
        <div class="d-flex flex-column align-center ga-2" style="position: relative; z-index: 1">
          <v-progress-circular indeterminate color="primary" size="32" />
          <span class="text-caption text-medium-emphasis">{{ t('camera.connecting') }}</span>
        </div>
      </template>

      <!-- Live video (always in DOM so ref is available for ontrack) -->
      <video ref="videoEl"
        class="w-100 h-100"
        :style="{ objectFit: 'cover', display: streamState === 'playing' ? 'block' : 'none' }"
        autoplay playsinline />

      <!-- Error -->
      <div v-if="streamState === 'error'"
        class="d-flex flex-column align-center ga-2 text-medium-emphasis text-body-2">
        <v-icon icon="mdi-camera-off" size="32" />
        <span class="text-caption text-center px-2">{{ errorMsg }}</span>
        <v-btn size="x-small" variant="tonal" @click="startStream">{{ t('common.retry') }}</v-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CameraWidgetConfig } from '~/types/dashboard'

const { t } = useI18n()
const props = defineProps<{ config: CameraWidgetConfig }>()
const name = computed(() => props.config.name ?? props.config.entity_id)

type StreamState = 'idle' | 'waking' | 'playing' | 'error'
const streamState = ref<StreamState>('idle')
const videoEl = ref<HTMLVideoElement | null>(null)
const snapshotSrc = ref('')
const errorMsg = ref('')

const client = useHAClient()
let pc: RTCPeerConnection | null = null
let unsubscribeWebRTC: (() => void) | null = null
const muted = ref(true)

function toggleMute() {
  muted.value = !muted.value
  if (videoEl.value) videoEl.value.muted = muted.value
}

onMounted(() => {
  snapshotSrc.value = `/api/camera/${props.config.entity_id}?t=${Date.now()}`
})

async function startStream() {
  streamState.value = 'waking'
  errorMsg.value = t('camera.stream_unavailable')

  try {
    pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

    // Nest requires exactly: audio, video, application m-lines in that order
    pc.addTransceiver('audio', { direction: 'recvonly' })
    pc.addTransceiver('video', { direction: 'recvonly' })
    pc.createDataChannel('dataSendChannel')

    pc.ontrack = (event) => {
      console.log('[Camera] track received:', event.track.kind, 'streams:', event.streams.length)
      const stream = event.streams[0] ?? new MediaStream([event.track])
      if (videoEl.value) {
        if (!videoEl.value.srcObject) {
          videoEl.value.srcObject = stream
        } else {
          // Add additional tracks (e.g. audio arriving after video)
          const existing = videoEl.value.srcObject as MediaStream
          stream.getTracks().forEach(t => { if (!existing.getTrackById(t.id)) existing.addTrack(t) })
        }
        videoEl.value.muted = true
        videoEl.value.play().catch(() => {})
      }
      if (event.track.kind === 'video') streamState.value = 'playing'
    }

    pc.oniceconnectionstatechange = () => {
      console.log('[Camera] ICE state:', pc?.iceConnectionState)
      if (pc?.iceConnectionState === 'failed' || pc?.iceConnectionState === 'closed') {
        errorMsg.value = t('camera.disconnected')
        streamState.value = 'error'
      }
    }

    // Collect local ICE candidates
    const localCandidates: RTCIceCandidate[] = []
    pc.onicecandidate = (e) => { if (e.candidate) localCandidates.push(e.candidate) }

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    // Wait for ICE gathering (max 3s)
    await new Promise<void>((resolve) => {
      if (pc!.iceGatheringState === 'complete') { resolve(); return }
      pc!.onicegatheringstatechange = () => { if (pc!.iceGatheringState === 'complete') resolve() }
      setTimeout(resolve, 3000)
    })

    const sdpOffer = pc.localDescription!.sdp
    console.log('[Camera] Sending WebRTC offer to', props.config.entity_id)

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout: keine Antwort von HA')), 15000)

      unsubscribeWebRTC = client.subscribeWebRTC(
        props.config.entity_id,
        sdpOffer,
        async (msg) => {
          console.log('[Camera] WebRTC message:', msg)
          if (msg.type === 'answer' && msg.answer) {
            clearTimeout(timeout)
            await pc!.setRemoteDescription({ type: 'answer', sdp: msg.answer })
            resolve()
          } else if (msg.type === 'candidate' && msg.candidate) {
            await pc!.addIceCandidate(new RTCIceCandidate(msg.candidate))
          } else if (msg.type === 'error') {
            clearTimeout(timeout)
            reject(new Error((msg as any).message ?? 'WebRTC error from HA'))
          }
        },
      )
    })
  } catch (e: unknown) {
    console.error('[Camera] WebRTC error:', e)
    errorMsg.value = e instanceof Error ? e.message : t('camera.stream_unavailable')
    if (pc) { pc.close(); pc = null }
    if (videoEl.value) videoEl.value.srcObject = null
    streamState.value = 'error'
  }
}

function stopStream() {
  unsubscribeWebRTC?.(); unsubscribeWebRTC = null
  if (pc) { pc.close(); pc = null }
  if (videoEl.value) { videoEl.value.srcObject = null; videoEl.value.muted = true }
  muted.value = true
  streamState.value = 'idle'
  snapshotSrc.value = `/api/camera/${props.config.entity_id}?t=${Date.now()}`
}

onUnmounted(() => {
  unsubscribeWebRTC?.()
  if (pc) pc.close()
})
</script>
