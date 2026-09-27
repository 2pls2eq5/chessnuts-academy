import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AcademyHeader from '../components/AcademyHeader'

const STUDENT_LEVELS = [
  { value: 'BASIC_1', label: 'Basic I' },
  { value: 'BASIC_2', label: 'Basic II' },
  { value: 'INTERMEDIATE_1', label: 'Intermediate I' },
  { value: 'INTERMEDIATE_2', label: 'Intermediate II' },
  { value: 'PRE_ADVANCED', label: 'Pre-Advanced' },
  { value: 'ADVANCED_1', label: 'Advanced I' },
  { value: 'ADVANCED_2', label: 'Advanced II' },
  { value: 'EXPERT_1', label: 'Expert I' },
  { value: 'EXPERT_2', label: 'Expert II' },
]

function getStudentLevelLabel(value) {
  const level = STUDENT_LEVELS.find(
    (item) => item.value === value
  )

  return level?.label || value
}

function StudentDetail({
  studentId,
  user,
  profile,
}) {
  const [student, setStudent] = useState(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [gender, setGender] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')

  const [joinDate, setJoinDate] = useState('')
  const [level, setLevel] = useState('')
  const [status, setStatus] = useState('active')

  // Active relationships shown on the page
  const [parents, setParents] = useState([])
  const [coaches, setCoaches] = useState([])

  // All available people for dropdowns
  const [allParents, setAllParents] = useState([])
  const [allCoaches, setAllCoaches] = useState([])

  const [showAddParent, setShowAddParent] =
    useState(false)

  const [showAddCoach, setShowAddCoach] =
    useState(false)

  const [selectedParentId, setSelectedParentId] =
    useState('')

  const [parentRelationship, setParentRelationship] =
    useState('Mother')

  const [parentIsPrimary, setParentIsPrimary] =
    useState(true)

  const [selectedCoachId, setSelectedCoachId] =
    useState('')

  async function loadAvailablePeople() {
    const [
      parentsResult,
      coachesResult,
    ] = await Promise.all([
      supabase
        .from('parents')
        .select(`
          id,
          profiles (
            display_name,
            username
          )
        `)
        .order('id'),

      supabase
        .from('coaches')
        .select(`
          id,
          profiles (
            display_name,
            username
          )
        `)
        .order('id'),
    ])

    if (parentsResult.error) {
      setError(parentsResult.error.message)
      return
    }

    if (coachesResult.error) {
      setError(coachesResult.error.message)
      return
    }

    setAllParents(
      parentsResult.data || []
    )

    setAllCoaches(
      coachesResult.data || []
    )
  }

  async function loadStudent() {
    setLoading(true)
    setError('')

    const {
      data,
      error: fetchError,
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

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    setStudent(data)

    setUsername(
      data.profiles?.username || ''
    )

    setDisplayName(
      data.profiles?.display_name || ''
    )

    setPhone(
      data.profiles?.phone || ''
    )

    setAddress(
      data.profiles?.address || ''
    )

    setGender(
      data.profiles?.gender || ''
    )

    setDateOfBirth(
      data.profiles?.date_of_birth || ''
    )

    setJoinDate(
      data.join_date || ''
    )

    setLevel(
      data.level || ''
    )

    setStatus(
      data.status || 'active'
    )

    /*
     * Only ACTIVE coach relationships
     * are displayed.
     *
     * Historical relationships with
     * ended_at filled in stay in the
     * database but are not displayed here.
     */
    const activeCoaches =
      (data.coach_students || []).filter(
        (item) => item.ended_at === null
      )

    setCoaches(activeCoaches)

    /*
     * Parents currently remain active
     * relationships.
     */
    setParents(
      data.parent_students || []
    )

    setLoading(false)
  }

  useEffect(() => {
    async function init() {
      await Promise.all([
        loadStudent(),
        loadAvailablePeople(),
      ])
    }

    init()
  }, [studentId])

  async function refreshData() {
    await Promise.all([
      loadStudent(),
      loadAvailablePeople(),
    ])
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSuccess('')

    const {
      error: saveError,
    } = await supabase.rpc(
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

    if (saveError) {
      setError(saveError.message)
      setSaving(false)
      return
    }

    setSuccess(
      'Student information updated successfully.'
    )

    await loadStudent()

    setSaving(false)
  }

  async function handleAddParent() {
    if (!selectedParentId) {
      setError('Please select a parent.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    const {
      error: addError,
    } = await supabase.rpc(
      'admin_add_parent_student',
      {
        p_parent_id: selectedParentId,
        p_student_id: student.id,
        p_relationship:
          parentRelationship,
        p_is_primary:
          parentIsPrimary,
      }
    )

    if (addError) {
      setError(addError.message)
      setSaving(false)
      return
    }

    setSuccess(
      'Parent added successfully.'
    )

    setSelectedParentId('')
    setParentRelationship('Mother')
    setParentIsPrimary(true)
    setShowAddParent(false)

    await refreshData()

    setSaving(false)
  }

  async function handleRemoveParent(
    parentId
  ) {
    setSaving(true)
    setError('')
    setSuccess('')

    const {
      error: removeError,
    } = await supabase.rpc(
      'admin_remove_parent_student',
      {
        p_parent_id: parentId,
        p_student_id: student.id,
      }
    )

    if (removeError) {
      setError(removeError.message)
      setSaving(false)
      return
    }

    setSuccess(
      'Parent removed successfully.'
    )

    await refreshData()

    setSaving(false)
  }

  async function handleAddCoach() {
    if (!selectedCoachId) {
      setError('Please select a coach.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    const today =
      new Date()
        .toISOString()
        .split('T')[0]

    const {
      error: addError,
    } = await supabase.rpc(
      'admin_add_coach_student',
      {
        p_coach_id: selectedCoachId,
        p_student_id: student.id,
        p_started_at: today,
      }
    )

    if (addError) {
      setError(addError.message)
      setSaving(false)
      return
    }

    setSuccess(
      'Coach added successfully.'
    )

    setSelectedCoachId('')
    setShowAddCoach(false)

    await refreshData()

    setSaving(false)
  }

  async function handleRemoveCoach(
    coachId
  ) {
    setSaving(true)
    setError('')
    setSuccess('')

    const today =
      new Date()
        .toISOString()
        .split('T')[0]

    const {
      error: removeError,
    } = await supabase.rpc(
      'admin_remove_coach_student',
      {
        p_coach_id: coachId,
        p_student_id: student.id,
        p_ended_at: today,
      }
    )

    if (removeError) {
      setError(removeError.message)
      setSaving(false)
      return
    }

    setSuccess(
      'Coach removed successfully.'
    )

    /*
     * Reload from database.
     *
     * loadStudent() filters ended
     * relationships, so the coach
     * immediately disappears.
     */
    await refreshData()

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="academy-app">
        <AcademyHeader
          user={user}
          profile={profile}
        />

        <main className="academy-main">
          <div className="loading">
            Loading...
          </div>
        </main>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="academy-app">
        <AcademyHeader
          user={user}
          profile={profile}
        />

        <main className="academy-main">
          <div className="error-box">
            Student not found.
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="academy-app">

      <AcademyHeader
        user={user}
        profile={profile}
      />

      <main className="academy-main">

        <div className="detail-header">
          <div>
            <button
              className="back-button"
              onClick={() => {
                window.location.href =
                  '/students'
              }}
            >
              ← Back to Students
            </button>

            <h1>
              {displayName || 'Student'}
            </h1>

            <p>
              Student details and
              relationships
            </p>
          </div>
        </div>

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        {success && (
          <div className="success-card">
            {success}
          </div>
        )}

        <div className="detail-grid">

          {/* BASIC INFORMATION */}

          <section className="card detail-card">

            <div className="detail-card-header">
              <div>
                <h2>
                  Basic Information
                </h2>

                <p>
                  Student profile
                </p>
              </div>
            </div>

            <div className="form-grid">

              <div className="form-group">
                <label>
                  Username
                </label>

                <input
                  className="form-input"
                  value={username}
                  onChange={(e) =>
                    setUsername(
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="form-group">
                <label>
                  Display Name
                </label>

                <input
                  className="form-input"
                  value={displayName}
                  onChange={(e) =>
                    setDisplayName(
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="form-group">
                <label>
                  Phone
                </label>

                <input
                  className="form-input"
                  value={phone}
                  onChange={(e) =>
                    setPhone(
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="form-group">
                <label>
                  Date of Birth
                </label>

                <input
                  type="date"
                  className="form-input"
                  value={dateOfBirth}
                  onChange={(e) =>
                    setDateOfBirth(
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="form-group">
                <label>
                  Gender
                </label>

                <select
                  className="form-input"
                  value={gender}
                  onChange={(e) =>
                    setGender(
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    Select gender
                  </option>

                  <option value="Male">
                    Male
                  </option>

                  <option value="Female">
                    Female
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  Join Date
                </label>

                <input
                  type="date"
                  className="form-input"
                  value={joinDate}
                  onChange={(e) =>
                    setJoinDate(
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="form-group">
                <label>
                  Level
                </label>

                <select
                  className="form-input"
                  value={level}
                  onChange={(e) =>
                    setLevel(
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    Select level
                  </option>

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
              </div>

              <div className="form-group">
                <label>
                  Status
                </label>

                <select
                  className="form-input"
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value
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

              <div className="form-group form-full">
                <label>
                  Address
                </label>

                <textarea
                  className="form-input"
                  rows="3"
                  value={address}
                  onChange={(e) =>
                    setAddress(
                      e.target.value
                    )
                  }
                />
              </div>

            </div>

            <div className="detail-actions">

              <button
                className="primary-button"
                onClick={handleSave}
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : 'Save Changes'}
              </button>

            </div>

          </section>


          {/* PARENTS */}

          <section className="card detail-card">

            <div className="detail-card-header">

              <div>
                <h2>
                  Parents
                </h2>

                <p>
                  Parents linked to
                  this student
                </p>
              </div>

              <button
                className="secondary-button"
                onClick={() =>
                  setShowAddParent(
                    !showAddParent
                  )
                }
              >
                + Add Parent
              </button>

            </div>

            {showAddParent && (
              <div className="relationship-form">

                <div className="form-group">

                  <label>
                    Parent
                  </label>

                  <select
                    className="form-input"
                    value={selectedParentId}
                    onChange={(e) =>
                      setSelectedParentId(
                        e.target.value
                      )
                    }
                  >

                    <option value="">
                      Select parent
                    </option>

                    {allParents
                      .filter(
                        (parent) =>
                          !parents.some(
                            (item) =>
                              item.parent_id ===
                              parent.id
                          )
                      )
                      .map(
                        (parent) => (
                          <option
                            key={parent.id}
                            value={parent.id}
                          >
                            {parent.profiles
                              ?.display_name ||
                              parent.profiles
                                ?.username ||
                              'Parent'}
                          </option>
                        )
                      )}

                  </select>

                </div>

                <div className="form-group">

                  <label>
                    Relationship
                  </label>

                  <select
                    className="form-input"
                    value={
                      parentRelationship
                    }
                    onChange={(e) =>
                      setParentRelationship(
                        e.target.value
                      )
                    }
                  >
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

                <div className="form-group">

                  <label>
                    Primary
                  </label>

                  <select
                    className="form-input"
                    value={
                      parentIsPrimary
                        ? 'yes'
                        : 'no'
                    }
                    onChange={(e) =>
                      setParentIsPrimary(
                        e.target.value ===
                          'yes'
                      )
                    }
                  >
                    <option value="yes">
                      Yes
                    </option>

                    <option value="no">
                      No
                    </option>
                  </select>

                </div>

                <div className="relationship-actions">

                  <button
                    className="primary-button"
                    onClick={
                      handleAddParent
                    }
                    disabled={saving}
                  >
                    Add Parent
                  </button>

                  <button
                    className="secondary-button"
                    onClick={() =>
                      setShowAddParent(
                        false
                      )
                    }
                  >
                    Cancel
                  </button>

                </div>

              </div>
            )}

            <div className="relationship-list">

              {parents.length === 0 ? (
                <p className="empty-state">
                  No parents linked.
                </p>
              ) : (
                parents.map(
                  (item) => {

                    const parent =
                      item.parents

                    return (
                      <div
                        className="relationship-row"
                        key={
                          item.parent_id
                        }
                      >

                        <div>

                          <strong>
                            {parent?.profiles
                              ?.display_name ||
                              parent?.profiles
                                ?.username ||
                              'Parent'}
                          </strong>

                          <span>
                            {item.relationship ||
                              'Parent'}

                            {item.is_primary
                              ? ' • Primary'
                              : ''}
                          </span>

                        </div>

                        <button
                          className="danger-button"
                          onClick={() =>
                            handleRemoveParent(
                              item.parent_id
                            )
                          }
                          disabled={saving}
                        >
                          Remove
                        </button>

                      </div>
                    )
                  }
                )
              )}

            </div>

          </section>


          {/* COACHES */}

          <section className="card detail-card">

            <div className="detail-card-header">

              <div>
                <h2>
                  Coaches
                </h2>

                <p>
                  Active coaches linked
                  to this student
                </p>
              </div>

              <button
                className="secondary-button"
                onClick={() =>
                  setShowAddCoach(
                    !showAddCoach
                  )
                }
              >
                + Add Coach
              </button>

            </div>

            {showAddCoach && (
              <div className="relationship-form">

                <div className="form-group">

                  <label>
                    Coach
                  </label>

                  <select
                    className="form-input"
                    value={selectedCoachId}
                    onChange={(e) =>
                      setSelectedCoachId(
                        e.target.value
                      )
                    }
                  >

                    <option value="">
                      Select coach
                    </option>

                    {allCoaches
                      .filter(
                        (coach) =>
                          !coaches.some(
                            (item) =>
                              item.coach_id ===
                              coach.id
                          )
                      )
                      .map(
                        (coach) => (
                          <option
                            key={coach.id}
                            value={coach.id}
                          >
                            {coach.profiles
                              ?.display_name ||
                              coach.profiles
                                ?.username ||
                              'Coach'}
                          </option>
                        )
                      )}

                  </select>

                </div>

                <div className="relationship-actions">

                  <button
                    className="primary-button"
                    onClick={
                      handleAddCoach
                    }
                    disabled={saving}
                  >
                    Add Coach
                  </button>

                  <button
                    className="secondary-button"
                    onClick={() =>
                      setShowAddCoach(
                        false
                      )
                    }
                  >
                    Cancel
                  </button>

                </div>

              </div>
            )}

            <div className="relationship-list">

              {coaches.length === 0 ? (
                <p className="empty-state">
                  No active coaches linked.
                </p>
              ) : (
                coaches.map(
                  (item) => {

                    const coach =
                      item.coaches

                    return (
                      <div
                        className="relationship-row"
                        key={
                          item.coach_id
                        }
                      >

                        <div>

                          <strong>
                            {coach?.profiles
                              ?.display_name ||
                              coach?.profiles
                                ?.username ||
                              'Coach'}
                          </strong>

                          <span>
                            Started{' '}
                            {item.started_at ||
                              '-'}
                          </span>

                        </div>

                        <button
                          className="danger-button"
                          onClick={() =>
                            handleRemoveCoach(
                              item.coach_id
                            )
                          }
                          disabled={saving}
                        >
                          Remove
                        </button>

                      </div>
                    )
                  }
                )
              )}

            </div>

          </section>

        </div>

      </main>

    </div>
  )
}

export default StudentDetail
