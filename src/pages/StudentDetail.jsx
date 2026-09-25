import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function StudentDetail({ studentId }) {
  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadStudent() {
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
            display_name,
            username
          )
        `)
        .eq('id', studentId)
        .single()

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      setStudent(data)
      setLoading(false)
    }

    loadStudent()
  }, [studentId])

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
        Loading student...
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

        <button
          onClick={() => {
            window.location.href =
              '/students'
          }}
          style={{
            marginTop: '20px',
            background: '#111',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            padding: '12px 18px',
            fontWeight: '700',
            cursor: 'pointer',
          }}
        >
          Back to Students
        </button>
      </div>
    )
  }

  if (!student) {
    return null
  }

  const displayName =
    student.profiles?.display_name ||
    'Unnamed Student'

  const username =
    student.profiles?.username || '—'

  const formatDate = (value) => {
    if (!value) {
      return '—'
    }

    return new Date(
      value
    ).toLocaleDateString('en-GB')
  }

  /* =========================
     STUDENT DETAIL
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
          maxWidth: '900px',
          margin: '0 auto',
          padding: '40px 24px',
        }}
      >
        {/* =========================
            BACK
        ========================= */}

        <button
          onClick={() => {
            window.location.href =
              '/students'
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            marginBottom: '24px',
            color: '#555',
            fontSize: '15px',
            cursor: 'pointer',
          }}
        >
          ← Back to Students
        </button>

        {/* =========================
            TITLE
        ========================= */}

        <div
          style={{
            marginBottom: '28px',
          }}
        >
          <h2
            style={{
              margin: '0 0 8px',
              fontSize: '32px',
            }}
          >
            {displayName}
          </h2>

          <p
            style={{
              margin: 0,
              color: '#666',
            }}
          >
            Student profile
          </p>
        </div>

        {/* =========================
            BASIC INFORMATION
        ========================= */}

        <section
          style={{
            background: 'white',
            border: '1px solid #e0e0dc',
            borderRadius: '16px',
            padding: '28px',
          }}
        >
          <h3
            style={{
              margin: '0 0 24px',
              fontSize: '20px',
            }}
          >
            Basic Information
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '24px',
            }}
          >
            {/* NAME */}

            <div>
              <div
                style={{
                  fontSize: '13px',
                  color: '#777',
                  marginBottom: '6px',
                }}
              >
                Name
              </div>

              <div
                style={{
                  fontWeight: '700',
                  fontSize: '16px',
                }}
              >
                {displayName}
              </div>
            </div>

            {/* USERNAME */}

            <div>
              <div
                style={{
                  fontSize: '13px',
                  color: '#777',
                  marginBottom: '6px',
                }}
              >
                Username
              </div>

              <div
                style={{
                  fontSize: '16px',
                }}
              >
                {username}
              </div>
            </div>

            {/* DATE OF BIRTH */}

            <div>
              <div
                style={{
                  fontSize: '13px',
                  color: '#777',
                  marginBottom: '6px',
                }}
              >
                Date of Birth
              </div>

              <div
                style={{
                  fontSize: '16px',
                }}
              >
                {formatDate(
                  student.date_of_birth
                )}
              </div>
            </div>

            {/* JOIN DATE */}

            <div>
              <div
                style={{
                  fontSize: '13px',
                  color: '#777',
                  marginBottom: '6px',
                }}
              >
                Join Date
              </div>

              <div
                style={{
                  fontSize: '16px',
                }}
              >
                {formatDate(
                  student.join_date
                )}
              </div>
            </div>

            {/* LEVEL */}

            <div>
              <div
                style={{
                  fontSize: '13px',
                  color: '#777',
                  marginBottom: '6px',
                }}
              >
                Level
              </div>

              <div
                style={{
                  fontSize: '16px',
                }}
              >
                {student.level || '—'}
              </div>
            </div>

            {/* STATUS */}

            <div>
              <div
                style={{
                  fontSize: '13px',
                  color: '#777',
                  marginBottom: '6px',
                }}
              >
                Status
              </div>

              <div
                style={{
                  fontSize: '16px',
                  textTransform:
                    'capitalize',
                }}
              >
                {student.status || '—'}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default StudentDetail
