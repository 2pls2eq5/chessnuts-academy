import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AcademyHeader from '../components/AcademyHeader'

function ParentDetail() {
  const path = window.location.pathname
  const parentId = path.split('/')[2]

  const [loading, setLoading] = useState(true)
  const [parent, setParent] = useState(null)

  const [error, setError] = useState('')

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] =
    useState(false)

  const [form, setForm] = useState({
    username: '',
    displayName: '',
    phone: '',
    address: '',
    gender: '',
    dateOfBirth: '',
  })

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
            username,
            display_name,
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

      const profile =
        data?.profiles || {}

      setForm({
        username:
          profile.username || '',
        displayName:
          profile.display_name || '',
        phone:
          profile.phone || '',
        address:
          profile.address || '',
        gender:
          profile.gender || '',
        dateOfBirth:
          profile.date_of_birth || '',
      })

      setLoading(false)
    }

    if (parentId) {
      loadParent()
    }
  }, [parentId])

  function formatDate(date) {
    if (!date) {
      return '—'
    }

    return new Date(date).toLocaleDateString(
      'en-GB'
    )
  }

  function getGenderLabel(gender) {
    if (!gender) {
      return '—'
    }

    return (
      gender.charAt(0).toUpperCase() +
      gender.slice(1)
    )
  }

  function getLevelLabel(level) {
    const levels = {
      BASIC_1: 'Basic I',
      BASIC_2: 'Basic II',
      INTERMEDIATE_1:
        'Intermediate I',
      INTERMEDIATE_2:
        'Intermediate II',
      PRE_ADVANCED:
        'Pre-Advanced',
      ADVANCED_1:
        'Advanced I',
      ADVANCED_2:
        'Advanced II',
      EXPERT_1:
        'Expert I',
      EXPERT_2:
        'Expert II',
    }

    return levels[level] || level || '—'
  }

  function handleChange(event) {
    const {
      name,
      value,
    } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function startEditing() {
    setSaveError('')
    setSaveSuccess(false)
    setEditing(true)
  }

  function cancelEditing() {
    const profile =
      parent?.profiles || {}

    setForm({
      username:
        profile.username || '',
      displayName:
        profile.display_name || '',
      phone:
        profile.phone || '',
      address:
        profile.address || '',
      gender:
        profile.gender || '',
      dateOfBirth:
        profile.date_of_birth || '',
    })

    setSaveError('')
    setSaveSuccess(false)
    setEditing(false)
  }

  async function handleSave(event) {
    event.preventDefault()

    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)

    const username =
      form.username.trim()

    const displayName =
      form.displayName.trim()

    if (!username) {
      setSaveError(
        'Username cannot be empty.'
      )
      setSaving(false)
      return
    }

    if (!displayName) {
      setSaveError(
        'Display name cannot be empty.'
      )
      setSaving(false)
      return
    }

    if (
      !/^[a-zA-Z0-9_]+$/.test(
        username
      )
    ) {
      setSaveError(
        'Username can only contain letters, numbers, and underscores.'
      )
      setSaving(false)
      return
    }

    const {
      error,
    } = await supabase.rpc(
      'admin_update_parent',
      {
        p_parent_id: parentId,
        p_username: username,
        p_display_name:
          displayName,
        p_phone:
          form.phone.trim() || null,
        p_address:
          form.address.trim() || null,
        p_gender:
          form.gender || null,
        p_date_of_birth:
          form.dateOfBirth || null,
      }
    )

    if (error) {
      setSaveError(error.message)
      setSaving(false)
      return
    }

    setParent((current) => ({
      ...current,
      profiles: {
        ...current.profiles,
        username,
        display_name:
          displayName,
        phone:
          form.phone.trim() || null,
        address:
          form.address.trim() || null,
        gender:
          form.gender || null,
        date_of_birth:
          form.dateOfBirth || null,
      },
    }))

    setSaveSuccess(true)
    setEditing(false)
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="academy-app">
        <AcademyHeader />

        <div className="page-state">
          Loading parent...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="academy-app">
        <AcademyHeader />

        <main className="academy-main">
          <div className="error-page">
            <h1>
              Chessnuts Academy
            </h1>

            <p>{error}</p>
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

        {/* =========================
            BACK
        ========================= */}

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

        {/* =========================
            HEADER
        ========================= */}

        <div className="detail-heading">
          <div>
            <h1>
              {profile.display_name ||
                'Unnamed Parent'}
            </h1>

            <p>
              Parent Details
            </p>
          </div>

          {!editing && (
            <button
              className="btn btn-primary"
              onClick={startEditing}
            >
              Edit Parent
            </button>
          )}
        </div>

        {/* =========================
            SUCCESS
        ========================= */}

        {saveSuccess && (
          <div className="success-card">
            Parent information updated
            successfully.
          </div>
        )}

        {/* =========================
            PROFILE VIEW
        ========================= */}

        {!editing && (
          <div className="card detail-card">
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
                    '—'}
                </div>
              </div>

              <div>
                <div className="detail-label">
                  Username
                </div>

                <div className="detail-value">
                  {profile.username ||
                    '—'}
                </div>
              </div>

              <div>
                <div className="detail-label">
                  Phone
                </div>

                <div className="detail-value">
                  {profile.phone ||
                    '—'}
                </div>
              </div>

              <div>
                <div className="detail-label">
                  Gender
                </div>

                <div className="detail-value">
                  {getGenderLabel(
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
                  {profile.address ||
                    '—'}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* =========================
            EDIT FORM
        ========================= */}

        {editing && (
          <form
            className="form-card"
            onSubmit={handleSave}
          >
            <div className="form-header">
              <h2>
                Edit Parent
              </h2>
            </div>

            {saveError && (
              <div className="error-state">
                {saveError}
              </div>
            )}

            <div className="detail-grid">

              <div className="form-group">
                <label className="form-label">
                  Name
                </label>

                <input
                  className="form-input"
                  type="text"
                  name="displayName"
                  value={
                    form.displayName
                  }
                  onChange={
                    handleChange
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Username
                </label>

                <input
                  className="form-input"
                  type="text"
                  name="username"
                  value={
                    form.username
                  }
                  onChange={
                    handleChange
                  }
                />

                <div className="form-help">
                  Letters, numbers,
                  and underscores only.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Phone
                </label>

                <input
                  className="form-input"
                  type="text"
                  name="phone"
                  value={
                    form.phone
                  }
                  onChange={
                    handleChange
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Gender
                </label>

                <select
                  className="form-select"
                  name="gender"
                  value={
                    form.gender
                  }
                  onChange={
                    handleChange
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
                  Date of Birth
                </label>

                <input
                  className="form-input"
                  type="date"
                  name="dateOfBirth"
                  value={
                    form.dateOfBirth
                  }
                  onChange={
                    handleChange
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Address
                </label>

                <textarea
                  className="form-input"
                  name="address"
                  rows="3"
                  value={
                    form.address
                  }
                  onChange={
                    handleChange
                  }
                />
              </div>

            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={
                  cancelEditing
                }
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {/* =========================
            CHILDREN
        ========================= */}

        <div className="card detail-card">
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
            <div className="table-scroll">
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
                              {student.profiles
                                ?.display_name ||
                                'Unnamed Student'}
                            </button>
                          </td>

                          <td>
                            {getLevelLabel(
                              student.level
                            )}
                          </td>

                          <td>
                            <span
                              className={
                                `status-badge ${
                                  student.status ===
                                  'active'
                                    ? 'status-active'
                                    : 'status-inactive'
                                }`
                              }
                            >
                              {student.status ||
                                'unknown'}
                            </span>
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
