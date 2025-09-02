import { PluginHookManager } from "../types/plugin"
import { logger } from "../utils/logger"

export class DefaultPluginHookManager implements PluginHookManager {
  private hooks: Map<string, Set<Function>> = new Map()

  register(hookName: string, callback: Function): void {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, new Set())
    }

    this.hooks.get(hookName)!.add(callback)
    logger.debug(`Hook registered: ${hookName}`, {
      callbackName: callback.name || "anonymous",
      totalCallbacks: this.hooks.get(hookName)!.size,
    })
  }

  unregister(hookName: string, callback: Function): void {
    const hookCallbacks = this.hooks.get(hookName)
    if (hookCallbacks) {
      hookCallbacks.delete(callback)
      logger.debug(`Hook unregistered: ${hookName}`, {
        callbackName: callback.name || "anonymous",
        remainingCallbacks: hookCallbacks.size,
      })

      // Clean up empty hook sets
      if (hookCallbacks.size === 0) {
        this.hooks.delete(hookName)
      }
    }
  }

  async execute(hookName: string, ...args: any[]): Promise<any[]> {
    const hookCallbacks = this.hooks.get(hookName)
    if (!hookCallbacks || hookCallbacks.size === 0) {
      logger.debug(`No callbacks registered for hook: ${hookName}`)
      return []
    }

    logger.debug(`Executing hook: ${hookName}`, {
      callbackCount: hookCallbacks.size,
      args: args.length,
    })

    const results: any[] = []
    const promises: Promise<any>[] = []

    for (const callback of hookCallbacks) {
      try {
        const result = callback(...args)

        // Handle both sync and async callbacks
        if (result && typeof result.then === "function") {
          promises.push(result)
        } else {
          results.push(result)
        }
      } catch (error) {
        logger.error(`Error executing hook callback: ${hookName}`, {
          error: error instanceof Error ? error.message : String(error),
          callbackName: callback.name || "anonymous",
        })
        // Continue executing other callbacks even if one fails
      }
    }

    // Wait for all async callbacks to complete
    if (promises.length > 0) {
      try {
        const asyncResults = await Promise.allSettled(promises)

        for (const result of asyncResults) {
          if (result.status === "fulfilled") {
            results.push(result.value)
          } else {
            logger.error(`Async hook callback failed: ${hookName}`, {
              error: result.reason,
            })
          }
        }
      } catch (error) {
        logger.error(`Error waiting for async hook callbacks: ${hookName}`, {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return results
  }

  async executeFirst(hookName: string, ...args: any[]): Promise<any> {
    const hookCallbacks = this.hooks.get(hookName)
    if (!hookCallbacks || hookCallbacks.size === 0) {
      logger.debug(`No callbacks registered for hook: ${hookName}`)
      return undefined
    }

    logger.debug(`Executing first hook callback: ${hookName}`, {
      totalCallbacks: hookCallbacks.size,
      args: args.length,
    })

    // Get the first callback
    const firstCallback = hookCallbacks.values().next().value as (Function | undefined)

    if (!firstCallback) {
      return undefined
    }

    try {
      const result = firstCallback(...args)

      // Handle both sync and async callbacks
      if (result && typeof result.then === "function") {
        return await result
      }

      return result
    } catch (error) {
      logger.error(`Error executing first hook callback: ${hookName}`, {
        error: error instanceof Error ? error.message : String(error),
        callbackName: (firstCallback as Function).name || "anonymous",
      })
      throw error
    }
  }

  // Utility methods for hook management
  getRegisteredHooks(): string[] {
    return Array.from(this.hooks.keys())
  }

  getHookCallbackCount(hookName: string): number {
    return this.hooks.get(hookName)?.size || 0
  }

  hasHook(hookName: string): boolean {
    return this.hooks.has(hookName) && this.hooks.get(hookName)!.size > 0
  }

  clear(): void {
    this.hooks.clear()
    logger.debug("All hooks cleared")
  }

  clearHook(hookName: string): void {
    this.hooks.delete(hookName)
    logger.debug(`Hook cleared: ${hookName}`)
  }
}
