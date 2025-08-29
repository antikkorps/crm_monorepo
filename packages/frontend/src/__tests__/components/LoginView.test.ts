import { useAuthStore } from "@/stores/auth"
import LoginView from "@/views/auth/LoginView.vue"
import { createTestingPinia } from "@pinia/testing"
import { mount } from "@vue/test-utils"
import PrimeVue from "primevue/config"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock router
const mockPush = vi.fn()
vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useRoute: () => ({
    query: {},
  }),
}))

describe("LoginView", () => {
  let wrapper: any
  let authStore: any

  beforeEach(() => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
    })

    wrapper = mount(LoginView, {
      global: {
        plugins: [pinia, PrimeVue],
        stubs: {
          Card: true,
          InputText: true,
          Password: true,
          Button: true,
          Checkbox: true,
          Message: true,
        },
      },
    })

    authStore = useAuthStore()
  })

  it("renders login form", () => {
    expect(wrapper.find("h2").text()).toBe("Medical CRM")
    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
  })

  it("validates email field", async () => {
    const emailInput = wrapper.find('input[type="email"]')

    // Test empty email
    await emailInput.setValue("")
    await emailInput.trigger("blur")

    expect(wrapper.vm.emailError).toBe("Email is required")

    // Test invalid email
    await emailInput.setValue("invalid-email")
    await emailInput.trigger("blur")

    expect(wrapper.vm.emailError).toBe("Please enter a valid email address")

    // Test valid email
    await emailInput.setValue("test@example.com")
    await emailInput.trigger("blur")

    expect(wrapper.vm.emailError).toBe("")
  })

  it("validates password field", async () => {
    const passwordInput = wrapper.find('input[type="password"]')

    // Test empty password
    await passwordInput.setValue("")
    await passwordInput.trigger("blur")

    expect(wrapper.vm.passwordError).toBe("Password is required")

    // Test short password
    await passwordInput.setValue("123")
    await passwordInput.trigger("blur")

    expect(wrapper.vm.passwordError).toBe("Password must be at least 6 characters")

    // Test valid password
    await passwordInput.setValue("password123")
    await passwordInput.trigger("blur")

    expect(wrapper.vm.passwordError).toBe("")
  })

  it("disables submit button when form is invalid", async () => {
    const submitButton = wrapper.find('button[type="submit"]')

    expect(submitButton.attributes("disabled")).toBeDefined()

    // Fill valid form
    await wrapper.find('input[type="email"]').setValue("test@example.com")
    await wrapper.find('input[type="password"]').setValue("password123")

    await wrapper.vm.$nextTick()

    expect(submitButton.attributes("disabled")).toBeUndefined()
  })

  it("calls login when form is submitted", async () => {
    authStore.login = vi.fn().mockResolvedValue({})

    // Fill valid form
    await wrapper.find('input[type="email"]').setValue("test@example.com")
    await wrapper.find('input[type="password"]').setValue("password123")

    // Submit form
    await wrapper.find("form").trigger("submit.prevent")

    expect(authStore.login).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    })
  })
})
