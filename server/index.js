// Local dev entrypoint — runs the Express app as a persistent server on
// SERVER_PORT (see vite.config.ts's dev proxy). In production on Vercel,
// api/[...slug].js imports server/app.js directly instead; Vercel invokes it
// as a serverless function and never runs this file.
import app from './app.js'

const PORT = process.env.SERVER_PORT || 8787
app.listen(PORT, () => console.log(`Chat server listening on http://localhost:${PORT}`))
