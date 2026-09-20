import 'dotenv/config'
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import pg from 'pg'

// Server-side admin sessions stored in the existing PostgreSQL database
// (survives restarts, works across one instance, no extra infra).
// The session secret is loaded from server/.env — never hardcoded.
const SESSION_SECRET = process.env.SESSION_SECRET
if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET missing from server/.env — refusing to boot without it.')
}

const PGStore = connectPgSimple(session)
const { Pool } = pg

const sessionPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 })
sessionPool.on('error', (err) => {
  console.error('[SESSION_POOL_ERROR] Unexpected error on idle client:', err.message)
})

export const sessionMiddleware = session({
  store: new PGStore({
    pool: sessionPool,
    createTableIfMissing: true, // creates the "session" table on first use
  }),
  name: 'arine.admin.sid', // distinct from any future user-facing cookie
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false, // no cookie for anonymous requests
  cookie: {
    httpOnly: true, // JS never sees the token
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    maxAge: 1000 * 60 * 60 * 12, // 12 hours
  },
})