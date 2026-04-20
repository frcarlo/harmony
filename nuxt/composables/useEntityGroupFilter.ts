import type { EntityGroupFilter } from '~/types/dashboard'
import type { HAState } from '~/types/ha'

export function useEntityGroupFilter() {
  const entityStore = useEntityStore()

  function getFilteredEntities(filter: EntityGroupFilter): HAState[] {
    if (filter.labels?.length) console.debug('[filter] label filter active:', filter.labels, 'entityLabelsMap size:', Object.keys(entityStore.entityLabelsMap).length)
    return Object.values(entityStore.entities).filter((entity) => {
      const id = entity.entity_id
      const domain = id.split('.')[0]

      if (filter.domains?.length && !filter.domains.includes(domain)) return false
      if (filter.name_contains && !id.includes(filter.name_contains)) return false
      if (filter.name_starts_with && !id.startsWith(filter.name_starts_with)) return false

      if (filter.areas?.length) {
        const areaId = entityStore.entityAreaMap[id]
        if (!areaId || !filter.areas.includes(areaId)) return false
      }

      if (filter.exclude_groups && Array.isArray(entity.attributes?.entity_id)) return false

      if (filter.labels?.length) {
        const entityLabels = entityStore.entityLabelsMap[id] ?? []
        const match = filter.labels.some(l => entityLabels.includes(l))
        if (!match) {
          if (domain === 'cover') console.debug('[filter] cover excluded:', id, 'entityLabels:', entityLabels, 'filterLabels:', filter.labels)
          return false
        }
      }

      return true
    })
  }

  function useFilteredEntities(filter: Ref<EntityGroupFilter> | EntityGroupFilter) {
    return computed(() => {
      const f = isRef(filter) ? filter.value : filter
      return getFilteredEntities(f)
    })
  }

  return { getFilteredEntities, useFilteredEntities }
}
