import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AcademyHeader from '../components/AcademyHeader'

function ParentDetail({ parentId }) {
  const [loading, setLoading] = useState(true)
  const [parent, setParent] = useState(null)
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
      })

      setLoading(false)
    }

    loadParent()
  }, [parentId])

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
        parent.profiles?.username || '',
      displayName:
        parent.profiles?.display_name || '',
      phone:
        parent.profiles?.phone || '',
      address:
        parent.profiles?.address || '',
      gender:
        parent.profiles?.gender || '',
      dateOfBirth:
        parent.profiles?.date_of_birth || '',
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
        'admin_update_parent',
        {
          p_parent_id: parent.id,
          p_username: form.username,
          p_display_name:
            form.displayName,
          p_phone: form.phone,
          p_address: form.address,
          p_gender: form.gender,
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
      'Parent profile updated successfully.'
    )

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
      <div className="error-page">
        <h1>Chessnuts Academy</h1>

        <p>{error}</p>

        <button
          className="btn btn-primary"
          onClick={() => {
            window.location.href =
              '/parents'
          }}
        >
          Back to Parents
        </button>
      </div>
    )
  }

  if (!parent) {
    return null
  }

  const displayName =
    parent.profiles?.display_name ||
    'Unnamed Parent'

  const username =
    parent.profiles?.username || '—'

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
                '/parents'
            }}
          >
            ← Back to Parents
          </button>
        </div>

        <div className="detail-heading">
          <h1>{displayName}</h1>

          <p>Parent profile</p>
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
          <section className="card detail-card">
            <div className="detail-card-header">
              <h2 className="detail-card-title">
                Basic Information
              </h2>

              <button
                className="btn btn-primary"
                onClick={startEditing}
              >
                Edit Parent
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
                  {parent.profiles
                    ?.phone || '—'}
                </div>
              </div>

              <div>
                <div className="detail-label">
                  Gender
                </div>

                <div className="detail-value">
                  {parent.profiles
                    ?.gender || '—'}
                </div>
              </div>

              <div>
                <div className="detail-label">
                  Address
                </div>

                <div className="detail-value">
                  {parent.profiles
                    ?.address || '—'}
                </div>
              </div>

              <div>
                <div className="detail-label">
                  Date of Birth
                </div>

                <div className="detail-value">
                  {formatDate(
                    parent.profiles
                      ?.date_of_birth
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
            </div>
          </section>
        ) : (
          <form
            className="card form-card"
            onSubmit={handleSave}
          >
            <div className="form-header">
              <h1>Edit Parent</h1>

              <p>
                Update this parent's
                profile information.
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

export default ParentDetail
