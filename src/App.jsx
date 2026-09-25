import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

function App() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const [stats, setStats] = useState({
    students: 0,
    coaches: 0,
    parents: 0,
  })

  const [error, setError] = useState('')

  useEffect(() => {
    async function initDashboard() {
      setLoading(true)
      setError('')

      /* =========================
         AUTH
      ========================= */

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

      /* =========================
         PROFILE
      ========================= */

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }

      setProfile(profileData)

      /* =========================
         ROLE
      ========================= */

      const {
        data: roleData,
        error: roleError,
      } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)

      if (roleError) {
        setError(roleError.message)
        setLoading(false)
        return
      }

      const admin =
        (roleData || []).some(
          (item) => item.role === 'ADMIN'
        )

      setIsAdmin(admin)

      if (!admin) {
        setLoading(false)
        return
      }

/* =========================
   DASHBOARD STATS
========================= */

const studentsResult = await supabase
  .from('students')
  .select('id')

console.log('STUDENTS RESULT:', studentsResult)

const coachesResult = await supabase
  .from('coaches')
  .select('id', { count: 'exact', head: true })

const parentsResult = await supabase
  .from('parents')
  .select('id', { count: 'exact', head: true })

if (studentsResult.error) {
  setError(studentsResult.error.message)
  setLoading(false)
  return
}

if (coachesResult.error) {
  setError(coachesResult.error.message)
  setLoading(false)
  return
}

if (parentsResult.error) {
  setError(parentsResult.error.message)
  setLoading(false)
  return
}

setStats({
  students: studentsResult.data?.length || 0,
  coaches: coachesResult.count || 0,
  parents: parentsResult.count || 0,
})

setLoading(false)

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        Loading...
      </div>
    )
  }

  /* =========================
     ERROR
  ========================= */

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          padding: '40px',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <h1>Chessnuts Academy</h1>

        <p
          style={{
            color: '#b00020',
          }}
        >
          {error}
        </p>
      </div>
    )
  }

  /* =========================
     ACCESS DENIED
  ========================= */

  if (!isAdmin) {
    return (
      <div
        style={{
          minHeight: '100vh',
          padding: '40px',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <h1>Chessnuts Academy</h1>

        <h2>Access denied</h2>

        <p>
          You need the ADMIN role to access
          this dashboard.
        </p>
      </div>
    )
  }

  /* =========================
     ADMIN DASHBOARD
  ========================= */

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f7f7f4',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <header
        style={{
          background: '#111',
          color: 'white',
          padding: '20px 40px',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: '24px',
          }}
        >
          Chessnuts Academy
        </h1>
      </header>

      <main
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '40px 24px',
        }}
      >
        <div
          style={{
            marginBottom: '32px',
          }}
        >
          <h2
            style={{
              margin: '0 0 8px',
              fontSize: '32px',
            }}
          >
            Admin Dashboard
          </h2>

          <p
            style={{
              margin: 0,
              color: '#555',
              fontSize: '16px',
            }}
          >
            Welcome back,{' '}
            <strong>
              {profile?.display_name ||
                user?.email}
            </strong>
          </p>
        </div>

        {/* =========================
            STATISTICS
        ========================= */}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '20px',
          }}
        >
          <div
            style={{
              background: 'white',
              border: '1px solid #e0e0dc',
              borderRadius: '16px',
              padding: '28px',
            }}
          >
            <div
              style={{
                color: '#666',
                fontSize: '14px',
                marginBottom: '10px',
              }}
            >
              Students
            </div>

            <div
              style={{
                fontSize: '40px',
                fontWeight: '800',
              }}
            >
              {stats.students}
            </div>
          </div>

          <div
            style={{
              background: 'white',
              border: '1px solid #e0e0dc',
              borderRadius: '16px',
              padding: '28px',
            }}
          >
            <div
              style={{
                color: '#666',
                fontSize: '14px',
                marginBottom: '10px',
              }}
            >
              Coaches
            </div>

            <div
              style={{
                fontSize: '40px',
                fontWeight: '800',
              }}
            >
              {stats.coaches}
            </div>
          </div>

          <div
            style={{
              background: 'white',
              border: '1px solid #e0e0dc',
              borderRadius: '16px',
              padding: '28px',
            }}
          >
            <div
              style={{
                color: '#666',
                fontSize: '14px',
                marginBottom: '10px',
              }}
            >
              Parents
            </div>

            <div
              style={{
                fontSize: '40px',
                fontWeight: '800',
              }}
            >
              {stats.parents}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
