import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  STUDENT_LEVELS,
  getStudentLevelLabel,
} from '../constants/studentLevels'
import AcademyHeader from '../components/AcademyHeader'

function StudentDetail({ studentId }) {
  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState(null)
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
    level: '',
    status: '',
  })

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
            username,
            phone,
            address,
            gender
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
          data.date_of_birth || '',
        level:
          data.level || '',
        status:
          data.status || 'active',
      })

      setLoading(false)
    }

    loadStudent()
  }, [studentId])

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
        student.profiles?.username || '',
      displayName:
        student.profiles?.display_name || '',
      phone:
        student.profiles?.phone || '',
      address:
        student.profiles?.address || '',
      gender:
        student.profiles?.gender || '',
      dateOfBirth:
        student.date_of_birth || '',
      level:
        student.level || '',
      status:
        student.status || 'active',
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
        'admin_update_student',
        {
          p_student_id: student.id,
          p_username: form.username,
          p_display_name:
            form.displayName,
          p_phone: form.phone,
          p_address: form.address,
          p_gender: form.gender,
          p_date_of_birth:
            form.dateOfBirth || null,
          p_level:
            form.level || null,
          p_status: form.status,
        }
      )

    if (error) {
      setSaveError(error.message)
      setSaving(false)
      return
    }

    setStudent((current) => ({
      ...current,
      date_of_birth:
        form.dateOfBirth || null,
      level:
        form.level || null,
      status: form.status,
      profiles: {
        ...current.profiles,
        username: form.username,
        display_name:
          form.displayName,
        phone: form.phone || null,
        address:
          form.address || null,
        gender:
          form.gender || null,
      },
    }))

    setSaveSuccess(
      'Student profile updated successfully.'
    )

    setEditing(false)
    setSaving(false)
  }

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
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent:
                    'space-between',
                  gap: '20px',
                  marginBottom: '24px',
                }}
              >
                <h2
                  className="detail-card-title"
                  style={{
                    marginBottom: 0,
                  }}
                >
                  Basic Information
                </h2>

                <button
                  className="btn btn-primary"
                  onClick={startEditing}
                >
                  Edit Student
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
                    {student.profiles
                      ?.phone || '—'}
                  </div>
                </div>

                <div>
                  <div className="detail-label">
                    Gender
                  </div>

                  <div className="detail-value">
                    {student.profiles
                      ?.gender || '—'}
                  </div>
                </div>

                <div>
                  <div className="detail-label">
                    Address
                  </div>

                  <div className="detail-value">
                    {student.profiles
                      ?.address || '—'}
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
                    {student.status ||
                      '—'}
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : (
          <form
            className="card form-card"
            onSubmit={handleSave}
          >
            <div className="form-header">
              <h1>Edit Student</h1>

              <p>
                Update this student's
                profile and Academy
                information.
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
                value={
                  form.displayName
                }
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
                value={
                  form.username
                }
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
                value={
                  form.address
                }
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
                value={
                  form.dateOfBirth
                }
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
                Level
              </label>

              <select
                className="form-select"
                value={form.level}
                onChange={(event) =>
                  updateField(
                    'level',
                    event.target.value
                  )
                }
              >
                <option value="">
                  Select level
                </option>

                {STUDENT_LEVELS.map(
                  (level) => (
                    <option
                      key={level.value}
                      value={level.value}
                    >
                      {level.label}
                    </option>
                  )
                )}
              </select>
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

            <div
              style={{
                display: 'flex',
                gap: '10px',
                marginTop: '24px',
              }}
            >
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

export default StudentDetail
