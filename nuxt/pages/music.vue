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
              {{ t('music.play_on').toUpperCase() }}
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
            {{ t('music.ha_players').toUpperCase() }}
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
      <div class="mp-topbar-right">
        <ConnectionStatus />
        <button v-if="smAndDown" class="mp-sidebar-toggle" @click="sidebarOpen = !sidebarOpen">
          <v-icon icon="mdi-bookshelf" size="18" />
        </button>
      </div>
    </div>

    <!-- Body: sidebar + main -->
    <div class="mp-body">
      <div v-if="smAndDown && sidebarOpen" class="mp-sidebar-mask" @click="sidebarOpen = false" />

      <!-- Sidebar -->
      <aside
        class="mp-sidebar"
        :class="{ 'mp-sidebar--open': sidebarOpen || !smAndDown, 'mp-sidebar--covers': sidebarCoversOnly }"
        :style="!smAndDown ? `width: ${sidebarWidth}px` : ''"
      >
        <div v-if="!smAndDown" class="mp-sidebar-resize-handle" @mousedown.prevent="startSidebarResize" @touchstart.prevent="startSidebarResize" />
        <nav class="mp-nav">
          <button class="mp-nav-btn" :class="{ active: view === 'home' }" @click="goHome">
            <v-icon icon="mdi-home-outline" size="17" />
            <span>Home</span>
          </button>
          <button class="mp-nav-btn" :class="{ active: view === 'search' }" @click="goSearch">
            <v-icon icon="mdi-magnify" size="17" />
            <span>{{ t('music.search_button') }}</span>
          </button>
        </nav>

        <div class="mp-library">
          <div class="mp-library-hdr">
            <v-icon icon="mdi-bookshelf" size="14" />
            <span v-if="!sidebarCoversOnly">{{ t('music.library') }}</span>
            <span v-if="!sidebarCoversOnly" class="mp-library-hdr__count">{{ libraryItems.length }}</span>
            <button class="mp-lib-collapse" @click="sidebarWidth = sidebarCoversOnly ? 244 : 56">
              <v-icon :icon="sidebarCoversOnly ? 'mdi-chevron-right' : 'mdi-chevron-left'" size="16" />
            </button>
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
            {{ t('music.no_playlists') }}
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

            <!-- Quick grid: top pinned playlists -->
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

            <!-- MA recently played (if available) -->
            <div v-if="recentItems.length" class="mp-section">
              <div class="mp-section-hdr-row">
                <span class="mp-section-hdr">{{ t('music.recently_played') }}</span>
                <button class="mp-show-all-btn" @click="openSectionView({ label: t('music.recently_played'), spotifyItems: [], maItems: recentItems, isCircle: false })">
                  {{ t('music.show_all') }}
                </button>
              </div>
              <div class="mp-card-row">
                <div
                  v-for="item in recentItems"
                  :key="item.uri"
                  class="mp-card"
                  :class="{ 'mp-card--circle': item.media_type === 'artist' }"
                  role="button"
                  tabindex="0"
                  @click="playMAItem(item)"
                >
                  <div class="mp-card__art" :class="{ 'mp-card__art--circle': item.media_type === 'artist' }">
                    <img v-if="maImageUrl(item)" :src="maImageUrl(item)" alt="" loading="lazy" />
                    <v-icon v-else icon="mdi-music" size="28" />
                    <div class="mp-card__overlay">
                      <button class="mp-card__play-btn" @click.stop="playMAItem(item)">
                        <v-progress-circular v-if="playingItemId === item.uri" indeterminate size="22" color="primary" />
                        <v-icon v-else icon="mdi-play" size="20" />
                      </button>
                    </div>
                  </div>
                  <div class="mp-card__name">{{ item.name }}</div>
                  <div class="mp-card__sub">{{ item.artists?.[0]?.name ?? item.album?.name ?? '' }}</div>
                </div>
              </div>
            </div>

            <!-- Spotify library sections — recently played first -->
            <div v-for="section in sortedSections" :key="section.key" class="mp-section">
              <div class="mp-section-hdr-row">
                <span class="mp-section-hdr">{{ section.label }}</span>
                <button class="mp-show-all-btn" @click="openSectionView({ label: section.label, spotifyItems: section.items, maItems: [], isCircle: section.key.includes('artist') })">
                  {{ t('music.show_all') }}
                </button>
              </div>
              <div class="mp-card-row">
                <div
                  v-for="item in section.items"
                  :key="item.media_content_id"
                  class="mp-card"
                  :class="{ 'mp-card--circle': section.key.includes('artist') }"
                  role="button"
                  tabindex="0"
                  @click="item.media_class !== 'track' ? openPlaylist({ id: item.media_content_id, title: item.title, thumbnail: item.thumbnail ?? undefined, source: 'spotify', browseNode: item }) : playBrowseItem(item)"
                >
                  <div class="mp-card__art" :class="{ 'mp-card__art--circle': section.key.includes('artist') }">
                    <img v-if="item.thumbnail" :src="item.thumbnail" alt="" loading="lazy" />
                    <v-icon v-else icon="mdi-music" size="28" />
                    <div class="mp-card__overlay">
                      <button class="mp-card__play-btn" @click.stop="playBrowseItem(item)">
                        <v-progress-circular v-if="playingItemId === item.media_content_id" indeterminate size="22" color="primary" />
                        <v-icon v-else icon="mdi-play" size="20" />
                      </button>
                    </div>
                  </div>
                  <div class="mp-card__name">{{ item.title }}</div>
                  <div class="mp-card__sub">{{ spotifyItemSub(item) }}</div>
                </div>
              </div>
            </div>

            <div v-if="!libraryLoading && !sortedSections.length && !recentItems.length" class="mp-placeholder">
              <v-icon icon="mdi-music-circle-outline" size="56" />
              <p>{{ t('music.no_data') }}</p>
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
                  :placeholder="t('music.search_placeholder')"
                  @keyup.enter="doSearch"
                />
                <button v-if="searchQuery" class="mp-search-clear" @click="searchQuery = ''; searchResults = null">
                  <v-icon icon="mdi-close" size="16" />
                </button>
              </div>
              <button class="mp-search-go" :disabled="!searchQuery.trim()" @click="doSearch">
                {{ t('music.search_button') }}
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
                      <v-menu location="bottom end" :close-on-content-click="true">
                        <template #activator="{ props: mp }">
                          <span class="mp-track__menu-btn" v-bind="mp" @click.stop>
                            <v-icon icon="mdi-dots-vertical" size="16" />
                          </span>
                        </template>
                        <v-list density="compact" nav bg-color="#1a1a28" rounded="lg" min-width="200">
                          <v-list-item prepend-icon="mdi-play" :title="t('music.play')" @click="enqueueMAItem(item, 'replace')" />
                          <v-list-item prepend-icon="mdi-skip-next" :title="t('music.play_next')" @click="enqueueMAItem(item, 'next')" />
                          <v-list-item prepend-icon="mdi-playlist-plus" :title="t('music.add_to_queue')" @click="enqueueMAItem(item, 'add')" />
                        </v-list>
                      </v-menu>
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
            <!-- Error state -->
            <div v-else-if="searchError" class="mp-placeholder">
              <v-icon icon="mdi-wifi-off" size="48" style="opacity:0.35" />
              <p style="margin-bottom:12px">{{ t('music.ma_timeout') }}</p>
              <button class="mp-search-go" @click="doSearch">{{ t('music.retry') }}</button>
            </div>
            <!-- Empty / initial -->
            <div v-else class="mp-placeholder">
              <v-icon icon="mdi-magnify" size="56" style="opacity:0.25" />
              <p>{{ t('music.search_placeholder') }}</p>
            </div>
          </template>

          <!-- PLAYLIST VIEW -->
          <template v-else-if="view === 'playlist' && activePlaylist">
            <div class="mp-pl-header" :style="plAccentRgb ? `--pl-accent: ${plAccentRgb}` : ''">
              <div class="mp-pl-hero">
                <div class="mp-pl-hero__art">
                  <img v-if="activePlaylist.thumbnail" :src="activePlaylist.thumbnail" alt="" />
                  <v-icon v-else icon="mdi-music-note" size="56" />
                </div>
                <div class="mp-pl-hero__info">
                  <div class="mp-pl-hero__type">{{ t('music.playlist').toUpperCase() }}</div>
                  <h1 class="mp-pl-hero__title">{{ activePlaylist.title }}</h1>
                  <div v-if="tracks.length" class="mp-pl-hero__meta">{{ t('music.tracks_count', { n: tracks.length }) }}</div>
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
              <button class="mp-compact-toggle" :class="{ active: plCompact }" @click="plCompact = !plCompact">
                <v-icon :icon="plCompact ? 'mdi-view-list' : 'mdi-view-list-outline'" size="15" />
                {{ plCompact ? 'List' : 'Compact' }}
              </button>
            </div>
            </div><!-- /mp-pl-header -->

            <div v-if="tracksLoading" class="mp-center py-6">
              <v-progress-circular indeterminate size="28" color="primary" />
            </div>
            <div v-else class="mp-track-list mp-track-list--pl" :class="{ 'mp-track-list--compact': plCompact }">
              <div class="mp-track mp-track--header">
                <span class="mp-track__num">#</span>
                <div class="mp-track__art" />
                <div class="mp-track__info">{{ t('music.title_header') }}</div>
                <span class="mp-track__dur"><v-icon icon="mdi-clock-outline" size="14" /></span>
              </div>
              <div
                v-for="(track, idx) in tracks"
                :key="track.media_content_id"
                class="mp-track"
                :class="{ 'mp-track--active': isCurrentBrowseTrack(track) }"
                role="button"
                tabindex="0"
                @click="playBrowseItem(track)"
                @keydown.enter="playBrowseItem(track)"
              >
                <v-progress-circular v-if="playingItemId === track.media_content_id" indeterminate size="14" color="primary" class="mp-track__playing" />
                <div v-else-if="isCurrentBrowseTrack(track)" class="mp-playing-bars mp-track__playing">
                  <div class="mp-playing-bar" />
                  <div class="mp-playing-bar" />
                  <div class="mp-playing-bar" />
                </div>
                <span v-else class="mp-track__num">{{ idx + 1 }}</span>
                <div class="mp-track__art">
                  <img v-if="track.thumbnail" :src="track.thumbnail" alt="" loading="lazy" />
                  <v-icon v-else icon="mdi-music-note" size="13" />
                </div>
                <div class="mp-track__info">
                  <div class="mp-track__title" :class="{ 'text-primary': isCurrentBrowseTrack(track) }">{{ track.title }}</div>
                </div>
                <v-menu location="bottom end" :close-on-content-click="true">
                  <template #activator="{ props: mp }">
                    <span class="mp-track__menu-btn" v-bind="mp" @click.stop>
                      <v-icon icon="mdi-dots-vertical" size="16" />
                    </span>
                  </template>
                  <v-list density="compact" nav bg-color="#1a1a28" rounded="lg" min-width="200">
                    <v-list-item prepend-icon="mdi-play" :title="t('music.play')" @click="enqueueBrowseItem(track, 'replace')" />
                    <v-list-item prepend-icon="mdi-skip-next" :title="t('music.play_next')" @click="enqueueBrowseItem(track, 'next')" />
                    <v-list-item prepend-icon="mdi-playlist-plus" :title="t('music.add_to_queue')" @click="enqueueBrowseItem(track, 'add')" />
                  </v-list>
                </v-menu>
              </div>
            </div>
          </template>

          <!-- SECTION LIST VIEW -->
          <template v-else-if="view === 'section' && activeSectionData">
            <div class="mp-section-view-header">
              <button class="mp-section-view-back" @click="goHome">
                <v-icon icon="mdi-arrow-left" size="20" />
              </button>
              <h2 class="mp-section-view-title">{{ activeSectionData.label }}</h2>
            </div>

            <div class="mp-list">
              <!-- MA items -->
              <button
                v-for="item in activeSectionData.maItems"
                :key="item.uri"
                class="mp-list-item"
                @click="playMAItem(item)"
              >
                <div class="mp-list-item__art" :class="{ 'mp-list-item__art--circle': item.media_type === 'artist' }">
                  <img v-if="maImageUrl(item)" :src="maImageUrl(item)" alt="" loading="lazy" />
                  <v-icon v-else icon="mdi-music-note" size="16" />
                </div>
                <div class="mp-list-item__info">
                  <div class="mp-list-item__title">{{ item.name }}</div>
                  <div class="mp-list-item__sub">{{ item.artists?.[0]?.name ?? item.album?.name ?? item.media_type ?? '' }}</div>
                </div>
                <v-progress-circular v-if="playingItemId === item.uri" indeterminate size="16" color="primary" style="opacity:1;flex-shrink:0" />
                <v-menu v-else location="bottom end" :close-on-content-click="true">
                  <template #activator="{ props: mp }">
                    <span class="mp-list-item__menu-btn" v-bind="mp" @click.stop>
                      <v-icon icon="mdi-dots-vertical" size="18" />
                    </span>
                  </template>
                  <v-list density="compact" nav bg-color="#1a1a28" rounded="lg" min-width="200">
                    <v-list-item prepend-icon="mdi-play" :title="t('music.play')" @click="enqueueMAItem(item, 'replace')" />
                    <v-list-item prepend-icon="mdi-skip-next" :title="t('music.play_next')" @click="enqueueMAItem(item, 'next')" />
                    <v-list-item prepend-icon="mdi-playlist-plus" :title="t('music.add_to_queue')" @click="enqueueMAItem(item, 'add')" />
                  </v-list>
                </v-menu>
              </button>

              <!-- Spotify items -->
              <button
                v-for="item in activeSectionData.spotifyItems"
                :key="item.media_content_id"
                class="mp-list-item"
                @click="item.can_expand ? openPlaylist({ id: item.media_content_id, title: item.title, thumbnail: item.thumbnail ?? undefined, source: 'spotify', browseNode: item }) : playBrowseItem(item)"
              >
                <div class="mp-list-item__art" :class="{ 'mp-list-item__art--circle': activeSectionData.isCircle }">
                  <img v-if="item.thumbnail" :src="item.thumbnail" alt="" loading="lazy" />
                  <v-icon v-else icon="mdi-music-note" size="16" />
                </div>
                <div class="mp-list-item__info">
                  <div class="mp-list-item__title">{{ item.title }}</div>
                  <div class="mp-list-item__sub">{{ spotifyItemSub(item) }}</div>
                </div>
                <v-progress-circular v-if="playingItemId === item.media_content_id" indeterminate size="16" color="primary" style="opacity:1;flex-shrink:0" />
                <v-menu v-else location="bottom end" :close-on-content-click="true">
                  <template #activator="{ props: mp }">
                    <span class="mp-list-item__menu-btn" v-bind="mp" @click.stop>
                      <v-icon icon="mdi-dots-vertical" size="18" />
                    </span>
                  </template>
                  <v-list density="compact" nav bg-color="#1a1a28" rounded="lg" min-width="200">
                    <v-list-item prepend-icon="mdi-play" :title="t('music.play')" @click="enqueueBrowseItem(item, 'replace')" />
                    <v-list-item prepend-icon="mdi-skip-next" :title="t('music.play_next')" @click="enqueueBrowseItem(item, 'next')" />
                    <v-list-item prepend-icon="mdi-playlist-plus" :title="t('music.add_to_queue')" @click="enqueueBrowseItem(item, 'add')" />
                  </v-list>
                </v-menu>
              </button>
            </div>
          </template>

        </div>
      </main>

      <!-- Queue panel -->
      <transition name="mp-lyrics-slide">
        <aside v-if="showQueue" class="mp-lyrics-panel mp-queue-panel">
          <div class="mp-lyrics-header">
            <div class="mp-lyrics-track">
              <div class="mp-lyrics-title">{{ t('music.queue') }}</div>
              <div v-if="queueSize" class="mp-lyrics-artist">{{ queuePosition }} / {{ queueSize }} Tracks</div>
            </div>
            <button class="mp-lyrics-close" @click="showQueue = false">
              <v-icon icon="mdi-close" size="18" />
            </button>
          </div>

          <!-- Now playing -->
          <div v-if="title" class="mp-queue-now">
            <div class="mp-queue-now__label">{{ t('music.queue_now') }}</div>
            <div class="mp-queue-now__track">
              <div class="mp-queue-now__art">
                <img v-if="albumArt" :src="`/api/ha-image?path=${encodeURIComponent(albumArt)}`" alt="" />
                <v-icon v-else icon="mdi-music-note" size="16" style="opacity:0.4" />
              </div>
              <div class="mp-queue-now__info">
                <div class="mp-queue-now__title">{{ title }}</div>
                <div class="mp-queue-now__artist">{{ artist ?? '' }}</div>
              </div>
              <div class="mp-playing-bars" style="margin-left:auto">
                <div class="mp-playing-bar" />
                <div class="mp-playing-bar" />
                <div class="mp-playing-bar" />
              </div>
            </div>
          </div>

          <!-- Upcoming -->
          <div v-if="queueLoading" class="mp-lyrics-center">
            <v-progress-circular indeterminate size="20" color="primary" />
          </div>
          <template v-else-if="upcomingQueueItems.length">
            <div class="mp-queue-next-label">{{ t('music.queue_next') }}</div>
            <div class="mp-lyrics-scroll" style="mask-image:none;-webkit-mask-image:none;padding:0 12px">
              <div
                v-for="(item, i) in upcomingQueueItems"
                :key="item.queue_item_id"
                class="mp-queue-item mp-queue-item--clickable"
                @click="playQueueItem(item)"
              >
                <span class="mp-queue-item__num">{{ i + 1 }}</span>
                <div class="mp-queue-item__art">
                  <img v-if="queueItemImage(item)" :src="queueItemImage(item)" alt="" loading="lazy" />
                  <v-icon v-else icon="mdi-music-note" size="13" />
                </div>
                <div class="mp-queue-item__info">
                  <div class="mp-queue-item__title">{{ item.media_item?.name ?? item.name }}</div>
                  <div class="mp-queue-item__artist">{{ queueItemArtist(item) }}</div>
                </div>
                <span class="mp-queue-item__dur">{{ formatTime(item.duration ?? 0) }}</span>
                <v-menu location="bottom end" :close-on-content-click="true">
                  <template #activator="{ props: mp }">
                    <span class="mp-track__menu-btn" v-bind="mp" @click.stop>
                      <v-icon icon="mdi-dots-vertical" size="16" />
                    </span>
                  </template>
                  <v-list density="compact" nav bg-color="#1a1a28" rounded="lg" min-width="200">
                    <v-list-item v-if="i > 0" prepend-icon="mdi-skip-next" :title="t('music.play_next')" @click.stop="moveQueueItemToNext(item, i)" />
                    <v-list-item prepend-icon="mdi-delete-outline" :title="t('music.remove_from_queue')" @click.stop="removeQueueItem(item)" />
                  </v-list>
                </v-menu>
              </div>
            </div>
          </template>
          <div v-else-if="!queueLoading && !title" class="mp-lyrics-center mp-lyrics-empty">
            <v-icon icon="mdi-playlist-music-outline" size="40" style="opacity:0.2" />
            <p>{{ t('music.queue_empty') }}</p>
          </div>
        </aside>
      </transition>

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
            <p>{{ t('music.no_lyrics') }}</p>
          </div>

          <div class="mp-lyrics-footer">
            <span>{{ t('music.lyrics_by') }}</span>
            <a href="https://lrclib.net" target="_blank" rel="noopener">LRCLIB</a>
          </div>
        </aside>
      </transition>
    </div>

    <!-- Bottom player bar -->
    <div class="mp-player" :class="{ 'mp-player--idle': !title }">
      <!-- Track info -->
      <div class="mp-player__track">
        <div class="mp-player__art" :class="{ 'mp-player__art--playing': isPlaying && !!albumArt }">
          <img v-if="albumArt" :src="`/api/ha-image?path=${encodeURIComponent(albumArt)}`" alt="Album art" />
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
            
            :class="{ 'mp-ctrl--on': shuffle }"
            :disabled="!hasPlayer"
            class="mp-ctrl mp-ctrl--shuffle"
            title="Shuffle"
            @click="toggleShuffle"
          >
            <v-icon icon="mdi-shuffle" size="16" />
          </button>
          <button class="mp-ctrl" :disabled="!hasPlayer" @click="command('media_previous_track')">
            <v-icon icon="mdi-skip-previous" size="22" />
          </button>
          <button class="mp-ctrl mp-ctrl--play" :disabled="!hasPlayer"
            :aria-label="isPlaying ? 'Pause' : 'Play'"
            @click="command(isPlaying ? 'media_pause' : 'media_play')">
            <v-icon :icon="isPlaying ? 'mdi-pause' : 'mdi-play'" size="22" />
          </button>
          <button class="mp-ctrl" :disabled="!hasPlayer" @click="command('media_next_track')">
            <v-icon icon="mdi-skip-next" size="22" />
          </button>
          <button
            class="mp-ctrl mp-ctrl--repeat"
            :class="{ 'mp-ctrl--on': repeatMode !== 'off' }"
            :disabled="!hasPlayer"
            title="Repeat"
            @click="cycleRepeat"
          >
            <v-icon :icon="repeatMode === 'one' ? 'mdi-repeat-once' : 'mdi-repeat'" size="16" />
          </button>
        </div>
        <div class="mp-progress" style="touch-action:manipulation" @click="seekFromClick">
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
        <!-- Queue toggle -->
        <button
          class="mp-ctrl"
          :class="{ 'mp-ctrl--on': showQueue }"
          :title="t('music.queue')"
          @click="toggleQueue"
        >
          <v-icon icon="mdi-playlist-play" size="18" />
        </button>

        <!-- Lyrics toggle -->
        <button
          class="mp-ctrl mp-ctrl--lyrics"
          :class="{ 'mp-ctrl--on': showLyrics }"
          :title="t('music.show_lyrics')"
          @click="showLyrics = !showLyrics; if (showLyrics) showQueue = false"
        >
          <v-icon icon="mdi-microphone-variant" size="16" />
        </button>

        <!-- Connect to device -->
        <v-menu :close-on-content-click="true" location="top" offset="12">
          <template #activator="{ props: cp }">
            <button
              class="mp-ctrl mp-ctrl--connect"
              :class="{ 'mp-ctrl--on': currentSource }"
              :title="t('music.connect_device')"
              v-bind="cp"
            >
              <v-icon icon="mdi-cast-audio" size="18" />
            </button>
          </template>
          <v-card min-width="260" rounded="lg" color="#1a1a28" border>
            <div class="px-3 pt-3 pb-1 text-caption" style="color:#64748b;font-weight:600;letter-spacing:.05em">
              {{ t('music.connect_device').toUpperCase() }}
            </div>
            <!-- Current device -->
            <div v-if="currentSource" class="mp-connect-current px-3 py-2">
              <v-icon :icon="deviceIcon(currentSource)" size="16" color="primary" />
              <div>
                <div class="mp-connect-current__name">{{ currentSource }}</div>
                <div class="mp-connect-current__label">{{ t('music.connect_now_playing') }}</div>
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
                {{ t('music.ma_section').toUpperCase() }}
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

        <!-- Volume: inline slider on desktop, popup on mobile -->
        <v-menu v-if="smAndDown" location="top" :close-on-content-click="false" offset="12">
          <template #activator="{ props: vp }">
            <button class="mp-vol-icon" v-bind="vp">
              <v-icon
                :icon="(volume ?? 0) > 0.5 ? 'mdi-volume-high' : (volume ?? 0) > 0 ? 'mdi-volume-medium' : 'mdi-volume-off'"
                size="18"
              />
            </button>
          </template>
          <v-card rounded="xl" color="#1a1a28" border min-width="200" class="pa-4">
            <div class="d-flex align-center ga-3">
              <v-icon icon="mdi-volume-off" size="18" style="color:#64748b" @click="toggleMute" />
              <v-slider
                :model-value="Math.round((volume ?? 0) * 100)"
                min="0" max="100" step="1"
                color="primary"
                track-color="#27273b"
                hide-details
                density="compact"
                style="flex:1;min-width:140px"
                @update:model-value="v => command('volume_set', { volume_level: v / 100 })"
              />
              <v-icon icon="mdi-volume-high" size="18" style="color:#64748b" />
            </div>
          </v-card>
        </v-menu>
        <template v-else>
          <button class="mp-vol-icon" @click="toggleMute">
            <v-icon
              :icon="(volume ?? 0) > 0.5 ? 'mdi-volume-high' : (volume ?? 0) > 0 ? 'mdi-volume-medium' : 'mdi-volume-off'"
              size="16"
            />
          </button>
          <div ref="volBarEl" class="mp-vol-track" style="touch-action:manipulation" @click="setVolFromClick">
            <div class="mp-vol-fill" :style="{ width: Math.round((volume ?? 0) * 100) + '%' }" />
            <div class="mp-vol-thumb" :style="{ left: Math.round((volume ?? 0) * 100) + '%' }" />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify'
import type { BrowseMediaNode, HAState } from '~/types/ha'
import type { MAItem, MASearchResult } from '~/composables/useMAClient'

const { t } = useI18n()
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

const activeEntityId = useLocalStorage('ha-music-player-entity', '')

watch(allPlayers, (players) => {
  // If stored entity no longer exists in the player list, fall back to first available
  const stillValid = players.some(p => p.entity_id === activeEntityId.value)
  if (!stillValid && players.length) {
    activeEntityId.value = players[0].entity_id
  }
}, { immediate: true })

// Remember the last explicitly chosen Spotify entity across player switches
const lastSpotifyEntityId = useLocalStorage('ha-music-spotify-entity', '')
watch(activeEntityId, (id) => { if (id.includes('spotify')) lastSpotifyEntityId.value = id })

// For library browsing: active Spotify > last used Spotify > first available Spotify
const spotifyEntityId = computed(() => {
  if (activeEntityId.value.includes('spotify')) return activeEntityId.value
  if (lastSpotifyEntityId.value && allPlayers.value.some(p => p.entity_id === lastSpotifyEntityId.value)) return lastSpotifyEntityId.value
  return allPlayers.value.find(p => p.entity_id.includes('spotify'))?.entity_id ?? ''
})

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
type View = 'home' | 'playlist' | 'search' | 'section'
const view = ref<View>('home')
const sidebarOpen = ref(false)
const mainEl = ref<HTMLElement | null>(null)

// Sidebar resize
const sidebarWidth = useLocalStorage('mp-sidebar-w', 244)
const sidebarCoversOnly = computed(() => sidebarWidth.value < 100)
function startSidebarResize(e: MouseEvent | TouchEvent) {
  if (smAndDown.value) return
  const startX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX
  const startW = sidebarWidth.value
  const onMove = (ev: Event) => {
    const x = 'touches' in ev ? (ev as TouchEvent).touches[0].clientX : (ev as MouseEvent).clientX
    sidebarWidth.value = Math.round(Math.max(52, Math.min(380, startW + x - startX)))
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    document.removeEventListener('touchmove', onMove)
    document.removeEventListener('touchend', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
  document.addEventListener('touchmove', onMove)
  document.addEventListener('touchend', onUp)
}

// Playlist header accent color (extracted from thumbnail via canvas)
const plAccentRgb = ref('')
async function extractAccentColor(imgUrl: string) {
  if (!imgUrl || !process.client) { plAccentRgb.value = ''; return }
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); img.src = imgUrl })
    const s = 40
    const canvas = document.createElement('canvas')
    canvas.width = s; canvas.height = s
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, s, s)
    const d = ctx.getImageData(0, 0, s, s).data
    let r = 0, g = 0, b = 0, n = 0
    for (let i = 0; i < d.length; i += 4) {
      const br = (d[i] + d[i + 1] + d[i + 2]) / 3
      if (br > 25 && br < 230) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++ }
    }
    plAccentRgb.value = n > 0 ? `${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)}` : ''
  } catch { plAccentRgb.value = '' }
}

// Compact track list (persisted)
const plCompact = useLocalStorage('mp-pl-compact', false)
const searchInputEl = ref<HTMLInputElement | null>(null)

interface SectionViewData {
  label: string
  spotifyItems: BrowseMediaNode[]
  maItems: MAItem[]
  isCircle: boolean
}
const activeSectionData = ref<SectionViewData | null>(null)

function goHome() { view.value = 'home'; sidebarOpen.value = false; activeSectionData.value = null }
function goSearch() {
  view.value = 'search'
  sidebarOpen.value = false
  nextTick(() => searchInputEl.value?.focus())
}
function openSectionView(data: SectionViewData) {
  activeSectionData.value = data
  view.value = 'section'
  sidebarOpen.value = false
  mainEl.value?.scrollTo({ top: 0, behavior: 'smooth' })
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

// Recently played first, then playlists, then rest
const SECTION_ORDER = ['current_user_recently_played', 'current_user_playlists', 'current_user_followed_artists', 'current_user_saved_albums']
const sortedSections = computed(() =>
  [...librarySections.value].sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(a.key)
    const bi = SECTION_ORDER.indexOf(b.key)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })
)


const CATEGORY_LABELS = computed<Record<string, string>>(() => ({
  current_user_playlists: t('music.cat_playlists'),
  current_user_followed_artists: t('music.cat_artists'),
  current_user_saved_albums: t('music.cat_albums'),
  current_user_saved_tracks: t('music.cat_liked'),
  current_user_recently_played: t('music.cat_recent'),
  current_user_top_artists: t('music.cat_top_artists'),
  current_user_top_tracks: t('music.cat_top_tracks'),
}))

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
      const categories = (root.children ?? []).filter(c => c.media_content_id in CATEGORY_LABELS.value)

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
          return { key: cat.media_content_id, label: CATEGORY_LABELS.value[cat.media_content_id]!, items: (node.children ?? []).slice(0, 12) }
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
watch(() => activePlaylist.value?.thumbnail, (url) => {
  url ? extractAccentColor(url) : (plAccentRgb.value = '')
}, { immediate: true })
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

// ── Play & Enqueue ─────────────────────────────────────────────
const playingItemId = ref<string | null>(null)

async function enqueueMAItem(item: MAItem, mode: 'replace' | 'next' | 'add') {
  if (mode === 'replace') { await playMAItem(item); return }
  if (!activeEntityId.value) return
  if (mode === 'add' && queueItems.value.some(qi => qi.media_item?.uri === item.uri || qi.name === item.name)) return
  playingItemId.value = item.uri
  try {
    await client.callService({
      domain: 'music_assistant',
      service: 'play_media',
      target: { entity_id: activeEntityId.value },
      service_data: { media_id: item.uri, media_type: item.media_type, enqueue: mode },
    })
    if (showQueue.value) setTimeout(fetchQueue, 800)
  } finally {
    playingItemId.value = null
  }
}

async function enqueueBrowseItem(item: BrowseMediaNode, mode: 'replace' | 'next' | 'add') {
  if (!activeEntityId.value) return
  if (mode === 'add' && queueItems.value.some(qi => qi.name === item.title || qi.media_item?.name === item.title)) return
  playingItemId.value = item.media_content_id
  try {
    await client.callService({
      domain: 'media_player',
      service: 'play_media',
      target: { entity_id: activeEntityId.value },
      service_data: {
        media_content_id: item.media_content_id,
        media_content_type: item.media_content_type,
        ...(mode !== 'replace' ? { enqueue: mode } : {}),
      },
    })
    if (showQueue.value) setTimeout(fetchQueue, 800)
  } finally {
    playingItemId.value = null
  }
}

async function playBrowseItem(item: BrowseMediaNode) {
  if (!activeEntityId.value) return
  playingItemId.value = item.media_content_id
  try {
    await client.callService({
      domain: 'media_player',
      service: 'play_media',
      target: { entity_id: activeEntityId.value },
      service_data: { media_content_id: item.media_content_id, media_content_type: item.media_content_type },
    })
  } finally {
    playingItemId.value = null
  }
}

async function playMAItem(item: MAItem) {
  playingItemId.value = item.uri
  try {
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
  } finally {
    playingItemId.value = null
  }
}

// ── MA recently played ─────────────────────────────────────────
const recentItems = ref<MAItem[]>([])

// ── Search ─────────────────────────────────────────────────────
const searchQuery = ref('')
const searchLoading = ref(false)
const searchError = ref(false)
const searchResults = ref<MASearchResult | null>(null)

const searchSections = computed(() => {
  const r = searchResults.value
  if (!r) return []
  return [
    { key: 'tracks', label: t('music.search_tracks'), items: r.tracks },
    { key: 'artists', label: t('music.search_artists'), items: r.artists },
    { key: 'albums', label: t('music.search_albums'), items: r.albums },
    { key: 'playlists', label: t('music.search_playlists'), items: r.playlists },
  ].filter(s => s.items.length)
})

async function doSearch() {
  if (!searchQuery.value.trim()) return
  searchLoading.value = true
  searchError.value = false
  searchResults.value = null
  try {
    searchResults.value = await search(searchQuery.value)
  } catch {
    searchError.value = true
  } finally {
    searchLoading.value = false
  }
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

// ── Queue ──────────────────────────────────────────────────────
interface QueueItem {
  queue_item_id: string
  name: string
  duration?: number
  sort_index: number
  media_item?: {
    name: string
    uri?: string
    artists?: Array<{ name: string }>
    album?: { name: string }
    metadata?: { images?: Array<{ type: string; path: string }> }
  }
}

function queueItemImage(item: QueueItem): string | undefined {
  const imgs = item.media_item?.metadata?.images
  if (!imgs?.length) return undefined
  const img = imgs.find(i => i.type === 'thumb') ?? imgs[0]
  return img?.path
}

function queueItemArtist(item: QueueItem): string {
  return item.media_item?.artists?.[0]?.name ?? item.media_item?.album?.name ?? ''
}

const showQueue = ref(false)
const queueLoading = ref(false)
const queueItems = ref<QueueItem[]>([])
const activeQueuePlayerId = ref('')
const queuePosition = computed(() => entity.value?.attributes?.queue_position as number | undefined)
const queueSize = computed(() => entity.value?.attributes?.queue_size as number | undefined)

// Find current track in queue by matching title, show only upcoming items
const currentQueueIdx = computed(() => {
  if (!title.value || !queueItems.value.length) return -1
  const t = title.value.toLowerCase()
  return queueItems.value.findIndex(item =>
    (item.media_item?.name ?? item.name).toLowerCase().includes(t) ||
    t.includes((item.media_item?.name ?? item.name).toLowerCase())
  )
})
const upcomingQueueItems = computed(() => {
  const idx = currentQueueIdx.value
  return idx >= 0 ? queueItems.value.slice(idx + 1) : queueItems.value
})

async function fetchQueue() {
  queueLoading.value = true
  queueItems.value = []
  try {
    // HA MA entities expose `active_queue` = the MA player/queue ID directly
    const activeQueue = entity.value?.attributes?.active_queue as string | undefined
    const res = await $fetch<{ player_id: string; items: QueueItem[] }>('/api/ma/queue', {
      query: { player_id: activeQueue ?? '' },
    })
    if (res.items.length > 0) {
      activeQueuePlayerId.value = res.player_id
      queueItems.value = res.items.slice(0, 100)
    }
  } catch { /* ignore */ }
  finally { queueLoading.value = false }
}

async function playQueueItem(item: QueueItem) {
  if (!activeQueuePlayerId.value) return
  try {
    await $fetch('/api/ma/queue-play', {
      method: 'POST',
      body: { queue_id: activeQueuePlayerId.value, index: item.queue_item_id },
    })
  } catch { /* ignore */ }
}

async function removeQueueItem(item: QueueItem) {
  if (!activeQueuePlayerId.value) return
  try {
    await $fetch('/api/ma/queue-manage', {
      method: 'POST',
      body: { action: 'remove', queue_id: activeQueuePlayerId.value, queue_item_id: item.queue_item_id },
    })
    await fetchQueue()
  } catch { /* ignore */ }
}

async function moveQueueItemToNext(item: QueueItem, indexInUpcoming: number) {
  if (!activeQueuePlayerId.value || indexInUpcoming === 0) return
  try {
    await $fetch('/api/ma/queue-manage', {
      method: 'POST',
      body: { action: 'move', queue_id: activeQueuePlayerId.value, queue_item_id: item.queue_item_id, pos_shift: -indexInUpcoming },
    })
    await fetchQueue()
  } catch { /* ignore */ }
}

function toggleQueue() {
  showQueue.value = !showQueue.value
  if (showQueue.value) {
    if (showLyrics.value) showLyrics.value = false
    fetchQueue()
  }
}

// Refresh queue when track changes
watch(title, () => { if (showQueue.value) fetchQueue() })
watch(activeEntityId, () => { if (showQueue.value) fetchQueue() })
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
.mp-topbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
}
.mp-sidebar-toggle {
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
  position: relative;
  transition: width 0.01s; /* allow resize without janky animation */
}
.mp-sidebar-resize-handle {
  position: absolute;
  right: -3px;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  z-index: 10;
}
.mp-sidebar-resize-handle:hover,
.mp-sidebar-resize-handle:active { background: rgba(var(--v-theme-primary), 0.3); }

/* Covers-only sidebar mode */
.mp-sidebar--covers .mp-nav { display: none; }
.mp-sidebar--covers .mp-lib-filters { display: none; }
.mp-sidebar--covers .mp-lib-item__text { display: none; }
.mp-sidebar--covers .mp-lib-item { padding: 3px; justify-content: center; }
.mp-sidebar--covers .mp-library { padding: 6px 4px; gap: 4px; }
.mp-sidebar--covers .mp-library-hdr { padding: 10px 4px 8px; justify-content: center; }

.mp-lib-collapse {
  margin-left: auto;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--mp-muted);
  padding: 2px 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.mp-lib-collapse:hover { color: var(--mp-text); background: var(--mp-surface); }
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
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  color: var(--mp-text);
  font-size: 13px;
  font-weight: 600;
  transition: background 0.12s, transform 0.12s;
  height: 52px;
}
.mp-quick-item:hover { background: var(--mp-surface-hov); transform: scale(1.02); }
.mp-quick-item:active { transform: scale(0.98); }
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

.mp-card-row {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 6px;
}
.mp-card-row::-webkit-scrollbar { display: none; }

/* Section header row with "Show all" */
.mp-section-hdr-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16px;
}
.mp-section-hdr-row .mp-section-hdr { margin-bottom: 0; }
.mp-show-all-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--mp-muted);
  font-size: 12px;
  font-weight: 600;
  padding: 2px 0;
  letter-spacing: 0.03em;
  transition: color 0.12s;
  flex-shrink: 0;
}
.mp-show-all-btn:hover { color: var(--mp-text); }

.mp-card {
  background: var(--mp-surface);
  border: none;
  border-radius: 10px;
  padding: 12px;
  cursor: pointer;
  text-align: left;
  color: var(--mp-text);
  transition: background 0.15s, transform 0.15s;
  flex: 0 0 160px;
  min-width: 0;
}
/* ── Section list view ──────────────────────────────────────── */
.mp-section-view-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}
.mp-section-view-back {
  background: var(--mp-surface);
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--mp-text);
  flex-shrink: 0;
  transition: background 0.12s;
}
.mp-section-view-back:hover { background: var(--mp-surface-hov); }
.mp-section-view-title { font-size: 26px; font-weight: 800; letter-spacing: -0.03em; }

.mp-list { display: flex; flex-direction: column; gap: 2px; }
.mp-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--mp-muted);
  text-align: left;
  width: 100%;
  transition: background 0.1s, color 0.1s;
}
.mp-list-item:hover { background: var(--mp-surface); color: var(--mp-text); }
.mp-list-item:hover .mp-list-item__play { opacity: 1; }
.mp-list-item__art {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--mp-surface);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mp-list-item__art--circle { border-radius: 50%; }
.mp-list-item__art img { width: 100%; height: 100%; object-fit: cover; }
.mp-list-item__info { flex: 1; min-width: 0; }
.mp-list-item__title { font-size: 14px; font-weight: 600; color: var(--mp-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mp-list-item__sub { font-size: 12px; color: var(--mp-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; }
.mp-list-item__play { color: var(--mp-muted); flex-shrink: 0; opacity: 0; transition: opacity 0.12s; }
.mp-card:hover { background: var(--mp-surface-hov); transform: translateY(-2px); }
.mp-card:active { transform: translateY(0) scale(0.98); }
.mp-card__art {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background: var(--mp-surface-hov);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  transition: box-shadow 0.2s;
}
.mp-card:hover .mp-card__art { box-shadow: 0 12px 32px rgba(0,0,0,0.4); }
.mp-card__art--circle { border-radius: 50%; }
.mp-card__art img { width: 100%; height: 100%; object-fit: cover; }
.mp-card__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 10px;
  opacity: 0;
  pointer-events: none; /* overlay itself is not clickable */
  background: linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%);
  transition: opacity 0.2s ease;
}
.mp-card:hover .mp-card__overlay { opacity: 1; }
.mp-card__play-btn {
  pointer-events: all; /* only the button is clickable */
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  transform: translateY(6px);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.mp-card:hover .mp-card__play-btn { transform: translateY(0); }
.mp-card__play-btn:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.5); transform: scale(1.06) translateY(0); }
.mp-card__play-btn:active { transform: scale(0.94); }
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

/* ── Playlist header (sticky) ───────────────────────────────── */
.mp-pl-header {
  position: sticky;
  top: 0;
  z-index: 5;
  background: linear-gradient(180deg, rgba(var(--pl-accent, 12, 12, 18), 0.55) 0%, var(--mp-bg) 100%);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  margin: -28px -28px 0;
  padding: 28px 28px 0;
  border-bottom: 1px solid var(--mp-border);
  transition: background 0.6s ease;
}
@media (max-width: 767px) {
  .mp-pl-header { margin: -20px -16px 0; padding: 20px 16px 0; }
}

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
.mp-action-btn.active { color: rgb(var(--v-theme-primary)); }

.mp-compact-toggle {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 4px;
  border: 1px solid var(--mp-border);
  background: none;
  cursor: pointer;
  color: var(--mp-muted);
  font-size: 12px;
  font-weight: 600;
  transition: color 0.12s, background 0.12s, border-color 0.12s;
}
.mp-compact-toggle:hover { color: var(--mp-text); background: var(--mp-surface); }
.mp-compact-toggle.active { color: rgb(var(--v-theme-primary)); border-color: rgba(var(--v-theme-primary), 0.4); }

/* Compact track list */
.mp-track-list--compact .mp-track { min-height: 32px; padding: 3px 0; }
.mp-track-list--compact .mp-track__art { display: none; }
.mp-track-list--compact .mp-track__info { font-size: 12px; }

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
  background: rgba(8, 8, 16, 0.92);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-top: 1px solid rgba(255,255,255,0.08);
  z-index: 10;
}
@media (max-width: 600px) {
  .mp-player {
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 6px;
    padding: 0 8px;
    --mp-player-h: 64px;
  }
  /* Center: only prev/play/next — hide shuffle, repeat, progress */
  .mp-player__center .mp-progress { display: none; }
  .mp-ctrl--shuffle,
  .mp-ctrl--repeat { display: none; }
  /* Right: hide desktop-only vol elements, connect, lyrics — keep queue + vol popup */
  .mp-vol-track,
  .mp-ctrl--connect,
  .mp-ctrl--lyrics { display: none; }
  /* Track info: smaller art */
  .mp-player__art { width: 42px; height: 42px; }
  .mp-player__title { font-size: 12px; }
  .mp-player__artist { font-size: 11px; }
}
.mp-player--idle .mp-ctrl--play { opacity: 0.5; }

.mp-player__track {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.mp-player__art {
  width: 52px;
  height: 52px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--mp-surface);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  transition: box-shadow 0.5s ease;
}
.mp-player__art--playing {
  box-shadow: 0 4px 24px rgba(var(--v-theme-primary), 0.3), 0 4px 16px rgba(0,0,0,0.5);
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
  transition: color 0.12s, background 0.12s, transform 0.1s;
}
.mp-ctrl:hover:not(:disabled) { color: var(--mp-text); background: var(--mp-surface); }
.mp-ctrl:active:not(:disabled) { transform: scale(0.88); }
.mp-ctrl:disabled { opacity: 0.3; cursor: default; }
.mp-ctrl--on { color: rgb(var(--v-theme-primary)) !important; }
.mp-ctrl--play {
  color: var(--mp-text) !important;
  background: var(--mp-surface-hov);
  border-radius: 50%;
  padding: 8px;
  transition: color 0.12s, background 0.12s, transform 0.12s;
}
.mp-ctrl--play:hover:not(:disabled) { background: #2a2a42; }
.mp-ctrl--play:active:not(:disabled) { transform: scale(0.92); }

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
  transition: height 0.15s ease;
}
.mp-progress:hover .mp-progress__track { height: 6px; }
.mp-progress__track:hover .mp-progress__thumb { opacity: 1; }
.mp-progress__fill {
  height: 100%;
  background: var(--mp-text);
  border-radius: 2px;
  transition: width 0.5s linear;
}
.mp-progress:hover .mp-progress__fill { background: rgb(var(--v-theme-primary)); }
.mp-progress__thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: var(--mp-text);
  opacity: 0;
  transition: opacity 0.15s;
  box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.2);
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
  padding: 0 22px;
  display: flex;
  flex-direction: column;
  gap: 0;
  scroll-behavior: smooth;
  position: relative;
  mask-image: linear-gradient(to bottom, transparent 0%, black 80px, black calc(100% - 80px), transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 80px, black calc(100% - 80px), transparent 100%);
}
.mp-lyrics-spacer { height: 60px; flex-shrink: 0; }

.mp-lyric-line {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.5;
  color: rgba(226, 232, 240, 0.18);
  cursor: pointer;
  border-radius: 8px;
  padding: 7px 8px;
  transition: color 0.4s ease, transform 0.4s ease, font-size 0.3s ease;
  transform-origin: left center;
}
.mp-lyric-line:hover {
  color: rgba(226, 232, 240, 0.5) !important;
  background: rgba(255,255,255,0.04);
}
.mp-lyric-line--past {
  color: rgba(226, 232, 240, 0.28);
}
.mp-lyric-line--active {
  color: var(--mp-text) !important;
  transform: scale(1.06);
  font-size: 22px;
}
.mp-lyric-line--next {
  color: rgba(226, 232, 240, 0.18);
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

/* ── Animated playing bars ──────────────────────────────────── */
.mp-playing-bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
  width: 20px;
  flex-shrink: 0;
}
.mp-playing-bar {
  flex: 1;
  border-radius: 1.5px;
  background: rgb(var(--v-theme-primary));
  animation: mp-bar 0.9s ease-in-out infinite;
  transform-origin: bottom;
}
.mp-playing-bar:nth-child(1) { animation-duration: 0.9s; height: 8px; }
.mp-playing-bar:nth-child(2) { animation-duration: 0.7s; animation-delay: 0.15s; height: 14px; }
.mp-playing-bar:nth-child(3) { animation-duration: 1.1s; animation-delay: 0.3s; height: 5px; }
@keyframes mp-bar {
  0%, 100% { transform: scaleY(0.35); }
  50% { transform: scaleY(1); }
}

/* ── Play button ────────────────────────────────────────────── */
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
  transition: transform 0.12s, box-shadow 0.12s;
  box-shadow: 0 4px 16px rgba(var(--v-theme-primary), 0.4);
}
.mp-play-btn:hover { transform: scale(1.06); box-shadow: 0 6px 24px rgba(var(--v-theme-primary), 0.5); }
.mp-play-btn:active { transform: scale(0.95); }

/* ── Section header ─────────────────────────────────────────── */
.mp-section-hdr {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 16px;
  color: var(--mp-text);
  letter-spacing: -0.02em;
}

/* ── Greeting ────────────────────────────────────────────────── */
.mp-greeting {
  font-size: 28px;
  font-weight: 800;
  color: var(--mp-text);
  margin: 0 0 24px;
  text-transform: capitalize;
  letter-spacing: -0.03em;
}

/* ── Lib item active ─────────────────────────────────────────── */
.mp-lib-item:hover { background: var(--mp-surface); color: var(--mp-text); }
.mp-lib-item:active { transform: scale(0.98); }
.mp-lib-item.active .mp-lib-item__name { color: rgb(var(--v-theme-primary)); }

/* ── Track list row ─────────────────────────────────────────── */
.mp-track:active { transform: scale(0.99); }

/* ── Top bar glow when playing ──────────────────────────────── */
.mp-topbar {
  background: var(--mp-bg);
  transition: box-shadow 0.5s ease;
}

/* ── prefers-reduced-motion ──────────────────────────────────── */
/* ── Track / list item menu button ──────────────────────────── */
.mp-track__menu-btn,
.mp-list-item__menu-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--mp-muted);
  padding: 4px 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.12s, color 0.12s, background 0.12s;
  flex-shrink: 0;
}
.mp-track:hover .mp-track__menu-btn,
.mp-list-item:hover .mp-list-item__menu-btn { opacity: 1; }
.mp-track__menu-btn:hover,
.mp-list-item__menu-btn:hover { color: var(--mp-text); background: var(--mp-surface-hov); }
/* Always visible on touch devices */
@media (hover: none) {
  .mp-track__menu-btn, .mp-list-item__menu-btn { opacity: 1; }
}

/* ── Queue panel ─────────────────────────────────────────────── */
.mp-queue-now {
  padding: 12px 14px 8px;
  border-bottom: 1px solid var(--mp-border);
  flex-shrink: 0;
}
.mp-queue-now__label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 8px;
}
.mp-queue-now__track {
  display: flex;
  align-items: center;
  gap: 10px;
}
.mp-queue-now__art {
  width: 40px; height: 40px;
  border-radius: 4px; overflow: hidden;
  background: var(--mp-surface); flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.mp-queue-now__art img { width: 100%; height: 100%; object-fit: cover; }
.mp-queue-now__info { flex: 1; min-width: 0; }
.mp-queue-now__title { font-size: 13px; font-weight: 600; color: var(--mp-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mp-queue-now__artist { font-size: 11px; color: var(--mp-muted); }

.mp-queue-next-label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--mp-muted);
  padding: 12px 14px 6px;
  flex-shrink: 0;
}

.mp-queue-item {
  display: flex; align-items: center; gap: 10px;
  padding: 7px 4px; border-radius: 6px;
  transition: background 0.1s;
}
.mp-queue-item:hover { background: var(--mp-surface); }
.mp-queue-item__num { width: 18px; text-align: right; font-size: 12px; color: var(--mp-muted); flex-shrink: 0; }
.mp-queue-item__art {
  width: 36px; height: 36px; border-radius: 3px; overflow: hidden;
  background: var(--mp-surface); flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.mp-queue-item__art img { width: 100%; height: 100%; object-fit: cover; }
.mp-queue-item__info { flex: 1; min-width: 0; }
.mp-queue-item__title { font-size: 13px; font-weight: 500; color: var(--mp-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mp-queue-item__artist { font-size: 11px; color: var(--mp-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mp-queue-item__dur { font-size: 11px; color: var(--mp-muted); flex-shrink: 0; }
.mp-queue-item .mp-track__menu-btn { opacity: 0; }
.mp-queue-item:hover .mp-track__menu-btn { opacity: 1; }
@media (hover: none) { .mp-queue-item .mp-track__menu-btn { opacity: 1; } }
.mp-queue-item--current { background: rgba(var(--v-theme-primary), 0.06); border-radius: 6px; }
.mp-queue-item--clickable { cursor: pointer; }
.mp-queue-item--clickable:hover { background: var(--mp-surface); }
.mp-queue-item--clickable:hover .mp-queue-item__num { opacity: 0; }
.mp-queue-item--clickable:hover::before {
  content: '';
  position: absolute;
  left: 4px;
  width: 14px;
  height: 14px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M8 5v14l11-7z'/%3E%3C/svg%3E") center/contain no-repeat;
}

/* Mobile: progress bar below the player as a thin strip */
@media (max-width: 600px) {
  .mp-player {
    position: relative;
  }
  .mp-player::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--mp-surface-hov);
  }
}

@media (prefers-reduced-motion: reduce) {
  .mp-playing-bar { animation: none !important; height: 8px !important; transform: none !important; }
  .mp-lyric-line { transition: color 0.1s; }
  .mp-lyric-line--active { transform: none; font-size: 20px; }
  .mp-quick-item, .mp-card, .mp-ctrl, .mp-play-btn { transition: background 0.1s, color 0.1s; transform: none !important; }
  .mp-lyrics-slide-enter-active, .mp-lyrics-slide-leave-active { transition: opacity 0.15s; }
  .mp-progress__track { transition: none; }
}
</style>
