import { ref } from "vue"

export interface SnackbarState {
  show: boolean
  message: string
  color: string
  timeout: number
}

const snackbarState = ref<SnackbarState>({
  show: false,
  message: "",
  color: "success",
  timeout: 3000,
})

export function useSnackbar() {
  const showSnackbar = (
    message: string,
    color: "success" | "error" | "warning" | "info" = "success",
    timeout: number = 3000
  ) => {
    snackbarState.value = {
      show: true,
      message,
      color,
      timeout,
    }
  }

  const hideSnackbar = () => {
    snackbarState.value.show = false
  }

  return {
    snackbarState,
    showSnackbar,
    hideSnackbar,
  }
}
