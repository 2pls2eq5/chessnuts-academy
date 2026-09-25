import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getStudentLevelLabel } from '../constants/studentLevels'
import AcademyHeader from '../components/AcademyHeader'

function Students() {
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadStudents() {
      setLoading(true)
      setError('')

      const {
        data,
        error,
      } = await supabase
        .from('students')
        .select(`
          id,
          date_of_birth,
          join_date,
          status,
          level,
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

      setStudents(data || [])
      setLoading(false)
    }

    loadStudents()
  }, [])

  const filteredStudents =
    students.filter((student) => {
      const name =
        student.profiles?.display_name ||
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
          Loading students...
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
            <h1>Students</h1>

            <p>
              Manage Academy students
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => {
              window.location.href =
                '/students/add'
            }}
          >
            + Add Student
          </button>
        </div>

        <div className="students-toolbar">
          <input
            className="search-input"
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />
        </div>

        <div className="card table-card">
          {filteredStudents.length === 0 ? (
            <div className="empty-state">
              {search
                ? 'No students match your search.'
                : 'No students found.'}
            </div>
          ) : (
            <div className="table-scroll">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Level</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStudents.map(
                    (student) => {
                      const status =
                        student.status ||
                        'unknown'

                      return (
                        <tr key={student.id}>
                          <td>
                            <button
                              className="student-name-button"
                              onClick={() => {
                                window.location.href =
                                  `/students/${student.id}`
                              }}
                            >
                              {student.profiles
                                ?.display_name ||
                                'Unnamed Student'}
                            </button>
                          </td>

                          <td>
                            <span className="level-badge">
                              {getStudentLevelLabel(
                                student.level
                              )}
                            </span>
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
                            {student.join_date
                              ? new Date(
                                  student.join_date
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

export default Students
