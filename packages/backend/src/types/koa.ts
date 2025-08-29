import { RouterContext } from "@koa/router"
import { Next as KoaNext } from "koa"

// Use the proper router context type from @koa/router
export type Context = RouterContext
export type Next = KoaNext

// Middleware type for router compatibility
export type Middleware = (ctx: Context, next: Next) => Promise<void>
