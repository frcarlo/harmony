<template>
  <div class="h-100 d-flex flex-column">
    <div class="d-flex align-center ga-2 px-3 pt-3 pb-1">
      <v-icon icon="mdi-camera" size="14" color="medium-emphasis" />
      <span class="text-caption text-medium-emphasis text-truncate flex-grow-1">{{ name }}</span>
      <v-btn
        v-if="props.config.light_entity_id"
        :icon="lightOn ? 'mdi-lightbulb' : 'mdi-lightbulb-outline'"
        size="x-small" variant="text" density="compact"
        :color="lightOn ? 'warning' : undefined"
        :title="t('camera.toggle_light')"
        @click="toggleLight"
      />
      <template v-if="streamMode === 'mjpeg'">
        <v-btn
          :icon="mjpegPaused ? 'mdi-play' : 'mdi-pause'"
          size="x-small" variant="text" density="compact"
          :title="mjpegPaused ? t('camera.resume') : t('camera.pause')"
          @click="toggleMjpeg"
        />
      </template>
      <template v-if="streamState === 'playing' && streamMode === 'webrtc'">
        <v-btn
          :icon="muted ? 'mdi-volume-off' : 'mdi-volume-high'"
          size="x-small" variant="text" density="compact"
          :color="muted ? undefined : 'primary'"
          @click="toggleMute"
        />
      </template>
      <v-btn
        v-if="streamState !== 'idle' && streamMode === 'webrtc'"
        icon="mdi-stop"
        size="x-small" variant="text" density="compact"
        :title="t('camera.stop_stream')"
        @click="stopStream"
      />
      <v-btn
        icon="mdi-fullscreen"
        size="x-small" variant="text" density="compact"
        :title="t('camera.fullscreen')"
        @click="openFullscreen"
      />
    </div>

    <div class="flex-grow-1 position-relative overflow-hidden d-flex align-center justify-center"
      style="border-radius: 0 0 12px 12px; background: #000">

      <!-- MJPEG mode: browser handles the stream natively -->
      <template v-if="streamMode === 'mjpeg'">
        <img v-if="!mjpegError && !mjpegPaused" :src="mjpegSrc" :alt="name"
          class="w-100 h-100 position-absolute" style="object-fit: cover"
          @error="mjpegError = true" />
        <img v-else-if="snapshotSrc" :src="snapshotSrc" :alt="name"
          class="w-100 h-100 position-absolute" style="object-fit: cover; opacity: 0.5" />
        <div v-if="mjpegPaused" style="position: relative; z-index: 1">
          <v-btn icon="mdi-play-circle" size="large" variant="flat" color="primary" @click="toggleMjpeg" />
        </div>
        <div v-else-if="mjpegError" class="d-flex flex-column align-center ga-2 text-medium-emphasis text-body-2">
          <v-icon icon="mdi-camera-off" size="32" />
          <span class="text-caption text-center px-2">{{ t('camera.unavailable') }}</span>
          <v-btn size="x-small" variant="tonal" @click="retryMjpeg">{{ t('common.retry') }}</v-btn>
        </div>
      </template>

      <!-- Snapshot mode: periodically refreshed still image -->
      <template v-else-if="streamMode === 'snapshot'">
        <img v-if="snapshotSrc" :src="snapshotSrc" :alt="name"
          class="w-100 h-100 position-absolute" style="object-fit: cover" />
        <div v-else class="d-flex flex-column align-center ga-2 text-medium-emphasis">
          <v-progress-circular indeterminate color="primary" size="24" />
        </div>
      </template>

      <!-- WebRTC mode (default) -->
      <template v-else>
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

        <!-- Live video -->
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
      </template>
    </div>
  </div>

  <!-- Fullscreen dialog -->
  <v-dialog v-model="fullscreen" max-width="100vw" max-height="100vh" :scrim="true">
    <v-card color="black" rounded="0" class="d-flex flex-column" style="width:100vw;height:100vh">
      <div class="d-flex align-center px-3 py-2" style="background:rgba(0,0,0,0.7);position:absolute;top:0;left:0;right:0;z-index:2">
        <v-icon icon="mdi-camera" size="14" color="white" class="mr-2" />
        <span class="text-caption text-white flex-grow-1">{{ name }}</span>
        <v-btn
          v-if="props.config.light_entity_id"
          :icon="lightOn ? 'mdi-lightbulb' : 'mdi-lightbulb-outline'"
          size="x-small" variant="text" color="white"
          :style="lightOn ? 'color: #fb8c00 !important' : ''"
          @click="toggleLight"
        />
        <template v-if="streamMode === 'mjpeg'">
          <v-btn
            :icon="mjpegPaused ? 'mdi-play' : 'mdi-pause'"
            size="x-small" variant="text" color="white"
            @click="toggleMjpeg"
          />
        </template>
        <template v-if="streamMode === 'webrtc' && streamState === 'playing'">
          <v-btn
            :icon="muted ? 'mdi-volume-off' : 'mdi-volume-high'"
            size="x-small" variant="text" color="white"
            @click="toggleMute"
          />
        </template>
        <v-btn icon="mdi-fullscreen-exit" size="x-small" variant="text" color="white"
          @click="fullscreen = false" />
      </div>

      <div class="flex-grow-1 d-flex align-center justify-center" style="background:#000">
        <!-- MJPEG fullscreen -->
        <template v-if="streamMode === 'mjpeg'">
          <img v-if="!mjpegPaused" :src="mjpegSrc" :alt="name" style="max-width:100%;max-height:100%;object-fit:contain" />
          <div v-else class="d-flex flex-column align-center ga-2">
            <img v-if="snapshotSrc" :src="snapshotSrc" :alt="name" style="max-width:100%;max-height:100%;object-fit:contain;opacity:0.5" />
            <v-btn icon="mdi-play-circle" size="x-large" variant="flat" color="primary" style="position:absolute" @click="toggleMjpeg" />
          </div>
        </template>

        <!-- Snapshot fullscreen -->
        <template v-else-if="streamMode === 'snapshot'">
          <img v-if="snapshotSrc" :src="snapshotSrc" :alt="name"
            style="max-width:100%;max-height:100%;object-fit:contain" />
        </template>

        <!-- WebRTC fullscreen -->
        <template v-else>
          <template v-if="streamState === 'idle'">
            <img v-if="snapshotSrc" :src="snapshotSrc" :alt="name" style="max-width:100%;max-height:100%;object-fit:contain" />
            <v-btn icon="mdi-play-circle" size="x-large" variant="flat" color="primary"
              style="position:absolute" @click="startStream" />
          </template>
          <template v-else-if="streamState === 'waking'">
            <v-progress-circular indeterminate color="primary" size="48" />
          </template>
          <video ref="videoElFs"
            style="max-width:100%;max-height:100%;object-fit:contain"
            :style="{ display: streamState === 'playing' ? 'block' : 'none' }"
            autoplay playsinline />
          <div v-if="streamState === 'error'" class="d-flex flex-column align-center ga-3 text-white">
            <v-icon icon="mdi-camera-off" size="48" />
            <span class="text-body-2">{{ errorMsg }}</span>
            <v-btn variant="tonal" @click="startStream">{{ t('common.retry') }}</v-btn>
          </div>
        </template>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { CameraWidgetConfig } from '~/types/dashboard'

const { t } = useI18n()
const props = defineProps<{ config: CameraWidgetConfig }>()
const name = computed(() => props.config.name ?? props.config.entity_id)
const streamMode = computed(() => props.config.stream_type ?? 'webrtc')

type StreamState = 'idle' | 'waking' | 'playing' | 'error'
const streamState = ref<StreamState>('idle')
const videoEl = ref<HTMLVideoElement | null>(null)
const videoElFs = ref<HTMLVideoElement | null>(null)
const snapshotSrc = ref('')
const errorMsg = ref('')
const fullscreen = ref(false)

// MJPEG
const mjpegSrc = ref('')
const mjpegError = ref(false)
const mjpegPaused = ref(true)

function toggleMjpeg() {
  if (mjpegPaused.value) {
    mjpegPaused.value = false
    mjpegError.value = false
    mjpegSrc.value = `/api/camera/stream/${props.config.entity_id}?t=${Date.now()}`
  } else {
    snapshotSrc.value = `/api/camera/${props.config.entity_id}?t=${Date.now()}`
    mjpegPaused.value = true
  }
}

// Snapshot refresh
let snapshotTimer: ReturnType<typeof setInterval> | null = null

const client = useHAClient()
const entityStore = useEntityStore()

const lightOn = computed(() => {
  const id = props.config.light_entity_id
  if (!id) return false
  return entityStore.entities[id]?.state === 'on'
})

function toggleLight() {
  const id = props.config.light_entity_id
  if (!id) return
  const domain = id.split('.')[0]
  client.callService({ domain, service: lightOn.value ? 'turn_off' : 'turn_on', target: { entity_id: id } })
}

let pc: RTCPeerConnection | null = null
let unsubscribeWebRTC: (() => void) | null = null
const muted = ref(true)

function toggleMute() {
  muted.value = !muted.value
  if (videoEl.value) videoEl.value.muted = muted.value
  if (videoElFs.value) videoElFs.value.muted = muted.value
}

function openFullscreen() {
  fullscreen.value = true
  if (streamMode.value === 'webrtc') {
    nextTick(() => {
      if (videoElFs.value && videoEl.value?.srcObject) {
        videoElFs.value.srcObject = videoEl.value.srcObject
        videoElFs.value.muted = muted.value
        videoElFs.value.play().catch(() => {})
      }
    })
  }
}

function refreshSnapshot() {
  snapshotSrc.value = `/api/camera/${props.config.entity_id}?t=${Date.now()}`
}

function retryMjpeg() {
  mjpegError.value = false
  mjpegSrc.value = `/api/camera/stream/${props.config.entity_id}?t=${Date.now()}`
}

onMounted(() => {
  if (streamMode.value === 'mjpeg') {
    snapshotSrc.value = `/api/camera/${props.config.entity_id}?t=${Date.now()}`
  } else if (streamMode.value === 'snapshot') {
    const interval = (props.config.refresh_interval ?? 5) * 1000
    refreshSnapshot()
    snapshotTimer = setInterval(refreshSnapshot, interval)
  } else {
    snapshotSrc.value = `/api/camera/${props.config.entity_id}?t=${Date.now()}`
  }
})

onUnmounted(() => {
  if (snapshotTimer) { clearInterval(snapshotTimer); snapshotTimer = null }
  unsubscribeWebRTC?.()
  if (pc) pc.close()
})

async function startStream() {
  streamState.value = 'waking'
  errorMsg.value = t('camera.stream_unavailable')

  try {
    pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

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
          const existing = videoEl.value.srcObject as MediaStream
          stream.getTracks().forEach(t => { if (!existing.getTrackById(t.id)) existing.addTrack(t) })
        }
        videoEl.value.muted = true
        videoEl.value.play().catch(() => {})
      }
      if (videoElFs.value && fullscreen.value) {
        videoElFs.value.srcObject = videoEl.value?.srcObject ?? null
        videoElFs.value.muted = muted.value
        videoElFs.value.play().catch(() => {})
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

    const localCandidates: RTCIceCandidate[] = []
    pc.onicecandidate = (e) => { if (e.candidate) localCandidates.push(e.candidate) }

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

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
</script>
