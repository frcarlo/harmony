<template>
  <div class="music-page">
    <!-- Top bar -->
    <div class="mp-topbar">
      <v-btn icon="mdi-chevron-left" size="small" variant="text" class="mp-back-btn" to="/dashboard" />
      <v-menu v-if="allPlayers.length" :close-on-content-click="true" offset="8">
        <template #activator="{ props: mp }">
          <button class="mp-device-chip" v-bind="mp">
            <v-icon icon="mdi-speaker" size="13" />
            <span class="mp-device-chip__source">{{ currentSource ?? currentPlayerName }}</span>
            <v-icon icon="mdi-chevron-down" size="14" style="opacity:0.5" />
          </button>
        </template>
        <v-card min-width="280" rounded="lg" color="#1a1a28" border style="max-height:70vh;display:flex;flex-direction:column">
          <!-- Spotify Connect output devices -->
          <template v-if="sourceList.length">
            <div class="px-3 pt-3 pb-1 text-caption" style="color:#64748b;font-weight:600;letter-spacing:.05em">
              PLAY ON
            </div>
            <v-list density="compact" nav bg-color="transparent">
              <v-list-item
                v-for="src in sourceList" :key="src"
                :title="src"
                :active="currentSource === src"
                :prepend-icon="deviceIcon(src)"
                color="primary"
                rounded="lg"
                @click="selectSource(src)"
              />
            </v-list>
            <v-divider class="my-1" />
          </template>

          <!-- HA Player section with filter -->
          <div class="px-3 pt-2 pb-1 text-caption" style="color:#64748b;font-weight:600;letter-spacing:.05em">
            HA PLAYER
          </div>
          <!-- Filter badges -->
          <div class="mp-player-filters px-2 pb-2">
            <button
              v-for="f in playerFilterOptions"
              :key="f.key"
              class="mp-player-filter"
              :class="{ active: playerFilter === f.key }"
              @click.stop="playerFilter = f.key"
            >
              <v-icon :icon="f.icon" size="11" />
              {{ f.label }}
            </button>
          </div>

          <div style="overflow-y:auto;flex:1">
            <v-list density="compact" nav bg-color="transparent">
              <v-list-item
                v-for="p in filteredPlayers" :key="p.entity_id"
                :title="p.state.attributes?.friendly_name as string ?? p.entity_id"
                :subtitle="playerIntegration(p.entity_id)"
                :active="activeEntityId === p.entity_id"
                :prepend-icon="playerIcon(p.entity_id)"
                color="primary"
                rounded="lg"
                @click="activeEntityId = p.entity_id"
              />
              <v-list-item v-if="!filteredPlayers.length" title="No players" disabled />
            </v-list>
          </div>
        </v-card>
      </v-menu>
      <button v-if="smAndDown" class="mp-sidebar-toggle" @click="sidebarOpen = !sidebarOpen">
        <v-icon icon="mdi-bookshelf" size="18" />
      </button>
    </div>

    <!-- Body: sidebar + main -->
    <div class="mp-body">
      <div v-if="smAndDown && sidebarOpen" class="mp-sidebar-mask" @click="sidebarOpen = false" />

      <!-- Sidebar -->
      <aside class="mp-sidebar" :class="{ 'mp-sidebar--open': sidebarOpen || !smAndDown }">
        <nav class="mp-nav">
          <button class="mp-nav-btn" :class="{ active: view === 'home' }" @click="goHome">
            <v-icon icon="mdi-home-outline" size="17" />
            <span>Home</span>
          </button>
          <button class="mp-nav-btn" :class="{ active: view === 'search' }" @click="goSearch">
            <v-icon icon="mdi-magnify" size="17" />
            <span>Search</span>
          </button>
        </nav>

        <div class="mp-library">
          <div class="mp-library-hdr">
            <v-icon icon="mdi-bookshelf" size="14" />
            <span>Your Library</span>
            <span class="mp-library-hdr__count">{{ libraryItems.length }}</span>
          </div>

          <!-- Filter badges -->
          <div v-if="availableFilters.length > 1" class="mp-lib-filters">
            <button
              v-for="f in availableFilters"
              :key="f.key"
              class="mp-lib-filter"
              :class="{ active: libraryFilter === f.key }"
              @click="libraryFilter = f.key"
            >
              <v-icon v-if="f.key === 'spotify'" icon="mdi-spotify" size="12" />
              <v-icon v-else-if="f.key === 'music_assistant'" icon="mdi-music-circle" size="12" />
              {{ f.label }}
            </button>
          </div>

          <div v-if="libraryLoading" class="mp-center py-4">
            <v-progress-circular indeterminate size="18" color="primary" />
          </div>
          <div v-else-if="!allLibraryItems.length" class="mp-lib-empty">
            No playlists found
          </div>
          <button
            v-for="item in libraryItems"
            :key="item.id"
            class="mp-lib-item"
            :class="{ active: view === 'playlist' && activePlaylistId === item.id }"
            @click="openPlaylist(item)"
          >
            <div class="mp-lib-item__art" :class="`mp-lib-item__art--${item.source}`">
              <img v-if="item.thumbnail" :src="item.thumbnail" alt="" loading="lazy" />
              <v-icon v-else icon="mdi-music-note" size="16" />
            </div>
            <div class="mp-lib-item__text">
              <div class="mp-lib-item__name">{{ item.title }}</div>
              <div class="mp-lib-item__sub">
                <v-icon :icon="item.source === 'spotify' ? 'mdi-spotify' : 'mdi-music-circle'" size="10" />
                {{ item.source === 'spotify' ? 'Spotify' : 'Music Assistant' }}
              </div>
            </div>
          </button>
        </div>
      </aside>

      <!-- Main -->
      <main ref="mainEl" class="mp-main">
        <div class="mp-main-gradient" :style="gradientStyle" />
        <div class="mp-main-scroll">

          <!-- HOME VIEW -->
          <template v-if="view === 'home'">
            <h2 class="mp-greeting">Good {{ timeGreeting }}</h2>

            <!-- Quick grid: top playlists -->
            <div v-if="quickItems.length" class="mp-quick-grid">
              <button
                v-for="item in quickItems"
                :key="item.id"
                class="mp-quick-item"
                @click="openPlaylist(item)"
              >
                <div class="mp-quick-item__art">
                  <img v-if="item.thumbnail" :src="item.thumbnail" alt="" loading="lazy" />
                  <v-icon v-else icon="mdi-music-note" size="20" />
                </div>
                <span class="mp-quick-item__name">{{ item.title }}</span>
              </button>
            </div>

            <!-- Recently played (MA) -->
            <div v-if="recentItems.length" class="mp-section">
              <div class="mp-section-hdr">Recently Played</div>
              <div class="mp-card-row">
                <button
                  v-for="item in recentItems"
                  :key="item.uri"
                  class="mp-card"
                  @click="playMAItem(item)"
                >
                  <div class="mp-card__art">
                    <img v-if="maImageUrl(item)" :src="maImageUrl(item)" alt="" loading="lazy" />
                    <v-icon v-else icon="mdi-music" size="28" />
                    <div class="mp-card__overlay"><v-icon icon="mdi-play-circle" size="36" /></div>
                  </div>
                  <div class="mp-card__name">{{ item.name }}</div>
                  <div class="mp-card__sub">{{ item.artists?.[0]?.name ?? item.album?.name ?? '' }}</div>
                </button>
              </div>
            </div>

            <!-- Library sections -->
            <div v-for="section in librarySections" :key="section.key" class="mp-section">
              <div class="mp-section-hdr">{{ section.label }}</div>
              <div class="mp-card-row">
                <button
                  v-for="item in section.items"
                  :key="item.media_content_id"
                  class="mp-card"
                  :class="{ 'mp-card--circle': section.key.includes('artist') }"
                  @click="item.can_expand ? openPlaylist({ id: item.media_content_id, title: item.title, thumbnail: item.thumbnail ?? undefined, source: 'spotify', browseNode: item }) : playBrowseItem(item)"
                >
                  <div class="mp-card__art" :class="{ 'mp-card__art--circle': section.key.includes('artist') }">
                    <img v-if="item.thumbnail" :src="item.thumbnail" alt="" loading="lazy" />
                    <v-icon v-else icon="mdi-music" size="28" />
                    <div class="mp-card__overlay"><v-icon icon="mdi-play-circle" size="36" /></div>
                  </div>
                  <div class="mp-card__name">{{ item.title }}</div>
                  <div class="mp-card__sub">{{ spotifyItemSub(item) }}</div>
                </button>
              </div>
            </div>

            <div v-if="!libraryLoading && !librarySections.length && !recentItems.length" class="mp-placeholder">
              <v-icon icon="mdi-music-circle-outline" size="56" />
              <p>No Spotify or Music Assistant data available</p>
            </div>
          </template>

          <!-- SEARCH VIEW -->
          <template v-else-if="view === 'search'">
            <div class="mp-search-bar">
              <div class="mp-search-input-wrap">
                <v-icon icon="mdi-magnify" size="18" class="mp-search-icon" />
                <input
                  ref="searchInputEl"
                  v-model="searchQuery"
                  class="mp-search-input"
                  placeholder="What do you want to play?"
                  @keyup.enter="doSearch"
                />
                <button v-if="searchQuery" class="mp-search-clear" @click="searchQuery = ''; searchResults = null">
                  <v-icon icon="mdi-close" size="16" />
                </button>
              </div>
              <button class="mp-search-go" :disabled="!searchQuery.trim()" @click="doSearch">
                Search
              </button>
            </div>

            <div v-if="searchLoading" class="mp-center py-8">
              <v-progress-circular indeterminate size="32" color="primary" />
            </div>
            <template v-else-if="searchResults">
              <template v-for="section in searchSections" :key="section.key">
                <div class="mp-section">
                  <div class="mp-section-hdr">{{ section.label }}</div>
                  <div v-if="section.key === 'tracks'" class="mp-track-list">
                    <button
                      v-for="(item, idx) in section.items.slice(0, 10)"
                      :key="item.uri"
                      class="mp-track"
                      @click="playMAItem(item)"
                    >
                      <span class="mp-track__num">{{ idx + 1 }}</span>
                      <div class="mp-track__art">
                        <img v-if="maImageUrl(item)" :src="maImageUrl(item)" alt="" loading="lazy" />
                        <v-icon v-else icon="mdi-music-note" size="14" />
                      </div>
                      <div class="mp-track__info">
                        <div class="mp-track__title">{{ item.name }}</div>
                        <div class="mp-track__sub">{{ item.artists?.[0]?.name ?? '' }}</div>
                      </div>
                      <span class="mp-track__dur">{{ formatTime(item.duration ?? 0) }}</span>
                    </button>
                  </div>
                  <div v-else class="mp-card-row">
                    <button
                      v-for="item in section.items.slice(0, 8)"
                      :key="item.uri"
                      class="mp-card"
                      :class="{ 'mp-card--circle': section.key === 'artists' }"
                      @click="playMAItem(item)"
                    >
                      <div class="mp-card__art" :class="{ 'mp-card__art--circle': section.key === 'artists' }">
                        <img v-if="maImageUrl(item)" :src="maImageUrl(item)" alt="" loading="lazy" />
                        <v-icon v-else icon="mdi-music" size="28" />
                        <div class="mp-card__overlay"><v-icon icon="mdi-play-circle" size="36" /></div>
                      </div>
                      <div class="mp-card__name">{{ item.name }}</div>
                      <div class="mp-card__sub">{{ item.artists?.[0]?.name ?? '' }}</div>
                    </button>
                  </div>
                </div>
              </template>
            </template>
            <div v-else class="mp-placeholder">
              <v-icon icon="mdi-magnify" size="56" />
              <p>Search for songs, albums, artists, playlists</p>
            </div>
          </template>

          <!-- PLAYLIST VIEW -->
          <template v-else-if="view === 'playlist' && activePlaylist">
            <div class="mp-pl-hero">
              <div class="mp-pl-hero__art">
                <img v-if="activePlaylist.thumbnail" :src="activePlaylist.thumbnail" alt="" />
                <v-icon v-else icon="mdi-music-note" size="56" />
              </div>
              <div class="mp-pl-hero__info">
                <div class="mp-pl-hero__type">PLAYLIST</div>
                <h1 class="mp-pl-hero__title">{{ activePlaylist.title }}</h1>
                <div v-if="tracks.length" class="mp-pl-hero__meta">{{ tracks.length }} tracks</div>
              </div>
            </div>

            <div class="mp-pl-actions">
              <button class="mp-play-btn" @click="playLibraryItem(activePlaylist)">
                <v-icon icon="mdi-play" size="24" />
              </button>
              <button class="mp-action-btn" title="Shuffle play" @click="shufflePlay">
                <v-icon icon="mdi-shuffle" size="18" />
              </button>
              <span v-if="activePlaylist" class="mp-pl-source-badge" :class="`mp-pl-source-badge--${activePlaylist.source}`">
                <v-icon :icon="activePlaylist.source === 'spotify' ? 'mdi-spotify' : 'mdi-music-circle'" size="13" />
                {{ activePlaylist.source === 'spotify' ? 'Spotify' : 'Music Assistant' }}
              </span>
            </div>

            <div v-if="tracksLoading" class="mp-center py-6">
              <v-progress-circular indeterminate size="28" color="primary" />
            </div>
            <div v-else class="mp-track-list mp-track-list--pl">
              <div class="mp-track mp-track--header">
                <span class="mp-track__num">#</span>
                <div class="mp-track__art" />
                <div class="mp-track__info">Title</div>
                <span class="mp-track__dur"><v-icon icon="mdi-clock-outline" size="14" /></span>
              </div>
              <button
                v-for="(track, idx) in tracks"
                :key="track.media_content_id"
                class="mp-track"
                :class="{ 'mp-track--active': isCurrentBrowseTrack(track) }"
                @click="playBrowseItem(track)"
              >
                <span v-if="!isCurrentBrowseTrack(track)" class="mp-track__num">{{ idx + 1 }}</span>
                <v-icon v-else icon="mdi-volume-high" size="14" class="mp-track__playing" />
                <div class="mp-track__art">
                  <img v-if="track.thumbnail" :src="track.thumbnail" alt="" loading="lazy" />
                  <v-icon v-else icon="mdi-music-note" size="13" />
                </div>
                <div class="mp-track__info">
                  <div class="mp-track__title" :class="{ 'text-primary': isCurrentBrowseTrack(track) }">{{ track.title }}</div>
                </div>
              </button>
            </div>
          </template>

        </div>
      </main>

      <!-- Lyrics panel -->
      <transition name="mp-lyrics-slide">
        <aside v-if="showLyrics" class="mp-lyrics-panel">
          <div class="mp-lyrics-header">
            <div class="mp-lyrics-track">
              <div class="mp-lyrics-title">{{ title ?? '—' }}</div>
              <div class="mp-lyrics-artist">{{ artist ?? '' }}</div>
            </div>
            <button class="mp-lyrics-close" title="Close lyrics" @click="showLyrics = false">
              <v-icon icon="mdi-close" size="18" />
            </button>
          </div>

          <div v-if="lyricsLoading" class="mp-lyrics-center">
            <v-progress-circular indeterminate size="24" color="primary" />
          </div>
          <div v-else-if="syncedLyrics.length" ref="lyricsEl" class="mp-lyrics-scroll">
            <div class="mp-lyrics-spacer" />
            <div
              v-for="(line, i) in syncedLyrics"
              :key="i"
              class="mp-lyric-line"
              :class="{
                'mp-lyric-line--active': i === currentLyricIdx,
                'mp-lyric-line--past': i < currentLyricIdx,
                'mp-lyric-line--next': i > currentLyricIdx,
              }"
              @click="seekTo(line.time)"
            >
              {{ line.text }}
            </div>
            <div class="mp-lyrics-spacer" />
          </div>
          <div v-else-if="plainLyrics" class="mp-lyrics-plain">
            {{ plainLyrics }}
          </div>
          <div v-else class="mp-lyrics-center mp-lyrics-empty">
            <v-icon icon="mdi-music-note-off" size="40" style="opacity:0.25" />
            <p>No lyrics found</p>
          </div>

          <div class="mp-lyrics-footer">
            <span>Lyrics by</span>
            <a href="https://lrclib.net" target="_blank" rel="noopener">LRCLIB</a>
          </div>
        </aside>
      </transition>
    </div>

    <!-- Bottom player bar -->
    <div class="mp-player" :class="{ 'mp-player--idle': !title }">
      <!-- Track info -->
      <div class="mp-player__track">
        <div class="mp-player__art">
          <img v-if="albumArt" :src="`/api/ha-image?path=${encodeURIComponent(albumArt)}`" alt="" />
          <v-icon v-else icon="mdi-music-note" size="18" style="opacity:0.25" />
        </div>
        <div class="mp-player__meta">
          <div class="mp-player__title">{{ title ?? '—' }}</div>
          <div class="mp-player__artist">{{ artist ?? '' }}</div>
        </div>
      </div>

      <!-- Controls + progress -->
      <div class="mp-player__center">
        <div class="mp-ctrl-row">
          <button
            class="mp-ctrl"
            :class="{ 'mp-ctrl--on': shuffle }"
            :disabled="!hasPlayer"
            title="Shuffle"
            @click="toggleShuffle"
          >
            <v-icon icon="mdi-shuffle" size="16" />
          </button>
          <button class="mp-ctrl" :disabled="!hasPlayer" @click="command('media_previous_track')">
            <v-icon icon="mdi-skip-previous" size="22" />
          </button>
          <button class="mp-ctrl mp-ctrl--play" :disabled="!hasPlayer" @click="command(isPlaying ? 'media_pause' : 'media_play')">
            <v-icon :icon="isPlaying ? 'mdi-pause' : 'mdi-play'" size="22" />
          </button>
          <button class="mp-ctrl" :disabled="!hasPlayer" @click="command('media_next_track')">
            <v-icon icon="mdi-skip-next" size="22" />
          </button>
          <button
            class="mp-ctrl"
            :class="{ 'mp-ctrl--on': repeatMode !== 'off' }"
            :disabled="!hasPlayer"
            title="Repeat"
            @click="cycleRepeat"
          >
            <v-icon :icon="repeatMode === 'one' ? 'mdi-repeat-once' : 'mdi-repeat'" size="16" />
          </button>
        </div>
        <div class="mp-progress" @click="seekFromClick">
          <span class="mp-progress__time">{{ formatTime(displayPosition) }}</span>
          <div ref="progressBarEl" class="mp-progress__track">
            <div class="mp-progress__fill" :style="{ width: progressPct + '%' }" />
            <div class="mp-progress__thumb" :style="{ left: progressPct + '%' }" />
          </div>
          <span class="mp-progress__time">{{ formatTime(duration) }}</span>
        </div>
      </div>

      <!-- Volume + Connect -->
      <div class="mp-player__vol">
        <!-- Lyrics toggle -->
        <button
          class="mp-ctrl mp-ctrl--lyrics"
          :class="{ 'mp-ctrl--on': showLyrics }"
          title="Show lyrics"
          @click="showLyrics = !showLyrics"
        >
          <v-icon icon="mdi-microphone-variant" size="16" />
        </button>

        <!-- Connect to device -->
        <v-menu :close-on-content-click="true" location="top" offset="12">
          <template #activator="{ props: cp }">
            <button
              class="mp-ctrl mp-ctrl--connect"
              :class="{ 'mp-ctrl--on': currentSource }"
              title="Connect to a device"
              v-bind="cp"
            >
              <v-icon icon="mdi-cast-audio" size="18" />
            </button>
          </template>
          <v-card min-width="260" rounded="lg" color="#1a1a28" border>
            <div class="px-3 pt-3 pb-1 text-caption" style="color:#64748b;font-weight:600;letter-spacing:.05em">
              CONNECT TO A DEVICE
            </div>
            <!-- Current device -->
            <div v-if="currentSource" class="mp-connect-current px-3 py-2">
              <v-icon :icon="deviceIcon(currentSource)" size="16" color="primary" />
              <div>
                <div class="mp-connect-current__name">{{ currentSource }}</div>
                <div class="mp-connect-current__label">Currently playing</div>
              </div>
            </div>
            <v-divider v-if="currentSource && sourceList.length > 1" class="my-1" />
            <!-- Other devices -->
            <v-list density="compact" nav bg-color="transparent">
              <v-list-item
                v-for="src in sourceList.filter(s => s !== currentSource)"
                :key="src"
                :title="src"
                :prepend-icon="deviceIcon(src)"
                rounded="lg"
                @click="selectSource(src)"
              />
            </v-list>
            <!-- MA players as transfer targets (deduplicated by name) -->
            <template v-if="maTransferTargets.length">
              <v-divider class="my-1" />
              <div class="px-3 pb-1 text-caption" style="color:#64748b;font-weight:600;letter-spacing:.05em">
                MUSIC ASSISTANT
              </div>
              <v-list density="compact" nav bg-color="transparent">
                <v-list-item
                  v-for="p in maTransferTargets"
                  :key="p.entity_id"
                  :title="p.state.attributes?.friendly_name as string ?? p.entity_id"
                  :active="activeEntityId === p.entity_id"
                  :prepend-icon="playerIcon(p.entity_id)"
                  color="primary"
                  rounded="lg"
                  @click="transferToMAPlayer(p.entity_id)"
                />
              </v-list>
            </template>
          </v-card>
        </v-menu>

        <button class="mp-vol-icon" @click="toggleMute">
          <v-icon
            :icon="(volume ?? 0) > 0.5 ? 'mdi-volume-high' : (volume ?? 0) > 0 ? 'mdi-volume-medium' : 'mdi-volume-off'"
            size="16"
          />
        </button>
        <div ref="volBarEl" class="mp-vol-track" @click="setVolFromClick">
          <div class="mp-vol-fill" :style="{ width: Math.round((volume ?? 0) * 100) + '%' }" />
          <div class="mp-vol-thumb" :style="{ left: Math.round((volume ?? 0) * 100) + '%' }" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify'
import type { BrowseMediaNode, HAState } from '~/types/ha'
import type { MAItem, MASearchResult } from '~/composables/useMAClient'

const { smAndDown } = useDisplay()
const client = useHAClient()
const entityStore = useEntityStore()
const { search, getRecentlyPlayed, getLibraryItems, maImageUrl, checkStatus, getPlayers, playViaMA, isAvailable } = useMAClient()

// ── Player entities ────────────────────────────────────────────
const allPlayers = computed(() => {
  const raw = Object.entries(entityStore.entities)
    .filter(([id]) => id.startsWith('media_player.'))
    .map(([entity_id, state]) => ({ entity_id, state: state as HAState }))

  // Deduplicate: if an MA player has the same friendly_name as a non-MA player, keep only MA
  const maNames = new Set(
    raw
      .filter(p => entityStore.entityPlatformMap[p.entity_id] === 'music_assistant')
      .map(p => p.state.attributes?.friendly_name as string | undefined)
      .filter(Boolean)
  )

  return raw
    .filter(p => {
      const platform = entityStore.entityPlatformMap[p.entity_id]
      if (platform === 'music_assistant') return true
      if (p.entity_id.includes('spotify')) return true
      // hide non-MA, non-Spotify players whose name is covered by an MA entity
      const name = p.state.attributes?.friendly_name as string | undefined
      return !name || !maNames.has(name)
    })
    .sort((a, b) => {
      const score = (p: typeof a) =>
        p.entity_id.includes('spotify') ? 0
          : entityStore.entityPlatformMap[p.entity_id] === 'music_assistant' ? 1 : 2
      return score(a) - score(b)
    })
})

type PlayerFilter = 'all' | 'spotify' | 'music_assistant'
const playerFilter = ref<PlayerFilter>('all')

const playerFilterOptions = computed(() => {
  const platforms = new Set(allPlayers.value.map(p =>
    p.entity_id.includes('spotify') ? 'spotify'
      : entityStore.entityPlatformMap[p.entity_id] === 'music_assistant' ? 'music_assistant'
        : 'other'
  ))
  return [
    { key: 'all' as PlayerFilter, label: 'All', icon: 'mdi-speaker-multiple' },
    ...(platforms.has('spotify') ? [{ key: 'spotify' as PlayerFilter, label: 'Spotify', icon: 'mdi-spotify' }] : []),
    ...(platforms.has('music_assistant') ? [{ key: 'music_assistant' as PlayerFilter, label: 'MA', icon: 'mdi-music-circle' }] : []),
  ]
})

const filteredPlayers = computed(() => {
  if (playerFilter.value === 'all') return allPlayers.value
  if (playerFilter.value === 'spotify') return allPlayers.value.filter(p => p.entity_id.includes('spotify'))
  return allPlayers.value.filter(p => entityStore.entityPlatformMap[p.entity_id] === 'music_assistant')
})

// Deduplicated MA players for the "Connect to a device" popup
const maTransferTargets = computed(() => {
  const seen = new Set<string>()
  return allPlayers.value
    .filter(p => entityStore.entityPlatformMap[p.entity_id] === 'music_assistant')
    .filter(p => {
      const name = (p.state.attributes?.friendly_name as string | undefined) ?? p.entity_id
      if (seen.has(name)) return false
      seen.add(name)
      return true
    })
})

const activeEntityId = ref('')

watch(allPlayers, (players) => {
  if (!activeEntityId.value && players.length) {
    activeEntityId.value = players[0].entity_id
  }
}, { immediate: true })

// Always points to the first available Spotify entity — used for library browsing
// regardless of which player is currently active for playback
const spotifyEntityId = computed(() =>
  allPlayers.value.find(p => p.entity_id.includes('spotify'))?.entity_id ?? ''
)

const entity = computed(() => activeEntityId.value ? entityStore.entities[activeEntityId.value] : undefined)
const currentPlayerName = computed(() => (entity.value?.attributes?.friendly_name as string | undefined) ?? activeEntityId.value)
const hasPlayer = computed(() => !!entity.value && entity.value.state !== 'unavailable')

// ── Player state ───────────────────────────────────────────────
const state = computed(() => entity.value?.state ?? 'unavailable')
const isPlaying = computed(() => state.value === 'playing')
const title = computed(() => entity.value?.attributes?.media_title as string | undefined)
const artist = computed(() => entity.value?.attributes?.media_artist as string | undefined)
const albumArt = computed(() => entity.value?.attributes?.entity_picture as string | undefined)
const volume = computed(() => entity.value?.attributes?.volume_level as number | undefined)
const shuffle = computed(() => entity.value?.attributes?.shuffle as boolean | undefined)
const repeatMode = computed(() => (entity.value?.attributes?.repeat as string | undefined) ?? 'off')
const duration = computed(() => (entity.value?.attributes?.media_duration as number | undefined) ?? 0)

// ── Spotify Connect device selection ──────────────────────────
const currentSource = computed(() => entity.value?.attributes?.source as string | undefined)
const sourceList = computed(() => (entity.value?.attributes?.source_list as string[] | undefined) ?? [])

async function selectSource(source: string) {
  await command('select_source', { source })
}

async function transferToMAPlayer(targetEntityId: string) {
  // Transfer current queue to a different MA player
  // First switch active entity, then resume play
  const wasPlaying = isPlaying.value
  activeEntityId.value = targetEntityId
  if (wasPlaying) {
    await nextTick()
    await command('media_play')
  }
}

function playerIntegration(entityId: string): string {
  const platform = entityStore.entityPlatformMap[entityId]
  if (!platform) return entityId
  const labels: Record<string, string> = {
    spotify: 'Spotify',
    music_assistant: 'Music Assistant',
    cast: 'Google Cast',
    sonos: 'Sonos',
    apple_tv: 'Apple TV',
    kodi: 'Kodi',
    plex: 'Plex',
    squeezebox: 'Squeezebox',
    vlc_telnet: 'VLC',
  }
  return labels[platform] ?? platform
}

function playerIcon(entityId: string): string {
  const platform = entityStore.entityPlatformMap[entityId]
  if (platform === 'spotify' || entityId.includes('spotify')) return 'mdi-spotify'
  if (platform === 'music_assistant') return 'mdi-music-circle'
  if (platform === 'cast') return 'mdi-cast'
  if (platform === 'sonos') return 'mdi-speaker-wireless'
  if (platform === 'apple_tv') return 'mdi-apple'
  if (platform === 'kodi') return 'mdi-kodi'
  if (platform === 'plex') return 'mdi-plex'
  return 'mdi-speaker'
}

function deviceIcon(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('phone') || n.includes('mobile') || n.includes('iphone') || n.includes('android')) return 'mdi-cellphone'
  if (n.includes('tablet') || n.includes('ipad')) return 'mdi-tablet'
  if (n.includes('tv') || n.includes('television') || n.includes('fire')) return 'mdi-television-play'
  if (n.includes('speaker') || n.includes('sonos') || n.includes('echo') || n.includes('alexa') || n.includes('homepod') || n.includes('nest')) return 'mdi-speaker'
  if (n.includes('computer') || n.includes('mac') || n.includes('windows') || n.includes('linux') || n.includes('pc')) return 'mdi-monitor'
  if (n.includes('web') || n.includes('browser')) return 'mdi-web'
  if (n.includes('cast')) return 'mdi-cast'
  return 'mdi-speaker-wireless'
}

// ── Live position ──────────────────────────────────────────────
const tick = ref(0)
let posTimer: ReturnType<typeof setInterval> | null = null

const displayPosition = computed(() => {
  void tick.value
  const attrs = entity.value?.attributes
  if (!attrs) return 0
  const pos = (attrs.media_position as number) ?? 0
  const updatedAt = attrs.media_position_updated_at as string | undefined
  if (!isPlaying.value || !updatedAt) return pos
  return pos + (Date.now() - new Date(updatedAt).getTime()) / 1000
})

const progressPct = computed(() => {
  if (!duration.value) return 0
  return Math.min(100, (displayPosition.value / duration.value) * 100)
})

watch(isPlaying, (playing) => {
  if (posTimer) { clearInterval(posTimer); posTimer = null }
  if (playing) posTimer = setInterval(() => tick.value++, 1000)
}, { immediate: true })

onUnmounted(() => { if (posTimer) clearInterval(posTimer) })

// ── Controls ───────────────────────────────────────────────────
async function command(service: string, data?: Record<string, unknown>) {
  if (!activeEntityId.value) return
  await client.callService({
    domain: 'media_player',
    service,
    target: { entity_id: activeEntityId.value },
    service_data: data,
  })
}

async function toggleShuffle() { await command('shuffle_set', { shuffle: !shuffle.value }) }

async function cycleRepeat() {
  const next = repeatMode.value === 'off' ? 'all' : repeatMode.value === 'all' ? 'one' : 'off'
  await command('repeat_set', { repeat: next })
}

let prevVol = 0.5
async function toggleMute() {
  if ((volume.value ?? 0) > 0) { prevVol = volume.value!; await command('volume_set', { volume_level: 0 }) }
  else await command('volume_set', { volume_level: prevVol })
}

const progressBarEl = ref<HTMLElement | null>(null)
const volBarEl = ref<HTMLElement | null>(null)

function seekFromClick(e: MouseEvent) {
  if (!progressBarEl.value || !duration.value) return
  const rect = progressBarEl.value.getBoundingClientRect()
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  command('media_seek', { seek_position: pct * duration.value })
}

function setVolFromClick(e: MouseEvent) {
  if (!volBarEl.value) return
  const rect = volBarEl.value.getBoundingClientRect()
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  command('volume_set', { volume_level: pct })
}

// ── Navigation ─────────────────────────────────────────────────
type View = 'home' | 'playlist' | 'search'
const view = ref<View>('home')
const sidebarOpen = ref(false)
const mainEl = ref<HTMLElement | null>(null)
const searchInputEl = ref<HTMLInputElement | null>(null)

function goHome() { view.value = 'home'; sidebarOpen.value = false }
function goSearch() {
  view.value = 'search'
  sidebarOpen.value = false
  nextTick(() => searchInputEl.value?.focus())
}

// ── Library — unified across Spotify + MA ─────────────────────
interface LibraryItem {
  id: string
  title: string
  thumbnail?: string
  source: 'spotify' | 'music_assistant'
  browseNode?: BrowseMediaNode
  maItem?: MAItem
}

type LibraryFilter = 'all' | 'spotify' | 'music_assistant'
const libraryFilter = ref<LibraryFilter>('all')
const libraryLoading = ref(false)
const allLibraryItems = ref<LibraryItem[]>([])

const availableFilters = computed(() => {
  const sources = new Set(allLibraryItems.value.map(i => i.source))
  return [
    { key: 'all' as LibraryFilter, label: 'All' },
    ...(sources.has('spotify') ? [{ key: 'spotify' as LibraryFilter, label: 'Spotify' }] : []),
    ...(sources.has('music_assistant') ? [{ key: 'music_assistant' as LibraryFilter, label: 'MA' }] : []),
  ]
})

const libraryItems = computed(() =>
  libraryFilter.value === 'all'
    ? allLibraryItems.value
    : allLibraryItems.value.filter(i => i.source === libraryFilter.value)
)

const librarySections = ref<Array<{ key: string; label: string; items: BrowseMediaNode[] }>>([])

const CATEGORY_LABELS: Record<string, string> = {
  current_user_playlists: 'Playlists',
  current_user_followed_artists: 'Artists you follow',
  current_user_saved_albums: 'Your Albums',
  current_user_saved_tracks: 'Liked Songs',
  current_user_recently_played: 'Recently Played on Spotify',
  current_user_top_artists: 'Your Top Artists',
  current_user_top_tracks: 'Your Top Tracks',
}

async function browseSpotify(entityId: string, contentType?: string, contentId?: string): Promise<BrowseMediaNode> {
  const response = await client.callServiceWithResponse<Record<string, BrowseMediaNode>>({
    domain: 'media_player',
    service: 'browse_media',
    target: { entity_id: entityId },
    service_data: {
      ...(contentType ? { media_content_type: contentType } : {}),
      ...(contentId ? { media_content_id: contentId } : {}),
    },
  })
  const node = response?.[entityId]
  if (!node) throw new Error('Browse failed')
  return node
}

async function loadLibrary() {
  libraryLoading.value = true
  const items: LibraryItem[] = []

  await Promise.allSettled([
    // Spotify playlists — always browse via the Spotify entity, not the active playback entity
    (async () => {
      const sId = spotifyEntityId.value
      if (!sId) return
      const root = await browseSpotify(sId)
      const categories = (root.children ?? []).filter(c => c.media_content_id in CATEGORY_LABELS)

      const playlistCat = categories.find(c => c.media_content_id === 'current_user_playlists')
      if (playlistCat) {
        const node = await browseSpotify(sId, playlistCat.media_content_type, playlistCat.media_content_id)
        for (const n of (node.children ?? [])) {
          items.push({ id: n.media_content_id, title: n.title, thumbnail: n.thumbnail ?? undefined, source: 'spotify', browseNode: n })
        }
      }

      const sections = await Promise.all(
        categories.map(async (cat) => {
          const node = await browseSpotify(sId, cat.media_content_type, cat.media_content_id)
          return { key: cat.media_content_id, label: CATEGORY_LABELS[cat.media_content_id]!, items: (node.children ?? []).slice(0, 12) }
        })
      )
      librarySections.value = sections.filter(s => s.items.length)
    })(),

    // Music Assistant playlists
    (async () => {
      if (!isAvailable.value) return
      const maPlaylists = await getLibraryItems('playlist')
      for (const p of maPlaylists) {
        if (!items.find(i => i.title === p.name)) {
          items.push({ id: `ma:${p.item_id}`, title: p.name, thumbnail: maImageUrl(p), source: 'music_assistant', maItem: p })
        }
      }
    })(),
  ])

  allLibraryItems.value = items
  libraryLoading.value = false
}

const quickItems = computed(() => allLibraryItems.value.filter(i => i.source === 'spotify').slice(0, 6))

// Reload library when Spotify player becomes available, not when playback entity changes
watch(spotifyEntityId, (id) => { if (id) loadLibrary() }, { immediate: true })
watch(isAvailable, (v) => { if (v) loadLibrary() })

// ── Playlist view ──────────────────────────────────────────────
const activePlaylist = ref<LibraryItem | null>(null)
const activePlaylistId = computed(() => activePlaylist.value?.id ?? '')
const tracks = ref<BrowseMediaNode[]>([])
const tracksLoading = ref(false)

async function openPlaylist(item: LibraryItem) {
  view.value = 'playlist'
  sidebarOpen.value = false
  activePlaylist.value = item
  tracks.value = []
  tracksLoading.value = true
  mainEl.value?.scrollTo({ top: 0, behavior: 'smooth' })
  try {
    if (item.source === 'spotify' && item.browseNode) {
      const sId = spotifyEntityId.value || activeEntityId.value
      const node = await browseSpotify(sId, item.browseNode.media_content_type, item.browseNode.media_content_id)
      tracks.value = (node.children ?? []).filter(t => t.can_play)
    } else if (item.source === 'music_assistant' && item.maItem) {
      // MA: play directly (no track-level browse in this flow)
      tracks.value = []
    }
  } catch { /* ignore */ }
  finally { tracksLoading.value = false }
}

function isCurrentBrowseTrack(track: BrowseMediaNode): boolean {
  return !!title.value && track.title.toLowerCase() === title.value.toLowerCase()
}

async function shufflePlay() {
  await command('shuffle_set', { shuffle: true })
  if (activePlaylist.value) await playLibraryItem(activePlaylist.value)
}

async function playLibraryItem(item: LibraryItem | null) {
  if (!item) return
  if (item.source === 'spotify' && item.browseNode) await playBrowseItem(item.browseNode)
  else if (item.source === 'music_assistant' && item.maItem) await playMAItem(item.maItem)
}

// ── Play ───────────────────────────────────────────────────────
async function playBrowseItem(item: BrowseMediaNode) {
  if (!activeEntityId.value) return
  await client.callService({
    domain: 'media_player',
    service: 'play_media',
    target: { entity_id: activeEntityId.value },
    service_data: { media_content_id: item.media_content_id, media_content_type: item.media_content_type },
  })
}

async function playMAItem(item: MAItem) {
  if (isAvailable.value) {
    try {
      const players = await getPlayers()
      const maPlayer = players.find(p => p.available)
      if (maPlayer) { await playViaMA(maPlayer.player_id, item.uri, item.media_type); return }
    } catch { /* fall through */ }
  }
  if (activeEntityId.value) {
    await client.callService({
      domain: 'music_assistant',
      service: 'play_media',
      target: { entity_id: activeEntityId.value },
      service_data: { media_id: item.uri, media_type: item.media_type, enqueue: 'replace' },
    }).catch(() => {
      client.callService({
        domain: 'media_player',
        service: 'play_media',
        target: { entity_id: activeEntityId.value },
        service_data: { media_content_id: item.uri, media_content_type: item.media_type },
      })
    })
  }
}

// ── MA recently played ─────────────────────────────────────────
const recentItems = ref<MAItem[]>([])

// ── Search ─────────────────────────────────────────────────────
const searchQuery = ref('')
const searchLoading = ref(false)
const searchResults = ref<MASearchResult | null>(null)

const searchSections = computed(() => {
  const r = searchResults.value
  if (!r) return []
  return [
    { key: 'tracks', label: 'Songs', items: r.tracks },
    { key: 'artists', label: 'Artists', items: r.artists },
    { key: 'albums', label: 'Albums', items: r.albums },
    { key: 'playlists', label: 'Playlists', items: r.playlists },
  ].filter(s => s.items.length)
})

async function doSearch() {
  if (!searchQuery.value.trim()) return
  searchLoading.value = true
  try { searchResults.value = await search(searchQuery.value) }
  catch { searchResults.value = null }
  finally { searchLoading.value = false }
}

// ── Greeting & helpers ─────────────────────────────────────────
const timeGreeting = computed(() => {
  const h = new Date().getHours()
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'
})

function formatTime(secs: number): string {
  const s = Math.max(0, Math.floor(secs))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function spotifyItemSub(item: BrowseMediaNode): string {
  const cls = item.media_class
  if (cls === 'artist') return 'Artist'
  if (cls === 'album') return 'Album'
  return 'Playlist'
}

const gradientStyle = computed(() => {
  if (!isPlaying.value) return {}
  return { background: 'linear-gradient(180deg, rgba(var(--v-theme-primary), 0.12) 0%, transparent 40%)' }
})

onMounted(async () => {
  checkStatus()
  try { recentItems.value = await getRecentlyPlayed(12) } catch { /* ignore */ }
})

// ── Lyrics ─────────────────────────────────────────────────────
interface LrcLine { time: number; text: string }

const showLyrics = ref(false)
const lyricsLoading = ref(false)
const syncedLyrics = ref<LrcLine[]>([])
const plainLyrics = ref('')
const lyricsEl = ref<HTMLElement | null>(null)

function parseLrc(lrc: string): LrcLine[] {
  const lines: LrcLine[] = []
  for (const raw of lrc.split('\n')) {
    const m = raw.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/)
    if (!m) continue
    const secs = parseInt(m[1]) * 60 + parseInt(m[2]) + parseInt(m[3]) / (m[3].length === 3 ? 1000 : 100)
    const text = m[4].trim()
    if (text) lines.push({ time: secs, text })
  }
  return lines.sort((a, b) => a.time - b.time)
}

async function fetchLyrics(trackTitle: string, trackArtist: string) {
  lyricsLoading.value = true
  syncedLyrics.value = []
  plainLyrics.value = ''
  try {
    const data = await $fetch<{ syncedLyrics?: string; plainLyrics?: string } | null>('/api/lyrics', {
      query: { track: trackTitle, artist: trackArtist },
    })
    if (data?.syncedLyrics) syncedLyrics.value = parseLrc(data.syncedLyrics)
    else if (data?.plainLyrics) plainLyrics.value = data.plainLyrics
  } catch { /* ignore */ }
  finally { lyricsLoading.value = false }
}

watch([title, artist], ([t, a]) => {
  if (t && a) fetchLyrics(t, a)
  else { syncedLyrics.value = []; plainLyrics.value = '' }
}, { immediate: true })

const currentLyricIdx = computed(() => {
  if (!syncedLyrics.value.length) return -1
  const pos = displayPosition.value
  let idx = 0
  for (let i = 0; i < syncedLyrics.value.length; i++) {
    if (syncedLyrics.value[i].time <= pos) idx = i
    else break
  }
  return idx
})

watch(currentLyricIdx, (idx) => {
  if (!lyricsEl.value || idx < 0) return
  nextTick(() => {
    const children = lyricsEl.value?.children
    if (!children) return
    // +1 because of the leading spacer div
    const el = children[idx + 1] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  })
})

function seekTo(time: number) {
  command('media_seek', { seek_position: time })
}
</script>

<style scoped>
.music-page {
  --mp-bg: #0c0c12;
  --mp-sidebar: #080810;
  --mp-surface: #181824;
  --mp-surface-hov: #22223a;
  --mp-text: #e2e8f0;
  --mp-muted: #64748b;
  --mp-border: rgba(255,255,255,0.06);
  --mp-player-h: 72px;
  --mp-topbar-h: 44px;
  --mp-sidebar-w: 244px;
  --mp-accent: rgb(var(--v-theme-primary));

  display: flex;
  flex-direction: column;
  height: 100dvh;
  background: var(--mp-bg);
  color: var(--mp-text);
  overflow: hidden;
}

/* ── Top bar ────────────────────────────────────────────────── */
.mp-topbar {
  height: var(--mp-topbar-h);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border-bottom: 1px solid var(--mp-border);
  flex-shrink: 0;
  background: var(--mp-bg);
  z-index: 10;
}
.mp-back-btn { color: var(--mp-muted) !important; }
.mp-device-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--mp-muted);
  flex: 1;
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 20px;
  transition: background 0.12s, color 0.12s;
  max-width: 240px;
}
.mp-device-chip:hover { background: var(--mp-surface); color: var(--mp-text); }
.mp-device-chip__source {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}
.mp-sidebar-toggle {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--mp-muted);
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
}
.mp-sidebar-toggle:hover { background: var(--mp-surface-hov); color: var(--mp-text); }

/* ── Body ───────────────────────────────────────────────────── */
.mp-body {
  display: flex;
  flex: 1;
  min-height: 0;
  position: relative;
}
.mp-sidebar-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 20;
}

/* ── Sidebar ────────────────────────────────────────────────── */
.mp-sidebar {
  width: var(--mp-sidebar-w);
  background: var(--mp-sidebar);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
  border-right: 1px solid var(--mp-border);
}
@media (max-width: 767px) {
  .mp-sidebar {
    position: fixed;
    top: var(--mp-topbar-h);
    left: 0;
    bottom: var(--mp-player-h);
    z-index: 25;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
  }
  .mp-sidebar--open { transform: translateX(0); }
}

.mp-nav {
  padding: 12px 8px 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.mp-nav-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--mp-muted);
  font-size: 14px;
  font-weight: 600;
  width: 100%;
  text-align: left;
  transition: background 0.12s, color 0.12s;
}
.mp-nav-btn:hover { background: var(--mp-surface); color: var(--mp-text); }
.mp-nav-btn.active { color: var(--mp-text); }

.mp-library {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.mp-library-hdr {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 8px 8px;
  color: var(--mp-muted);
  font-size: 13px;
  font-weight: 600;
}
.mp-library-hdr__count {
  margin-left: auto;
  font-size: 11px;
  background: var(--mp-surface);
  border-radius: 10px;
  padding: 1px 6px;
}
.mp-lib-empty { font-size: 12px; color: var(--mp-muted); padding: 12px; text-align: center; }

/* Player filter badges (inside device menu) */
.mp-player-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.mp-player-filter {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.1);
  background: none;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  transition: background 0.1s, color 0.1s, border-color 0.1s;
}
.mp-player-filter:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
.mp-player-filter.active {
  background: rgb(var(--v-theme-primary) / 0.15);
  border-color: rgb(var(--v-theme-primary) / 0.45);
  color: rgb(var(--v-theme-primary));
}

/* Library filter badges */
.mp-lib-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 8px 8px;
}
.mp-lib-filter {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid var(--mp-border);
  background: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--mp-muted);
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.mp-lib-filter:hover { background: var(--mp-surface); color: var(--mp-text); }
.mp-lib-filter.active {
  background: rgb(var(--v-theme-primary) / 0.15);
  border-color: rgb(var(--v-theme-primary) / 0.5);
  color: rgb(var(--v-theme-primary));
}

/* Source dot on playlist art */
.mp-lib-item__art--spotify { box-shadow: inset 0 0 0 2px rgba(30,215,96,0.3); }
.mp-lib-item__art--music_assistant { box-shadow: inset 0 0 0 2px rgba(99,102,241,0.3); }

/* Source badge on playlist hero */
.mp-pl-source-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
  margin-left: 8px;
}
.mp-pl-source-badge--spotify { background: rgba(30,215,96,0.12); color: #1ed760; border: 1px solid rgba(30,215,96,0.25); }
.mp-pl-source-badge--music_assistant { background: rgba(99,102,241,0.12); color: rgb(var(--v-theme-primary)); border: 1px solid rgba(99,102,241,0.25); }
.mp-lib-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 8px;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--mp-muted);
  text-align: left;
  transition: background 0.12s, color 0.12s;
  width: 100%;
}
.mp-lib-item:hover { background: var(--mp-surface); color: var(--mp-text); }
.mp-lib-item.active { background: var(--mp-surface); color: var(--mp-text); }
.mp-lib-item__art {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  overflow: hidden;
  background: var(--mp-surface);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mp-lib-item__art img { width: 100%; height: 100%; object-fit: cover; }
.mp-lib-item__name { font-size: 13px; font-weight: 500; color: inherit; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 148px; }
.mp-lib-item__sub { font-size: 11px; color: var(--mp-muted); }

/* ── Main ───────────────────────────────────────────────────── */
.mp-main {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  position: relative;
  scroll-behavior: smooth;
}
.mp-main-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 300px;
  pointer-events: none;
  z-index: 0;
  transition: background 0.8s ease;
}
.mp-main-scroll {
  position: relative;
  z-index: 1;
  padding: 28px 28px 32px;
  min-height: 100%;
}
@media (max-width: 767px) {
  .mp-main-scroll { padding: 20px 16px 24px; }
}

/* ── Home ───────────────────────────────────────────────────── */
.mp-greeting {
  font-size: 24px;
  font-weight: 700;
  color: var(--mp-text);
  margin: 0 0 20px;
  text-transform: capitalize;
}

.mp-quick-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 32px;
}
@media (max-width: 900px) { .mp-quick-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .mp-quick-grid { grid-template-columns: 1fr; } }

.mp-quick-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--mp-surface);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  overflow: hidden;
  color: var(--mp-text);
  font-size: 13px;
  font-weight: 600;
  transition: background 0.12s;
  height: 52px;
}
.mp-quick-item:hover { background: var(--mp-surface-hov); }
.mp-quick-item__art {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  background: var(--mp-surface-hov);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.mp-quick-item__art img { width: 100%; height: 100%; object-fit: cover; }
.mp-quick-item__name { padding-right: 12px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ── Sections & cards ───────────────────────────────────────── */
.mp-section { margin-bottom: 36px; }
.mp-section-hdr {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 16px;
  color: var(--mp-text);
}

.mp-card-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 16px;
}
@media (max-width: 500px) { .mp-card-row { grid-template-columns: repeat(2, 1fr); gap: 12px; } }

.mp-card {
  background: var(--mp-surface);
  border: none;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  text-align: left;
  color: var(--mp-text);
  transition: background 0.15s;
}
.mp-card:hover { background: var(--mp-surface-hov); }
.mp-card__art {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  background: var(--mp-surface-hov);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}
.mp-card__art--circle { border-radius: 50%; }
.mp-card__art img { width: 100%; height: 100%; object-fit: cover; }
.mp-card__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 8px;
  opacity: 0;
  transition: opacity 0.15s;
  background: rgba(0,0,0,0.3);
  color: rgb(var(--v-theme-primary));
}
.mp-card:hover .mp-card__overlay { opacity: 1; }
.mp-card__name { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mp-card__sub { font-size: 11px; color: var(--mp-muted); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ── Search ─────────────────────────────────────────────────── */
.mp-search-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 28px;
}
.mp-search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--mp-surface);
  border-radius: 24px;
  padding: 0 16px;
  height: 44px;
  border: 1px solid var(--mp-border);
}
.mp-search-icon { color: var(--mp-muted); flex-shrink: 0; }
.mp-search-input {
  flex: 1;
  border: none;
  background: none;
  color: var(--mp-text);
  font-size: 14px;
  outline: none;
}
.mp-search-input::placeholder { color: var(--mp-muted); }
.mp-search-clear {
  border: none;
  background: none;
  cursor: pointer;
  color: var(--mp-muted);
  display: flex;
  padding: 2px;
}
.mp-search-clear:hover { color: var(--mp-text); }
.mp-search-go {
  padding: 0 20px;
  height: 44px;
  border-radius: 22px;
  border: none;
  background: rgb(var(--v-theme-primary));
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 0.12s;
}
.mp-search-go:disabled { opacity: 0.4; cursor: default; }
.mp-search-go:not(:disabled):hover { opacity: 0.85; }

/* ── Track list ─────────────────────────────────────────────── */
.mp-track-list { display: flex; flex-direction: column; }
.mp-track-list--pl { margin-top: 8px; }
.mp-track {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--mp-muted);
  text-align: left;
  width: 100%;
  transition: background 0.1s;
}
.mp-track:hover { background: var(--mp-surface); color: var(--mp-text); }
.mp-track--active { color: rgb(var(--v-theme-primary)) !important; }
.mp-track--header {
  color: var(--mp-muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: default;
  border-bottom: 1px solid var(--mp-border);
  margin-bottom: 4px;
  border-radius: 0;
}
.mp-track--header:hover { background: none; color: var(--mp-muted); }
.mp-track__num { width: 20px; text-align: right; font-size: 13px; flex-shrink: 0; }
.mp-track__playing { color: rgb(var(--v-theme-primary)); flex-shrink: 0; width: 20px; }
.mp-track__art {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  overflow: hidden;
  background: var(--mp-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.mp-track__art img { width: 100%; height: 100%; object-fit: cover; }
.mp-track__info { flex: 1; min-width: 0; }
.mp-track__title { font-size: 14px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--mp-text); }
.mp-track--active .mp-track__title { color: rgb(var(--v-theme-primary)); }
.mp-track__sub { font-size: 12px; color: var(--mp-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mp-track__dur { font-size: 12px; color: var(--mp-muted); flex-shrink: 0; }

/* ── Playlist hero ──────────────────────────────────────────── */
.mp-pl-hero {
  display: flex;
  align-items: flex-end;
  gap: 24px;
  padding: 12px 0 28px;
}
@media (max-width: 600px) { .mp-pl-hero { flex-direction: column; align-items: flex-start; } }
.mp-pl-hero__art {
  width: 180px;
  height: 180px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  background: var(--mp-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 16px 48px rgba(0,0,0,0.5);
}
@media (max-width: 600px) { .mp-pl-hero__art { width: 120px; height: 120px; } }
.mp-pl-hero__art img { width: 100%; height: 100%; object-fit: cover; }
.mp-pl-hero__type { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--mp-muted); margin-bottom: 8px; }
.mp-pl-hero__title { font-size: 32px; font-weight: 800; line-height: 1.1; margin: 0 0 10px; }
@media (max-width: 600px) { .mp-pl-hero__title { font-size: 22px; } }
.mp-pl-hero__meta { font-size: 13px; color: var(--mp-muted); }

.mp-pl-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}
.mp-play-btn {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: transform 0.1s, opacity 0.1s;
}
.mp-play-btn:hover { transform: scale(1.05); opacity: 0.9; }
.mp-action-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--mp-muted);
  transition: color 0.12s;
}
.mp-action-btn:hover { color: var(--mp-text); }

/* ── Placeholder ────────────────────────────────────────────── */
.mp-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px 24px;
  color: var(--mp-muted);
  text-align: center;
}
.mp-placeholder p { font-size: 14px; }
.mp-center { display: flex; justify-content: center; align-items: center; }

/* ── Bottom player bar ──────────────────────────────────────── */
.mp-player {
  height: var(--mp-player-h);
  flex-shrink: 0;
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
  background: var(--mp-bg);
  border-top: 1px solid var(--mp-border);
  z-index: 10;
}
@media (max-width: 600px) {
  .mp-player {
    grid-template-columns: 1fr auto;
    .mp-player__vol { display: none; }
  }
}
.mp-player--idle .mp-ctrl--play { opacity: 0.5; }

.mp-player__track {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.mp-player__art {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  overflow: hidden;
  background: var(--mp-surface);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mp-player__art img { width: 100%; height: 100%; object-fit: cover; }
.mp-player__meta { min-width: 0; }
.mp-player__title { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mp-player__artist { font-size: 12px; color: var(--mp-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.mp-player__center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.mp-ctrl-row {
  display: flex;
  align-items: center;
  gap: 4px;
}
.mp-ctrl {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--mp-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: 50%;
  transition: color 0.1s, background 0.1s;
}
.mp-ctrl:hover:not(:disabled) { color: var(--mp-text); background: var(--mp-surface); }
.mp-ctrl:disabled { opacity: 0.3; cursor: default; }
.mp-ctrl--on { color: rgb(var(--v-theme-primary)) !important; }
.mp-ctrl--play {
  color: var(--mp-text) !important;
  background: var(--mp-surface);
  border-radius: 50%;
  padding: 8px;
}
.mp-ctrl--play:hover:not(:disabled) { background: var(--mp-surface-hov); }

.mp-progress {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.mp-progress__time { font-size: 11px; color: var(--mp-muted); flex-shrink: 0; min-width: 30px; text-align: center; }
.mp-progress__track {
  flex: 1;
  height: 4px;
  background: var(--mp-surface-hov);
  border-radius: 2px;
  position: relative;
  cursor: pointer;
}
.mp-progress__track:hover .mp-progress__thumb { opacity: 1; }
.mp-progress__fill {
  height: 100%;
  background: var(--mp-text);
  border-radius: 2px;
  transition: width 0.5s linear;
}
.mp-progress__track:hover .mp-progress__fill { background: rgb(var(--v-theme-primary)); }
.mp-progress__thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--mp-text);
  opacity: 0;
  transition: opacity 0.15s;
}

.mp-player__vol {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
}
.mp-ctrl--connect { margin-right: 4px; }
.mp-connect-current {
  display: flex;
  align-items: center;
  gap: 10px;
}
.mp-connect-current__name { font-size: 13px; font-weight: 600; color: #e2e8f0; }
.mp-connect-current__label { font-size: 11px; color: rgb(var(--v-theme-primary)); }
.mp-vol-icon {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--mp-muted);
  display: flex;
  flex-shrink: 0;
  transition: color 0.1s;
}
.mp-vol-icon:hover { color: var(--mp-text); }
.mp-vol-track {
  width: 100px;
  height: 4px;
  background: var(--mp-surface-hov);
  border-radius: 2px;
  position: relative;
  cursor: pointer;
}
.mp-vol-track:hover .mp-vol-thumb { opacity: 1; }
.mp-vol-fill {
  height: 100%;
  background: var(--mp-text);
  border-radius: 2px;
}
.mp-vol-track:hover .mp-vol-fill { background: rgb(var(--v-theme-primary)); }
.mp-vol-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--mp-text);
  opacity: 0;
  transition: opacity 0.15s;
}

/* ── Lyrics panel ───────────────────────────────────────────── */
.mp-lyrics-panel {
  width: 340px;
  flex-shrink: 0;
  background: var(--mp-sidebar);
  border-left: 1px solid var(--mp-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@media (max-width: 767px) {
  .mp-lyrics-panel {
    position: fixed;
    inset: var(--mp-topbar-h) 0 var(--mp-player-h);
    width: 100%;
    z-index: 30;
  }
}

.mp-lyrics-slide-enter-active,
.mp-lyrics-slide-leave-active {
  transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
  overflow: hidden;
}
.mp-lyrics-slide-enter-from,
.mp-lyrics-slide-leave-to {
  width: 0 !important;
  opacity: 0;
}

.mp-lyrics-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 14px 11px;
  border-bottom: 1px solid var(--mp-border);
  flex-shrink: 0;
}
.mp-lyrics-track { flex: 1; min-width: 0; }
.mp-lyrics-title { font-size: 13px; font-weight: 600; color: var(--mp-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mp-lyrics-artist { font-size: 11px; color: var(--mp-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 1px; }
.mp-lyrics-close {
  background: none; border: none; cursor: pointer;
  color: var(--mp-muted); padding: 5px; border-radius: 50%;
  display: flex; transition: color 0.12s, background 0.12s; flex-shrink: 0;
}
.mp-lyrics-close:hover { color: var(--mp-text); background: var(--mp-surface); }

.mp-lyrics-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  scroll-behavior: smooth;
}
.mp-lyrics-spacer { height: 40px; flex-shrink: 0; }

.mp-lyric-line {
  font-size: 19px;
  font-weight: 700;
  line-height: 1.45;
  color: rgba(226, 232, 240, 0.2);
  cursor: pointer;
  border-radius: 8px;
  padding: 5px 8px;
  transition: color 0.35s ease, transform 0.35s ease, opacity 0.35s ease;
  transform-origin: left center;
}
.mp-lyric-line:hover {
  color: rgba(226, 232, 240, 0.55) !important;
  background: rgba(255,255,255,0.04);
}
.mp-lyric-line--past {
  color: rgba(226, 232, 240, 0.3);
}
.mp-lyric-line--active {
  color: var(--mp-text) !important;
  transform: scale(1.03);
}
.mp-lyric-line--next {
  color: rgba(226, 232, 240, 0.2);
}

.mp-lyrics-plain {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  font-size: 14px;
  line-height: 1.85;
  color: var(--mp-muted);
  white-space: pre-line;
}

.mp-lyrics-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.mp-lyrics-empty { color: var(--mp-muted); font-size: 13px; }

.mp-lyrics-footer {
  padding: 8px 14px;
  font-size: 10px;
  color: var(--mp-muted);
  border-top: 1px solid var(--mp-border);
  display: flex;
  gap: 4px;
  align-items: center;
  flex-shrink: 0;
  opacity: 0.6;
}
.mp-lyrics-footer a { color: inherit; text-decoration: underline; }
.mp-lyrics-footer a:hover { opacity: 0.8; }

.mp-ctrl--lyrics { margin-right: 2px; }
</style>
