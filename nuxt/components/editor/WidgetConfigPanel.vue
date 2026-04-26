<template>
  <UiSheet :open="open" side="right" width="420" :min-width="360" :max-width="760" resizable
    storage-key="ha-widget-config-panel-width" @close="$emit('close')">
    <template #header>
      <p class="text-subtitle-1 font-weight-semibold mb-2">{{ t('widget.config_title') }}</p>
    </template>

    <div v-if="widget" class="d-flex flex-column ga-3 config-panel">
      <!-- Widget type badge -->
      <div class="d-flex align-center ga-2 px-3 py-2 rounded-lg config-panel__badge"
        style="background: rgba(255,255,255,0.05)">
        <v-icon :icon="WIDGET_ICONS[widget.type] ?? 'mdi-widgets-outline'" size="18" color="primary" />
        <span class="text-body-2 font-weight-medium">{{ t(`widget.${widget.type}.label`) }}</span>
        <span v-if="cfg.name || cfg.entity_id" class="text-caption text-medium-emphasis text-truncate ml-1">
          — {{ cfg.name || cfg.entity_id }}
        </span>
      </div>

      <v-expansion-panels v-model="openSections" multiple variant="accordion" class="config-panel__sections">
        <v-expansion-panel v-if="hasGeneralSection" value="general" rounded="xl" elevation="0">
          <v-expansion-panel-title class="config-panel__section-title">
            {{ t('config.section_general') }}
          </v-expansion-panel-title>
          <v-expansion-panel-text class="config-panel__section-body">
            <!-- Entity -->
            <div v-if="showEntityField" class="config-panel__field-group">
              <p class="text-caption text-medium-emphasis mb-1 text-uppercase font-weight-medium">{{ t('config.entity')
              }}
              </p>
              <EntityPicker v-model="cfg.entity_id" :domain-filter="ENTITY_DOMAINS[widget.type]" />
            </div>

            <!-- Name -->
            <div v-if="showNameField" class="config-panel__field-group">
              <p class="text-caption text-medium-emphasis mb-1 text-uppercase font-weight-medium">
                {{ t('config.display_name') }}
              </p>
              <v-text-field v-model="cfg.name" :placeholder="t('config.display_name_hint')" density="compact"
                hide-details="auto" />
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel v-if="hasContentSection" value="content" rounded="xl" elevation="0">
          <v-expansion-panel-title class="config-panel__section-title">
            {{ t('config.section_content') }}
          </v-expansion-panel-title>
          <v-expansion-panel-text class="config-panel__section-body">
            <!-- Sensor -->
            <template v-if="widget.type === 'sensor'">
              <v-text-field v-model="cfg.unit" :label="t('config.unit')" :placeholder="t('config.unit_auto')" />
              <v-text-field v-model.number="cfg.decimal_places" :label="t('config.decimal_places')" type="number"
                min="0" max="5" :placeholder="t('config.unit_auto')" />
              <v-checkbox v-model="cfg.show_trend" :label="t('config.show_trend')" hide-details density="compact" />
            </template>

            <!-- Light -->
            <v-checkbox v-if="widget.type === 'light'" v-model="cfg.show_brightness"
              :label="t('config.show_brightness')" />

            <template v-if="widget.type === 'switch'">
              <UiIconPicker v-model="cfg.icon" :label="t('config.icon_field')" placeholder="mdi-toggle-switch-outline"
                density="compact" hide-details="auto" />
              <div class="config-panel__field-group">
                <p class="text-caption text-medium-emphasis mb-1 text-uppercase font-weight-medium">{{
                  t('config.sensor_entity') }}</p>
                <EntityPicker v-model="cfg.sensor_entity_id" :domain-filter="['sensor', 'binary_sensor']" />
              </div>
              <v-checkbox v-model="cfg.show_sensor_trend" :label="t('config.show_sensor_trend')" hide-details
                density="compact" />
            </template>

            <!-- Chart -->
            <template v-if="widget.type === 'chart'">
              <v-select v-model="cfg.period" :label="t('config.period')" :items="periodItems" />
              <v-select v-model="cfg.chart_type" :label="t('config.chart_type')" :items="chartTypeItems" />
              <UiColorPicker v-model="cfg.color" :label="t('config.line_color')" />
              <UiColorPicker v-if="cfg.chart_type === 'area'" v-model="cfg.area_color" :label="t('config.area_color')"
                clearable />
            </template>

            <!-- Appliance -->
            <template v-if="widget.type === 'appliance'">
              <div class="d-flex flex-column ga-2">
                <div class="config-panel__field-group">
                  <p class="text-caption text-medium-emphasis mb-1 text-uppercase font-weight-medium">{{
                    t('config.status_entity') }}</p>
                  <EntityPicker v-model="cfg.status_entity_id" />
                </div>
                <div class="config-panel__field-group">
                  <p class="text-caption text-medium-emphasis mb-1 text-uppercase font-weight-medium">{{
                    t('config.progress_entity') }}</p>
                  <EntityPicker v-model="cfg.progress_entity_id" />
                </div>
                <div class="config-panel__field-group">
                  <p class="text-caption text-medium-emphasis mb-1 text-uppercase font-weight-medium">{{
                    t('config.end_time_entity') }}</p>
                  <EntityPicker v-model="cfg.end_time_entity_id" />
                </div>
                <div class="config-panel__field-group">
                  <p class="text-caption text-medium-emphasis mb-1 text-uppercase font-weight-medium">{{
                    t('config.countdown_entity') }}</p>
                  <EntityPicker v-model="cfg.countdown_entity_id" />
                </div>
                <div class="config-panel__field-group">
                  <p class="text-caption text-medium-emphasis mb-1 text-uppercase font-weight-medium">{{
                    t('config.time_remaining_entity') }}</p>
                  <EntityPicker v-model="cfg.time_remaining_entity_id" />
                </div>
                <div class="config-panel__field-group">
                  <p class="text-caption text-medium-emphasis mb-1 text-uppercase font-weight-medium">{{
                    t('config.program_entity') }}</p>
                  <EntityPicker v-model="cfg.program_entity_id" />
                </div>
                <div class="config-panel__field-group">
                  <p class="text-caption text-medium-emphasis mb-1 text-uppercase font-weight-medium">{{
                    t('config.power_entity') }}</p>
                  <EntityPicker v-model="cfg.power_entity_id" />
                </div>
                <div class="config-panel__field-group">
                  <p class="text-caption text-medium-emphasis mb-1 text-uppercase font-weight-medium">{{
                    t('config.door_entity') }}</p>
                  <EntityPicker v-model="cfg.door_entity_id" />
                </div>
                <UiIconPicker v-model="cfg.icon" :label="t('config.icon_field')" placeholder="mdi-dishwasher"
                  density="compact" hide-details="auto" />
                <v-text-field v-model="cfg.running_state" :label="t('config.running_state')" placeholder="run"
                  density="compact" hide-details="auto" />
              </div>
            </template>

            <template v-if="widget.type === 'alarm'">
              <div class="d-flex flex-column ga-2">
                <div class="config-panel__field-group">
                  <p class="text-caption text-medium-emphasis mb-1 text-uppercase font-weight-medium">{{
                    t('config.entity') }}</p>
                  <EntityPicker v-model="cfg.entity_id" domain="alarm_control_panel" />
                </div>
                <UiIconPicker v-model="cfg.icon" :label="t('config.icon_field')" placeholder="mdi-shield-home-outline"
                  density="compact" hide-details="auto" />
                <v-text-field v-model="cfg.code" :label="t('config.alarm_code')" :hint="t('config.alarm_code_hint')"
                  type="password" density="compact" hide-details="auto" />
                <v-checkbox v-model="cfg.prompt_for_code" :label="t('config.alarm_code_prompt')"
                  :hint="t('config.alarm_code_prompt_hint')" density="compact" hide-details="auto" />
                <v-checkbox v-model="cfg.use_keypad" :label="t('config.alarm_code_keypad')"
                  :hint="t('config.alarm_code_keypad_hint')" density="compact" hide-details="auto" />
                <v-checkbox v-model="cfg.use_keypad_on_mobile" :label="t('config.alarm_code_keypad_mobile')"
                  :hint="t('config.alarm_code_keypad_mobile_hint')" density="compact" hide-details="auto" />
                <v-text-field v-model.number="cfg.code_length" :label="t('config.alarm_code_length')" type="number"
                  min="1" max="8" density="compact" hide-details="auto" />
                <div>
                  <p class="text-caption text-medium-emphasis mb-2">{{ t('config.actions_align') }}</p>
                  <v-btn-toggle v-model="cfg.actions_align" mandatory density="compact" color="primary" class="w-100">
                    <v-btn value="start" size="small" class="flex-1-1" icon="mdi-format-align-left"
                      :title="t('config.align_left')" />
                    <v-btn value="center" size="small" class="flex-1-1" icon="mdi-format-align-center"
                      :title="t('config.align_center')" />
                    <v-btn value="end" size="small" class="flex-1-1" icon="mdi-format-align-right"
                      :title="t('config.align_right')" />
                  </v-btn-toggle>
                </div>
              </div>
            </template>

            <!-- Cover / Cover Dial -->
            <!-- Cover Dial 2 -->
            <template v-if="widget.type === 'cover' || widget.type === 'cover_dial' || widget.type === 'cover_dial2'">
              <v-text-field v-model="cfg.name" :label="t('config.display_name')" density="compact" hide-details
                clearable />
              <v-checkbox v-model="cfg.compact" :label="t('config.compact_mode')" hide-details density="compact" />
              <UiColorPicker v-model="cfg.open_color" :label="t('config.open_color')" clearable />
              <UiColorPicker v-model="cfg.closed_color" :label="t('config.closed_color')" clearable />
            </template>

            <!-- Camera -->
            <template v-if="widget.type === 'camera'">
              <div>
                <div class="text-caption text-medium-emphasis mb-1">{{ t('config.light_entity') }}</div>
                <EntityPicker v-model="cfg.light_entity_id" :domain-filter="['light', 'switch']"
                  :placeholder="t('config.light_entity_placeholder')" />
              </div>
              <v-select
                v-model="cfg.stream_type"
                :items="[
                  { title: t('config.stream_type_webrtc'), value: 'webrtc' },
                  { title: t('config.stream_type_mjpeg'), value: 'mjpeg' },
                  { title: t('config.stream_type_snapshot'), value: 'snapshot' },
                ]"
                :label="t('config.stream_type')"
                :placeholder="t('config.stream_type_webrtc')"
                clearable
              />
              <v-text-field v-if="cfg.stream_type === 'snapshot'" v-model.number="cfg.refresh_interval"
                :label="t('config.refresh_interval')" type="number" min="1" />
            </template>

            <!-- Lock -->
            <template v-if="widget.type === 'lock'">
              <v-btn-toggle :model-value="cfg.lock_type ?? 'lock'" mandatory density="compact" variant="tonal"
                class="w-100" @update:model-value="cfg.lock_type = $event">
                <v-btn value="lock" class="flex-grow-1 text-none">
                  <v-icon icon="mdi-lock" size="16" class="mr-1" />{{ t('lock.type_label.lock') }}
                </v-btn>
                <v-btn value="gate" class="flex-grow-1 text-none">
                  <v-icon icon="mdi-garage" size="16" class="mr-1" />{{ t('lock.type_label.gate') }}
                </v-btn>
              </v-btn-toggle>
              <div class="d-flex ga-2">
                <UiIconPicker v-model="cfg.locked_icon" :label="t('config.locked_icon')" placeholder="mdi-lock"
                  class="flex-grow-1" />
                <UiIconPicker v-model="cfg.unlocked_icon" :label="t('config.unlocked_icon')"
                  placeholder="mdi-lock-open-variant" class="flex-grow-1" />
              </div>
              <EntityPicker v-model="cfg.door_sensor_entity" domain="binary_sensor"
                :placeholder="t('lock.door_sensor')" />
              <v-checkbox v-model="cfg.require_confirmation" :label="t('config.require_confirmation')" />
              <v-checkbox :model-value="cfg.show_door_button !== false" :label="t('config.show_door_button')"
                @update:model-value="cfg.show_door_button = $event ? undefined : false" />
            </template>

            <!-- Weather -->
            <template v-if="widget.type === 'weather'">
              <div>
                <p class="text-caption text-medium-emphasis mb-1">{{ t('config.forecast_rows', {
                  n: cfg.forecast_rows ??
                    3
                })
                }}</p>
                <v-slider v-model="cfg.forecast_rows" min="0" max="7" step="1" thumb-label />
                <p v-if="availableForecastDays !== null" class="text-caption text-medium-emphasis mt-1">
                  {{ t('config.forecast_available_days', { n: availableForecastDays }) }}
                </p>
              </div>
            </template>

            <!-- Clock -->
            <template v-if="widget.type === 'clock'">
              <div>
                <p class="text-caption text-medium-emphasis mb-2">{{ t('config.clock_style') }}</p>
                <v-btn-toggle v-model="cfg.style" mandatory density="compact" color="primary" class="w-100">
                  <v-btn value="default" size="small" class="flex-1-1">{{ t('config.clock_style_default') }}</v-btn>
                  <v-btn value="led" size="small" class="flex-1-1">{{ t('config.clock_style_led') }}</v-btn>
                </v-btn-toggle>
              </div>
              <v-checkbox v-model="cfg.format_24h" :label="t('config.format_24h')" />
              <v-checkbox v-model="cfg.show_seconds" :label="t('config.show_seconds')" />
              <v-checkbox v-model="cfg.show_date" :label="t('config.show_date')" />
            </template>

            <!-- Label -->
            <template v-if="widget.type === 'label'">
              <v-text-field v-model="cfg.text" :label="t('config.text')" :placeholder="t('config.text_placeholder')" />
              <v-select v-model="cfg.font_size" :label="t('config.font_size')" :items="fontSizeItems" />
            </template>

            <!-- Media Player -->
            <v-checkbox v-if="widget.type === 'media_player'" v-model="cfg.show_album_art"
              :label="t('config.show_album_art')" />

            <!-- Calendar -->
            <template v-if="widget.type === 'calendar'">
              <EntityPicker v-model="cfg.entity_id" domain="calendar" />
              <v-select v-model="cfg.days" :label="t('config.days')" :items="dayItems" />
              <v-checkbox v-model="cfg.show_time" :label="t('config.show_time')" />
            </template>

            <!-- Calendar v2 -->
            <template v-if="widget.type === 'calendar_v2'">
              <v-btn-toggle :model-value="cfg.view ?? 'month'" mandatory density="compact" variant="tonal" rounded="lg"
                class="w-100 mb-1" @update:model-value="cfg.view = $event">
                <v-btn value="day" class="flex-grow-1 text-none">{{ t('calendar_v2.day') }}</v-btn>
                <v-btn value="week" class="flex-grow-1 text-none">{{ t('calendar_v2.week') }}</v-btn>
                <v-btn value="month" class="flex-grow-1 text-none">{{ t('calendar_v2.month') }}</v-btn>
              </v-btn-toggle>
              <p class="text-caption text-medium-emphasis mb-1 text-uppercase font-weight-medium">{{
                t('calendar_v2.calendars') }}</p>
              <div v-for="(_, idx) in (cfg.calendars ?? [])" :key="idx" class="d-flex ga-2 align-center mb-1">
                <EntityPicker v-model="cfg.calendars[idx]" domain="calendar" class="flex-grow-1" />
                <v-btn icon="mdi-delete" size="x-small" variant="text" color="error"
                  @click="cfg.calendars.splice(idx, 1)" />
              </div>
              <v-btn prepend-icon="mdi-plus" variant="tonal" size="small" class="text-none"
                @click="cfg.calendars = [...(cfg.calendars ?? []), '']">
                {{ t('calendar_v2.add_calendar') }}
              </v-btn>
            </template>

            <!-- Person Widget -->
            <template v-if="widget.type === 'person'">
              <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium mb-1">{{ t('person.persons')
              }}</p>
              <div v-for="(p, idx) in cfg.persons" :key="idx" class="d-flex align-center ga-1 mb-1">
                <EntityPicker v-model="p.entity_id" domain="person" class="flex-grow-1" />
                <v-btn icon="mdi-delete" size="x-small" variant="text" color="error"
                  @click="cfg.persons.splice(idx, 1)" />
              </div>
              <v-btn prepend-icon="mdi-plus" variant="tonal" size="small" class="mt-1"
                @click="cfg.persons = [...(cfg.persons ?? []), { entity_id: '' }]">
                {{ t('person.add_person') }}
              </v-btn>
            </template>

            <!-- Energy Widget -->
            <template v-if="widget.type === 'energy'">
              <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium mb-1">{{ t('energy.grid') }}
              </p>
              <EntityPicker v-model="cfg.grid_entity_id" domain="sensor" />
              <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium mb-1">{{ t('energy.solar')
              }}</p>
              <EntityPicker v-model="cfg.solar_entity_id" domain="sensor" />
              <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium mb-1">{{ t('energy.battery')
              }}</p>
              <EntityPicker v-model="cfg.battery_entity_id" domain="sensor" />
            </template>

            <!-- Room Card -->
            <template v-if="widget.type === 'room_card'">
              <v-text-field v-model="cfg.name" :label="t('config.room_name')" />
              <EntityPicker v-model="cfg.climate_entity" domain="climate" />
              <v-checkbox v-model="cfg.show_temp_control" :label="t('config.show_temp_control')" />
              <EntityPicker v-model="cfg.light_entity" domain="light" />
              <v-divider />
              <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium">{{
                t('config.sensor_no_thermostat') }}</p>
              <EntityPicker v-model="cfg.sensor_entity" domain="sensor" />
              <UiIconPicker v-if="cfg.sensor_entity" v-model="cfg.sensor_icon" :label="t('config.icon_field')"
                placeholder="mdi-eye" />
              <v-select v-model="cfg.card_click_action" :label="t('config.card_click_action')"
                :items="roomCardActionItems" item-title="title" item-value="value" density="compact"
                hide-details="auto" />
              <v-select v-model="cfg.card_double_click_action" :label="t('config.card_double_click_action')"
                :items="roomCardActionItems" item-title="title" item-value="value" density="compact"
                hide-details="auto" />
              <v-select v-model="cfg.card_hold_action" :label="t('config.card_hold_action')"
                :items="roomCardActionItems" item-title="title" item-value="value" density="compact"
                hide-details="auto" />
              <v-divider />
              <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium">{{
                t('config.status_entities') }}
              </p>
              <template v-for="(slot, idx) in roomStatusEntities" :key="idx">
                <div class="d-flex align-center ga-1">
                  <span class="text-caption text-medium-emphasis flex-grow-1">{{ idx + 1 }}.</span>
                  <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click="removeStatusSlot(idx)" />
                </div>
                <EntityPicker v-model="slot.entity_id" :placeholder="`Entity ${idx + 1}`" />
                <div v-if="slot.entity_id" class="d-flex flex-column ga-2">
                  <UiIconPicker v-model="slot.icon" :label="t('config.icon_field')" placeholder="mdi-fire" />
                  <UiColorPicker v-model="slot.active_color" :label="t('config.active_color')" clearable />
                  <UiColorPicker v-model="slot.inactive_color" :label="t('config.inactive_color')" clearable />
                  <v-text-field v-model="slot.active_state" :label="t('config.active_state')"
                    :placeholder="t('config.active_state_hint')" density="compact" clearable hide-details />
                </div>
              </template>
              <v-btn prepend-icon="mdi-plus" variant="tonal" size="small" class="mt-1" @click="addStatusSlot">
                {{ t('config.add_status') }}
              </v-btn>
            </template>

            <!-- Status Bar -->
            <template v-if="widget.type === 'status_bar'">
              <v-checkbox v-model="cfg.show_labels" :label="t('config.show_labels')" hide-details density="compact" />
              <v-btn-toggle v-model="cfg.orientation" density="compact" rounded="lg" mandatory class="mb-1">
                <v-btn value="horizontal" size="small" prepend-icon="mdi-arrow-left-right">{{ t('config.horizontal')
                }}</v-btn>
                <v-btn value="vertical" size="small" prepend-icon="mdi-arrow-up-down">{{ t('config.vertical') }}</v-btn>
              </v-btn-toggle>
              <v-btn-toggle v-model="cfg.nav_position" density="compact" rounded="lg" mandatory class="mb-1">
                <v-btn value="start" size="small" prepend-icon="mdi-dock-left">{{ t('config.nav_start') }}</v-btn>
                <v-btn value="end" size="small" prepend-icon="mdi-dock-right">{{ t('config.nav_end') }}</v-btn>
              </v-btn-toggle>
              <v-divider />
              <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium">{{
                t('config.status_entities') }}</p>

              <!-- Compact entry list -->
              <div class="d-flex flex-column ga-1">
                <div v-for="(entry, idx) in statusBarEntries" :key="idx"
                  class="d-flex align-center ga-2 pa-2 rounded-lg" style="background: rgba(255,255,255,0.04)">
                  <v-icon
                    :icon="entry.entry_type === 'divider' ? 'mdi-minus' : (entry.icon || (entry.entry_type === 'group' ? 'mdi-lightbulb-group-outline' : entry.entry_type === 'nav' ? 'mdi-arrow-right-circle' : entry.entry_type === 'room' ? 'mdi-sofa-outline' : 'mdi-circle'))"
                    size="18" class="flex-shrink-0" />
                  <div class="flex-grow-1 text-body-2 text-truncate" style="min-width:0">
                    {{ entry.entry_type === 'divider' ? t('config.entry_type_divider') : (entry.label || entry.entity_id
                      || (entry.entry_type === 'group' ? entryGroupSummary(entry) : entry.entry_type === 'nav' ?
                        entry.dashboard_id : entry.entry_type === 'room' ? (entry.light_entity || entry.climate_entity ||
                          entry.sensor_entity || 'room') : '—')) }}
                  </div>
                  <v-chip
                    :color="entry.entry_type === 'group' ? 'primary' : entry.entry_type === 'nav' ? 'secondary' : entry.entry_type === 'room' ? 'warning' : entry.entry_type === 'divider' ? 'medium-emphasis' : undefined"
                    size="x-small" variant="tonal" class="flex-shrink-0">
                    {{ entry.entry_type === 'group' ? t('config.entry_type_group') : entry.entry_type === 'nav' ?
                      t('config.entry_type_nav') : entry.entry_type === 'room' ? t('config.entry_type_room') :
                        entry.entry_type === 'divider' ? t('config.entry_type_divider') : t('config.entry_type_single') }}
                  </v-chip>
                  <div class="d-flex align-center ga-1 flex-shrink-0">
                    <v-btn icon="mdi-chevron-up" size="x-small" variant="text" :disabled="idx === 0"
                      :title="t('config.move_up')" @click="moveStatusBarEntry(idx, -1)" />
                    <v-btn icon="mdi-chevron-down" size="x-small" variant="text"
                      :disabled="idx === statusBarEntries.length - 1" :title="t('config.move_down')"
                      @click="moveStatusBarEntry(idx, 1)" />
                  </div>
                  <v-btn v-if="entry.entry_type !== 'divider'" icon="mdi-pencil-outline" size="x-small" variant="text"
                    @click="openEntryDialog(idx)" />
                  <v-btn icon="mdi-delete" size="x-small" variant="text" color="error"
                    @click="removeStatusBarEntry(idx)" />
                </div>
              </div>

              <div class="d-flex flex-column ga-1 mt-2">
                <v-btn prepend-icon="mdi-plus" variant="tonal" size="small" block
                  class="statusbar-add-btn statusbar-add-btn--single" @click="addStatusBarEntry">
                  {{ t('config.add_status') }}
                </v-btn>
                <v-btn prepend-icon="mdi-plus" variant="tonal" size="small" block color="primary"
                  class="statusbar-add-btn statusbar-add-btn--group" @click="addStatusBarGroupEntry">
                  {{ t('config.add_group') }}
                </v-btn>
                <v-btn prepend-icon="mdi-plus" variant="tonal" size="small" block color="warning"
                  class="statusbar-add-btn statusbar-add-btn--room" @click="addStatusBarRoomEntry">
                  {{ t('config.add_room') }}
                </v-btn>
                <v-btn prepend-icon="mdi-minus" variant="tonal" size="small" block
                  class="statusbar-add-btn statusbar-add-btn--divider" @click="addStatusBarDividerEntry">
                  {{ t('config.add_divider') }}
                </v-btn>
                <v-btn prepend-icon="mdi-plus" variant="tonal" size="small" block color="secondary"
                  class="statusbar-add-btn statusbar-add-btn--nav" @click="addStatusBarNavEntry">
                  {{ t('config.add_nav') }}
                </v-btn>
              </div>

              <!-- Entry edit dialog -->
              <StatusBarEntryDialog v-if="editingEntryIdx !== null" v-model="entryDialogOpen"
                :entry="statusBarEntries[editingEntryIdx]" @save="saveEntryDialog" />
            </template>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel value="appearance" rounded="xl" elevation="0">
          <v-expansion-panel-title class="config-panel__section-title">
            {{ t('config.section_appearance') }}
          </v-expansion-panel-title>
          <v-expansion-panel-text class="config-panel__section-body">
            <div class="d-flex align-center ga-2">
              <UiColorPicker v-model="appearance.bg_color" :label="t('config.bg_color')" clearable class="flex-grow-1"
                :disabled="appearance.bg_color === 'transparent'" />
              <v-btn size="small" variant="tonal" density="comfortable"
                :color="appearance.bg_color === 'transparent' ? 'primary' : undefined"
                :title="t('config.bg_transparent')"
                @click="appearance.bg_color = appearance.bg_color === 'transparent' ? undefined : 'transparent'">T</v-btn>
            </div>
            <div v-if="appearance.bg_color && appearance.bg_color !== 'transparent'">
              <div class="d-flex align-center justify-space-between ga-3 mb-1">
                <p class="text-caption text-medium-emphasis mb-0">
                  {{ t('config.bg_opacity', { n: appearance.bg_opacity ?? 100 }) }}
                </p>
                <v-chip size="small" variant="tonal" color="primary">
                  {{ appearance.bg_opacity ?? 100 }}%
                </v-chip>
              </div>
              <v-slider v-model="appearance.bg_opacity" min="0" max="100" step="5" hide-details />
            </div>
            <UiColorPicker v-model="appearance.border_color" :label="t('config.border_color')" clearable />
            <UiColorPicker v-model="appearance.active_color" :label="t('config.active_color')" clearable />
            <UiColorPicker v-model="appearance.text_color" :label="t('config.text_color')" clearable />
            <v-checkbox v-if="widget?.type === 'appliance'" v-model="cfg.compact" :label="t('config.compact_mode')"
              density="compact" hide-details />
            <v-checkbox v-model="appearance.disable_glass" :label="t('config.disable_glass')"
              :hint="t('config.disable_glass_hint')" density="compact" hide-details="auto" />

            <div>
              <p class="text-caption text-medium-emphasis mb-1">{{ t('config.border_width', {
                n: appearance.border_width ??
                  '–'
              })
                }}</p>
              <v-slider v-model="appearance.border_width" min="0" max="8" step="1" thumb-label />
            </div>

            <v-text-field v-model.number="appearance.min_width" :label="t('config.min_width')"
              :hint="currentWidgetWidth ? t('config.min_width_hint', { n: currentWidgetWidth }) : undefined"
              persistent-hint type="number" min="0" placeholder="–" clearable />
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <p v-else class="text-medium-emphasis text-body-2">{{ t('widget.none_selected') }}</p>
  </UiSheet>
</template>

<script setup lang="ts">
import type { WidgetType, WidgetAppearance } from '~/types/dashboard'

const entityStore = useEntityStore()
const { t } = useI18n()
defineProps<{ open: boolean }>()
defineEmits<{ close: [] }>()

const dashboardStore = useDashboardStore()
const widget = computed(() => dashboardStore.dashboard?.widgets.find((w) => w.id === dashboardStore.selectedWidgetId))
const openSections = ref(['general', 'content', 'appearance'])

const currentWidgetWidth = ref<number | null>(null)
watch(() => dashboardStore.selectedWidgetId, async (id) => {
  if (!id) { currentWidgetWidth.value = null; return }
  await nextTick()
  const el = document.querySelector(`[gs-id="${id}"] .grid-stack-item-content`)
  currentWidgetWidth.value = el ? Math.round(el.getBoundingClientRect().width) : null
}, { immediate: true })
const cfg = computed(() => (widget.value?.config ?? {}) as Record<string, unknown>)

watch(widget, (w) => { if (w && !w.appearance) w.appearance = {} }, { immediate: true })
const appearance = computed(() => (widget.value?.appearance ?? {}) as WidgetAppearance)

const ENTITY_FIELD_EXCLUDED_TYPES: WidgetType[] = ['clock', 'label', 'room_card', 'calendar', 'calendar_v2', 'person', 'energy', 'status_bar', 'appliance', 'alarm']
const NAME_FIELD_EXCLUDED_TYPES: WidgetType[] = ['clock', 'room_card', 'status_bar', 'calendar_v2']
const CONTENT_SECTION_TYPES = new Set<WidgetType>([
  'sensor', 'switch', 'light', 'chart', 'appliance', 'cover', 'cover_dial', 'cover_dial2', 'camera', 'lock',
  'weather', 'clock', 'label', 'media_player', 'calendar', 'calendar_v2', 'person', 'energy', 'alarm',
  'room_card', 'status_bar',
])

const showEntityField = computed(() => !!widget.value && !ENTITY_FIELD_EXCLUDED_TYPES.includes(widget.value.type))
const showNameField = computed(() => !!widget.value && !NAME_FIELD_EXCLUDED_TYPES.includes(widget.value.type))
const hasGeneralSection = computed(() => showEntityField.value || showNameField.value)
const hasContentSection = computed(() => !!widget.value && CONTENT_SECTION_TYPES.has(widget.value.type))

watch(widget, (currentWidget) => {
  openSections.value = [
    ...(currentWidget && hasGeneralSection.value ? ['general'] : []),
    ...(currentWidget && hasContentSection.value ? ['content'] : []),
    'appearance',
  ]
}, { immediate: true })

const WIDGET_ICONS: Partial<Record<WidgetType, string>> = {
  sensor: 'mdi-gauge', switch: 'mdi-toggle-switch-outline', light: 'mdi-lightbulb-outline',
  chart: 'mdi-chart-line', camera: 'mdi-cctv', thermostat: 'mdi-thermostat',
  media_player: 'mdi-play-circle-outline', cover: 'mdi-window-shutter',
  cover_dial: 'mdi-window-shutter', cover_dial2: 'mdi-window-shutter',
  lock: 'mdi-lock-outline', weather: 'mdi-weather-partly-cloudy',
  clock: 'mdi-clock-outline', label: 'mdi-format-text', room_card: 'mdi-floor-plan',
  calendar: 'mdi-calendar-outline', calendar_v2: 'mdi-calendar-month-outline', person: 'mdi-account-group-outline',
  energy: 'mdi-lightning-bolt', appliance: 'mdi-dishwasher', alarm: 'mdi-shield-home-outline', status_bar: 'mdi-view-list-outline',
}

const ENTITY_DOMAINS: Partial<Record<WidgetType, string | string[]>> = {
  sensor: ['sensor', 'binary_sensor'], switch: 'switch', light: 'light', camera: 'camera',
  thermostat: 'climate', media_player: 'media_player', cover: 'cover', cover_dial: 'cover', cover_dial2: 'cover',
  lock: 'lock', weather: 'weather',
}

const periodItems = computed(() => [
  { title: t('config.period_1h'), value: '1h' }, { title: t('config.period_6h'), value: '6h' },
  { title: t('config.period_24h'), value: '24h' }, { title: t('config.period_7d'), value: '7d' },
  { title: t('config.period_30d'), value: '30d' },
])
const chartTypeItems = computed(() => [
  { title: t('config.chart_line'), value: 'line' },
  { title: t('config.chart_area'), value: 'area' },
  { title: t('config.chart_bar'), value: 'bar' },
])
const fontSizeItems = computed(() => [
  { title: t('config.font_sm'), value: 'sm' }, { title: t('config.font_md'), value: 'md' },
  { title: t('config.font_lg'), value: 'lg' }, { title: t('config.font_xl'), value: 'xl' },
])
const dayItems = computed(() => [
  { title: t('config.days_1'), value: 1 }, { title: t('config.days_3'), value: 3 },
  { title: t('config.days_7'), value: 7 }, { title: t('config.days_14'), value: 14 },
])
const roomCardActionItems = computed(() => [
  { title: t('config.action_none'), value: 'none' },
  { title: t('config.action_toggle_light'), value: 'toggle_light' },
  { title: t('config.action_open_light_detail'), value: 'open_light_detail' },
  { title: t('config.action_open_climate_detail'), value: 'open_climate_detail' },
])

const availableForecastDays = ref<number | null>(null)

watch(() => [widget.value?.type, cfg.value.entity_id] as const, async ([type, entityId]) => {
  if (type !== 'weather' || typeof entityId !== 'string' || !entityId) {
    availableForecastDays.value = null
    return
  }
  try {
    const data = await $fetch<Array<unknown>>(`/api/ha/weather-forecast?entityId=${encodeURIComponent(entityId)}`)
    availableForecastDays.value = Array.isArray(data) ? data.length : 0
  } catch {
    availableForecastDays.value = null
  }
}, { immediate: true })

const roomStatusEntities = computed(() => (cfg.value.status_entities as Array<Record<string, unknown>>) ?? [])

function addStatusSlot() {
  const list = [...roomStatusEntities.value]
  list.push({ entity_id: '', icon: 'mdi-circle', active_color: undefined })
  cfg.value.status_entities = list
}

function removeStatusSlot(index: number) {
  const list = [...roomStatusEntities.value]
  list.splice(index, 1)
  cfg.value.status_entities = list
}

const statusBarEntries = computed(() => (cfg.value.entries as Array<Record<string, unknown>>) ?? [])

const entryDialogOpen = ref(false)
const editingEntryIdx = ref<number | null>(null)

function openEntryDialog(idx: number) {
  editingEntryIdx.value = idx
  entryDialogOpen.value = true
}

function saveEntryDialog(updated: Record<string, unknown>) {
  const list = [...statusBarEntries.value]
  if (editingEntryIdx.value !== null) list[editingEntryIdx.value] = updated
  cfg.value.entries = list
}

function entryGroupSummary(entry: Record<string, unknown>) {
  const filter = entry.filter as Record<string, unknown> | undefined
  if (!filter) return t('config.entry_type_group')

  const parts: string[] = []
  const domains = (filter.domains as string[] | undefined)?.filter(Boolean) ?? []
  const areas = (filter.areas as string[] | undefined)?.filter(Boolean) ?? []
  const labels = (filter.labels as string[] | undefined)?.filter(Boolean) ?? []

  if (domains.length) parts.push(domains.join(', '))

  if (areas.length) {
    const areaNames = areas
      .map(id => entityStore.areas.find((area) => area.area_id === id)?.name ?? id)
      .filter(Boolean)
    if (areaNames.length) parts.push(areaNames.join(', '))
  }

  if (labels.length) {
    const labelNames = labels
      .map(id => entityStore.labels.find((label) => label.label_id === id)?.name ?? id)
      .filter(Boolean)
    if (labelNames.length) parts.push(labelNames.join(', '))
  }

  return parts.join(' · ') || t('config.entry_type_group')
}

function addStatusBarEntry() {
  const list = [...statusBarEntries.value]
  list.push({ entity_id: '', icon: 'mdi-circle', active_state: 'on' })
  cfg.value.entries = list
  openEntryDialog(list.length - 1)
}

function addStatusBarNavEntry() {
  const list = [...statusBarEntries.value]
  list.push({ entry_type: 'nav', icon: 'mdi-arrow-right-circle-outline', label: '', dashboard_id: '' })
  cfg.value.entries = list
  openEntryDialog(list.length - 1)
}

function addStatusBarRoomEntry() {
  const list = [...statusBarEntries.value]
  list.push({
    entry_type: 'room',
    icon: 'mdi-sofa-outline',
    label: '',
    light_entity: '',
    climate_entity: '',
    sensor_entity: '',
    status_entities: [],
    active_source: 'light',
  })
  cfg.value.entries = list
  openEntryDialog(list.length - 1)
}

function addStatusBarGroupEntry() {
  const list = [...statusBarEntries.value]
  list.push({ entry_type: 'group', icon: 'mdi-lightbulb-group-outline', filter: { domains: ['light'] }, show_badge: true })
  cfg.value.entries = list
  openEntryDialog(list.length - 1)
}

function addStatusBarDividerEntry() {
  const list = [...statusBarEntries.value]
  list.push({ entry_type: 'divider' })
  cfg.value.entries = list
}

function removeStatusBarEntry(index: number) {
  const list = [...statusBarEntries.value]
  list.splice(index, 1)
  cfg.value.entries = list
}

function moveStatusBarEntry(index: number, direction: -1 | 1) {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= statusBarEntries.value.length) return

  const list = [...statusBarEntries.value]
  const [entry] = list.splice(index, 1)
  list.splice(targetIndex, 0, entry)
  cfg.value.entries = list
}
</script>

<style scoped>
.config-panel {
  padding-bottom: 8px;
}

.config-panel__badge {
  min-height: 0;
}

.config-panel__sections :deep(.v-expansion-panel) {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.config-panel__sections :deep(.v-expansion-panel-title) {
  min-height: 52px;
  padding: 0 16px;
}

.config-panel__sections :deep(.v-expansion-panel-text__wrapper) {
  padding: 0 16px 16px;
}

.config-panel__section-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.statusbar-add-btn {
  border: 1px solid transparent;
  font-weight: 650;
}

.statusbar-add-btn--single {
  background: rgba(var(--v-theme-info), 0.22) !important;
  border-color: rgba(var(--v-theme-info), 0.28);
  color: rgb(var(--v-theme-info)) !important;
}

.statusbar-add-btn--group {
  background: rgba(var(--v-theme-primary), 0.24) !important;
  border-color: rgba(var(--v-theme-primary), 0.32);
  color: rgb(var(--v-theme-primary)) !important;
}

.statusbar-add-btn--room {
  background: rgba(var(--v-theme-warning), 0.24) !important;
  border-color: rgba(var(--v-theme-warning), 0.32);
  color: rgb(var(--v-theme-warning)) !important;
}

.statusbar-add-btn--divider {
  background: rgba(var(--v-theme-on-surface), 0.11) !important;
  border-color: rgba(var(--v-theme-on-surface), 0.2);
  color: rgba(var(--v-theme-on-surface), 0.84) !important;
}

.statusbar-add-btn--nav {
  background: rgba(var(--v-theme-success), 0.22) !important;
  border-color: rgba(var(--v-theme-success), 0.38);
  color: rgb(var(--v-theme-success)) !important;
}

.config-panel__field-group :deep(.v-input) {
  margin-top: 0;
}

.config-panel__field-group :deep(.v-field__input) {
  min-height: 40px;
}

.config-panel :deep(.v-input) {
  margin-top: 0;
}

.config-panel :deep(.v-selection-control) {
  min-height: 36px;
}

.config-panel :deep(.v-field__input) {
  min-height: 40px;
  padding-top: 8px;
  padding-bottom: 8px;
}
</style>
