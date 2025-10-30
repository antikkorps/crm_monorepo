import { ParameterizedContext } from "koa"
import { Next as KoaNext } from "koa"

// Use a more flexible context type that works with both Koa and Router
export type Context = ParameterizedContext
export type Next = KoaNext

// Middleware type for router compatibility
export type Middleware = (ctx: Context, next: Next) => Promise<void>
