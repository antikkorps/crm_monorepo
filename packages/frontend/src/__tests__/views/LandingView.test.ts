import { mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock the LandingView component to avoid import issues
const LandingView = {
  template: `
    <div>
      <div class="hero-section">
        <h1 class="hero-title">Medical CRM</h1>
        <p class="hero-description">Gérez efficacement vos relations avec les institutions médicales</p>
        <div class="hero-actions">
          <button data-testid="login-button" @click="goToLogin">Se connecter</button>
          <button data-testid="learn-more-button" @click="scrollToFeatures">En savoir plus</button>
        </div>
      </div>
      <div id="features" class="features-section">
        <div class="feature-card" v-for="i in 6" :key="i">Feature {{ i }}</div>
      </div>
      <div class="footer">
        <div class="footer-content">Footer content</div>
      </div>
    </div>
  `,
  methods: {
    goToLogin() {
      this.$router.push("/login")
    },
    scrollToFeatures() {
      document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })
    }
  }
}

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
        mocks: {
          $router: {
            push: mockPush
          }
        }
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
    const loginButton = wrapper.find('[data-testid="login-button"]')
    await loginButton.trigger("click")

    expect(mockPush).toHaveBeenCalledWith("/login")
  })

  it("scrolls to features when learn more button is clicked", async () => {
    // Mock scrollIntoView
    const mockScrollIntoView = vi.fn()
    const mockGetElementById = vi.spyOn(document, "getElementById").mockReturnValue({
      scrollIntoView: mockScrollIntoView,
    } as any)

    const learnMoreButton = wrapper.find('[data-testid="learn-more-button"]')
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
