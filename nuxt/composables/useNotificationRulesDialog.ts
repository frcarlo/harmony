const open = ref(false)

export function useNotificationRulesDialog() {
  return {
    open: readonly(open),
    openDialog: () => { open.value = true },
    closeDialog: () => { open.value = false },
  }
}
