import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AcademyHeader from '../components/AcademyHeader'
import {
  getStudentLevelLabel,
} from '../constants/studentLevels'

function CoachDetail({ coachId }) {
  const [loading, setLoading] = useState(true)
  const [coach, setCoach] = useState(null)
  const [error, setError] = useState('')

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  const [form, setForm] = useState({
    username: '',
    displayName: '',
    phone: '',
    address: '',
    gender: '',
    dateOfBirth: '',
    bio: '',
    status: '',
  })

  useEffect(() => {
    async function loadCoach() {
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
            display_name,
            username,
            phone,
            address,
            gender,
            date_of_birth
          ),
          coach_students (
            student_id,
            started_at,
            ended_at,
            students (
              id,
              level,
              status,
              profiles (
                display_name,
                username
              )
            )
          )
        `)
        .eq('id', coachId)
        .single()

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      setCoach(data)

      setForm({
        username:
          data.profiles?.username || '',

        displayName:
          data.profiles?.display_name || '',

        phone:
          data.profiles?.phone || '',

        address:
          data.profiles?.address || '',

        gender:
          data.profiles?.gender || '',

        dateOfBirth:
          data.profiles?.date_of_birth || '',

        bio:
          data.bio || '',

        status:
          data.status || 'active',
      })

      setLoading(false)
    }

    loadCoach()
  }, [coachId])

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function startEditing() {
    setSaveError('')
    setSaveSuccess('')

    setForm({
      username:
        coach.profiles?.username || '',

      displayName:
        coach.profiles?.display_name || '',

      phone:
        coach.profiles?.phone || '',

      address:
        coach.profiles?.address || '',

      gender:
        coach.profiles?.gender || '',

      dateOfBirth:
        coach.profiles?.date_of_birth || '',

      bio:
        coach.bio || '',

      status:
        coach.status || 'active',
    })

    setEditing(true)
  }

  function cancelEditing() {
    setSaveError('')
    setEditing(false)
  }

  async function handleSave(event) {
    event.preventDefault()

    setSaving(true)
    setSaveError('')
    setSaveSuccess('')

    const { error } =
      await supabase.rpc(
        'admin_update_coach',
        {
          p_coach_id: coach.id,

          p_username:
            form.username,

          p_display_name:
            form.displayName,

          p_phone:
            form.phone,

          p_address:
            form.address,

          p_gender:
            form.gender,

          p_date_of_birth:
            form.dateOfBirth || null,

          p_bio:
            form.bio,

          p_status:
            form.status,
        }
      )

    if (error) {
      setSaveError(error.message)
      setSaving(false)
      return
    }

    setCoach((current) => ({
      ...current,

      bio:
        form.bio || null,

      status:
        form.status,

      profiles: {
        ...current.profiles,

        username:
          form.username,

        display_name:
          form.displayName,

        phone:
          form.phone || null,

        address:
          form.address || null,

        gender:
          form.gender || null,

        date_of_birth:
          form.dateOfBirth || null,
      },
    }))

    setSaveSuccess(
      'Coach profile updated successfully.'
    )

    setEditing(false)
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="academy-app">
        <AcademyHeader />

        <div className="page-state">
          Loading coach...
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
              '/coaches'
          }}
        >
          Back to Coaches
        </button>
      </div>
    )
  }

  if (!coach) {
    return null
  }

  const displayName =
    coach.profiles?.display_name ||
    'Unnamed Coach'

  const username =
    coach.profiles?.username || '—'

  const formatDate = (value) => {
    if (!value) {
      return '—'
    }

    return new Date(
      value
    ).toLocaleDateString('en-GB')
  }

  const students =
    (coach.coach_students || [])
      .filter(
        (item) =>
          item.students &&
          item.ended_at === null
      )
      .map((item) => ({
        ...item.students,
      }))

  return (
    <div className="academy-app">
      <AcademyHeader />

      <main className="academy-main">

        <div className="detail-back">
          <button
            className="btn btn-ghost"
            onClick={() => {
              window.location.href =
                '/coaches'
            }}
          >
            ← Back to Coaches
          </button>
        </div>

        <div className="detail-heading">
          <h1>{displayName}</h1>

          <p>Coach profile</p>
        </div>

        {saveSuccess && (
          <div className="success-card">
            <div className="success-icon">
              ✓
            </div>

            <p>{saveSuccess}</p>
          </div>
        )}

        {!editing ? (
          <>
            <section className="card detail-card">

              <div className="detail-card-header">
                <h2 className="detail-card-title">
                  Basic Information
                </h2>

                <button
                  className="btn btn-primary"
                  onClick={startEditing}
                >
                  Edit Coach
                </button>
              </div>

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
                    Phone
                  </div>

                  <div className="detail-value">
                    {
                      coach.profiles?.phone ||
                      '—'
                    }
                  </div>
                </div>

                <div>
                  <div className="detail-label">
                    Gender
                  </div>

                  <div className="detail-value">
                    {
                      coach.profiles?.gender ||
                      '—'
                    }
                  </div>
                </div>

                <div>
                  <div className="detail-label">
                    Address
                  </div>

                  <div className="detail-value">
                    {
                      coach.profiles?.address ||
                      '—'
                    }
                  </div>
                </div>

                <div>
                  <div className="detail-label">
                    Date of Birth
                  </div>

                  <div className="detail-value">
                    {formatDate(
                      coach.profiles
                        ?.date_of_birth
                    )}
                  </div>
                </div>

                <div>
                  <div className="detail-label">
                    Join Date
                  </div>

                  <div className="detail-value">
                    {formatDate(
                      coach.join_date
                    )}
                  </div>
                </div>

                <div>
                  <div className="detail-label">
                    Status
                  </div>

                  <div className="detail-value">
                    {coach.status || '—'}
                  </div>
                </div>

                <div>
                  <div className="detail-label">
                    Bio
                  </div>

                  <div className="detail-value">
                    {coach.bio || '—'}
                  </div>
                </div>

              </div>
            </section>

            <section
              className="card detail-card"
              style={{
                marginTop: '32px',
              }}
            >
              <div className="detail-card-header">
                <h2 className="detail-card-title">
                  Students
                </h2>
              </div>

              {students.length === 0 ? (
                <div className="empty-state">
                  No students assigned.
                </div>
              ) : (
                <div className="detail-grid">
                  {students.map((student) => (
                    <div
                      key={student.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '18px',
                      }}
                    >
                      <div>
                        <div className="detail-label">
                          Student
                        </div>

                        <div className="detail-value detail-value-strong">
                          {
                            student.profiles
                              ?.display_name ||
                            'Unnamed Student'
                          }
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
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <form
            className="card form-card"
            onSubmit={handleSave}
          >

            <div className="form-header">
              <h1>Edit Coach</h1>

              <p>
                Update this coach's profile and
                Academy information.
              </p>
            </div>

            {saveError && (
              <div className="error-box">
                {saveError}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                Display Name
              </label>

              <input
                className="form-input"
                type="text"
                value={form.displayName}
                onChange={(event) =>
                  updateField(
                    'displayName',
                    event.target.value
                  )
                }
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Username
              </label>

              <input
                className="form-input"
                type="text"
                value={form.username}
                onChange={(event) =>
                  updateField(
                    'username',
                    event.target.value
                  )
                }
                required
              />

              <div className="form-help">
                Letters, numbers, and
                underscores only.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Phone
              </label>

              <input
                className="form-input"
                type="text"
                value={form.phone}
                onChange={(event) =>
                  updateField(
                    'phone',
                    event.target.value
                  )
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Gender
              </label>

              <select
                className="form-select"
                value={form.gender}
                onChange={(event) =>
                  updateField(
                    'gender',
                    event.target.value
                  )
                }
              >
                <option value="">
                  Select gender
                </option>

                <option value="male">
                  Male
                </option>

                <option value="female">
                  Female
                </option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Address
              </label>

              <input
                className="form-input"
                type="text"
                value={form.address}
                onChange={(event) =>
                  updateField(
                    'address',
                    event.target.value
                  )
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Date of Birth
              </label>

              <input
                className="form-input"
                type="date"
                value={form.dateOfBirth}
                onChange={(event) =>
                  updateField(
                    'dateOfBirth',
                    event.target.value
                  )
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Bio
              </label>

              <textarea
                className="form-input"
                value={form.bio}
                onChange={(event) =>
                  updateField(
                    'bio',
                    event.target.value
                  )
                }
                rows="5"
                placeholder="Coach biography..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Status
              </label>

              <select
                className="form-select"
                value={form.status}
                onChange={(event) =>
                  updateField(
                    'status',
                    event.target.value
                  )
                }
              >
                <option value="active">
                  Active
                </option>

                <option value="inactive">
                  Inactive
                </option>
              </select>
            </div>

            <div className="form-actions">

              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : 'Save Changes'}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel
              </button>

            </div>
          </form>
        )}
      </main>
    </div>
  )
}

export default CoachDetail
