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
              <EntityPicker v-model="cfg.entity_id" :domain-filter="WIDGET_ENTITY_DOMAINS[widget.type]"
                :numeric-only="widget.type === 'gauge'" />
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

            <template v-if="widget.type === 'gauge'">
              <div class="d-flex flex-column ga-3">
                <v-text-field v-model="cfg.unit" :label="t('config.unit')" :placeholder="t('config.unit_auto')"
                  density="compact" hide-details="auto" />
                <v-text-field v-model.number="cfg.decimal_places" :label="t('config.decimal_places')" type="number"
                  min="0" max="5" :placeholder="t('config.unit_auto')" density="compact" hide-details="auto" />
                <v-select v-model="cfg.value_position" :label="t('config.gauge_value_position')"
                  :items="gaugeValuePositionItems" item-title="title" item-value="value" density="compact"
                  hide-details="auto" />
                <v-select v-model="cfg.severity_direction" :label="t('config.gauge_severity_direction')"
                  :items="gaugeSeverityDirectionItems" item-title="title" item-value="value" density="compact"
                  hide-details="auto" />
                <div class="d-flex ga-3">
                  <v-text-field v-model.number="cfg.min" :label="t('config.gauge_min')" type="number" density="compact"
                    hide-details="auto" />
                  <v-text-field v-model.number="cfg.max" :label="t('config.gauge_max')" type="number" density="compact"
                    hide-details="auto" />
                </div>
                <div class="d-flex ga-3">
                  <v-text-field v-model.number="cfg.yellow_from" :label="gaugeYellowThresholdLabel" type="number"
                    density="compact" hide-details="auto" />
                  <v-text-field v-model.number="cfg.red_from" :label="gaugeRedThresholdLabel" type="number"
                    density="compact" hide-details="auto" />
                </div>
                <div class="d-flex ga-3">
                  <UiColorPicker v-model="gaugeGreenColor" :label="t('config.gauge_green')" clearable
                    class="flex-1-1" />
                  <UiColorPicker v-model="gaugeYellowColor" :label="t('config.gauge_yellow')" clearable
                    class="flex-1-1" />
                  <UiColorPicker v-model="gaugeRedColor" :label="t('config.gauge_red')" clearable class="flex-1-1" />
                </div>
              </div>
            </template>

            <template v-if="widget.type === 'template'">
              <v-textarea v-model="cfg.template" :label="t('config.template')" rows="12" auto-grow density="compact"
                hide-details="auto" />
              <v-text-field v-model.number="cfg.refresh_interval" :label="t('config.refresh_interval')" type="number"
                min="5" suffix="s" density="compact" hide-details="auto" />
            </template>

            <!-- Light -->
            <template v-if="widget.type === 'light'">
              <v-checkbox v-model="cfg.show_brightness" :label="t('config.show_brightness')" />
              <v-select v-model="cfg.card_click_action" :label="t('config.card_click_action')"
                :items="lightTapActionItems" item-title="title" item-value="value" density="compact" hide-details="auto"
                clearable />
              <v-select v-model="cfg.card_double_click_action" :label="t('config.card_double_click_action')"
                :items="lightTapActionItems" item-title="title" item-value="value" density="compact" hide-details="auto"
                clearable />
            </template>

            <template v-if="widget.type === 'switch'">
              <UiIconPicker v-model="iconModel" :label="t('config.icon_field')" placeholder="mdi-toggle-switch-outline"
                density="compact" hide-details="auto" />
              <div class="config-panel__field-group">
                <p class="text-caption text-medium-emphasis mb-1 text-uppercase font-weight-medium">{{
                  t('config.sensor_entity') }}</p>
                <EntityPicker v-model="cfg.sensor_entity_id" :domain-filter="['sensor', 'binary_sensor']" />
              </div>
              <v-checkbox v-model="cfg.show_sensor_trend" :label="t('config.show_sensor_trend')" hide-details
                density="compact" />
            </template>

            <template v-if="widget.type === 'button'">
              <UiIconPicker v-model="iconModel" :label="t('config.icon_field')" placeholder="mdi-gesture-tap-button"
                density="compact" hide-details="auto" />
            </template>

            <template v-if="widget.type === 'select'">
              <UiIconPicker v-model="iconModel" :label="t('config.icon_field')" placeholder="mdi-form-dropdown"
                density="compact" hide-details="auto" />
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

            <template v-if="widget.type === 'problem_overview'">
              <div class="d-flex flex-column ga-2">
                <v-text-field v-model.number="cfg.battery_threshold" :label="t('config.problem_battery_threshold')"
                  type="number" min="1" max="100" suffix="%" density="compact" hide-details="auto" />
                <v-text-field v-model.number="cfg.max_items" :label="t('config.problem_max_items')" type="number"
                  min="1" max="50" density="compact" hide-details="auto" />
                <v-checkbox v-model="cfg.show_batteries" :label="t('config.problem_show_batteries')" hide-details
                  density="compact" />
                <v-checkbox v-model="cfg.show_unavailable" :label="t('config.problem_show_unavailable')" hide-details
                  density="compact" />
                <v-combobox v-model="ignoredOfflinePlatformsModel" :items="DEFAULT_IGNORED_OFFLINE_PLATFORMS"
                  :label="t('config.problem_ignored_offline_platforms')" multiple chips closable-chips clearable
                  density="compact" hide-details="auto" />
                <v-combobox v-model="ignoredOfflineDomainsModel" :items="DEFAULT_IGNORED_OFFLINE_DOMAINS"
                  :label="t('config.problem_ignored_offline_domains')" multiple chips closable-chips clearable
                  density="compact" hide-details="auto" />
                <v-checkbox v-model="cfg.show_openings" :label="t('config.problem_show_openings')" hide-details
                  density="compact" />
                <v-checkbox v-model="cfg.show_updates" :label="t('config.problem_show_updates')" hide-details
                  density="compact" />
                <v-checkbox v-model="cfg.show_alerts" :label="t('config.problem_show_alerts')" hide-details
                  density="compact" />
                <v-checkbox v-model="cfg.show_repairs" :label="t('config.problem_show_repairs')" hide-details
                  density="compact" />
                <v-checkbox v-model="cfg.show_system" :label="t('config.problem_show_system')" hide-details
                  density="compact" />
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
              <v-select v-model="cfg.stream_type" :items="[
                { title: t('config.stream_type_webrtc'), value: 'webrtc' },
                { title: t('config.stream_type_mjpeg'), value: 'mjpeg' },
                { title: t('config.stream_type_snapshot'), value: 'snapshot' },
              ]" :label="t('config.stream_type')" :placeholder="t('config.stream_type_webrtc')" clearable />
              <v-text-field v-if="cfg.stream_type === 'snapshot'" v-model.number="cfg.refresh_interval"
                :label="t('config.refresh_interval')" type="number" min="1" />
              <div>
                <div class="text-caption text-medium-emphasis mb-1">{{ t('config.light_entity') }}</div>
                <EntityPicker v-model="cfg.light_entity_id" :domain-filter="['light', 'switch']"
                  :placeholder="t('config.light_entity_placeholder')" />
              </div>
              <v-divider />
              <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium">{{
                t('config.camera_status_entities') }}</p>
              <div class="d-flex flex-column ga-1">
                <div v-for="(entry, idx) in cameraStatusEntries" :key="idx"
                  class="d-flex align-center ga-2 pa-2 rounded-lg" style="background: rgba(255,255,255,0.04)">
                  <v-icon :icon="entry.icon || 'mdi-circle'" size="18" class="flex-shrink-0" />
                  <div class="flex-grow-1 text-body-2 text-truncate" style="min-width:0">{{ entry.label ||
                    entry.entity_id || '—' }}</div>
                  <div class="d-flex align-center ga-1 flex-shrink-0">
                    <v-btn icon="mdi-chevron-up" size="x-small" variant="text" :disabled="idx === 0"
                      :title="t('config.move_up')" @click="moveCameraStatusEntry(idx, -1)" />
                    <v-btn icon="mdi-chevron-down" size="x-small" variant="text"
                      :disabled="idx === cameraStatusEntries.length - 1" :title="t('config.move_down')"
                      @click="moveCameraStatusEntry(idx, 1)" />
                  </div>
                  <v-btn icon="mdi-pencil-outline" size="x-small" variant="text" @click="openCameraStatusDialog(idx)" />
                  <v-btn icon="mdi-delete" size="x-small" variant="text" color="error"
                    @click="removeCameraStatusEntry(idx)" />
                </div>
              </div>
              <v-btn prepend-icon="mdi-plus" variant="tonal" size="small" block @click="addCameraStatusEntry">
                {{ t('config.add_camera_status') }}
              </v-btn>
              <LazyStatusBarEntryDialog v-if="editingCameraStatusIdx !== null" v-model="cameraStatusDialogOpen"
                :entry="cameraStatusEntries[editingCameraStatusIdx]" @save="saveCameraStatusEntry" />
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
              <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium">{{
                t('config.weather_details') }}</p>
              <div class="d-flex flex-wrap ga-1">
                <v-checkbox v-model="cfg.detail_humidity" :label="t('config.weather_detail_humidity')" hide-details
                  density="compact" class="flex-grow-1" style="min-width: 120px" />
                <v-checkbox v-model="cfg.detail_pressure" :label="t('config.weather_detail_pressure')" hide-details
                  density="compact" class="flex-grow-1" style="min-width: 120px" />
                <v-checkbox v-model="cfg.detail_wind" :label="t('config.weather_detail_wind')" hide-details
                  density="compact" class="flex-grow-1" style="min-width: 120px" />
                <v-checkbox v-model="cfg.detail_visibility" :label="t('config.weather_detail_visibility')" hide-details
                  density="compact" class="flex-grow-1" style="min-width: 120px" />
              </div>
              <div class="config-panel__field-group">
                <p class="text-caption text-medium-emphasis mb-1 text-uppercase font-weight-medium">{{
                  t('config.weather_warning_entity') }}</p>
                <EntityPicker v-model="cfg.warning_entity_id" :domain-filter="['sensor', 'binary_sensor']"
                  :placeholder="t('config.weather_warning_entity_placeholder')" />
              </div>
              <v-text-field v-if="cfg.warning_entity_id" v-model="cfg.warning_name"
                :label="t('config.weather_warning_name')" :placeholder="t('config.weather_warning_name_placeholder')"
                density="compact" hide-details="auto" />
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
              <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium">{{ t('config.room_lights')
              }}</p>
              <EntityPicker v-model="cfg.light_entity" domain="light" />
              <template v-for="(_, idx) in roomLightEntities" :key="`room-light-${idx}`">
                <div class="d-flex align-center ga-1">
                  <span class="text-caption text-medium-emphasis flex-grow-1">{{ t('config.additional_light') }} {{ idx
                    + 1 }}</span>
                  <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click="removeRoomLight(idx)" />
                </div>
                <EntityPicker v-model="roomLightEntities[idx]" domain="light"
                  :placeholder="t('config.light_entity_placeholder')" />
              </template>
              <v-btn prepend-icon="mdi-plus" variant="tonal" size="small" @click="addRoomLight">
                {{ t('config.add_light') }}
              </v-btn>
              <v-divider />
              <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium">{{
                t('config.sensor_no_thermostat') }}</p>
              <EntityPicker v-model="cfg.sensor_entity" domain="sensor" />
              <UiIconPicker v-if="cfg.sensor_entity" v-model="cfg.sensor_icon" :label="t('config.icon_field')"
                placeholder="mdi-eye" />
              <template v-for="(sensor, idx) in roomSensorEntities" :key="`room-sensor-${idx}`">
                <div class="d-flex align-center ga-1">
                  <span class="text-caption text-medium-emphasis flex-grow-1">{{ t('config.additional_sensors') }} {{
                    idx + 1 }}</span>
                  <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click="removeRoomSensor(idx)" />
                </div>
                <EntityPicker v-model="sensor.entity_id" :domain-filter="['sensor', 'binary_sensor']"
                  :placeholder="t('config.sensor_entity')" />
                <UiIconPicker v-if="sensor.entity_id" v-model="sensor.icon" :label="t('config.icon_field')"
                  placeholder="mdi-gauge" />
              </template>
              <v-btn prepend-icon="mdi-plus" variant="tonal" size="small" @click="addRoomSensor">
                {{ t('config.add_sensor') }}
              </v-btn>
              <v-select v-model="cfg.card_click_action" :label="t('config.card_click_action')"
                :items="roomCardActionItems" item-title="title" item-value="value" density="compact"
                hide-details="auto" />
              <v-select v-model="cfg.card_double_click_action" :label="t('config.card_double_click_action')"
                :items="roomCardActionItems" item-title="title" item-value="value" density="compact"
                hide-details="auto" />
              <v-divider />
              <v-checkbox :model-value="cfg.auto_status_entities !== false" :label="t('config.auto_status_entities')"
                :hint="t('config.auto_status_entities_hint')" density="compact" hide-details="auto"
                @update:model-value="cfg.auto_status_entities = $event ? undefined : false" />
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

            <!-- Vacuum -->
            <template v-if="widget.type === 'vacuum'">
              <p class="text-caption text-medium-emphasis">{{ t('widget.vacuum.description') }}</p>
            </template>

            <!-- Fan -->
            <template v-if="widget.type === 'fan'">
              <v-checkbox v-model="cfg.show_speed" :label="t('config.fan_show_speed')" hide-details density="compact" />
            </template>

            <!-- Scene -->
            <template v-if="widget.type === 'scene'">
              <v-text-field v-model="cfg.name" :label="t('config.display_name')" :placeholder="t('scene.default_name')" density="compact" hide-details="auto" />
              <div>
                <p class="text-caption text-medium-emphasis mb-1">{{ t('config.scene_columns') }}</p>
                <v-btn-toggle :model-value="cfg.columns ?? 2" mandatory density="compact" color="primary" class="w-100" @update:model-value="cfg.columns = $event">
                  <v-btn :value="1" size="small" class="flex-1-1">1</v-btn>
                  <v-btn :value="2" size="small" class="flex-1-1">2</v-btn>
                  <v-btn :value="3" size="small" class="flex-1-1">3</v-btn>
                </v-btn-toggle>
              </div>
              <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium">{{ t('scene.scenes') }}</p>
              <div v-for="(entry, idx) in sceneEntries" :key="idx" class="d-flex flex-column ga-2 pa-2 rounded-lg" style="background: rgba(255,255,255,0.04)">
                <div class="d-flex align-center ga-1">
                  <span class="text-caption text-medium-emphasis flex-grow-1">{{ idx + 1 }}.</span>
                  <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click="removeSceneEntry(idx)" />
                </div>
                <EntityPicker v-model="entry.entity_id" :domain-filter="['scene', 'script']" />
                <v-text-field v-model="entry.name" :label="t('config.display_name')" :placeholder="t('config.display_name_hint')" density="compact" hide-details="auto" />
                <div class="d-flex ga-2">
                  <UiIconPicker v-model="entry.icon" :label="t('config.icon_field')" placeholder="mdi-play-circle-outline" class="flex-grow-1" density="compact" hide-details="auto" />
                  <UiColorPicker v-model="entry.color" :label="t('config.active_color')" clearable class="flex-1-1" />
                </div>
              </div>
              <v-btn prepend-icon="mdi-plus" variant="tonal" size="small" block @click="addSceneEntry">
                {{ t('scene.add_scene') }}
              </v-btn>
            </template>

            <!-- Camera Status -->
            <template v-if="widget.type === 'camera_status'">
              <v-text-field v-model="cfg.name" :label="t('config.display_name')" density="compact" hide-details="auto" />
              <v-divider />
              <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium">{{ t('camera_status.config.camera') }}</p>
              <EntityPicker v-model="cfg.camera_entity_id" domain="camera" />
              <v-divider />
              <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium">{{ t('camera_status.config.sensor') }}</p>
              <EntityPicker v-model="cfg.sensor_entity_id" />
              <v-text-field
                v-model="cfg.active_state"
                :label="t('camera_status.config.active_state')"
                :placeholder="t('camera_status.config.active_state_placeholder')"
                density="compact"
                hide-details="auto"
              />
              <UiColorPicker v-model="cfg.active_color" :label="t('camera_status.config.active_color')" clearable />
              <UiColorPicker v-model="cfg.inactive_color" :label="t('camera_status.config.inactive_color')" clearable />
              <v-divider />
              <v-select
                v-model="cfg.default_stream"
                :label="t('camera_status.config.default_stream')"
                :items="[
                  { title: t('camera_status.snapshot'), value: 'snapshot' },
                  { title: t('camera_status.live'), value: 'mjpeg' },
                ]"
                density="compact"
                hide-details
              />
              <v-text-field
                v-model.number="cfg.snapshot_refresh"
                :label="t('camera_status.config.refresh')"
                :placeholder="'5'"
                type="number"
                min="1"
                density="compact"
                hide-details="auto"
                suffix="s"
              />
            </template>

            <!-- Timer -->
            <template v-if="widget.type === 'timer'">
              <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium">{{ t('timer.config.timers') }}</p>
              <div v-for="(entry, idx) in timerEntries" :key="idx" class="d-flex flex-column ga-2 pa-2 rounded-lg" style="background: rgba(255,255,255,0.04)">
                <div class="d-flex align-center ga-1">
                  <span class="text-caption text-medium-emphasis flex-grow-1">{{ idx + 1 }}.</span>
                  <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click="removeTimerEntry(idx)" />
                </div>
                <EntityPicker v-model="entry.entity_id" domain="timer" />
                <v-text-field
                  v-model="entry.name"
                  :label="t('config.display_name')"
                  :placeholder="t('timer.config.name_placeholder')"
                  density="compact"
                  hide-details="auto"
                />
              </div>
              <v-btn prepend-icon="mdi-plus" variant="tonal" size="small" block @click="addTimerEntry">
                {{ t('timer.config.add_timer') }}
              </v-btn>
              <v-divider />
              <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium">{{ t('timer.config.finish_title') }}</p>
              <v-checkbox v-model="cfg.finish_blink" :label="t('timer.config.finish_blink')" hide-details density="compact" />
              <v-checkbox v-model="cfg.finish_sound" :label="t('timer.config.finish_sound')" hide-details density="compact" />
              <template v-if="cfg.finish_sound !== false">
                <p class="text-caption text-medium-emphasis">{{ t('timer.config.finish_sound_volume') }}: {{ cfg.finish_sound_volume ?? 70 }}%</p>
                <v-slider v-model="cfg.finish_sound_volume" :min="10" :max="100" :step="5"
                  hide-details density="compact" thumb-size="14"
                  :default-value="70" />
              </template>
            </template>

            <!-- Power Consumers -->
            <template v-if="widget.type === 'power_consumers'">
              <v-text-field v-model="cfg.name" :label="t('config.display_name')" density="compact" hide-details="auto" />
              <v-divider />
              <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium">{{ t('power_consumers.config.price') }}</p>
              <div class="d-flex ga-2">
                <v-text-field
                  v-model.number="cfg.price_per_kwh"
                  :label="t('power_consumers.config.price_per_kwh')"
                  type="number"
                  min="0"
                  step="0.01"
                  density="compact"
                  hide-details="auto"
                  class="flex-grow-1"
                />
                <v-text-field
                  v-model="cfg.currency_symbol"
                  :label="t('power_consumers.config.currency')"
                  density="compact"
                  hide-details
                  style="max-width: 80px"
                />
              </div>
              <v-divider />
              <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium">{{ t('power_consumers.config.consumers') }}</p>
              <div
                v-for="(consumer, idx) in (cfg.consumers ?? [])"
                :key="idx"
                class="d-flex flex-column ga-2 pa-2 rounded-lg"
                style="background: rgba(255,255,255,0.04)"
              >
                <div class="d-flex align-center ga-1">
                  <span class="text-caption text-medium-emphasis flex-grow-1">{{ idx + 1 }}.</span>
                  <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click="removePowerConsumer(idx)" />
                </div>
                <EntityPicker v-model="consumer.entity_id" :domain-filter="['sensor']" device-class="energy" />
                <v-text-field
                  v-model="consumer.name"
                  :label="t('power_consumers.config.consumer_name')"
                  :placeholder="consumer.entity_id"
                  density="compact"
                  hide-details="auto"
                />
              </div>
              <v-btn
                variant="tonal"
                size="small"
                prepend-icon="mdi-plus"
                block
                @click="addPowerConsumer"
              >
                {{ t('power_consumers.config.add_consumer') }}
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
              <draggable
                :model-value="statusBarEntries"
                :item-key="(e: Record<string, any>) => JSON.stringify(e)"
                animation="180"
                handle=".sb-drag-handle"
                ghost-class="sb-drag-ghost"
                chosen-class="sb-drag-chosen"
                class="d-flex flex-column ga-1"
                @update:model-value="(cfg as any).entries = $event"
              >
                <template #item="{ element: entry, index: idx }">
                  <div class="d-flex align-center ga-2 pa-2 rounded-lg sb-entry-row" style="background: rgba(255,255,255,0.04)">
                    <v-icon icon="mdi-drag-vertical" size="18" class="sb-drag-handle" />
                    <v-icon
                      :icon="entry.entry_type === 'divider' ? 'mdi-minus' : (entry.icon || (entry.entry_type === 'group' ? 'mdi-lightbulb-group-outline' : entry.entry_type === 'nav' ? 'mdi-arrow-right-circle' : entry.entry_type === 'room' ? 'mdi-sofa-outline' : entry.entry_type === 'problem' ? 'mdi-home-alert-outline' : 'mdi-circle'))"
                      size="18" class="flex-shrink-0" />
                    <div class="flex-grow-1 text-body-2 text-truncate" style="min-width:0">
                      {{ entry.entry_type === 'divider' ? t('config.entry_type_divider') : (entry.label || entry.entity_id
                        || (entry.entry_type === 'group' ? entryGroupSummary(entry) : entry.entry_type === 'nav' ?
                          entry.dashboard_id : entry.entry_type === 'room' ? (entry.light_entity || entry.climate_entity ||
                            entry.sensor_entity || 'room') : entry.entry_type === 'problem' ? t('config.entry_type_problem') : '—')) }}
                    </div>
                    <v-chip
                      :color="entry.entry_type === 'group' ? 'primary' : entry.entry_type === 'nav' ? 'secondary' : entry.entry_type === 'room' ? 'warning' : entry.entry_type === 'problem' ? 'error' : entry.entry_type === 'divider' ? 'medium-emphasis' : undefined"
                      size="x-small" variant="tonal" class="flex-shrink-0">
                      {{ entry.entry_type === 'group' ? t('config.entry_type_group') : entry.entry_type === 'nav' ?
                        t('config.entry_type_nav') : entry.entry_type === 'room' ? t('config.entry_type_room') :
                          entry.entry_type === 'problem' ? t('config.entry_type_problem') :
                            entry.entry_type === 'divider' ? t('config.entry_type_divider') : t('config.entry_type_single') }}
                    </v-chip>
                    <v-btn v-if="entry.entry_type !== 'divider'" icon="mdi-pencil-outline" size="x-small" variant="text"
                      @click="openEntryDialog(idx)" />
                    <v-btn icon="mdi-delete" size="x-small" variant="text" color="error"
                      @click="removeStatusBarEntry(idx)" />
                  </div>
                </template>
              </draggable>

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
                <v-btn prepend-icon="mdi-plus" variant="tonal" size="small" block color="error"
                  class="statusbar-add-btn statusbar-add-btn--problem" @click="addStatusBarProblemEntry">
                  {{ t('config.add_problem') }}
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
              <LazyStatusBarEntryDialog v-if="editingEntryIdx !== null" v-model="entryDialogOpen"
                :entry="statusBarEntries[editingEntryIdx]" @save="saveEntryDialog" />
            </template>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel v-if="hasGenericActionSection" value="actions" rounded="xl" elevation="0">
          <v-expansion-panel-title class="config-panel__section-title">
            {{ t('config.section_actions') }}
          </v-expansion-panel-title>
          <v-expansion-panel-text class="config-panel__section-body">
            <div v-for="action in genericActionConfigs" :key="action.model" class="config-panel__action-block">
              <v-select v-model="cfg[action.model]" :label="t(action.label)" :items="genericActionItems"
                item-title="title" item-value="value" density="compact" hide-details="auto" />
              <template v-if="cfg[action.model] === 'call_service'">
                <v-text-field v-model="cfg[action.service]" :label="t('config.action_service')"
                  placeholder="script.turn_on" density="compact" hide-details="auto" />
                <div class="config-panel__field-group">
                  <p class="text-caption text-medium-emphasis mb-1 text-uppercase font-weight-medium">
                    {{ t('config.action_service_target') }}
                  </p>
                  <EntityPicker v-model="cfg[action.target]"
                    :placeholder="t('config.action_service_target_optional')" />
                </div>
                <v-textarea v-model="cfg[action.data]" :label="t('config.action_service_data')"
                  :placeholder="`{ ${t('config.action_service_data_placeholder')} }`" rows="3" auto-grow
                  density="compact" hide-details="auto" />
              </template>
            </div>
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

            <div>
              <p class="text-caption text-medium-emphasis mb-2">{{ t('config.widget_visibility') }}</p>
              <div class="d-flex flex-column ga-1">
                <v-checkbox v-model="visibility.desktop" :label="t('config.visibility_desktop')"
                  density="compact" hide-details />
                <v-checkbox v-model="visibility.tablet" :label="t('config.visibility_tablet')"
                  density="compact" hide-details />
                <v-checkbox v-model="visibility.mobile" :label="t('config.visibility_mobile')"
                  density="compact" hide-details />
              </div>
            </div>

            <!-- User exclusion (admin only) -->
            <div v-if="currentUser?.role === 'admin'">
              <p class="text-caption text-medium-emphasis mb-1">{{ t('config.excluded_users') }}</p>
              <p class="text-caption text-disabled mb-2">{{ t('config.excluded_users_hint') }}</p>
              <div class="d-flex flex-wrap ga-1">
                <button
                  v-for="u in allUsers"
                  :key="u.id"
                  class="user-excl-btn"
                  :class="{ 'user-excl-btn--on': excludedUserIds.includes(u.id) }"
                  @click="toggleExcludedUser(u.id)"
                >
                  <v-icon icon="mdi-account-outline" size="11" />
                  {{ u.username }}
                </button>
              </div>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <p v-else class="text-medium-emphasis text-body-2">{{ t('widget.none_selected') }}</p>
  </UiSheet>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable'
import type { WidgetType, WidgetAppearance, WidgetVisibility } from '~/types/dashboard'

const entityStore = useEntityStore()
const { t } = useI18n()
defineProps<{ open: boolean }>()
defineEmits<{ close: [] }>()

const dashboardStore = useDashboardStore()
const { user: currentUser } = useUserSession()

interface UserSummary { id: string; username: string }
const allUsers = ref<UserSummary[]>([])
onMounted(async () => {
  if (currentUser.value?.role === 'admin') {
    const users = await $fetch<UserSummary[]>('/api/users')
    allUsers.value = users.filter(u => u.id !== currentUser.value?.id)
  }
})

const excludedUserIds = computed<string[]>({
  get: () => widget.value?.excluded_user_ids ?? [],
  set: (ids) => {
    if (widget.value) widget.value.excluded_user_ids = ids.length > 0 ? ids : undefined
  },
})

function toggleExcludedUser(userId: string) {
  const current = excludedUserIds.value
  const idx = current.indexOf(userId)
  if (idx === -1) excludedUserIds.value = [...current, userId]
  else excludedUserIds.value = current.filter(id => id !== userId)
}
const widget = computed(() => dashboardStore.dashboard?.widgets.find((w) => w.id === dashboardStore.selectedWidgetId))
const openSections = ref(['general', 'content', 'appearance'])

const currentWidgetWidth = ref<number | null>(null)
watch(() => dashboardStore.selectedWidgetId, async (id) => {
  if (!id) { currentWidgetWidth.value = null; return }
  await nextTick()
  const el = document.querySelector(`[gs-id="${id}"] .grid-stack-item-content`)
  currentWidgetWidth.value = el ? Math.round(el.getBoundingClientRect().width) : null
}, { immediate: true })
const cfg = computed(() => (widget.value?.config ?? {}) as Record<string, any>)

function stringConfigModel(key: string) {
  return computed({
    get: () => (typeof cfg.value[key] === 'string' ? cfg.value[key] as string : undefined),
    set: (value?: string) => {
      cfg.value[key] = value || undefined
    },
  })
}

function stringArrayConfigModel(key: string) {
  return computed<string[]>({
    get: () => Array.isArray(cfg.value[key]) ? (cfg.value[key] as unknown[]).filter((item): item is string => typeof item === 'string') : [],
    set: (value) => {
      cfg.value[key] = value
    },
  })
}

const gaugeGreenColor = stringConfigModel('green_color')
const gaugeYellowColor = stringConfigModel('yellow_color')
const gaugeRedColor = stringConfigModel('red_color')
const ignoredOfflinePlatformsModel = stringArrayConfigModel('ignored_offline_platforms')
const ignoredOfflineDomainsModel = stringArrayConfigModel('ignored_offline_domains')
const iconModel = computed({
  get: () => (typeof cfg.value.icon === 'string' ? cfg.value.icon : ''),
  set: (value: string) => {
    cfg.value.icon = value || undefined
  },
})

watch(widget, (w) => {
  if (!w) return
  if (!w.appearance) w.appearance = {}
  if (!w.visibility) w.visibility = { desktop: true, tablet: true, mobile: true }
  w.visibility.desktop ??= true
  w.visibility.tablet ??= true
  w.visibility.mobile ??= true
  if (w.type === 'light') {
    const config = w.config as Record<string, any>
    config.card_click_action ??= config.tap_action ?? 'none'
    config.card_double_click_action ??= config.double_tap_action ?? 'none'
  }
  if (w.type === 'problem_overview') {
    const config = w.config as Record<string, any>
    config.ignored_offline_platforms ??= [...DEFAULT_IGNORED_OFFLINE_PLATFORMS]
    config.ignored_offline_domains ??= [...DEFAULT_IGNORED_OFFLINE_DOMAINS]
    config.show_repairs ??= true
    config.show_system ??= true
  }
  if (w.type === 'timer') {
    const config = w.config as Record<string, any>
    if (!Array.isArray(config.timers)) {
      config.timers = config.entity_id ? [{ entity_id: config.entity_id }] : []
    }
  }
}, { immediate: true })
const appearance = computed(() => (widget.value?.appearance ?? {}) as WidgetAppearance)
const visibility = computed(() => (widget.value?.visibility ?? {}) as WidgetVisibility)

const ENTITY_FIELD_EXCLUDED_TYPES: WidgetType[] = ['clock', 'label', 'room_card', 'calendar', 'calendar_v2', 'person', 'energy', 'status_bar', 'appliance', 'alarm', 'template', 'problem_overview', 'scene', 'timer', 'camera_status', 'power_consumers']
const NAME_FIELD_EXCLUDED_TYPES: WidgetType[] = ['clock', 'room_card', 'status_bar', 'calendar_v2', 'scene', 'camera_status', 'power_consumers']
const CONTENT_SECTION_TYPES = new Set<WidgetType>([
  'sensor', 'gauge', 'template', 'switch', 'button', 'select', 'light', 'chart', 'appliance', 'cover', 'cover_dial', 'cover_dial2', 'camera', 'lock',
  'weather', 'clock', 'label', 'media_player', 'calendar', 'calendar_v2', 'person', 'energy', 'alarm',
  'room_card', 'status_bar', 'problem_overview', 'vacuum', 'fan', 'scene', 'timer', 'camera_status', 'power_consumers',
])
const GENERIC_ACTION_TYPES = new Set<WidgetType>([
  'sensor', 'gauge', 'switch', 'chart', 'camera', 'thermostat', 'media_player', 'cover', 'cover_dial', 'cover_dial2',
  'lock', 'weather', 'calendar', 'vacuum', 'fan', 'timer',
])

const showEntityField = computed(() => !!widget.value && !ENTITY_FIELD_EXCLUDED_TYPES.includes(widget.value.type))
const showNameField = computed(() => !!widget.value && !NAME_FIELD_EXCLUDED_TYPES.includes(widget.value.type))
const hasGeneralSection = computed(() => showEntityField.value || showNameField.value)
const hasContentSection = computed(() => !!widget.value && CONTENT_SECTION_TYPES.has(widget.value.type))
const hasGenericActionSection = computed(() => !!widget.value && GENERIC_ACTION_TYPES.has(widget.value.type))

watch(widget, (currentWidget) => {
  openSections.value = [
    ...(currentWidget && hasGeneralSection.value ? ['general'] : []),
    ...(currentWidget && hasContentSection.value ? ['content'] : []),
    ...(currentWidget && hasGenericActionSection.value ? ['actions'] : []),
    'appearance',
  ]
}, { immediate: true })

const WIDGET_ICONS: Partial<Record<WidgetType, string>> = {
  sensor: 'mdi-gauge', gauge: 'mdi-gauge-full', template: 'mdi-code-braces', switch: 'mdi-toggle-switch-outline',
  button: 'mdi-gesture-tap-button', select: 'mdi-form-dropdown', light: 'mdi-lightbulb-outline',
  chart: 'mdi-chart-line', camera: 'mdi-cctv', thermostat: 'mdi-thermostat',
  media_player: 'mdi-play-circle-outline', cover: 'mdi-window-shutter',
  cover_dial: 'mdi-window-shutter', cover_dial2: 'mdi-window-shutter',
  lock: 'mdi-lock-outline', weather: 'mdi-weather-partly-cloudy',
  clock: 'mdi-clock-outline', label: 'mdi-format-text', room_card: 'mdi-floor-plan',
  calendar: 'mdi-calendar-outline', calendar_v2: 'mdi-calendar-month-outline', person: 'mdi-account-group-outline',
  energy: 'mdi-lightning-bolt', appliance: 'mdi-dishwasher', alarm: 'mdi-shield-home-outline',
  problem_overview: 'mdi-home-alert-outline', status_bar: 'mdi-view-list-outline',
  vacuum: 'mdi-robot-vacuum', fan: 'mdi-fan', scene: 'mdi-play-box-multiple-outline', timer: 'mdi-timer-outline',
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
const gaugeValuePositionItems = computed(() => [
  { title: t('config.gauge_value_top'), value: 'top' },
  { title: t('config.gauge_value_right'), value: 'right' },
  { title: t('config.gauge_value_bottom'), value: 'bottom' },
  { title: t('config.gauge_value_left'), value: 'left' },
  { title: t('config.gauge_value_center'), value: 'center' },
])
const gaugeSeverityDirectionItems = computed(() => [
  { title: t('config.gauge_high_bad'), value: 'high_bad' },
  { title: t('config.gauge_low_bad'), value: 'low_bad' },
])
const gaugeYellowThresholdLabel = computed(() =>
  cfg.value.severity_direction === 'low_bad' ? t('config.gauge_yellow_below') : t('config.gauge_yellow_from'),
)
const gaugeRedThresholdLabel = computed(() =>
  cfg.value.severity_direction === 'low_bad' ? t('config.gauge_red_below') : t('config.gauge_red_from'),
)
const dayItems = computed(() => [
  { title: t('config.days_1'), value: 1 }, { title: t('config.days_3'), value: 3 },
  { title: t('config.days_7'), value: 7 }, { title: t('config.days_14'), value: 14 },
])
const lightTapActionItems = computed(() => [
  { title: t('config.action_none'), value: 'none' },
  { title: t('config.action_toggle_light'), value: 'toggle' },
  { title: t('config.action_open_light_detail'), value: 'open_detail' },
])

const genericActionItems = computed(() => [
  { title: t('config.action_none'), value: 'none' },
  { title: t('config.action_toggle_entity'), value: 'toggle' },
  { title: t('config.action_open_entity_detail'), value: 'open_detail' },
  { title: t('config.action_call_service'), value: 'call_service' },
])

const genericActionConfigs = [
  {
    label: 'config.card_click_action',
    model: 'card_click_action',
    service: 'card_click_service',
    target: 'card_click_target_entity',
    data: 'card_click_service_data',
  },
  {
    label: 'config.card_double_click_action',
    model: 'card_double_click_action',
    service: 'card_double_click_service',
    target: 'card_double_click_target_entity',
    data: 'card_double_click_service_data',
  },
] as const

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

const roomStatusEntities = computed(() => (cfg.value.status_entities as Array<Record<string, any>>) ?? [])
const roomLightEntities = computed({
  get: () => {
    if (!Array.isArray(cfg.value.light_entities)) cfg.value.light_entities = []
    return cfg.value.light_entities as string[]
  },
  set: (value: string[]) => {
    cfg.value.light_entities = value
  },
})
const roomSensorEntities = computed({
  get: () => {
    if (!Array.isArray(cfg.value.sensor_entities)) cfg.value.sensor_entities = []
    return cfg.value.sensor_entities as Array<Record<string, any>>
  },
  set: (value: Array<Record<string, any>>) => {
    cfg.value.sensor_entities = value
  },
})

function addRoomLight() {
  roomLightEntities.value = [...roomLightEntities.value, '']
}

function removeRoomLight(index: number) {
  const list = [...roomLightEntities.value]
  list.splice(index, 1)
  roomLightEntities.value = list
}

function addRoomSensor() {
  roomSensorEntities.value = [...roomSensorEntities.value, { entity_id: '', icon: 'mdi-gauge' }]
}

function removeRoomSensor(index: number) {
  const list = [...roomSensorEntities.value]
  list.splice(index, 1)
  roomSensorEntities.value = list
}

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

const statusBarEntries = computed(() => (cfg.value.entries as Array<Record<string, any>>) ?? [])

const entryDialogOpen = ref(false)
const editingEntryIdx = ref<number | null>(null)

function openEntryDialog(idx: number) {
  editingEntryIdx.value = idx
  entryDialogOpen.value = true
}

function saveEntryDialog(updated: Record<string, any>) {
  const list = [...statusBarEntries.value]
  if (editingEntryIdx.value !== null) list[editingEntryIdx.value] = updated
  cfg.value.entries = list
}

function entryGroupSummary(entry: Record<string, any>) {
  const filter = entry.filter as Record<string, any> | undefined
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

function addStatusBarProblemEntry() {
  const list = [...statusBarEntries.value]
  list.push({
    entry_type: 'problem',
    icon: 'mdi-home-alert-outline',
    inactive_icon: 'mdi-shield-check-outline',
    label: '',
    battery_threshold: 20,
    max_items: 8,
    show_badge: true,
    show_batteries: true,
    show_unavailable: true,
    show_openings: true,
    show_updates: true,
    show_alerts: true,
    show_repairs: true,
    show_system: true,
    ignored_offline_platforms: [...DEFAULT_IGNORED_OFFLINE_PLATFORMS],
    ignored_offline_domains: [...DEFAULT_IGNORED_OFFLINE_DOMAINS],
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

// ── Camera status entities ─────────────────────────────────────────────────

const cameraStatusEntries = computed(() => (cfg.value.status_entities as Array<Record<string, any>>) ?? [])
const cameraStatusDialogOpen = ref(false)
const editingCameraStatusIdx = ref<number | null>(null)

function openCameraStatusDialog(idx: number) {
  editingCameraStatusIdx.value = idx
  cameraStatusDialogOpen.value = true
}

function saveCameraStatusEntry(updated: Record<string, any>) {
  const list = [...cameraStatusEntries.value]
  if (editingCameraStatusIdx.value !== null) list[editingCameraStatusIdx.value] = updated
  cfg.value.status_entities = list
}

function addCameraStatusEntry() {
  const list = [...cameraStatusEntries.value]
  list.push({ entity_id: '', icon: 'mdi-circle', active_state: 'on' })
  cfg.value.status_entities = list
  openCameraStatusDialog(list.length - 1)
}

function removeCameraStatusEntry(index: number) {
  const list = [...cameraStatusEntries.value]
  list.splice(index, 1)
  cfg.value.status_entities = list
}

function moveCameraStatusEntry(index: number, direction: -1 | 1) {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= cameraStatusEntries.value.length) return
  const list = [...cameraStatusEntries.value]
  const [entry] = list.splice(index, 1)
  list.splice(targetIndex, 0, entry)
  cfg.value.status_entities = list
}

// ── Scene entries ─────────────────────────────────────────────────────────────

const sceneEntries = computed(() => (cfg.value.entries as Array<Record<string, any>>) ?? [])

function addSceneEntry() {
  const list = [...sceneEntries.value]
  list.push({ entity_id: '', name: '', icon: '', color: '' })
  cfg.value.entries = list
}

function removeSceneEntry(index: number) {
  const list = [...sceneEntries.value]
  list.splice(index, 1)
  cfg.value.entries = list
}

// ── Timer entries ──────────────────────────────────────────────────────────

const timerEntries = computed(() => (cfg.value.timers as Array<{ entity_id: string; name?: string }>) ?? [])

function addTimerEntry() {
  const list = [...timerEntries.value]
  list.push({ entity_id: '' })
  cfg.value.timers = list
}

function removeTimerEntry(index: number) {
  const list = [...timerEntries.value]
  list.splice(index, 1)
  cfg.value.timers = list
}

// ── Power Consumers entries ────────────────────────────────────────────────

function addPowerConsumer() {
  const list = [...((cfg.value.consumers as Array<{ entity_id: string; name?: string }>) ?? [])]
  list.push({ entity_id: '', name: '' })
  cfg.value.consumers = list
}

function removePowerConsumer(index: number) {
  const list = [...((cfg.value.consumers as Array<{ entity_id: string; name?: string }>) ?? [])]
  list.splice(index, 1)
  cfg.value.consumers = list
}
</script>

<style scoped>
.config-panel {
  padding-bottom: 8px;
}

.sb-drag-handle {
  cursor: grab;
  opacity: 0.35;
  transition: opacity 0.15s;
  flex-shrink: 0;
}
.sb-drag-handle:hover {
  opacity: 0.75;
}
.sb-drag-ghost {
  opacity: 0.25;
  background: rgba(var(--v-theme-primary), 0.12) !important;
  border-radius: 8px;
}
.sb-drag-chosen {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  z-index: 10;
}
.sb-entry-row {
  transition: box-shadow 0.15s;
}

.config-panel__badge {
  min-height: 0;
}

.config-panel__sections {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-panel__sections :deep(.v-expansion-panel) {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px !important;
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

.config-panel__action-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.04);
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

.user-excl-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid rgba(var(--v-border-color), 0.16);
  background: none;
  color: rgba(var(--v-theme-on-surface), 0.5);
  cursor: pointer;
  transition: all 0.12s;
}

.user-excl-btn:hover { background: rgba(var(--v-theme-on-surface), 0.06); }

.user-excl-btn--on {
  background: rgba(var(--v-theme-error), 0.10);
  border-color: rgba(var(--v-theme-error), 0.35);
  color: rgb(var(--v-theme-error));
}
</style>
