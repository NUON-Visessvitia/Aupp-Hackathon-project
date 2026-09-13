// Vercel serverless entrypoint. vercel.json rewrites every /api/* request
// here (as a plain filename, not the bracket catch-all convention — that
// syntax collides with glob character-class matching in vercel.json's
// `functions` config keys, which silently broke includeFiles for parts.db).
// Express reads the original req.url to do its own internal routing, so the
// whole app just works as a single request handler. See server/app.js for
// the actual routes.
import app from '../server/app.js'

export default app
