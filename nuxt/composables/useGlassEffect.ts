export const useGlassEffect = () => {
  const storage = useUserPreferenceStorage()
  const glass = useState('glass', () =>
    storage.read('ha-glass') === 'true'
  )

  watch(() => storage.currentUserId.value, () => {
    glass.value = storage.read('ha-glass') === 'true'
  }, { immediate: true })

  function toggle() {
    glass.value = !glass.value
    storage.write('ha-glass', String(glass.value))
  }

  return { glass, toggle }
}
