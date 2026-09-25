import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function Dashboard({ user, profile }) {
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState({
    students: 0,
    coaches: 0,
    parents: 0,
  })

  const [error, setError] = useState('')

  useEffect(() => {
    async function loadStats() {
      setLoading(true)
      setError('')

      /* =========================
         STUDENTS
      ========================= */

      const studentsResult = await supabase
        .from('students')
        .select('id')

      /* =========================
         COACHES
      ========================= */

      const coachesResult = await supabase
        .from('coaches')
        .select('id')

      /* =========================
         PARENTS
      ========================= */

      const parentsResult = await supabase
        .from('parents')
        .select('id')

      /* =========================
         ERRORS
      ========================= */

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

      /* =========================
         STATS
      ========================= */

      setStats({
        students:
          studentsResult.data?.length || 0,

        coaches:
          coachesResult.data?.length || 0,

        parents:
          parentsResult.data?.length || 0,
      })

      setLoading(false)
    }

    loadStats()
  }, [])

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
        Loading dashboard...
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
     DASHBOARD
  ========================= */

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f7f7f4',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* =========================
          HEADER
      ========================= */}

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
        {/* =========================
            WELCOME
        ========================= */}

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
            marginBottom: '40px',
          }}
        >
          {/* STUDENTS */}

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

          {/* COACHES */}

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

          {/* PARENTS */}

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

        {/* =========================
            QUICK ACTIONS
        ========================= */}

        <section>
          <h2
            style={{
              margin: '0 0 20px',
              fontSize: '24px',
            }}
          >
            Quick Actions
          </h2>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={() => {
                window.location.href =
                  '/students'
              }}
              style={{
                background: '#111',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 18px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              View Students
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

export default Dashboard
