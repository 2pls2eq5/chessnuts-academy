import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

function App() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    async function initAuth() {
      const params = new URLSearchParams(
        window.location.search
      )

      const code = params.get('code')

      if (code) {
        const { error } =
          await supabase.auth.exchangeCodeForSession(
            code
          )

        if (error) {
          console.error(error)
          window.location.href =
            'https://chessnuts.fun/login'
          return
        }

        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        )
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        window.location.href =
          'https://chessnuts.fun/login'
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
