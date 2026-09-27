import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AcademyHeader from '../components/AcademyHeader'

function Parents() {
  const [loading, setLoading] = useState(true)
  const [parents, setParents] = useState([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadParents() {
      setLoading(true)
      setError('')

      const {
        data,
        error,
      } = await supabase
        .from('parents')
        .select(`
          id,
          created_at,
          profiles (
            display_name
          ),
          parent_students (
            student_id
          )
        `)
        .order('created_at', {
          ascending: true,
        })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      setParents(data || [])
      setLoading(false)
    }

    loadParents()
  }, [])

  const filteredParents =
    parents.filter((parent) => {
      const name =
        parent.profiles?.display_name ||
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
          Loading parents...
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
            <h1>Parents</h1>

            <p>
              Manage Academy parents
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => {
              window.location.href =
                '/parents/add'
            }}
          >
            + Add Parent
          </button>
        </div>

        <div className="students-toolbar">
          <input
            className="search-input"
            type="text"
            placeholder="Search parents..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />
        </div>

        <div className="card table-card">
          {filteredParents.length === 0 ? (
            <div className="empty-state">
              {search
                ? 'No parents match your search.'
                : 'No parents found.'}
            </div>
          ) : (
            <div className="table-scroll">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Children</th>
                    <th>Joined</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredParents.map(
                    (parent) => {
                      const childrenCount =
                        parent
                          .parent_students
                          ?.length || 0

                      return (
                        <tr key={parent.id}>
                          <td>
                            <button
                              className="student-name-button"
                              onClick={() => {
                                window.location.href =
                                  `/parents/${parent.id}`
                              }}
                            >
                              {parent.profiles
                                ?.display_name ||
                                'Unnamed Parent'}
                            </button>
                          </td>

                          <td>
                            {childrenCount}
                          </td>

                          <td>
                            {parent.created_at
                              ? new Date(
                                  parent.created_at
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

export default Parents
