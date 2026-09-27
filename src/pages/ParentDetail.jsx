import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AcademyHeader from '../components/AcademyHeader'

function ParentDetail({ parentId }) {
  const [loading, setLoading] = useState(true)
  const [parent, setParent] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadParent() {
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
            display_name,
            username,
            phone,
            address,
            gender,
            date_of_birth
          ),
          parent_students (
            student_id,
            students (
              id,
              level,
              status,
              profiles (
                display_name
              )
            )
          )
        `)
        .eq('id', parentId)
        .single()

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      setParent(data)
      setLoading(false)
    }

    if (parentId) {
      loadParent()
    }
  }, [parentId])

  function formatDate(date) {
    if (!date) {
      return '-'
    }

    return new Date(date).toLocaleDateString(
      'en-US',
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }
    )
  }

  function formatGender(gender) {
    if (!gender) {
      return '-'
    }

    return (
      gender.charAt(0).toUpperCase() +
      gender.slice(1)
    )
  }

  if (loading) {
    return (
      <div className="academy-app">
        <AcademyHeader />

        <main className="academy-main">
          <div className="page-state">
            Loading parent...
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="academy-app">
        <AcademyHeader />

        <main className="academy-main">
          <div className="error-state">
            <h2>
              Unable to load parent
            </h2>

            <p>{error}</p>

            <button
              className="btn btn-secondary"
              onClick={() => {
                window.location.href =
                  '/parents'
              }}
            >
              ← Back to Parents
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (!parent) {
    return (
      <div className="academy-app">
        <AcademyHeader />

        <main className="academy-main">
          <div className="empty-state">
            Parent not found.
          </div>
        </main>
      </div>
    )
  }

  const profile =
    parent.profiles || {}

  const children =
    parent.parent_students || []

  return (
    <div className="academy-app">
      <AcademyHeader />

      <main className="academy-main">
        <div className="detail-back">
          <button
            className="btn btn-ghost"
            onClick={() => {
              window.location.href =
                '/parents'
            }}
          >
            ← Back to Parents
          </button>
        </div>

        <div className="page-header">
          <div>
            <h1>
              {profile.display_name ||
                'Unnamed Parent'}
            </h1>

            <p>
              Parent Details
            </p>
          </div>
        </div>

        {/* =========================
            PROFILE
        ========================= */}

        <div className="detail-card">
          <div className="detail-card-header">
            <div className="detail-card-title">
              Profile
            </div>
          </div>

          <div className="detail-grid">
            <div>
              <div className="detail-label">
                Name
              </div>

              <div className="detail-value-strong">
                {profile.display_name ||
                  '-'}
              </div>
            </div>

            <div>
              <div className="detail-label">
                Username
              </div>

              <div className="detail-value">
                {profile.username ||
                  '-'}
              </div>
            </div>

            <div>
              <div className="detail-label">
                Phone
              </div>

              <div className="detail-value">
                {profile.phone || '-'}
              </div>
            </div>

            <div>
              <div className="detail-label">
                Gender
              </div>

              <div className="detail-value">
                {formatGender(
                  profile.gender
                )}
              </div>
            </div>

            <div>
              <div className="detail-label">
                Date of Birth
              </div>

              <div className="detail-value">
                {formatDate(
                  profile.date_of_birth
                )}
              </div>
            </div>

            <div>
              <div className="detail-label">
                Joined
              </div>

              <div className="detail-value">
                {formatDate(
                  parent.created_at
                )}
              </div>
            </div>

            <div>
              <div className="detail-label">
                Address
              </div>

              <div className="detail-value">
                {profile.address || '-'}
              </div>
            </div>
          </div>
        </div>

        {/* =========================
            CHILDREN
        ========================= */}

        <div className="detail-card">
          <div className="detail-card-header">
            <div className="detail-card-title">
              Children
            </div>
          </div>

          {children.length === 0 ? (
            <div className="empty-state">
              This parent has no children
              assigned yet.
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Level</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {children.map(
                    (relationship) => {
                      const student =
                        relationship.students

                      if (!student) {
                        return null
                      }

                      return (
                        <tr
                          key={
                            relationship.student_id
                          }
                        >
                          <td>
                            <button
                              className="student-name-button"
                              onClick={() => {
                                window.location.href =
                                  `/students/${student.id}`
                              }}
                            >
                              {
                                student
                                  .profiles
                                  ?.display_name ||
                                  'Unnamed Student'
                              }
                            </button>
                          </td>

                          <td>
                            {student.level ||
                              '-'}
                          </td>

                          <td>
                            {student.status ||
                              '-'}
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

export default ParentDetail
