export interface AvatarOptions {
  seed?: string
  style?: string
  size?: number
  backgroundColor?: string
}

export class AvatarService {
  private static readonly DEFAULT_STYLE = 'avataaars'
  private static readonly DEFAULT_SIZE = 200
  private static readonly BASE_URL = 'https://api.dicebear.com/7.x'

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
      params.append('backgroundColor', backgroundColor)
    }

    return `${this.BASE_URL}/${style}/png?${params.toString()}`
  }

  /**
   * Generate avatar URL for a user based on their name
   */
  public static generateUserAvatar(
    firstName: string,
    lastName: string,
    options: Omit<AvatarOptions, 'seed'> = {}
  ): string {
    const seed = this.generateSeedFromName(firstName, lastName)
    return this.generateAvatarUrl({ ...options, seed })
  }

  /**
   * Generate avatar URL using existing avatar seed
   */
  public static generateAvatarFromSeed(
    avatarSeed: string,
    options: Omit<AvatarOptions, 'seed'> = {}
  ): string {
    return this.generateAvatarUrl({ ...options, seed: avatarSeed })
  }

  /**
   * Generate a consistent seed from user's name
   */
  public static generateSeedFromName(firstName: string, lastName: string): string {
    const fullName = `${firstName.trim()}-${lastName.trim()}`.toLowerCase()
    return fullName.replace(/[^a-z0-9-]/g, '')
  }

  /**
   * Generate a random seed for avatar
   */
  public static generateRandomSeed(): string {
    return Math.random().toString(36).substring(2, 15)
  }

  /**
   * Get available avatar styles
   */
  public static getAvailableStyles(): string[] {
    return [
      'avataaars',
      'big-ears',
      'big-ears-neutral',
      'big-smile',
      'bottts',
      'croodles',
      'croodles-neutral',
      'fun-emoji',
      'icons',
      'identicon',
      'initials',
      'lorelei',
      'lorelei-neutral',
      'micah',
      'miniavs',
      'open-peeps',
      'personas',
      'pixel-art',
      'pixel-art-neutral',
      'shapes',
      'thumbs',
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
   * Generate avatar URLs for different sizes (for responsive display)
   */
  public static generateResponsiveAvatars(
    seed: string,
    style = this.DEFAULT_STYLE
  ): {
    small: string    // 32px - for navbar, lists
    medium: string   // 64px - for cards, forms
    large: string    // 120px - for profile pages
    xlarge: string   // 200px - for preview, selection
  } {
    return {
      small: this.generateAvatarFromSeed(seed, { style, size: 32 }),
      medium: this.generateAvatarFromSeed(seed, { style, size: 64 }),
      large: this.generateAvatarFromSeed(seed, { style, size: 120 }),
      xlarge: this.generateAvatarFromSeed(seed, { style, size: 200 }),
    }
  }
}