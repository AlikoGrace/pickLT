import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

/**
 * Routes that require authentication.
 * - Mover dashboard & management routes
 * - Account/profile routes
 * - Protected API routes (mover-specific)
 */
const isProtectedRoute = createRouteMatcher([
  // Mover dashboard routes
  '/dashboard(.*)',
  '/available-moves(.*)',
  '/earnings(.*)',
  '/my-crew(.*)',
  '/settings(.*)',
  // Account routes
  '/account(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect({
      unauthenticatedUrl: new URL('/login?type=mover', req.url).toString(),
    })
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
