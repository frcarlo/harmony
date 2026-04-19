export const useGlassEffect = () => {
  const glass = useState('glass', () =>
    import.meta.client ? localStorage.getItem('ha-glass') === 'true' : false
  )

  function toggle() {
    glass.value = !glass.value
    if (import.meta.client) localStorage.setItem('ha-glass', String(glass.value))
  }

  return { glass, toggle }
}
