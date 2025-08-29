import { describe, expect, it } from "vitest"
import { AvatarService } from "../../services/AvatarService"

describe("AvatarService", () => {
  describe("generateAvatarUrl", () => {
    it("should generate URL with default options", () => {
      const url = AvatarService.generateAvatarUrl()

      expect(url).toContain("api.dicebear.com")
      expect(url).toContain("avataaars") // default style
      expect(url).toContain("size=200") // default size
    })

    it("should generate URL with custom seed", () => {
      const seed = "test-seed"
      const url = AvatarService.generateAvatarUrl({ seed })

      expect(url).toContain(`seed=${seed}`)
    })

    it("should generate URL with custom style", () => {
      const style = "bottts"
      const url = AvatarService.generateAvatarUrl({ style })

      expect(url).toContain(`/${style}/`)
    })

    it("should generate URL with custom size", () => {
      const size = 150
      const url = AvatarService.generateAvatarUrl({ size })

      expect(url).toContain(`size=${size}`)
    })

    it("should generate URL with background color", () => {
      const backgroundColor = "ff0000"
      const url = AvatarService.generateAvatarUrl({ backgroundColor })

      expect(url).toContain(`backgroundColor=${backgroundColor}`)
    })

    it("should generate URL with all custom options", () => {
      const options = {
        seed: "custom-seed",
        style: "pixel-art",
        size: 300,
        backgroundColor: "00ff00",
      }

      const url = AvatarService.generateAvatarUrl(options)

      expect(url).toContain(`/${options.style}/`)
      expect(url).toContain(`seed=${options.seed}`)
      expect(url).toContain(`size=${options.size}`)
      expect(url).toContain(`backgroundColor=${options.backgroundColor}`)
    })
  })

  describe("generateUserAvatar", () => {
    it("should generate avatar for user with name", () => {
      const firstName = "John"
      const lastName = "Doe"
      const url = AvatarService.generateUserAvatar(firstName, lastName)

      const expectedSeed = AvatarService.generateSeedFromName(firstName, lastName)
      expect(url).toContain(`seed=${expectedSeed}`)
    })

    it("should generate avatar with custom options", () => {
      const firstName = "Jane"
      const lastName = "Smith"
      const options = { style: "lorelei", size: 250 }

      const url = AvatarService.generateUserAvatar(firstName, lastName, options)

      expect(url).toContain("/lorelei/")
      expect(url).toContain("size=250")
    })
  })

  describe("generateAvatarFromSeed", () => {
    it("should generate avatar from existing seed", () => {
      const seed = "existing-seed"
      const url = AvatarService.generateAvatarFromSeed(seed)

      expect(url).toContain(`seed=${seed}`)
      expect(url).toContain("avataaars") // default style
    })

    it("should generate avatar from seed with custom style", () => {
      const seed = "existing-seed"
      const style = "micah"
      const url = AvatarService.generateAvatarFromSeed(seed, { style })

      expect(url).toContain(`seed=${seed}`)
      expect(url).toContain(`/${style}/`)
    })
  })

  describe("generateSeedFromName", () => {
    it("should generate consistent seed from name", () => {
      const firstName = "John"
      const lastName = "Doe"

      const seed1 = AvatarService.generateSeedFromName(firstName, lastName)
      const seed2 = AvatarService.generateSeedFromName(firstName, lastName)

      expect(seed1).toBe(seed2)
      expect(seed1).toBe("john-doe")
    })

    it("should handle names with spaces", () => {
      const firstName = " John "
      const lastName = " Doe "

      const seed = AvatarService.generateSeedFromName(firstName, lastName)

      expect(seed).toBe("john-doe")
    })

    it("should handle special characters", () => {
      const firstName = "José"
      const lastName = "García-López"

      const seed = AvatarService.generateSeedFromName(firstName, lastName)

      expect(seed).toBe("jos-garca-lpez")
    })

    it("should handle numbers in names", () => {
      const firstName = "John2"
      const lastName = "Doe3"

      const seed = AvatarService.generateSeedFromName(firstName, lastName)

      expect(seed).toBe("john2-doe3")
    })

    it("should convert to lowercase", () => {
      const firstName = "JOHN"
      const lastName = "DOE"

      const seed = AvatarService.generateSeedFromName(firstName, lastName)

      expect(seed).toBe("john-doe")
    })
  })

  describe("generateRandomSeed", () => {
    it("should generate random seed", () => {
      const seed1 = AvatarService.generateRandomSeed()
      const seed2 = AvatarService.generateRandomSeed()

      expect(seed1).not.toBe(seed2)
      expect(seed1.length).toBe(16) // 8 bytes = 16 hex characters
      expect(seed2.length).toBe(16)
    })

    it("should generate hex string", () => {
      const seed = AvatarService.generateRandomSeed()

      expect(seed).toMatch(/^[0-9a-f]{16}$/)
    })
  })

  describe("updateUserAvatarSeed", () => {
    it("should generate name-based seed when not forced", () => {
      const firstName = "John"
      const lastName = "Doe"

      const seed = AvatarService.updateUserAvatarSeed(firstName, lastName, false)

      expect(seed).toBe("john-doe")
    })

    it("should generate random seed when forced", () => {
      const firstName = "John"
      const lastName = "Doe"

      const seed = AvatarService.updateUserAvatarSeed(firstName, lastName, true)

      expect(seed).not.toBe("john-doe")
      expect(seed.length).toBe(16)
    })
  })

  describe("getAvailableStyles", () => {
    it("should return array of available styles", () => {
      const styles = AvatarService.getAvailableStyles()

      expect(Array.isArray(styles)).toBe(true)
      expect(styles.length).toBeGreaterThan(0)
      expect(styles).toContain("avataaars")
      expect(styles).toContain("bottts")
      expect(styles).toContain("pixel-art")
    })
  })

  describe("isValidStyle", () => {
    it("should validate existing styles", () => {
      expect(AvatarService.isValidStyle("avataaars")).toBe(true)
      expect(AvatarService.isValidStyle("bottts")).toBe(true)
      expect(AvatarService.isValidStyle("pixel-art")).toBe(true)
    })

    it("should reject invalid styles", () => {
      expect(AvatarService.isValidStyle("invalid-style")).toBe(false)
      expect(AvatarService.isValidStyle("")).toBe(false)
      expect(AvatarService.isValidStyle("random")).toBe(false)
    })
  })

  describe("getAvatarMetadata", () => {
    it("should return metadata with default style", () => {
      const seed = "test-seed"
      const metadata = AvatarService.getAvatarMetadata(seed)

      expect(metadata.seed).toBe(seed)
      expect(metadata.style).toBe("avataaars")
      expect(metadata.url).toContain(seed)
      expect(metadata.url).toContain("avataaars")
    })

    it("should return metadata with custom style", () => {
      const seed = "test-seed"
      const style = "bottts"
      const metadata = AvatarService.getAvatarMetadata(seed, style)

      expect(metadata.seed).toBe(seed)
      expect(metadata.style).toBe(style)
      expect(metadata.url).toContain(seed)
      expect(metadata.url).toContain(style)
    })

    it("should fallback to default style for invalid style", () => {
      const seed = "test-seed"
      const invalidStyle = "invalid-style"
      const metadata = AvatarService.getAvatarMetadata(seed, invalidStyle)

      expect(metadata.seed).toBe(seed)
      expect(metadata.style).toBe("avataaars") // fallback to default
      expect(metadata.url).toContain("avataaars")
    })
  })
})
