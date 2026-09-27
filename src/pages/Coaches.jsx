import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AcademyHeader from '../components/AcademyHeader'

function Coaches() {
  const [loading, setLoading] = useState(true)
  const [coaches, setCoaches] = useState([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadCoaches() {
      setLoading(true)
      setError('')

      const {
        data,
        error,
      } = await supabase
        .from('coaches')
        .select(`
          id,
          join_date,
          status,
          bio,
          profiles (
            display_name
          )
        `)
        .order('join_date', {
          ascending: true,
        })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      setCoaches(data || [])
      setLoading(false)
    }

    loadCoaches()
  }, [])

  const filteredCoaches =
    coaches.filter((coach) => {
      const name =
        coach.profiles?.display_name ||
        ''

      return name
        .toLowerCase()
        .includes(search.toLowerCase())
    })

  if (loading) {
    return (
      <div className="academy-app">
        <AcademyHeader />

        <div className="page-state">
          Loading coaches...
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
        <div className="page-header">
          <div className="page-header-copy">
            <h1>Coaches</h1>

            <p>
              Manage Academy coaches
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => {
              window.location.href =
                '/coaches/add'
            }}
          >
            + Add Coach
          </button>
        </div>

        <div className="students-toolbar">
          <input
            className="search-input"
            type="text"
            placeholder="Search coaches..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />
        </div>

        <div className="card table-card">
          {filteredCoaches.length === 0 ? (
            <div className="empty-state">
              {search
                ? 'No coaches match your search.'
                : 'No coaches found.'}
            </div>
          ) : (
            <div className="table-scroll">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCoaches.map(
                    (coach) => {
                      const status =
                        coach.status ||
                        'unknown'

                      return (
                        <tr key={coach.id}>
                          <td>
                            <button
                              className="student-name-button"
                              onClick={() => {
                                window.location.href =
                                  `/coaches/${coach.id}`
                              }}
                            >
                              {coach.profiles
                                ?.display_name ||
                                'Unnamed Coach'}
                            </button>
                          </td>

                          <td>
                            <span
                              className={
                                `status-badge ${
                                  status ===
                                  'active'
                                    ? 'status-active'
                                    : 'status-inactive'
                                }`
                              }
                            >
                              {status}
                            </span>
                          </td>

                          <td>
                            {coach.join_date
                              ? new Date(
                                  coach.join_date
                                ).toLocaleDateString(
                                  'en-GB'
                                )
                              : '—'}
                          </td>
                        </tr>
                      )
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default Coaches
