import LandingView from "@/views/LandingView.vue"
import { mount } from "@vue/test-utils"
import PrimeVue from "primevue/config"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock router
const mockPush = vi.fn()
vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe("LandingView", () => {
  let wrapper: any

  beforeEach(() => {
    wrapper = mount(LandingView, {
      global: {
        plugins: [PrimeVue],
        stubs: {
          Button: true,
        },
      },
    })
  })

  it("renders hero section", () => {
    expect(wrapper.find(".hero-title").text()).toContain("Medical CRM")
    expect(wrapper.find(".hero-description").exists()).toBe(true)
  })

  it("renders features section", () => {
    expect(wrapper.find(".features-section").exists()).toBe(true)
    expect(wrapper.findAll(".feature-card")).toHaveLength(6)
  })

  it("navigates to login when login button is clicked", async () => {
    const loginButton = wrapper.find(".hero-button.primary")
    await loginButton.trigger("click")

    expect(mockPush).toHaveBeenCalledWith("/login")
  })

  it("scrolls to features when learn more button is clicked", async () => {
    // Mock scrollIntoView
    const mockScrollIntoView = vi.fn()
    const mockGetElementById = vi.spyOn(document, "getElementById").mockReturnValue({
      scrollIntoView: mockScrollIntoView,
    } as any)

    const learnMoreButton = wrapper.find(".hero-button.secondary")
    await learnMoreButton.trigger("click")

    expect(mockGetElementById).toHaveBeenCalledWith("features")
    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" })

    mockGetElementById.mockRestore()
  })

  it("renders footer", () => {
    expect(wrapper.find(".footer").exists()).toBe(true)
    expect(wrapper.find(".footer-content").exists()).toBe(true)
  })
})
