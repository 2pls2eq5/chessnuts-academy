import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const COOKIE_NAME = 'chessnuts-auth'
const CHUNK_SIZE = 3000

function getCookie(name) {
  const cookies = document.cookie.split('; ')

  const cookie = cookies.find((row) =>
    row.startsWith(`${name}=`)
  )

  return cookie
    ? decodeURIComponent(cookie.substring(name.length + 1))
    : null
}

function setCookie(name, value) {
  const domain =
    window.location.hostname === 'chessnuts.fun' ||
    window.location.hostname.endsWith('.chessnuts.fun')
      ? '; Domain=.chessnuts.fun'
      : ''

  document.cookie =
    `${name}=${encodeURIComponent(value)}` +
    `${domain}; Path=/; SameSite=Lax` +
    (window.location.protocol === 'https:' ? '; Secure' : '')
}

function removeCookie(name) {
  const domain =
    window.location.hostname === 'chessnuts.fun' ||
    window.location.hostname.endsWith('.chessnuts.fun')
      ? '; Domain=.chessnuts.fun'
      : ''

  document.cookie =
    `${name}=; Max-Age=0${domain}; Path=/`
}

const sharedCookieStorage = {
  getItem(key) {
    const count =
      Number(getCookie(`${COOKIE_NAME}-count`)) || 1

    let value = ''

    for (let i = 0; i < count; i++) {
      value += getCookie(
        `${COOKIE_NAME}-${i}`
      ) || ''
    }

    return value || null
  },

  setItem(key, value) {
    const chunks = []

    for (
      let i = 0;
      i < value.length;
      i += CHUNK_SIZE
    ) {
      chunks.push(
        value.slice(i, i + CHUNK_SIZE)
      )
    }

    const oldCount =
      Number(getCookie(`${COOKIE_NAME}-count`)) || 0

    for (let i = 0; i < oldCount; i++) {
      removeCookie(`${COOKIE_NAME}-${i}`)
    }

    chunks.forEach((chunk, index) => {
      setCookie(
        `${COOKIE_NAME}-${index}`,
        chunk
      )
    })

    setCookie(
      `${COOKIE_NAME}-count`,
      String(chunks.length)
    )
  },

  removeItem(key) {
    const count =
      Number(getCookie(`${COOKIE_NAME}-count`)) || 0

    for (let i = 0; i < count; i++) {
      removeCookie(`${COOKIE_NAME}-${i}`)
    }

    removeCookie(`${COOKIE_NAME}-count`)
  },
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: sharedCookieStorage,
      storageKey: COOKIE_NAME,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)
