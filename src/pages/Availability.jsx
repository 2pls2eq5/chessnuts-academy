import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AcademyHeader from '../components/AcademyHeader'

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

const DEFAULT_TIMEZONE = 'Asia/Jakarta'

function getDayLabel(day) {
  return (
    DAYS.find((item) => item.value === day)
      ?.label || day
  )
}

function formatTime(time) {
  return time
    ? time.slice(0, 5)
    : ''
}

function getCoachName(coach) {
  return (
    coach?.profiles?.display_name ||
    'Unnamed Coach'
  )
}

function Availability() {
  const [loading, setLoading] =
    useState(true)

  const [availability, setAvailability] =
    useState([])

  const [coaches, setCoaches] =
    useState([])

  const [search, setSearch] =
    useState('')

  const [statusFilter, setStatusFilter] =
    useState('all')

  const [error, setError] =
    useState('')

  const [message, setMessage] =
    useState('')

  const [showForm, setShowForm] =
    useState(false)

  const [editingAvailability, setEditingAvailability] =
    useState(null)

  const [saving, setSaving] =
    useState(false)

  const [form, setForm] = useState({
    coachId: '',
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '10:00',
    timezone: DEFAULT_TIMEZONE,
    status: 'active',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError('')

    const [
      availabilityResult,
      coachesResult,
    ] = await Promise.all([
      supabase
        .from('coach_availability')
        .select(`
          id,
          coach_id,
          day_of_week,
          start_time,
          end_time,
          timezone,
          status,
          coaches (
            id,
            profile_id,
            profiles (
              display_name
            )
          )
        `)
        .order('day_of_week', {
          ascending: true,
        })
        .order('start_time', {
          ascending: true,
        }),

      supabase
        .from('coaches')
        .select(`
          id,
          profile_id,
          profiles (
            display_name
          )
        `),
    ])

    if (availabilityResult.error) {
      setError(
        availabilityResult.error.message
      )
      setLoading(false)
      return
    }

    if (coachesResult.error) {
      setError(
        coachesResult.error.message
      )
      setLoading(false)
      return
    }

    const sortedCoaches =
      [...(coachesResult.data || [])]
        .sort((a, b) =>
          getCoachName(a).localeCompare(
            getCoachName(b)
          )
        )

    setAvailability(
      availabilityResult.data || []
    )

    setCoaches(sortedCoaches)

    setLoading(false)
  }

  function openAddForm() {
    setError('')
    setMessage('')
    setEditingAvailability(null)

    setForm({
      coachId:
        coaches[0]?.id || '',
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '10:00',
      timezone: DEFAULT_TIMEZONE,
      status: 'active',
    })

    setShowForm(true)
  }

  function openEditForm(item) {
    setError('')
    setMessage('')
    setEditingAvailability(item)

    setForm({
      coachId: item.coach_id,
      dayOfWeek: item.day_of_week,
      startTime:
        formatTime(item.start_time),
      endTime:
        formatTime(item.end_time),
      timezone: item.timezone,
      status: item.status,
    })

    setShowForm(true)
  }

  function closeForm() {
    if (saving) return

    setShowForm(false)
    setEditingAvailability(null)
  }

  function handleChange(e) {
    const {
      name,
      value,
    } = e.target

    setForm((current) => ({
      ...current,
      [name]:
        name === 'dayOfWeek'
          ? Number(value)
          : value,
    }))
  }

  function validateForm() {
    if (!form.coachId) {
      return 'Please select a coach.'
    }

    if (
      !form.startTime ||
      !form.endTime
    ) {
      return 'Start and end time are required.'
    }

    if (
      form.startTime >=
      form.endTime
    ) {
      return 'Start time must be before end time.'
    }

    if (!form.timezone.trim()) {
      return 'Timezone is required.'
    }

    /*
     * [start, end)
     *
     * 19:00–20:00
     * 20:00–21:00
     *
     * are allowed.
     */
    const conflict =
      availability.find((item) => {
        if (
          editingAvailability &&
          item.id ===
            editingAvailability.id
        ) {
          return false
        }

        if (
          item.coach_id !==
            form.coachId ||
          item.day_of_week !==
            form.dayOfWeek ||
          item.timezone !==
            form.timezone ||
          item.status !== 'active' ||
          form.status !== 'active'
        ) {
          return false
        }

        return (
          item.start_time <
            form.endTime &&
          item.end_time >
            form.startTime
        )
      })

    if (conflict) {
      return (
        'This availability overlaps another active availability for this coach.'
      )
    }

    return ''
  }

  async function handleSubmit(e) {
    e.preventDefault()

    setError('')
    setMessage('')

    const validationError =
      validateForm()

    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)

    if (editingAvailability) {
      const {
        error: updateError,
      } = await supabase
        .from('coach_availability')
        .update({
          coach_id:
            form.coachId,
          day_of_week:
            form.dayOfWeek,
          start_time:
            form.startTime,
          end_time:
            form.endTime,
          timezone:
            form.timezone.trim(),
          status:
            form.status,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'id',
          editingAvailability.id
        )

      if (updateError) {
        setError(
          updateError.message
        )
        setSaving(false)
        return
      }

      setMessage(
        'Availability updated successfully.'
      )
    } else {
      const {
        error: insertError,
      } = await supabase
        .from('coach_availability')
        .insert({
          coach_id:
            form.coachId,
          day_of_week:
            form.dayOfWeek,
          start_time:
            form.startTime,
          end_time:
            form.endTime,
          timezone:
            form.timezone.trim(),
          status:
            form.status,
        })

      if (insertError) {
        setError(
          insertError.message
        )
        setSaving(false)
        return
      }

      setMessage(
        'Availability added successfully.'
      )
    }

    setSaving(false)
    setShowForm(false)
    setEditingAvailability(null)

    await loadData()
  }

  async function toggleStatus(item) {
    setError('')
    setMessage('')

    const nextStatus =
      item.status === 'active'
        ? 'inactive'
        : 'active'

    /*
     * Re-check overlap when activating.
     */
    if (nextStatus === 'active') {
      const conflict =
        availability.find((other) => {
          if (
            other.id === item.id
          ) {
            return false
          }

          if (
            other.coach_id !==
              item.coach_id ||
            other.day_of_week !==
              item.day_of_week ||
            other.timezone !==
              item.timezone ||
            other.status !==
              'active'
          ) {
            return false
          }

          return (
            other.start_time <
              item.end_time &&
            other.end_time >
              item.start_time
          )
        })

      if (conflict) {
        setError(
          'Cannot activate this availability because it overlaps another active availability.'
        )
        return
      }
    }

    const {
      error: updateError,
    } = await supabase
      .from('coach_availability')
      .update({
        status: nextStatus,
        updated_at:
          new Date().toISOString(),
      })
      .eq('id', item.id)

    if (updateError) {
      setError(
        updateError.message
      )
      return
    }

    setMessage(
      nextStatus === 'active'
        ? 'Availability activated.'
        : 'Availability deactivated.'
    )

    await loadData()
  }

  async function removeAvailability(
    item
  ) {
    setError('')
    setMessage('')

    const confirmed =
      window.confirm(
        `Remove ${getCoachName(
          item.coaches
        )}'s ${getDayLabel(
          item.day_of_week
        )} availability?`
      )

    if (!confirmed) {
      return
    }

    const {
      error: deleteError,
    } = await supabase
      .from('coach_availability')
      .delete()
      .eq('id', item.id)

    if (deleteError) {
      setError(
        deleteError.message
      )
      return
    }

    setMessage(
      'Availability removed successfully.'
    )

    await loadData()
  }

  const filteredAvailability =
    availability.filter((item) => {
      const name =
        getCoachName(item.coaches)

      const matchesSearch =
        name
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )

      const matchesStatus =
        statusFilter === 'all' ||
        item.status ===
          statusFilter

      return (
        matchesSearch &&
        matchesStatus
      )
    })

  if (loading) {
    return (
      <div className="academy-app">
        <AcademyHeader />

        <div className="page-state">
          Loading availability...
        </div>
      </div>
    )
  }

  if (error && !showForm) {
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

  return (
    <div className="academy-app">
      <AcademyHeader />

      <main className="academy-main">
        <div className="page-header">
          <div className="page-header-copy">
            <h1>
              Availability
            </h1>

            <p>
              Manage coach weekly availability
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={openAddForm}
          >
            + Add Availability
          </button>
        </div>

        <div className="schedule-subnav">
          <button
            className="schedule-subnav-active"
          >
            Availability
          </button>

          <button
            className="schedule-subnav-disabled"
            disabled
          >
            Requests
          </button>

          <button
            className="schedule-subnav-disabled"
            disabled
          >
            Schedules
          </button>
        </div>

        {message && (
          <div className="success-card">
            {message}
          </div>
        )}

        <div className="students-toolbar">
          <input
            className="search-input"
            type="text"
            placeholder="Search coaches..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
          />

          <select
            className="form-select schedule-status-filter"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value
              )
            }
          >
            <option value="all">
              All Status
            </option>

            <option value="active">
              Active
            </option>

            <option value="inactive">
              Inactive
            </option>
          </select>
        </div>

        <div className="card table-card">
          {filteredAvailability.length ===
          0 ? (
            <div className="empty-state">
              {search
                ? 'No availability matches your search.'
                : 'No availability found.'}
            </div>
          ) : (
            <div className="table-scroll">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>Coach</th>
                    <th>Day</th>
                    <th>Time</th>
                    <th>Timezone</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAvailability.map(
                    (item) => {
                      const status =
                        item.status ||
                        'unknown'

                      return (
                        <tr
                          key={item.id}
                        >
                          <td>
                            {getCoachName(
                              item.coaches
                            )}
                          </td>

                          <td>
                            {getDayLabel(
                              item.day_of_week
                            )}
                          </td>

                          <td>
                            {formatTime(
                              item.start_time
                            )}
                            {' – '}
                            {formatTime(
                              item.end_time
                            )}
                          </td>

                          <td>
                            {item.timezone}
                          </td>

                          <td>
                            <span
                              className={
                                `status-badge ${
                                  status ===
                                  'active'
                                    ? 'status-active'
                                    : 'status-inactive'
                                }`
                              }
                            >
                              {status}
                            </span>
                          </td>

                          <td>
                            <div className="schedule-row-actions">
                              <button
                                className="schedule-row-button"
                                onClick={() =>
                                  openEditForm(
                                    item
                                  )
                                }
                              >
                                Edit
                              </button>

                              <button
                                className="schedule-row-button"
                                onClick={() =>
                                  toggleStatus(
                                    item
                                  )
                                }
                              >
                                {status ===
                                'active'
                                  ? 'Deactivate'
                                  : 'Activate'}
                              </button>

                              <button
                                className="schedule-row-button schedule-row-danger"
                                onClick={() =>
                                  removeAvailability(
                                    item
                                  )
                                }
                              >
                                Remove
                              </button>
                            </div>
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

        {showForm && (
          <div className="schedule-form-card">
            <div className="form-header">
              <div>
                <h2>
                  {editingAvailability
                    ? 'Edit Availability'
                    : 'Add Availability'}
                </h2>

                <p>
                  Set a recurring weekly
                  availability for a coach.
                </p>
              </div>

              <button
                className="btn btn-ghost"
                onClick={closeForm}
                disabled={saving}
              >
                Close
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
            >
              {error && (
                <div className="error-box">
                  {error}
                </div>
              )}

              <div className="schedule-form-grid">
                <div className="form-group">
                  <label className="form-label">
                    Coach
                  </label>

                  <select
                    name="coachId"
                    className="form-select"
                    value={
                      form.coachId
                    }
                    onChange={
                      handleChange
                    }
                    disabled={saving}
                    required
                  >
                    <option value="">
                      Select coach
                    </option>

                    {coaches.map(
                      (coach) => (
                        <option
                          key={
                            coach.id
                          }
                          value={
                            coach.id
                          }
                        >
                          {getCoachName(
                            coach
                          )}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Day
                  </label>

                  <select
                    name="dayOfWeek"
                    className="form-select"
                    value={
                      form.dayOfWeek
                    }
                    onChange={
                      handleChange
                    }
                    disabled={saving}
                    required
                  >
                    {DAYS.map(
                      (day) => (
                        <option
                          key={
                            day.value
                          }
                          value={
                            day.value
                          }
                        >
                          {day.label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Start time
                  </label>

                  <input
                    className="form-input"
                    type="time"
                    name="startTime"
                    value={
                      form.startTime
                    }
                    onChange={
                      handleChange
                    }
                    disabled={saving}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    End time
                  </label>

                  <input
                    className="form-input"
                    type="time"
                    name="endTime"
                    value={
                      form.endTime
                    }
                    onChange={
                      handleChange
                    }
                    disabled={saving}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Timezone
                  </label>

                  <input
                    className="form-input"
                    type="text"
                    name="timezone"
                    value={
                      form.timezone
                    }
                    onChange={
                      handleChange
                    }
                    disabled={saving}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Status
                  </label>

                  <select
                    className="form-select"
                    name="status"
                    value={
                      form.status
                    }
                    onChange={
                      handleChange
                    }
                    disabled={saving}
                  >
                    <option value="active">
                      Active
                    </option>

                    <option value="inactive">
                      Inactive
                    </option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeForm}
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
                    : editingAvailability
                      ? 'Save Changes'
                      : 'Add Availability'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}

export default Availability
