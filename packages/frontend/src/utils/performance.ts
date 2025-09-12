/**
 * Performance utilities for optimizing Vue applications
 */

// Debounce function to limit API calls
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout

  return (...args: Parameters<T>) => {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }

    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Throttle function to limit frequent operations
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, wait)
    }
  }
}

// Simple in-memory cache with TTL
export class SimpleCache<T = any> {
  private cache = new Map<string, { data: T; expiry: number }>()

  set(key: string, data: T, ttl: number = 300000): void { // 5 minutes default
    const expiry = Date.now() + ttl
    this.cache.set(key, { data, expiry })
  }

  get(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null

    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  clear(): void {
    this.cache.clear()
  }

  delete(key: string): void {
    this.cache.delete(key)
  }
}

// Lazy loading helper for large lists
export function createVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  return {
    getVisibleItems: (scrollTop: number) => {
      const visibleCount = Math.ceil(containerHeight / itemHeight)
      const startIndex = Math.floor(scrollTop / itemHeight)
      const endIndex = Math.min(startIndex + visibleCount + 2, items.length)
      
      return {
        items: items.slice(startIndex, endIndex),
        startIndex,
        endIndex,
        totalHeight: items.length * itemHeight
      }
    }
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, number[]> = new Map()

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  startTimer(key: string): void {
    if (typeof performance !== 'undefined') {
      const startTime = performance.now()
      if (!this.metrics.has(key)) {
        this.metrics.set(key, [])
      }
      this.metrics.get(key)!.push(startTime)
    }
  }

  endTimer(key: string): number {
    if (typeof performance !== 'undefined') {
      const endTime = performance.now()
      const times = this.metrics.get(key)
      if (times && times.length > 0) {
        const startTime = times.pop()!
        const duration = endTime - startTime
        console.log(`[Performance] ${key}: ${duration.toFixed(2)}ms`)
        return duration
      }
    }
    return 0
  }

  getAverageTime(key: string): number {
    const times = this.metrics.get(key)
    if (!times || times.length === 0) return 0
    return times.reduce((a, b) => a + b, 0) / times.length
  }
}

// Image lazy loading
export function createImageLazyLoader() {
  if (typeof IntersectionObserver === 'undefined') {
    return {
      observe: () => {},
      unobserve: () => {},
      disconnect: () => {}
    }
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement
        const src = img.dataset.src
        if (src) {
          img.src = src
          img.removeAttribute('data-src')
          observer.unobserve(img)
        }
      }
    })
  })

  return observer
}