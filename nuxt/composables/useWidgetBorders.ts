export const useWidgetBorders = () => {
  const storage = useUserPreferenceStorage()
  const borders = useState('widget-borders', () =>
    storage.read('ha-widget-borders') !== 'false'
  )

  watch(() => storage.currentUserId.value, () => {
    borders.value = storage.read('ha-widget-borders') !== 'false'
  }, { immediate: true })

  function toggle() {
    borders.value = !borders.value
    storage.write('ha-widget-borders', String(borders.value))
  }

  return { borders, toggle }
}
