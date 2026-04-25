import type { EntityGroupFilter } from '~/types/dashboard'
import type { HAState } from '~/types/ha'

export function useEntityGroupFilter() {
  const entityStore = useEntityStore()

  function getFilteredEntities(filter: EntityGroupFilter): HAState[] {
    return Object.values(entityStore.entities).filter((entity) => {
      const id = entity.entity_id
      const domain = id.split('.')[0]
      const objectId = id.split('.').slice(1).join('.')
      const containsNeedle = filter.name_contains?.trim().toLowerCase()
      const startsNeedle = filter.name_starts_with?.trim().toLowerCase()
      const haystacks = [id.toLowerCase(), objectId.toLowerCase()]

      if (filter.domains?.length && !filter.domains.includes(domain)) return false
      if (containsNeedle && !haystacks.some((value) => value.includes(containsNeedle))) return false
      if (startsNeedle && !haystacks.some((value) => value.startsWith(startsNeedle))) return false

      if (filter.areas?.length) {
        const areaId = entityStore.entityAreaMap[id]
        if (!areaId || !filter.areas.includes(areaId)) return false
      }

      if (filter.exclude_groups && Array.isArray(entity.attributes?.entity_id)) return false

      if (filter.labels?.length) {
        const entityLabels = entityStore.entityLabelsMap[id] ?? []
        const match = filter.labels.some(l => entityLabels.includes(l))
        if (!match) return false
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
