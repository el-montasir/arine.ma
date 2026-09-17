import bcrypt from 'bcryptjs'

// Admin passwords are never stored or returned as plaintext.
const COST = 12

export async function hashPassword(plain) {
  return bcrypt.hash(plain, COST)
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash)
}