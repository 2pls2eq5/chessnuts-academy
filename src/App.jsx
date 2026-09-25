import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

function App() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    async function initAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        const returnTo = encodeURIComponent(
          window.location.href
        )

        window.location.href =
          `https://chessnuts.fun/login?returnTo=${returnTo}`

        return
      }

      setUser(user)
      setLoading(false)
    }

    initAuth()
  }, [])

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Loading...
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '40px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <h1>Chessnuts Academy</h1>

      <p>
        Welcome back,{' '}
        {user?.email}
      </p>

      <p>
        Academy Dashboard coming together...
      </p>
    </div>
  )
}

export default App
