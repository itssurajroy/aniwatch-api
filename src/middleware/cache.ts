import type { Context, MiddlewareHandler } from "hono"; // <-- FIX: Consolidated and corrected import
import { env } from "../config/env.js";
import { AniwatchAPICache, cache } from "../config/cache.js";
import type { ServerContext } from "../config/context.js";

export const cacheControl: MiddlewareHandler = async (c, next) => {
    // ... (this function is fine)
    const sMaxAge = env.ANIWATCH_API_S_MAXAGE;
    const staleWhileRevalidate = env.ANIWATCH_API_STALE_WHILE_REVALIDATE;

    c.header(
        "Cache-Control",
        `s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`
    );

    await next();
};

export function cacheConfigSetter(keySliceIndex: number): MiddlewareHandler {
    // ... (this function is fine)
    return async (c, next) => {
        const { pathname, search } = new URL(c.req.url);

        const duration = Number(
            c.req.header(AniwatchAPICache.CACHE_EXPIRY_HEADER_NAME) ||
                AniwatchAPICache.DEFAULT_CACHE_EXPIRY_SECONDS
        );
        c.set("CACHE_CONFIG", {
            key: `${pathname.slice(keySliceIndex) + search}`,
            duration,
        });

        if (AniwatchAPICache.enabled) {
            c.res.headers.set(
                AniwatchAPICache.CACHE_EXPIRY_HEADER_NAME,
                duration.toString()
            );
        }

        await next();
    };
}

// THIS FUNCTION IS NOW FULLY CORRECTED
export function withCache<T, P extends string = string>(
    getData: (c: Context<ServerContext, P>) => Promise<T>
): MiddlewareHandler<ServerContext, P> { // <-- FIX: Added the explicit return type
    return async (c) => {
        const cacheConfig = c.get("CACHE_CONFIG");

        const data = await cache.getOrSet<T>(
            () => getData(c),
            cacheConfig.key,
            cacheConfig.duration
        );

        return c.json({ success: true, data }, { status: 200 });
    };
}
