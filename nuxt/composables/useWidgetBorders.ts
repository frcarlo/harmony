export const useWidgetBorders = () => {
  const borders = useState('widget-borders', () =>
    import.meta.client ? localStorage.getItem('ha-widget-borders') !== 'false' : true
  )

  function toggle() {
    borders.value = !borders.value
    if (import.meta.client) localStorage.setItem('ha-widget-borders', String(borders.value))
  }

  return { borders, toggle }
}
