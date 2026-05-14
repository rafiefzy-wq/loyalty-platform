import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
  isAuthenticatedNextjs,
} from '@convex-dev/auth/nextjs/server'

const isProtected = createRouteMatcher(['/dashboard(.*)', '/scanner(.*)'])
const isAuthPage = createRouteMatcher(['/login', '/register'])

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const authed = await isAuthenticatedNextjs()

  if (isProtected(request) && !authed) {
    return nextjsMiddlewareRedirect(request, '/login')
  }
  if (isAuthPage(request) && authed) {
    return nextjsMiddlewareRedirect(request, '/dashboard')
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
