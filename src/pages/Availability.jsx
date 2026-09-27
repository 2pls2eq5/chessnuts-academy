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
    DAYS.find((item) => item.value === day)?.label ||
    day
  )
}

function formatTime(time) {
  if (!time) return ''

  return time.slice(0, 5)
}

function Availability({ user, profile }) {
  const [availability, setAvailability] = useState([])
  const [coaches, setCoaches] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [showModal, setShowModal] = useState(false)
  const [editingAvailability, setEditingAvailability] =
    useState(null)

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

    const [availabilityResult, coachesResult] =
      await Promise.all([
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
            created_at,
            updated_at,
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
          `)
          .order('id'),
      ])

    if (availabilityResult.error) {
      setError(availabilityResult.error.message)
      setLoading(false)
      return
    }

    if (coachesResult.error) {
      setError(coachesResult.error.message)
      setLoading(false)
      return
    }

    setAvailability(
      availabilityResult.data || []
    )

    setCoaches(
      (coachesResult.data || []).sort((a, b) =>
        getCoachName(a).localeCompare(
          getCoachName(b)
        )
      )
    )

    setLoading(false)
  }

  function getCoachName(coach) {
    return (
      coach?.profiles?.display_name ||
      'Unknown Coach'
    )
  }

  function resetForm() {
    setForm({
      coachId: coaches[0]?.id || '',
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '10:00',
      timezone: DEFAULT_TIMEZONE,
      status: 'active',
    })
  }

  function openAddModal() {
    setMessage('')
    setError('')

    setEditingAvailability(null)

    setForm({
      coachId: coaches[0]?.id || '',
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '10:00',
      timezone: DEFAULT_TIMEZONE,
      status: 'active',
    })

    setShowModal(true)
  }

  function openEditModal(item) {
    setMessage('')
    setError('')

    setEditingAvailability(item)

    setForm({
      coachId: item.coach_id,
      dayOfWeek: item.day_of_week,
      startTime: formatTime(item.start_time),
      endTime: formatTime(item.end_time),
      timezone: item.timezone,
      status: item.status,
    })

    setShowModal(true)
  }

  function closeModal() {
    if (saving) return

    setShowModal(false)
    setEditingAvailability(null)
  }

  function handleChange(event) {
    const {
      name,
      value,
    } = event.target

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

    if (!form.startTime || !form.endTime) {
      return 'Start and end time are required.'
    }

    if (
      form.startTime >= form.endTime
    ) {
      return 'Start time must be before end time.'
    }

    if (!form.timezone.trim()) {
      return 'Timezone is required.'
    }

    /*
     * Prevent overlapping active availability
     * for the same coach/day/timezone.
     *
     * [start, end)
     *
     * 19:00–20:00 and 20:00–21:00 are allowed.
     */
    const conflict =
      availability.find((item) => {
        if (
          editingAvailability &&
          item.id === editingAvailability.id
        ) {
          return false
        }

        if (
          item.coach_id !== form.coachId ||
          item.day_of_week !== form.dayOfWeek ||
          item.timezone !== form.timezone ||
          item.status !== 'active' ||
          form.status !== 'active'
        ) {
          return false
        }

        return (
          item.start_time < form.endTime &&
          item.end_time > form.startTime
        )
      })

    if (conflict) {
      return (
        'This coach already has an overlapping active ' +
        'availability on this day and timezone.'
      )
    }

    return ''
  }

  async function handleSubmit(event) {
    event.preventDefault()

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
          coach_id: form.coachId,
          day_of_week: form.dayOfWeek,
          start_time: form.startTime,
          end_time: form.endTime,
          timezone:
            form.timezone.trim(),
          status: form.status,
          updated_at: new Date().toISOString(),
        })
        .eq(
          'id',
          editingAvailability.id
        )

      if (updateError) {
        setError(updateError.message)
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
          coach_id: form.coachId,
          day_of_week: form.dayOfWeek,
          start_time: form.startTime,
          end_time: form.endTime,
          timezone:
            form.timezone.trim(),
          status: form.status,
        })

      if (insertError) {
        setError(insertError.message)
        setSaving(false)
        return
      }

      setMessage(
        'Availability added successfully.'
      )
    }

    setSaving(false)
    setShowModal(false)
    setEditingAvailability(null)

    await loadData()
  }

  async function handleStatusChange(
    item,
    nextStatus
  ) {
    const action =
      nextStatus === 'active'
        ? 'activate'
        : 'deactivate'

    const confirmed =
      window.confirm(
        `${action === 'activate'
          ? 'Activate'
          : 'Deactivate'
        } this availability?`
      )

    if (!confirmed) return

    setError('')
    setMessage('')

    /*
     * When activating, check overlap again.
     * Another availability may have been created
     * while this one was inactive.
     */
    if (nextStatus === 'active') {
      const conflict =
        availability.find((other) => {
          if (other.id === item.id) {
            return false
          }

          if (
            other.coach_id !== item.coach_id ||
            other.day_of_week !==
              item.day_of_week ||
            other.timezone !==
              item.timezone ||
            other.status !== 'active'
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
      setError(updateError.message)
      return
    }

    setMessage(
      nextStatus === 'active'
        ? 'Availability activated.'
        : 'Availability deactivated.'
    )

    await loadData()
  }

  async function handleRemove(item) {
    const confirmed =
      window.confirm(
        `Remove ${getCoachName(
          item.coaches
        )}'s ${getDayLabel(
          item.day_of_week
        )} availability permanently?`
      )

    if (!confirmed) return

    setError('')
    setMessage('')

    const {
      error: deleteError,
    } = await supabase
      .from('coach_availability')
      .delete()
      .eq('id', item.id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    setMessage(
      'Availability removed successfully.'
    )

    await loadData()
  }

  const filteredAvailability =
    availability.filter((item) => {
      const coachName =
        getCoachName(item.coaches)

      const matchesSearch =
        coachName
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )

      const matchesStatus =
        statusFilter === 'all' ||
        item.status === statusFilter

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

  return (
    <div className="academy-app">
      <AcademyHeader />

      <main className="academy-main">
        <div className="page-header">
          <div className="page-header-copy">
            <h1>Coach Availability</h1>

            <div className="page-header-welcome">
              Manage recurring weekly availability
              for coaches.
            </div>
          </div>

          <button
            className="primary-button"
            onClick={openAddModal}
          >
            + Add Availability
          </button>
        </div>

        <div className="schedule-nav">
          <button className="schedule-nav-active">
            Availability
          </button>

          <button
            className="schedule-nav-disabled"
            disabled
          >
            Requests
          </button>

          <button
            className="schedule-nav-disabled"
            disabled
          >
            Schedules
          </button>
        </div>

        {message && (
          <div className="success-message">
            {message}
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="card table-card">
          <div className="table-toolbar">
            <input
              type="text"
              placeholder="Search coach..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              className="table-search"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              className="table-filter"
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

          {filteredAvailability.length ===
          0 ? (
            <div className="empty-state">
              No availability found.
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
                    (item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="table-name">
                            {getCoachName(
                              item.coaches
                            )}
                          </div>
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
                          {'–'}
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
                              item.status ===
                              'active'
                                ? 'status-badge status-active'
                                : 'status-badge status-inactive'
                            }
                          >
                            {item.status ===
                            'active'
                              ? 'Active'
                              : 'Inactive'}
                          </span>
                        </td>

                        <td>
                          <div className="table-actions">
                            <button
                              className="table-action-button"
                              onClick={() =>
                                openEditModal(
                                  item
                                )
                              }
                            >
                              Edit
                            </button>

                            <button
                              className="table-action-button"
                              onClick={() =>
                                handleStatusChange(
                                  item,
                                  item.status ===
                                    'active'
                                    ? 'inactive'
                                    : 'active'
                                )
                              }
                            >
                              {item.status ===
                              'active'
                                ? 'Deactivate'
                                : 'Activate'}
                            </button>

                            <button
                              className="table-action-button table-action-danger"
                              onClick={() =>
                                handleRemove(
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
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal()
            }
          }}
        >
          <div
            className="modal-card"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <h2>
                  {editingAvailability
                    ? 'Edit Availability'
                    : 'Add Availability'}
                </h2>

                <p>
                  Set the coach's recurring
                  weekly availability.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
            >
              <div className="form-grid">
                <div className="form-group">
                  <label>
                    Coach
                  </label>

                  <select
                    name="coachId"
                    value={form.coachId}
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
                          key={coach.id}
                          value={coach.id}
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
                  <label>
                    Day
                  </label>

                  <select
                    name="dayOfWeek"
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
                  <label>
                    Start time
                  </label>

                  <input
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
                  <label>
                    End time
                  </label>

                  <input
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
                  <label>
                    Timezone
                  </label>

                  <input
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
                  <label>
                    Status
                  </label>

                  <select
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

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    closeModal
                  }
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : editingAvailability
                      ? 'Save Changes'
                      : 'Save Availability'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Availability
