import { ref, computed, watch, type Ref } from 'vue'

// Cache pour éviter de re-télécharger les mêmes images
const imageCache = new Map<string, string>()
const loadingCache = new Set<string>()

export function useImageLoader() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Convertit une URL d'image relative en data URL base64
   * Gère automatiquement l'authentification via fetch
   */
  const loadImageAsDataUrl = async (imageUrl: string): Promise<string> => {
    if (!imageUrl) return ''

    // Si c'est déjà une data URL, on la retourne telle quelle
    if (imageUrl.startsWith('data:')) {
      return imageUrl
    }

    // Si c'est une URL externe (http/https), on la retourne telle quelle
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // Pour les URLs externes, on ne peut pas toujours les convertir à cause du CORS
      // On essaie quand même, mais on fallback sur l'URL originale
      try {
        return await fetchAndConvertToDataUrl(imageUrl)
      } catch {
        return imageUrl
      }
    }

    // Pour les URLs relatives (/api/templates/logos/...), on utilise notre cache
    if (imageCache.has(imageUrl)) {
      return imageCache.get(imageUrl)!
    }

    // Éviter les téléchargements parallèles de la même image
    if (loadingCache.has(imageUrl)) {
      // Attendre que l'autre requête se termine
      while (loadingCache.has(imageUrl)) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      return imageCache.get(imageUrl) || imageUrl
    }

    try {
      loadingCache.add(imageUrl)
      const dataUrl = await fetchAndConvertToDataUrl(imageUrl)
      imageCache.set(imageUrl, dataUrl)
      return dataUrl
    } catch (err) {
      console.warn('Failed to load image as data URL:', err)
      return imageUrl // Fallback sur l'URL originale
    } finally {
      loadingCache.delete(imageUrl)
    }
  }

  /**
   * Fetch une image et la convertit en data URL
   */
  const fetchAndConvertToDataUrl = async (url: string): Promise<string> => {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }

    const blob = await response.blob()

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  /**
   * Composable réactif pour charger une image
   */
  const useImage = (imageUrl: Ref<string> | string) => {
    const url = ref(typeof imageUrl === 'string' ? imageUrl : imageUrl.value)
    const dataUrl = ref<string>('')
    const isLoading = ref(false)
    const loadError = ref<string | null>(null)

    const load = async () => {
      if (!url.value) {
        dataUrl.value = ''
        return
      }

      isLoading.value = true
      loadError.value = null

      try {
        dataUrl.value = await loadImageAsDataUrl(url.value)
      } catch (err) {
        loadError.value = err instanceof Error ? err.message : 'Failed to load image'
        dataUrl.value = url.value // Fallback
      } finally {
        isLoading.value = false
      }
    }

    // Charger automatiquement au début
    load()

    // Si c'est une ref réactive, recharger quand elle change
    if (typeof imageUrl !== 'string') {
      watch(imageUrl, (newUrl) => {
        url.value = newUrl
        load()
      })
    }

    return {
      dataUrl: computed(() => dataUrl.value),
      isLoading: computed(() => isLoading.value),
      error: computed(() => loadError.value),
      reload: load,
    }
  }

  return {
    loadImageAsDataUrl,
    useImage,
    loading: computed(() => loading.value),
    error: computed(() => error.value),
  }
}