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

const TIMEZONES = [
  'Asia/Jakarta',
  'Asia/Makassar',
  'Asia/Jayapura',
]

const EMPTY_FORM = {
  coachId: '',
  dayOfWeek: '1',
  startTime: '09:00',
  endTime: '10:00',
  timezone: 'Asia/Jakarta',
  status: 'active',
}

function Availability() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState(null)

  const [availability, setAvailability] = useState([])
  const [coaches, setCoaches] = useState([])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [showForm, setShowForm] = useState(false)
  const [editingAvailability, setEditingAvailability] = useState(null)

  const [form, setForm] = useState(EMPTY_FORM)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')

    const [
      { data: availabilityData, error: availabilityError },
      { data: coachesData, error: coachesError },
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
            profiles (
              display_name
            )
          )
        `)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true }),

      supabase
        .from('coaches')
        .select(`
          id,
          profiles (
            display_name
          )
        `)
        .order('profiles(display_name)', { ascending: true }),
    ])

    if (availabilityError) {
      setError(availabilityError.message)
      setLoading(false)
      return
    }

    if (coachesError) {
      setError(coachesError.message)
      setLoading(false)
      return
    }

    setAvailability(availabilityData || [])
    setCoaches(coachesData || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  function getDayLabel(dayOfWeek) {
    return (
      DAYS.find((day) => day.value === Number(dayOfWeek))?.label ||
      'Unknown'
    )
  }

  function getCoachName(item) {
    return item.coaches?.profiles?.display_name || 'Unnamed Coach'
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingAvailability(null)
  }

  function openAddForm() {
    setError('')
    setSuccess('')
    resetForm()

    if (coaches.length > 0) {
      setForm((current) => ({
        ...current,
        coachId: coaches[0].id,
      }))
    }

    setShowForm(true)
  }

  function openEditForm(item) {
    setError('')
    setSuccess('')

    setEditingAvailability(item)

    setForm({
      coachId: item.coach_id,
      dayOfWeek: String(item.day_of_week),
      startTime: item.start_time?.slice(0, 5) || '',
      endTime: item.end_time?.slice(0, 5) || '',
      timezone: item.timezone || 'Asia/Jakarta',
      status: item.status || 'active',
    })

    setShowForm(true)
  }

  function closeForm() {
    if (saving) return

    setShowForm(false)
    resetForm()
  }

  function validateForm() {
    if (!form.coachId) {
      return 'Please select a coach.'
    }

    if (!form.startTime || !form.endTime) {
      return 'Start time and end time are required.'
    }

    if (form.startTime >= form.endTime) {
      return 'Start time must be earlier than end time.'
    }

    if (!form.timezone.trim()) {
      return 'Timezone is required.'
    }

    const duplicate = availability.find((item) => {
      if (editingAvailability && item.id === editingAvailability.id) {
        return false
      }

      if (item.status !== 'active') {
        return false
      }

      if (form.status !== 'active') {
        return false
      }

      if (item.coach_id !== form.coachId) {
        return false
      }

      if (Number(item.day_of_week) !== Number(form.dayOfWeek)) {
        return false
      }

      if (item.timezone !== form.timezone.trim()) {
        return false
      }

      return (
        item.start_time < form.endTime &&
        item.end_time > form.startTime
      )
    })

    if (duplicate) {
      return 'This availability overlaps an existing active availability.'
    }

    return ''
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')
    setSuccess('')

    const validationError = validateForm()

    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)

    const payload = {
      p_coach_id: form.coachId,
      p_day_of_week: Number(form.dayOfWeek),
      p_start_time: form.startTime,
      p_end_time: form.endTime,
      p_timezone: form.timezone.trim(),
      p_status: form.status,
    }

    let result

    if (editingAvailability) {
      result = await supabase.rpc(
        'admin_update_coach_availability',
        {
          p_id: editingAvailability.id,
          ...payload,
        }
      )
    } else {
      result = await supabase.rpc(
        'admin_create_coach_availability',
        payload
      )
    }

    if (result.error) {
      setError(result.error.message)
      setSaving(false)
      return
    }

    setSaving(false)
    setShowForm(false)
    resetForm()

    setSuccess(
      editingAvailability
        ? 'Availability updated successfully.'
        : 'Availability created successfully.'
    )

    await loadData()
  }

  async function handleToggleStatus(item) {
    setError('')
    setSuccess('')

    const nextStatus =
      item.status === 'active' ? 'inactive' : 'active'

    const { error } = await supabase.rpc(
      'admin_update_coach_availability',
      {
        p_id: item.id,
        p_coach_id: item.coach_id,
        p_day_of_week: Number(item.day_of_week),
        p_start_time: item.start_time,
        p_end_time: item.end_time,
        p_timezone: item.timezone,
        p_status: nextStatus,
      }
    )

    if (error) {
      setError(error.message)
      return
    }

    setSuccess(
      nextStatus === 'active'
        ? 'Availability activated successfully.'
        : 'Availability deactivated successfully.'
    )

    await loadData()
  }

  async function handleRemove(item) {
    const coachName = getCoachName(item)
    const day = getDayLabel(item.day_of_week)

    const confirmed = window.confirm(
      `Remove ${coachName}'s ${day} ${item.start_time.slice(
        0,
        5
      )}-${item.end_time.slice(0, 5)} availability?`
    )

    if (!confirmed) return

    setError('')
    setSuccess('')
    setRemovingId(item.id)

    const { error } = await supabase.rpc(
      'admin_delete_coach_availability',
      {
        p_id: item.id,
      }
    )

    setRemovingId(null)

    if (error) {
      setError(error.message)
      return
    }

    setSuccess('Availability removed successfully.')

    await loadData()
  }

  const filteredAvailability = availability.filter((item) => {
    const coachName = getCoachName(item).toLowerCase()
    const matchesSearch = coachName.includes(search.toLowerCase())

    const matchesStatus =
      statusFilter === 'all' ||
      item.status === statusFilter

    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="academy-app">
        <AcademyHeader />
        <div className="page-state">Loading availability...</div>
      </div>
    )
  }

  return (
    <div className="academy-app">
      <AcademyHeader />

      <main className="academy-main">
        <div className="page-header">
          <div className="page-header-copy">
            <h1>Availability</h1>
            <p>Manage recurring coach availability</p>
          </div>

          {!showForm && (
            <button
              className="btn btn-primary"
              onClick={openAddForm}
            >
              + Add Availability
            </button>
          )}
        </div>

        <div className="schedule-subnav">
          <button
            className="schedule-subnav-active"
            onClick={() => {
              window.location.href = '/schedule/availability'
            }}
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

        {showForm && (
          <div className="card schedule-form-card">
            <div className="form-header">
              <div>
                <h2>
                  {editingAvailability
                    ? 'Edit Availability'
                    : 'Add Availability'}
                </h2>

                <p>
                  Set a recurring weekly time range when a coach is
                  available for scheduling.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="schedule-form-grid">
                <div className="form-group">
                  <label className="form-label">
                    Coach
                  </label>

                  <select
                    className="form-select"
                    value={form.coachId}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        coachId: event.target.value,
                      })
                    }
                  >
                    <option value="">
                      Select coach
                    </option>

                    {coaches.map((coach) => (
                      <option key={coach.id} value={coach.id}>
                        {coach.profiles?.display_name ||
                          'Unnamed Coach'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Day
                  </label>

                  <select
                    className="form-select"
                    value={form.dayOfWeek}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        dayOfWeek: event.target.value,
                      })
                    }
                  >
                    {DAYS.map((day) => (
                      <option
                        key={day.value}
                        value={day.value}
                      >
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Start Time
                  </label>

                  <input
                    className="form-input"
                    type="time"
                    value={form.startTime}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        startTime: event.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    End Time
                  </label>

                  <input
                    className="form-input"
                    type="time"
                    value={form.endTime}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        endTime: event.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Timezone
                  </label>

                  <select
                    className="form-select"
                    value={form.timezone}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        timezone: event.target.value,
                      })
                    }
                  >
                    {TIMEZONES.map((timezone) => (
                      <option
                        key={timezone}
                        value={timezone}
                      >
                        {timezone}
                      </option>
                    ))}
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
                      setForm({
                        ...form,
                        status: event.target.value,
                      })
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
              </div>

              {error && (
                <div className="error-box">
                  {error}
                </div>
              )}

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
                      : 'Create Availability'}
                </button>
              </div>
            </form>
          </div>
        )}

        {!showForm && (
          <>
            {success && (
              <div className="success-card">
                {success}
              </div>
            )}

            {error && (
              <div className="error-box">
                {error}
              </div>
            )}

            <div className="students-toolbar">
              <input
                className="search-input"
                type="text"
                placeholder="Search coaches..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />

              <select
                className="form-select schedule-status-filter"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="card table-card">
              {filteredAvailability.length === 0 ? (
                <div className="empty-state">
                  {search || statusFilter !== 'all'
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
                      {filteredAvailability.map((item) => {
                        const active =
                          item.status === 'active'

                        return (
                          <tr key={item.id}>
                            <td>
                              <button
                                className="student-name-button"
                                onClick={() =>
                                  openEditForm(item)
                                }
                              >
                                {getCoachName(item)}
                              </button>
                            </td>

                            <td>
                              {getDayLabel(item.day_of_week)}
                            </td>

                            <td>
                              {item.start_time?.slice(0, 5)}–
                              {item.end_time?.slice(0, 5)}
                            </td>

                            <td>
                              {item.timezone}
                            </td>

                            <td>
                              <span
                                className={`status-badge ${
                                  active
                                    ? 'status-active'
                                    : 'status-inactive'
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>

                            <td>
                              <div className="schedule-row-actions">
                                <button
                                  className="schedule-row-button"
                                  onClick={() =>
                                    openEditForm(item)
                                  }
                                >
                                  Edit
                                </button>

                                <button
                                  className="schedule-row-button"
                                  onClick={() =>
                                    handleToggleStatus(item)
                                  }
                                >
                                  {active
                                    ? 'Deactivate'
                                    : 'Activate'}
                                </button>

                                <button
                                  className="schedule-row-button schedule-row-danger"
                                  onClick={() =>
                                    handleRemove(item)
                                  }
                                  disabled={
                                    removingId === item.id
                                  }
                                >
                                  {removingId === item.id
                                    ? 'Removing...'
                                    : 'Remove'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default Availability
