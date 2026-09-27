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

  const [parents, setParents] = useState([])
  const [coaches, setCoaches] = useState([])

  const [relationshipLoading, setRelationshipLoading] =
    useState(false)

  const [relationshipError, setRelationshipError] =
    useState('')

  const [showParentSelector, setShowParentSelector] =
    useState(false)

  const [showCoachSelector, setShowCoachSelector] =
    useState(false)

  const [availableParents, setAvailableParents] =
    useState([])

  const [availableCoaches, setAvailableCoaches] =
    useState([])

  const [selectedParentId, setSelectedParentId] =
    useState('')

  const [parentRelationship, setParentRelationship] =
    useState('')

  const [parentIsPrimary, setParentIsPrimary] =
    useState(false)

  const [selectedCoachId, setSelectedCoachId] =
    useState('')

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
          join_date,
          status,
          level,
          profiles (
            display_name,
            username,
            phone,
            address,
            gender,
            date_of_birth
          ),
          parent_students (
            parent_id,
            relationship,
            is_primary,
            parents (
              id,
              profiles (
                display_name,
                username
              )
            )
          ),
          coach_students (
            coach_id,
            started_at,
            ended_at,
            coaches (
              id,
              profiles (
                display_name,
                username
              )
            )
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

      setParents(
        (data.parent_students || [])
          .filter((item) => item.parents)
          .map((item) => ({
            ...item.parents,
            relationship:
              item.relationship || '',
            is_primary:
              item.is_primary || false,
          }))
      )

      setCoaches(
        (data.coach_students || [])
          .filter(
            (item) =>
              item.coaches &&
              item.ended_at === null
          )
          .map((item) => ({
            ...item.coaches,
            started_at:
              item.started_at || null,
            ended_at:
              item.ended_at || null,
          }))
      )

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
        student.profiles?.date_of_birth || '',
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

      level:
        form.level || null,

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
      'Student profile updated successfully.'
    )

    setEditing(false)
    setSaving(false)
  }

  async function loadAvailableParents() {
    setRelationshipLoading(true)
    setRelationshipError('')

    setSelectedParentId('')
    setParentRelationship('')
    setParentIsPrimary(false)

    const {
      data,
      error,
    } = await supabase
      .from('parents')
      .select(`
        id,
        profiles (
          display_name,
          username
        )
      `)
      .order('created_at', {
        ascending: true,
      })

    if (error) {
      setRelationshipError(error.message)
      setRelationshipLoading(false)
      return
    }

    const existingIds =
      parents.map((parent) => parent.id)

    setAvailableParents(
      (data || []).filter(
        (parent) =>
          !existingIds.includes(parent.id)
      )
    )

    setShowParentSelector(true)
    setShowCoachSelector(false)
    setRelationshipLoading(false)
  }

  async function loadAvailableCoaches() {
    setRelationshipLoading(true)
    setRelationshipError('')

    setSelectedCoachId('')

    const {
      data,
      error,
    } = await supabase
      .from('coaches')
      .select(`
        id,
        profiles (
          display_name,
          username
        )
      `)
      .order('created_at', {
        ascending: true,
      })

    if (error) {
      setRelationshipError(error.message)
      setRelationshipLoading(false)
      return
    }

    const existingIds =
      coaches.map((coach) => coach.id)

    setAvailableCoaches(
      (data || []).filter(
        (coach) =>
          !existingIds.includes(coach.id)
      )
    )

    setShowCoachSelector(true)
    setShowParentSelector(false)
    setRelationshipLoading(false)
  }

  function cancelParentSelector() {
    setShowParentSelector(false)
    setSelectedParentId('')
    setParentRelationship('')
    setParentIsPrimary(false)
    setRelationshipError('')
  }

  function cancelCoachSelector() {
    setShowCoachSelector(false)
    setSelectedCoachId('')
    setRelationshipError('')
  }

  async function addParent() {
    if (!selectedParentId) {
      setRelationshipError(
        'Please select a parent.'
      )
      return
    }

    if (!parentRelationship) {
      setRelationshipError(
        'Please select the relationship.'
      )
      return
    }

    setRelationshipLoading(true)
    setRelationshipError('')

    const { error } =
      await supabase.rpc(
        'admin_add_parent_student',
        {
          p_parent_id:
            selectedParentId,

          p_student_id:
            student.id,

          p_relationship:
            parentRelationship,

          p_is_primary:
            parentIsPrimary,
        }
      )

    if (error) {
      setRelationshipError(error.message)
      setRelationshipLoading(false)
      return
    }

    const parent =
      availableParents.find(
        (item) =>
          item.id === selectedParentId
      )

    if (parent) {
      setParents((current) => [
        ...current,

        {
          ...parent,
          relationship:
            parentRelationship,
          is_primary:
            parentIsPrimary,
        },
      ])
    }

    setShowParentSelector(false)
    setSelectedParentId('')
    setParentRelationship('')
    setParentIsPrimary(false)
    setRelationshipLoading(false)
  }

  async function removeParent(parentId) {
    setRelationshipLoading(true)
    setRelationshipError('')

    const { error } =
      await supabase.rpc(
        'admin_remove_parent_student',
        {
          p_parent_id: parentId,
          p_student_id: student.id,
        }
      )

    if (error) {
      setRelationshipError(error.message)
      setRelationshipLoading(false)
      return
    }

    setParents((current) =>
      current.filter(
        (parent) =>
          parent.id !== parentId
      )
    )

    setRelationshipLoading(false)
  }

  async function addCoach() {
    if (!selectedCoachId) {
      setRelationshipError(
        'Please select a coach.'
      )
      return
    }

    setRelationshipLoading(true)
    setRelationshipError('')

    const today =
      new Date()
        .toISOString()
        .split('T')[0]

    const { error } =
      await supabase.rpc(
        'admin_add_coach_student',
        {
          p_coach_id:
            selectedCoachId,

          p_student_id:
            student.id,

          p_started_at:
            today,
        }
      )

    if (error) {
      setRelationshipError(error.message)
      setRelationshipLoading(false)
      return
    }

    const coach =
      availableCoaches.find(
        (item) =>
          item.id === selectedCoachId
      )

    if (coach) {
      setCoaches((current) => [
        ...current,

        {
          ...coach,
          started_at: today,
          ended_at: null,
        },
      ])
    }

    setShowCoachSelector(false)
    setSelectedCoachId('')
    setRelationshipLoading(false)
  }

  async function removeCoach(coachId) {
    setRelationshipLoading(true)
    setRelationshipError('')

    const today =
      new Date()
        .toISOString()
        .split('T')[0]

    const { error } =
      await supabase.rpc(
        'admin_remove_coach_student',
        {
          p_coach_id: coachId,
          p_student_id: student.id,
          p_ended_at: today,
        }
      )

    if (error) {
      setRelationshipError(error.message)
      setRelationshipLoading(false)
      return
    }

    setCoaches((current) =>
      current.filter(
        (coach) =>
          coach.id !== coachId
      )
    )

    setRelationshipLoading(false)
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
              <div className="detail-card-header">
                <h2 className="detail-card-title">
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
                      student.profiles
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

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(2, minmax(0, 1fr))',
                gap: '24px',
                marginTop: '24px',
              }}
            >
              <section className="card detail-card">
                <div className="detail-card-header">
                  <h2 className="detail-card-title">
                    Parents
                  </h2>

                  <button
                    className="btn btn-primary"
                    onClick={
                      loadAvailableParents
                    }
                    disabled={
                      relationshipLoading
                    }
                  >
                    + Add Parent
                  </button>
                </div>

                {relationshipError &&
                  showParentSelector && (
                    <div className="error-box">
                      {relationshipError}
                    </div>
                  )}

                {showParentSelector && (
                  <div className="form-group">
                    <label className="form-label">
                      Parent
                    </label>

                    <select
                      className="form-select"
                      value={
                        selectedParentId
                      }
                      onChange={(event) =>
                        setSelectedParentId(
                          event.target.value
                        )
                      }
                      disabled={
                        relationshipLoading
                      }
                    >
                      <option value="">
                        Select a parent
                      </option>

                      {availableParents.map(
                        (parent) => (
                          <option
                            key={parent.id}
                            value={parent.id}
                          >
                            {parent.profiles
                              ?.display_name ||
                              'Unnamed Parent'}
                          </option>
                        )
                      )}
                    </select>

                    {availableParents.length ===
                      0 && (
                      <div className="form-help">
                        No available parents.
                      </div>
                    )}

                    <label className="form-label">
                      Relationship
                    </label>

                    <select
                      className="form-select"
                      value={
                        parentRelationship
                      }
                      onChange={(event) =>
                        setParentRelationship(
                          event.target.value
                        )
                      }
                      disabled={
                        relationshipLoading
                      }
                    >
                      <option value="">
                        Select relationship
                      </option>

                      <option value="Mother">
                        Mother
                      </option>

                      <option value="Father">
                        Father
                      </option>

                      <option value="Guardian">
                        Guardian
                      </option>

                      <option value="Other">
                        Other
                      </option>
                    </select>

                    <label className="form-label">
                      Primary Parent
                    </label>

                    <select
                      className="form-select"
                      value={
                        parentIsPrimary
                          ? 'true'
                          : 'false'
                      }
                      onChange={(event) =>
                        setParentIsPrimary(
                          event.target.value ===
                            'true'
                        )
                      }
                      disabled={
                        relationshipLoading
                      }
                    >
                      <option value="false">
                        No
                      </option>

                      <option value="true">
                        Yes
                      </option>
                    </select>

                    <div className="form-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={addParent}
                        disabled={
                          relationshipLoading ||
                          !selectedParentId ||
                          !parentRelationship
                        }
                      >
                        {relationshipLoading
                          ? 'Adding...'
                          : 'Add Parent'}
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={
                          cancelParentSelector
                        }
                        disabled={
                          relationshipLoading
                        }
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {parents.length === 0 ? (
                  <div className="empty-state">
                    No parents assigned.
                  </div>
                ) : (
                  <div
  className="detail-grid"
  style={{
    gap: '24px',
    rowGap: '28px',
  }}
>
  {parents.map((parent) => (
    <div
      key={parent.id}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '7px',
      }}
    >
                        <div className="detail-label">
                          Parent
                        </div>

                        <div className="detail-value detail-value-strong">
                          {parent.profiles
                            ?.display_name ||
                            'Unnamed Parent'}
                        </div>

                        {parent.profiles
                          ?.username && (
                          <div className="detail-value">
                            @{parent.profiles.username}
                          </div>
                        )}

                        <div className="detail-label">
                          Relationship
                        </div>

                        <div className="detail-value">
                          {parent.relationship ||
                            '—'}
                        </div>

                        <div className="detail-label">
                          Primary
                        </div>

                        <div className="detail-value">
                          {parent.is_primary
                            ? 'Yes'
                            : 'No'}
                        </div>

                        <button
                          className="btn btn-secondary"
                          onClick={() =>
                            removeParent(
                              parent.id
                            )
                          }
                          disabled={
                            relationshipLoading
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="card detail-card">
                <div className="detail-card-header">
                  <h2 className="detail-card-title">
                    Coaches
                  </h2>

                  <button
                    className="btn btn-primary"
                    onClick={
                      loadAvailableCoaches
                    }
                    disabled={
                      relationshipLoading
                    }
                  >
                    + Add Coach
                  </button>
                </div>

                {relationshipError &&
                  showCoachSelector && (
                    <div className="error-box">
                      {relationshipError}
                    </div>
                  )}

                {showCoachSelector && (
                  <div className="form-group">
                    <label className="form-label">
                      Coach
                    </label>

                    <select
                      className="form-select"
                      value={
                        selectedCoachId
                      }
                      onChange={(event) =>
                        setSelectedCoachId(
                          event.target.value
                        )
                      }
                      disabled={
                        relationshipLoading
                      }
                    >
                      <option value="">
                        Select a coach
                      </option>

                      {availableCoaches.map(
                        (coach) => (
                          <option
                            key={coach.id}
                            value={coach.id}
                          >
                            {coach.profiles
                              ?.display_name ||
                              'Unnamed Coach'}
                          </option>
                        )
                      )}
                    </select>

                    {availableCoaches.length ===
                      0 && (
                      <div className="form-help">
                        No available coaches.
                      </div>
                    )}

                    <div className="form-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={addCoach}
                        disabled={
                          relationshipLoading ||
                          !selectedCoachId
                        }
                      >
                        {relationshipLoading
                          ? 'Adding...'
                          : 'Add Coach'}
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={
                          cancelCoachSelector
                        }
                        disabled={
                          relationshipLoading
                        }
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {coaches.length === 0 ? (
                  <div className="empty-state">
                    No coaches assigned.
                  </div>
                ) : (
                  <div className="detail-grid">
                    {coaches.map((coach) => (
                      <div key={coach.id}>
                        <div className="detail-label">
                          Coach
                        </div>

                        <div className="detail-value detail-value-strong">
                          {coach.profiles
                            ?.display_name ||
                            'Unnamed Coach'}
                        </div>

                        {coach.profiles
                          ?.username && (
                          <div className="detail-value">
                            @{coach.profiles.username}
                          </div>
                        )}

                        <div className="detail-label">
                          Started
                        </div>

                        <div className="detail-value">
                          {formatDate(
                            coach.started_at
                          )}
                        </div>

                        <button
                          className="btn btn-secondary"
                          onClick={() =>
                            removeCoach(
                              coach.id
                            )
                          }
                          disabled={
                            relationshipLoading
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
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

export default StudentDetail
