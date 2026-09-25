import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

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

  /* =========================
     SEARCH
  ========================= */

  const filteredStudents =
    students.filter((student) => {
      const name =
        student.profiles?.display_name ||
        ''

      return name
        .toLowerCase()
        .includes(search.toLowerCase())
    })

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
        Loading students...
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
     STUDENTS PAGE
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
        {/* =========================
            PAGE HEADER
        ========================= */}

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '20px',
            marginBottom: '28px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2
              style={{
                margin: '0 0 8px',
                fontSize: '32px',
              }}
            >
              Students
            </h2>

            <p
              style={{
                margin: 0,
                color: '#555',
              }}
            >
              Manage Academy students
            </p>
          </div>

          <button
             onClick={() => {
    window.location.href = '/students/add'
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
            + Add Student
          </button>
        </div>

        {/* =========================
            SEARCH
        ========================= */}

        <div
          style={{
            marginBottom: '20px',
          }}
        >
          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            style={{
              width: '100%',
              maxWidth: '400px',
              boxSizing: 'border-box',
              padding: '12px 14px',
              border: '1px solid #d8d8d2',
              borderRadius: '10px',
              fontSize: '15px',
              outline: 'none',
              background: 'white',
            }}
          />
        </div>

        {/* =========================
            STUDENTS TABLE
        ========================= */}

        <div
          style={{
            background: 'white',
            border: '1px solid #e0e0dc',
            borderRadius: '16px',
            overflow: 'hidden',
          }}
        >
          {filteredStudents.length === 0 ? (
            <div
              style={{
                padding: '50px 30px',
                textAlign: 'center',
                color: '#666',
              }}
            >
              {search
                ? 'No students match your search.'
                : 'No students found.'}
            </div>
          ) : (
            <div
              style={{
                overflowX: 'auto',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: '#f7f7f4',
                      textAlign: 'left',
                    }}
                  >
                    <th
                      style={{
                        padding: '16px 20px',
                        fontSize: '13px',
                        color: '#666',
                        fontWeight: '700',
                      }}
                    >
                      Name
                    </th>

                    <th
                      style={{
                        padding: '16px 20px',
                        fontSize: '13px',
                        color: '#666',
                        fontWeight: '700',
                      }}
                    >
                      Level
                    </th>

                    <th
                      style={{
                        padding: '16px 20px',
                        fontSize: '13px',
                        color: '#666',
                        fontWeight: '700',
                      }}
                    >
                      Status
                    </th>

                    <th
                      style={{
                        padding: '16px 20px',
                        fontSize: '13px',
                        color: '#666',
                        fontWeight: '700',
                      }}
                    >
                      Joined
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStudents.map(
                    (student) => (
                      <tr
                        key={student.id}
                        style={{
                          borderTop:
                            '1px solid #eeeeea',
                        }}
                      >
                        <td
                          style={{
                            padding: '18px 20px',
                          }}
                        >
                          <button
                            onClick={() => {
                              window.location.href =
                                `/students/${student.id}`
                            }}
                            style={{
                              background:
                                'none',
                              border: 'none',
                              padding: 0,
                              fontSize:
                                'inherit',
                              fontWeight: '700',
                              cursor:
                                'pointer',
                              color:
                                '#111',
                            }}
                          >
                            {student.profiles
                              ?.display_name ||
                              'Unnamed Student'}
                          </button>
                        </td>

                        <td
                          style={{
                            padding: '18px 20px',
                            color: '#555',
                          }}
                        >
                          {student.level ||
                            '—'}
                        </td>

                        <td
                          style={{
                            padding: '18px 20px',
                            color: '#555',
                          }}
                        >
                          {student.status ||
                            '—'}
                        </td>

                        <td
                          style={{
                            padding: '18px 20px',
                            color: '#555',
                          }}
                        >
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
