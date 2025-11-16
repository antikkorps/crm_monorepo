import crypto from "crypto"
import fs from "fs/promises"
import path from "path"
import { logger } from "../utils/logger"

export interface AvatarOptions {
  seed?: string
  style?: string
  size?: number
  backgroundColor?: string
}

export class AvatarService {
  private static readonly DEFAULT_STYLE = "avataaars"
  private static readonly DEFAULT_SIZE = 200
  private static readonly BASE_URL = "https://api.dicebear.com/7.x"
  private static readonly AVATARS_DIR = path.join(process.cwd(), "uploads", "avatars")
  private static readonly USE_LOCAL_STORAGE = true // Enable local storage by default

  /**
   * Generate a DiceBear avatar URL based on a seed
   */
  public static generateAvatarUrl(options: AvatarOptions = {}): string {
    const {
      seed = this.generateRandomSeed(),
      style = this.DEFAULT_STYLE,
      size = this.DEFAULT_SIZE,
      backgroundColor,
    } = options

    const params = new URLSearchParams({
      seed: seed,
      size: size.toString(),
    })

    if (backgroundColor) {
      params.append("backgroundColor", backgroundColor)
    }

    return `${this.BASE_URL}/${style}/svg?${params.toString()}`
  }

  /**
   * Generate avatar URL for a user based on their name
   */
  public static generateUserAvatar(
    firstName: string,
    lastName: string,
    options: Omit<AvatarOptions, "seed"> = {}
  ): string {
    const seed = this.generateSeedFromName(firstName, lastName)
    return this.generateAvatarUrl({ ...options, seed })
  }

  /**
   * Generate avatar URL using existing avatar seed
   */
  public static generateAvatarFromSeed(
    avatarSeed: string,
    options: Omit<AvatarOptions, "seed"> = {}
  ): string {
    return this.generateAvatarUrl({ ...options, seed: avatarSeed })
  }

  /**
   * Generate a consistent seed from user's name
   */
  public static generateSeedFromName(firstName: string, lastName: string): string {
    const fullName = `${firstName.trim()}-${lastName.trim()}`.toLowerCase()
    return fullName.replace(/[^a-z0-9-]/g, "")
  }

  /**
   * Generate a random seed for avatar
   */
  public static generateRandomSeed(): string {
    return crypto.randomBytes(8).toString("hex")
  }

  /**
   * Update user's avatar seed
   */
  public static updateUserAvatarSeed(
    firstName: string,
    lastName: string,
    forceNew: boolean = false
  ): string {
    if (forceNew) {
      return this.generateRandomSeed()
    }
    return this.generateSeedFromName(firstName, lastName)
  }

  /**
   * Get available avatar styles
   */
  public static getAvailableStyles(): string[] {
    return [
      "avataaars",
      "big-ears",
      "big-ears-neutral",
      "big-smile",
      "bottts",
      "croodles",
      "croodles-neutral",
      "fun-emoji",
      "icons",
      "identicon",
      "initials",
      "lorelei",
      "lorelei-neutral",
      "micah",
      "miniavs",
      "open-peeps",
      "personas",
      "pixel-art",
      "pixel-art-neutral",
      "shapes",
      "thumbs",
    ]
  }

  /**
   * Validate avatar style
   */
  public static isValidStyle(style: string): boolean {
    return this.getAvailableStyles().includes(style)
  }

  /**
   * Get avatar metadata for API responses
   */
  public static getAvatarMetadata(
    avatarSeed: string,
    style?: string
  ): {
    seed: string
    url: string
    style: string
  } {
    const avatarStyle = style && this.isValidStyle(style) ? style : this.DEFAULT_STYLE
    return {
      seed: avatarSeed,
      url: this.generateAvatarFromSeed(avatarSeed, { style: avatarStyle }),
      style: avatarStyle,
    }
  }

  /**
   * Ensure avatars directory exists
   */
  private static async ensureAvatarsDirectory(): Promise<void> {
    try {
      await fs.access(this.AVATARS_DIR)
    } catch {
      await fs.mkdir(this.AVATARS_DIR, { recursive: true })
      logger.info(`Created avatars directory: ${this.AVATARS_DIR}`)
    }
  }

  /**
   * Get local file path for a user's avatar
   */
  public static getLocalAvatarPath(userId: string, style?: string): string {
    const avatarStyle = style && this.isValidStyle(style) ? style : this.DEFAULT_STYLE
    return path.join(this.AVATARS_DIR, `${userId}-${avatarStyle}.svg`)
  }

  /**
   * Get URL for locally stored avatar
   */
  public static getLocalAvatarUrl(userId: string, style?: string): string {
    const avatarStyle = style && this.isValidStyle(style) ? style : this.DEFAULT_STYLE
    return `/api/avatars/${userId}-${avatarStyle}.svg`
  }

  /**
   * Download SVG from DiceBear API
   */
  private static async downloadSvgFromDiceBear(
    seed: string,
    style: string
  ): Promise<string> {
    const url = this.generateAvatarUrl({ seed, style, size: 200 })

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch avatar: ${response.statusText}`)
      }
      return await response.text()
    } catch (error: any) {
      logger.error(`Failed to download avatar from DiceBear`, {
        error: error.message,
        seed,
        style,
        url,
      })
      throw error
    }
  }

  /**
   * Generate and store avatar SVG locally
   * @param userId - User ID
   * @param seed - Avatar seed
   * @param style - Avatar style (default: avataaars)
   * @returns Path to stored SVG file
   */
  public static async generateAndStoreAvatar(
    userId: string,
    seed: string,
    style?: string
  ): Promise<string> {
    const avatarStyle = style && this.isValidStyle(style) ? style : this.DEFAULT_STYLE
    const filePath = this.getLocalAvatarPath(userId, avatarStyle)

    try {
      // Ensure directory exists
      await this.ensureAvatarsDirectory()

      // Download SVG from DiceBear
      const svgContent = await this.downloadSvgFromDiceBear(seed, avatarStyle)

      // Store SVG file
      await fs.writeFile(filePath, svgContent, "utf-8")

      logger.info(`Avatar generated and stored`, {
        userId,
        seed,
        style: avatarStyle,
        path: filePath,
      })

      return filePath
    } catch (error: any) {
      logger.error(`Failed to generate and store avatar`, {
        error: error.message,
        userId,
        seed,
        style: avatarStyle,
      })
      throw error
    }
  }

  /**
   * Check if local avatar exists
   */
  public static async avatarExists(userId: string, style?: string): Promise<boolean> {
    const avatarStyle = style && this.isValidStyle(style) ? style : this.DEFAULT_STYLE
    const filePath = this.getLocalAvatarPath(userId, avatarStyle)

    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get avatar content (reads from local storage or generates if missing)
   */
  public static async getAvatarContent(
    userId: string,
    seed: string,
    style?: string
  ): Promise<string> {
    const avatarStyle = style && this.isValidStyle(style) ? style : this.DEFAULT_STYLE
    const filePath = this.getLocalAvatarPath(userId, avatarStyle)

    // Try to read existing file
    try {
      const content = await fs.readFile(filePath, "utf-8")
      return content
    } catch (error) {
      // File doesn't exist, generate it
      logger.info(`Avatar not found, generating new one`, { userId, seed, style: avatarStyle })
      await this.generateAndStoreAvatar(userId, seed, avatarStyle)
      return await fs.readFile(filePath, "utf-8")
    }
  }

  /**
   * Delete local avatar file
   */
  public static async deleteAvatar(userId: string, style?: string): Promise<void> {
    const avatarStyle = style && this.isValidStyle(style) ? style : this.DEFAULT_STYLE
    const filePath = this.getLocalAvatarPath(userId, avatarStyle)

    try {
      await fs.unlink(filePath)
      logger.info(`Avatar deleted`, { userId, style: avatarStyle })
    } catch (error: any) {
      if (error.code !== "ENOENT") {
        logger.error(`Failed to delete avatar`, {
          error: error.message,
          userId,
          style: avatarStyle,
        })
      }
    }
  }

  /**
   * Regenerate avatar (delete old and create new)
   */
  public static async regenerateAvatar(
    userId: string,
    seed: string,
    style?: string
  ): Promise<string> {
    const avatarStyle = style && this.isValidStyle(style) ? style : this.DEFAULT_STYLE

    // Delete old avatar
    await this.deleteAvatar(userId, avatarStyle)

    // Generate new one
    return await this.generateAndStoreAvatar(userId, seed, avatarStyle)
  }
}

export default AvatarService
