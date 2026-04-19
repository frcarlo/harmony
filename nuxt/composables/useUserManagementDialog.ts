const open = ref(false)

export function useUserManagementDialog() {
  return {
    open: readonly(open),
    openDialog: () => { open.value = true },
    closeDialog: () => { open.value = false },
  }
}
