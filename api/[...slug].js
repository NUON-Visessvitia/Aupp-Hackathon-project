// Vercel serverless entrypoint. The bracket filename makes this catch every
// path under /api/* (Vercel's file-system routing), and since Express does
// its own internal routing against req.url, the whole app just works as a
// request handler — no rewrites needed. See server/app.js for the routes.
import app from '../server/app.js'

export default app
