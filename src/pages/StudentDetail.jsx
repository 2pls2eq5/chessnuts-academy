import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  STUDENT_LEVELS,
  getStudentLevelLabel,
} from '../constants/studentLevels'
import AcademyHeader from '../components/AcademyHeader'

export default function StudentDetail({ studentId }) {
  const id = studentId

  const [student, setStudent] = useState(null)
  const [parents, setParents] = useState([])
  const [coaches, setCoaches] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [editing, setEditing] = useState(false)

  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [gender, setGender] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [level, setLevel] = useState('')
  const [status, setStatus] = useState('active')

  // =========================================================
  // PARENT RELATIONSHIP
  // =========================================================

  const [showParentSelector, setShowParentSelector] =
    useState(false)

  const [availableParents, setAvailableParents] =
    useState([])

  const [selectedParentId, setSelectedParentId] =
    useState('')

  const [parentRelationship, setParentRelationship] =
    useState('')

  const [relationshipLoading, setRelationshipLoading] =
    useState(false)

  // =========================================================
  // COACH RELATIONSHIP
  // =========================================================

  const [showCoachSelector, setShowCoachSelector] =
    useState(false)

  const [availableCoaches, setAvailableCoaches] =
    useState([])

  const [selectedCoachId, setSelectedCoachId] =
    useState('')

  const [coachStartedAt, setCoachStartedAt] =
    useState('')

  const [
    coachRelationshipLoading,
    setCoachRelationshipLoading,
  ] = useState(false)

  // =========================================================
  // LOAD
  // =========================================================

  useEffect(() => {
    if (!id) {
      setError('Student ID is missing.')
      setLoading(false)
      return
    }

    loadStudent()
  }, [id])

  async function loadStudent() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('students')
      .select(`
        id,
        profile_id,
        join_date,
        level,
        status,

        profiles (
          id,
          username,
          display_name,
          phone,
          address,
          gender,
          date_of_birth
        ),

        parent_students (
          parent_id,
          relationship,

          parents (
            id,
            profile_id,

            profiles (
              id,
              username,
              display_name,
              phone
            )
          )
        ),

        coach_students (
          coach_id,
          started_at,
          ended_at,

          coaches (
            id,
            profile_id,

            profiles (
              id,
              username,
              display_name
            )
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error(error)
      setError(error.message)
      setLoading(false)
      return
    }

    const profile = data.profiles

    setStudent(data)

    setUsername(profile?.username || '')
    setDisplayName(profile?.display_name || '')
    setPhone(profile?.phone || '')
    setAddress(profile?.address || '')
    setGender(profile?.gender || '')
    setDateOfBirth(profile?.date_of_birth || '')

    setLevel(data.level || '')
    setStatus(data.status || 'active')

    // -------------------------------------------------------
    // PARENTS
    // -------------------------------------------------------

    const parentList =
      data.parent_students
        ?.map((item) => ({
          ...item.parents,
          relationship:
            item.relationship || '',
        }))
        || []

    setParents(parentList)

    // -------------------------------------------------------
    // ACTIVE COACHES ONLY
    // -------------------------------------------------------

    const coachList =
      data.coach_students
        ?.filter(
          (item) =>
            item.ended_at === null ||
            item.ended_at === undefined
        )
        .map((item) => ({
          ...item.coaches,
          started_at:
            item.started_at || '',
        }))
        || []

    setCoaches(coachList)

    setLoading(false)
  }

  // =========================================================
  // STUDENT EDIT
  // =========================================================

  async function saveStudent() {
    setSaving(true)
    setError('')

    const { error } = await supabase.rpc(
      'admin_update_student',
      {
        p_student_id: student.id,
        p_username: username,
        p_display_name: displayName,
        p_phone: phone,
        p_address: address,
        p_gender: gender,
        p_date_of_birth:
          dateOfBirth || null,
        p_level: level,
        p_status: status,
      }
    )

    if (error) {
      console.error(error)
      setError(error.message)
      setSaving(false)
      return
    }

    await loadStudent()

    setEditing(false)
    setSaving(false)
  }

  function cancelEditing() {
    const profile = student?.profiles

    setUsername(profile?.username || '')
    setDisplayName(
      profile?.display_name || ''
    )
    setPhone(profile?.phone || '')
    setAddress(profile?.address || '')
    setGender(profile?.gender || '')
    setDateOfBirth(
      profile?.date_of_birth || ''
    )

    setLevel(student?.level || '')
    setStatus(
      student?.status || 'active'
    )

    setEditing(false)
  }

  // =========================================================
  // PARENT
  // =========================================================

  async function loadAvailableParents() {
    setRelationshipLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('parents')
      .select(`
        id,
        profile_id,

        profiles (
          id,
          username,
          display_name
        )
      `)
      .order('id')

    if (error) {
      console.error(error)
      setError(error.message)
      setRelationshipLoading(false)
      return
    }

    const existingParentIds =
      parents.map(
        (parent) => parent.id
      )

    const available =
      (data || []).filter(
        (parent) =>
          !existingParentIds.includes(
            parent.id
          )
      )

    setAvailableParents(available)
    setSelectedParentId('')
    setParentRelationship('')
    setShowParentSelector(true)

    setRelationshipLoading(false)
  }

  function cancelParentSelector() {
    setShowParentSelector(false)
    setSelectedParentId('')
    setParentRelationship('')
  }

  async function addParent() {
    if (!selectedParentId) {
      setError('Please select a parent.')
      return
    }

    if (!parentRelationship) {
      setError(
        'Please select a relationship.'
      )
      return
    }

    setRelationshipLoading(true)
    setError('')

    const { error } = await supabase.rpc(
      'admin_add_parent_student',
      {
        p_parent_id:
          selectedParentId,

        p_student_id:
          student.id,

        p_relationship:
          parentRelationship,
      }
    )

    if (error) {
      console.error(error)
      setError(error.message)
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
        },
      ])
    }

    cancelParentSelector()

    setRelationshipLoading(false)
  }

  async function removeParent(parentId) {
    if (
      !window.confirm(
        'Remove this parent from the student?'
      )
    ) {
      return
    }

    setRelationshipLoading(true)
    setError('')

    const { error } = await supabase.rpc(
      'admin_remove_parent_student',
      {
        p_parent_id: parentId,
        p_student_id: student.id,
      }
    )

    if (error) {
      console.error(error)
      setError(error.message)
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

  // =========================================================
  // COACH
  // =========================================================

  async function loadAvailableCoaches() {
    setCoachRelationshipLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('coaches')
      .select(`
        id,
        profile_id,

        profiles (
          id,
          username,
          display_name
        )
      `)
      .order('id')

    if (error) {
      console.error(error)
      setError(error.message)
      setCoachRelationshipLoading(false)
      return
    }

    const existingCoachIds =
      coaches.map(
        (coach) => coach.id
      )

    const available =
      (data || []).filter(
        (coach) =>
          !existingCoachIds.includes(
            coach.id
          )
      )

    setAvailableCoaches(available)
    setSelectedCoachId('')
    setCoachStartedAt('')
    setShowCoachSelector(true)

    setCoachRelationshipLoading(false)
  }

  function cancelCoachSelector() {
    setShowCoachSelector(false)
    setSelectedCoachId('')
    setCoachStartedAt('')
  }

  async function addCoach() {
    if (!selectedCoachId) {
      setError('Please select a coach.')
      return
    }

    setCoachRelationshipLoading(true)
    setError('')

    const { error } = await supabase.rpc(
      'admin_add_coach_student',
      {
        p_coach_id:
          selectedCoachId,

        p_student_id:
          student.id,

        p_started_at:
          coachStartedAt || null,
      }
    )

    if (error) {
      console.error(error)
      setError(error.message)
      setCoachRelationshipLoading(false)
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
          started_at:
            coachStartedAt || '',
        },
      ])
    }

    cancelCoachSelector()

    setCoachRelationshipLoading(false)
  }

  async function removeCoach(coachId) {
    if (
      !window.confirm(
        'Remove this coach from the student?'
      )
    ) {
      return
    }

    setCoachRelationshipLoading(true)
    setError('')

    const { error } = await supabase.rpc(
      'admin_remove_coach_student',
      {
        p_coach_id: coachId,

        p_student_id:
          student.id,

        p_ended_at:
          new Date()
            .toISOString()
            .slice(0, 10),
      }
    )

    if (error) {
      console.error(error)
      setError(error.message)
      setCoachRelationshipLoading(false)
      return
    }

    setCoaches((current) =>
      current.filter(
        (coach) =>
          coach.id !== coachId
      )
    )

    setCoachRelationshipLoading(false)
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="academy-app">
        <AcademyHeader />

        <main className="page-container">
          <div className="loading-state">
            Loading student...
          </div>
        </main>
      </div>
    )
  }

  // =========================================================
  // NOT FOUND
  // =========================================================

  if (!student) {
    return (
      <div className="academy-app">
        <AcademyHeader />

        <main className="page-container">
          <div className="error-state">
            Student not found.
          </div>
        </main>
      </div>
    )
  }

  const profile = student.profiles

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="academy-app">
      <AcademyHeader />

      <main className="page-container">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="page-header">

          <div className="page-header-copy">

            <button
              className="back-button"
              onClick={() =>
                window.location.href =
                  '/students'
              }
            >
              ← Students
            </button>

            <h1>
              {profile?.display_name}
            </h1>

            <p>
              Student details and relationships
            </p>

          </div>

          {!editing ? (
            <button
              className="button button-primary"
              onClick={() =>
                setEditing(true)
              }
            >
              Edit Student
            </button>
          ) : (
            <div className="button-row">

              <button
                className="button button-secondary"
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className="button button-primary"
                onClick={saveStudent}
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : 'Save Changes'}
              </button>

            </div>
          )}

        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {/* =================================================
            BASIC INFORMATION
        ================================================= */}

        <section className="card detail-card">

          <h2 className="detail-card-title">
            Basic Information
          </h2>

          <div className="detail-grid">

            {/* USERNAME */}

            <div>
              <div className="detail-label">
                Username
              </div>

              {editing ? (
                <input
                  className="form-input"
                  value={username}
                  onChange={(event) =>
                    setUsername(
                      event.target.value
                    )
                  }
                />
              ) : (
                <div className="detail-value">
                  {profile?.username
                    ? `@${profile.username}`
                    : '—'}
                </div>
              )}
            </div>

            {/* DISPLAY NAME */}

            <div>
              <div className="detail-label">
                Display Name
              </div>

              {editing ? (
                <input
                  className="form-input"
                  value={displayName}
                  onChange={(event) =>
                    setDisplayName(
                      event.target.value
                    )
                  }
                />
              ) : (
                <div className="detail-value detail-value-strong">
                  {profile?.display_name ||
                    '—'}
                </div>
              )}
            </div>

            {/* PHONE */}

            <div>
              <div className="detail-label">
                Phone
              </div>

              {editing ? (
                <input
                  className="form-input"
                  value={phone}
                  onChange={(event) =>
                    setPhone(
                      event.target.value
                    )
                  }
                />
              ) : (
                <div className="detail-value">
                  {profile?.phone || '—'}
                </div>
              )}
            </div>

            {/* GENDER */}

            <div>
              <div className="detail-label">
                Gender
              </div>

              {editing ? (
                <select
                  className="form-select"
                  value={gender}
                  onChange={(event) =>
                    setGender(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Select
                  </option>

                  <option value="male">
                    Male
                  </option>

                  <option value="female">
                    Female
                  </option>
                </select>
              ) : (
                <div className="detail-value">
                  {profile?.gender || '—'}
                </div>
              )}
            </div>

            {/* DATE OF BIRTH */}

            <div>
              <div className="detail-label">
                Date of Birth
              </div>

              {editing ? (
                <input
                  type="date"
                  className="form-input"
                  value={dateOfBirth}
                  onChange={(event) =>
                    setDateOfBirth(
                      event.target.value
                    )
                  }
                />
              ) : (
                <div className="detail-value">
                  {profile?.date_of_birth ||
                    '—'}
                </div>
              )}
            </div>

            {/* LEVEL */}

            <div>
              <div className="detail-label">
                Level
              </div>

              {editing ? (
                <select
                  className="form-select"
                  value={level}
                  onChange={(event) =>
                    setLevel(
                      event.target.value
                    )
                  }
                >
                  {STUDENT_LEVELS.map(
                    (item) => (
                      <option
                        key={item.value}
                        value={item.value}
                      >
                        {item.label}
                      </option>
                    )
                  )}
                </select>
              ) : (
                <div className="detail-value">
                  {getStudentLevelLabel(
                    student.level
                  )}
                </div>
              )}
            </div>

            {/* STATUS */}

            <div>
              <div className="detail-label">
                Status
              </div>

              {editing ? (
                <select
                  className="form-select"
                  value={status}
                  onChange={(event) =>
                    setStatus(
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
              ) : (
                <div className="detail-value">
                  {student.status || '—'}
                </div>
              )}
            </div>

            {/* JOIN DATE */}

            <div>
              <div className="detail-label">
                Join Date
              </div>

              <div className="detail-value">
                {student.join_date || '—'}
              </div>
            </div>

            {/* ADDRESS */}

            <div className="detail-grid-full">

              <div className="detail-label">
                Address
              </div>

              {editing ? (
                <textarea
                  className="form-textarea"
                  value={address}
                  onChange={(event) =>
                    setAddress(
                      event.target.value
                    )
                  }
                  rows={3}
                />
              ) : (
                <div className="detail-value">
                  {profile?.address || '—'}
                </div>
              )}

            </div>

          </div>
        </section>

        {/* =================================================
            PARENTS + COACHES
        ================================================= */}

        <div className="detail-two-column">

          {/* =================================================
              PARENTS
          ================================================= */}

          <section className="card detail-card">

            <div className="detail-card-header">

              <h2 className="detail-card-title">
                Parents
              </h2>

              {!showParentSelector && (
                <button
                  className="button button-secondary"
                  onClick={
                    loadAvailableParents
                  }
                  disabled={
                    relationshipLoading
                  }
                >
                  + Add Parent
                </button>
              )}

            </div>

            {/* ADD PARENT FORM */}

            {showParentSelector && (
              <div className="relationship-form">

                <div className="form-group">

                  <label className="form-label">
                    Parent
                  </label>

                  <select
                    className="form-select"
                    value={selectedParentId}
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
                      Select parent
                    </option>

                    {availableParents.map(
                      (parent) => (
                        <option
                          key={parent.id}
                          value={parent.id}
                        >
                          {parent.profiles
                            ?.display_name ||
                            'Unnamed parent'}

                          {parent.profiles
                            ?.username
                            ? ` (@${parent.profiles.username})`
                            : ''}
                        </option>
                      )
                    )}

                  </select>

                </div>

                <div className="form-group">

                  <label className="form-label">
                    Relationship
                  </label>

                  <select
                    className="form-select"
                    value={parentRelationship}
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

                </div>

                <div className="button-row">

                  <button
                    className="button button-primary"
                    onClick={addParent}
                    disabled={
                      relationshipLoading
                    }
                  >
                    {relationshipLoading
                      ? 'Adding...'
                      : 'Add Parent'}
                  </button>

                  <button
                    className="button button-secondary"
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

            {/* EMPTY */}

            {parents.length === 0 &&
              !showParentSelector && (
                <div className="empty-state">
                  No parents assigned.
                </div>
              )}

            {/* PARENT LIST */}

            <div className="relationship-list">

              {parents.map((parent) => (

                <div
                  className="relationship-item"
                  key={parent.id}
                >

                  <div>

                    <div className="relationship-item-title">
                      {parent.profiles
                        ?.display_name ||
                        'Unnamed parent'}
                    </div>

                    {parent.profiles
                      ?.username && (
                      <div className="relationship-item-username">
                        @{parent.profiles.username}
                      </div>
                    )}

                    <div className="relationship-item-meta">

                      <span>
                        Relationship
                      </span>

                      <strong>
                        {parent.relationship ||
                          '—'}
                      </strong>

                    </div>

                  </div>

                  <button
                    className="button button-danger"
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

          </section>

          {/* =================================================
              COACHES
          ================================================= */}

          <section className="card detail-card">

            <div className="detail-card-header">

              <h2 className="detail-card-title">
                Coaches
              </h2>

              {!showCoachSelector && (
                <button
                  className="button button-secondary"
                  onClick={
                    loadAvailableCoaches
                  }
                  disabled={
                    coachRelationshipLoading
                  }
                >
                  + Add Coach
                </button>
              )}

            </div>

            {/* ADD COACH FORM */}

            {showCoachSelector && (
              <div className="relationship-form">

                <div className="form-group">

                  <label className="form-label">
                    Coach
                  </label>

                  <select
                    className="form-select"
                    value={selectedCoachId}
                    onChange={(event) =>
                      setSelectedCoachId(
                        event.target.value
                      )
                    }
                    disabled={
                      coachRelationshipLoading
                    }
                  >

                    <option value="">
                      Select coach
                    </option>

                    {availableCoaches.map(
                      (coach) => (
                        <option
                          key={coach.id}
                          value={coach.id}
                        >
                          {coach.profiles
                            ?.display_name ||
                            'Unnamed coach'}

                          {coach.profiles
                            ?.username
                            ? ` (@${coach.profiles.username})`
                            : ''}
                        </option>
                      )
                    )}

                  </select>

                </div>

                <div className="form-group">

                  <label className="form-label">
                    Start Date
                  </label>

                  <input
                    type="date"
                    className="form-input"
                    value={coachStartedAt}
                    onChange={(event) =>
                      setCoachStartedAt(
                        event.target.value
                      )
                    }
                    disabled={
                      coachRelationshipLoading
                    }
                  />

                </div>

                <div className="button-row">

                  <button
                    className="button button-primary"
                    onClick={addCoach}
                    disabled={
                      coachRelationshipLoading
                    }
                  >
                    {coachRelationshipLoading
                      ? 'Adding...'
                      : 'Add Coach'}
                  </button>

                  <button
                    className="button button-secondary"
                    onClick={
                      cancelCoachSelector
                    }
                    disabled={
                      coachRelationshipLoading
                    }
                  >
                    Cancel
                  </button>

                </div>

              </div>
            )}

            {/* EMPTY */}

            {coaches.length === 0 &&
              !showCoachSelector && (
                <div className="empty-state">
                  No coaches assigned.
                </div>
              )}

            {/* COACH LIST */}

            <div className="relationship-list">

              {coaches.map((coach) => (

                <div
                  className="relationship-item"
                  key={coach.id}
                >

                  <div>

                    <div className="relationship-item-title">
                      {coach.profiles
                        ?.display_name ||
                        'Unnamed coach'}
                    </div>

                    {coach.profiles
                      ?.username && (
                      <div className="relationship-item-username">
                        @{coach.profiles.username}
                      </div>
                    )}

                    {coach.started_at && (
                      <div className="relationship-item-meta">

                        <span>
                          Start Date
                        </span>

                        <strong>
                          {coach.started_at}
                        </strong>

                      </div>
                    )}

                  </div>

                  <button
                    className="button button-danger"
                    onClick={() =>
                      removeCoach(
                        coach.id
                      )
                    }
                    disabled={
                      coachRelationshipLoading
                    }
                  >
                    Remove
                  </button>

                </div>

              ))}

            </div>

          </section>

        </div>

      </main>
    </div>
  )
}
