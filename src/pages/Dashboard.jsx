import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AcademyHeader from '../components/AcademyHeader'

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

      const studentsResult = await supabase
        .from('students')
        .select('id')

      const coachesResult = await supabase
        .from('coaches')
        .select('id')

      const parentsResult = await supabase
        .from('parents')
        .select('id')

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

  if (loading) {
    return (
      <div className="academy-app">
        <AcademyHeader />

        <div className="page-state">
          Loading dashboard...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-page">
        <h1>Chessnuts Academy</h1>
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="academy-app">
      <AcademyHeader />

      <main className="academy-main">
        <div className="dashboard-welcome">
          <div className="page-header-copy">
            <h1>Admin Dashboard</h1>

            <div className="page-header-welcome">
              Welcome back,{' '}
              <strong>
                {profile?.display_name ||
                  user?.email}
              </strong>
            </div>
          </div>
        </div>

        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-label">
              Students
            </div>

            <div className="stat-value">
              {stats.students}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              Coaches
            </div>

            <div className="stat-value">
              {stats.coaches}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              Parents
            </div>

            <div className="stat-value">
              {stats.parents}
            </div>
          </div>
        </div>

        <section className="quick-actions">
          <h2 className="section-title">
            Quick Actions
          </h2>

          <button
            className="btn btn-primary"
            onClick={() => {
              window.location.href =
                '/students'
            }}
          >
            View Students
          </button>
        </section>
      </main>
    </div>
  )
}

export default Dashboard
