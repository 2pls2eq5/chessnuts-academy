import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getStudentLevelLabel } from '../constants/studentLevels'
import AcademyHeader from '../components/AcademyHeader'

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

  if (loading) {
    return (
      <div className="academy-app">
        <AcademyHeader />

        <div className="page-state">
          Loading student...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-page">
        <h1>Chessnuts Academy</h1>

        <p>{error}</p>

        <button
          className="btn btn-primary"
          onClick={() => {
            window.location.href =
              '/students'
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

  return (
    <div className="academy-app">
      <AcademyHeader />

      <main className="academy-main">
        <div className="detail-back">
          <button
            className="btn btn-ghost"
            onClick={() => {
              window.location.href =
                '/students'
            }}
          >
            ← Back to Students
          </button>
        </div>

        <div className="detail-heading">
          <h1>{displayName}</h1>

          <p>Student profile</p>
        </div>

        <section className="card detail-card">
          <h2 className="detail-card-title">
            Basic Information
          </h2>

          <div className="detail-grid">
            <div>
              <div className="detail-label">
                Name
              </div>

              <div className="detail-value detail-value-strong">
                {displayName}
              </div>
            </div>

            <div>
              <div className="detail-label">
                Username
              </div>

              <div className="detail-value">
                {username}
              </div>
            </div>

            <div>
              <div className="detail-label">
                Date of Birth
              </div>

              <div className="detail-value">
                {formatDate(
                  student.date_of_birth
                )}
              </div>
            </div>

            <div>
              <div className="detail-label">
                Join Date
              </div>

              <div className="detail-value">
                {formatDate(
                  student.join_date
                )}
              </div>
            </div>

            <div>
              <div className="detail-label">
                Level
              </div>

              <div className="detail-value">
                {getStudentLevelLabel(
                  student.level
                )}
              </div>
            </div>

            <div>
              <div className="detail-label">
                Status
              </div>

              <div className="detail-value">
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
