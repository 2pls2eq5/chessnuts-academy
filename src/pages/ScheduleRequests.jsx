import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getStudentLevelLabel } from '../constants/studentLevels'
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

function ScheduleRequests() {
  const [loading, setLoading] = useState(true)
  const [scheduleRequests, setScheduleRequests] = useState([])

  const [students, setStudents] = useState([])
  const [coaches, setCoaches] = useState([])
  const [programs, setPrograms] = useState([])

  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState({
    student_id: '',
    coach_id: '',
    program_id: '',
    day_of_week: '',
    start_time: '',
    timezone: 'Asia/Jakarta',
    location: '',
    maps_url: '',
    notes: '',
  })

  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [actionError, setActionError] = useState('')
  const [approvingId, setApprovingId] = useState(null)
  const [rejectingId, setRejectingId] = useState(null)

  const [relationshipCandidate, setRelationshipCandidate] =
    useState(null)

  async function loadScheduleRequests() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('student_schedule_requests')
      .select(`
        id,
        student_id,
        coach_id,
        program_id,
        day_of_week,
        start_time,
        end_time,
        timezone,
        location,
        maps_url,
        related_request_id,
        related_schedule_id,
        notes,
        status,
        student_level,
        created_at,
        students (
          profiles (
            display_name
          )
        ),
        coaches (
          profiles (
            display_name
          )
        ),
        programs (
          type,
          mode,
          location,
          duration
        )
      `)
      .order('created_at', {
        ascending: true,
      })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setScheduleRequests(data || [])
    setLoading(false)
  }

  async function loadFormData() {
    const [
      { data: studentsData, error: studentsError },
      { data: coachesData, error: coachesError },
      { data: programsData, error: programsError },
    ] = await Promise.all([
      supabase
        .from('students')
        .select(`
          id,
          level,
          status,
          profiles (
            display_name
          )
        `)
        .eq('status', 'active')
        .order('profiles(display_name)', {
          ascending: true,
        }),

      supabase
        .from('coaches')
        .select(`
          id,
          status,
          profiles (
            display_name
          )
        `)
        .eq('status', 'active')
        .order('profiles(display_name)', {
          ascending: true,
        }),

      supabase
        .from('programs')
        .select(`
          id,
          type,
          mode,
          location,
          duration
        `)
        .order('type', {
          ascending: true,
        })
        .order('mode', {
          ascending: true,
        })
        .order('duration', {
          ascending: true,
        }),
    ])

    if (studentsError) {
      setFormError(studentsError.message)
      return
    }

    if (coachesError) {
      setFormError(coachesError.message)
      return
    }

    if (programsError) {
      setFormError(programsError.message)
      return
    }

    setStudents(studentsData || [])
    setCoaches(coachesData || [])
    setPrograms(programsData || [])
  }

  useEffect(() => {
    async function loadPage() {
      await loadScheduleRequests()
      await loadFormData()
    }

    loadPage()
  }, [])

  function resetForm() {
    setForm({
      student_id: '',
      coach_id: '',
      program_id: '',
      day_of_week: '',
      start_time: '',
      timezone: 'Asia/Jakarta',
      location: '',
      maps_url: '',
      notes: '',
    })

    setFormError('')
    setRelationshipCandidate(null)
  }

  function openForm() {
    resetForm()
    setActionError('')
    setShowForm(true)
  }

  function closeForm() {
    resetForm()
    setShowForm(false)
  }

  function getStudentName(student) {
    return (
      student.profiles?.display_name ||
      'Unnamed Student'
    )
  }

  function getCoachName(coach) {
    return (
      coach.profiles?.display_name ||
      'Unnamed Coach'
    )
  }

  function formatProgram(program) {
    if (!program) {
      return '—'
    }

    const parts = [
      program.type,
      program.mode,
      program.location,
      program.duration
        ? `${program.duration} min`
        : null,
    ]

    return parts.filter(Boolean).join(' · ')
  }

  function formatTime(time) {
    return time?.slice(0, 5) || '—'
  }

  function getDayLabel(dayOfWeek) {
    return (
      DAYS.find(
        (day) => day.value === Number(dayOfWeek)
      )?.label || 'Unknown'
    )
  }

  function calculateEndTime(startTime, duration) {
    if (!startTime || !duration) {
      return ''
    }

    const [hours, minutes] = startTime
      .split(':')
      .map(Number)

    const totalMinutes =
      hours * 60 + minutes + Number(duration)

    if (totalMinutes >= 24 * 60) {
      return ''
    }

    const endHours = Math.floor(totalMinutes / 60)
    const endMinutes = totalMinutes % 60

    return `${String(endHours).padStart(2, '0')}:${String(
      endMinutes
    ).padStart(2, '0')}`
  }

  function handleProgramChange(programId) {
    const selectedProgram = programs.find(
      (program) => program.id === programId
    )

    setForm((current) => ({
      ...current,
      program_id: programId,
      location:
        selectedProgram?.location === 'COACH_PLACE'
          ? 'coach_location'
          : '',
      maps_url: '',
    }))
  }

  function handleStartTimeChange(startTime) {
    setForm((current) => ({
      ...current,
      start_time: startTime,
    }))
  }

  async function findRelationshipCandidate(
    endTime,
    selectedProgram
  ) {
    if (
      selectedProgram.type !== 'PRIVATE' ||
      selectedProgram.location !== 'STUDENT_PLACE'
    ) {
      return null
    }

    /*
     * Find an adjacent request:
     *
     * existing.end_time = new.start_time
     * OR
     * new.end_time = existing.start_time
     */
    const { data: requestCandidates, error: requestError } =
      await supabase
        .from('student_schedule_requests')
        .select(`
          id,
          student_id,
          coach_id,
          day_of_week,
          start_time,
          end_time,
          timezone,
          location,
          status,
          created_at,
          students (
            profiles (
              display_name
            )
          )
        `)
        .eq('coach_id', form.coach_id)
        .eq('day_of_week', Number(form.day_of_week))
        .eq('timezone', form.timezone)
        .eq('location', 'student_location')
        .in('status', ['pending', 'approved'])
        .neq('student_id', form.student_id)

    if (requestError) {
      throw new Error(requestError.message)
    }

    const matchingRequest =
      (requestCandidates || []).find((request) => {
        return (
          request.end_time?.slice(0, 5) ===
            form.start_time.slice(0, 5) ||
          request.start_time?.slice(0, 5) ===
            endTime.slice(0, 5)
        )
      })

    if (matchingRequest) {
      return {
        type: 'request',
        id: matchingRequest.id,
        studentName:
          matchingRequest.students?.profiles
            ?.display_name ||
          'Unnamed Student',
        startTime: matchingRequest.start_time,
        endTime: matchingRequest.end_time,
      }
    }

    const { data: scheduleCandidates, error: scheduleError } =
      await supabase
        .from('student_schedules')
        .select(`
          id,
          student_id,
          coach_id,
          day_of_week,
          start_time,
          end_time,
          timezone,
          location,
          status,
          students (
            profiles (
              display_name
            )
          )
        `)
        .eq('coach_id', form.coach_id)
        .eq('day_of_week', Number(form.day_of_week))
        .eq('timezone', form.timezone)
        .eq('location', 'student_location')
        .eq('status', 'active')
        .neq('student_id', form.student_id)

    if (scheduleError) {
      throw new Error(scheduleError.message)
    }

    const matchingSchedule =
      (scheduleCandidates || []).find((schedule) => {
        return (
          schedule.end_time?.slice(0, 5) ===
            form.start_time.slice(0, 5) ||
          schedule.start_time?.slice(0, 5) ===
            endTime.slice(0, 5)
        )
      })

    if (matchingSchedule) {
      return {
        type: 'schedule',
        id: matchingSchedule.id,
        studentName:
          matchingSchedule.students?.profiles
            ?.display_name ||
          'Unnamed Student',
        startTime: matchingSchedule.start_time,
        endTime: matchingSchedule.end_time,
      }
    }

    return null
  }

  async function submitScheduleRequest(
    relationship = null
  ) {
    const selectedProgram = programs.find(
      (program) => program.id === form.program_id
    )

    const endTime = calculateEndTime(
      form.start_time,
      selectedProgram?.duration
    )

    const { error } = await supabase.rpc(
      'create_schedule_request',
      {
        p_student_id: form.student_id,
        p_coach_id: form.coach_id,
        p_program_id: form.program_id,
        p_day_of_week: Number(form.day_of_week),
        p_start_time: form.start_time,
        p_end_time: endTime,
        p_timezone: form.timezone,
        p_notes: form.notes.trim() || null,
        p_location: form.location.trim() || null,
        p_maps_url: form.maps_url.trim() || null,
        p_related_request_id:
          relationship?.type === 'request'
            ? relationship.id
            : null,
        p_related_schedule_id:
          relationship?.type === 'schedule'
            ? relationship.id
            : null,
      }
    )

    if (error) {
      throw new Error(error.message)
    }
  }

  async function createScheduleRequest(e) {
    e.preventDefault()

    setFormError('')

    if (!form.student_id) {
      setFormError('Please select a student.')
      return
    }

    if (!form.coach_id) {
      setFormError('Please select a coach.')
      return
    }

    if (!form.program_id) {
      setFormError('Please select a program.')
      return
    }

    if (form.day_of_week === '') {
      setFormError('Please select a day.')
      return
    }

    if (!form.start_time) {
      setFormError('Please select a start time.')
      return
    }

    const selectedProgram = programs.find(
      (program) => program.id === form.program_id
    )

    if (!selectedProgram) {
      setFormError('Selected program was not found.')
      return
    }

    const endTime = calculateEndTime(
      form.start_time,
      selectedProgram.duration
    )

    if (!endTime) {
      setFormError(
        'The selected time is too late for this program duration.'
      )
      return
    }

    if (
      selectedProgram.location === 'STUDENT_PLACE' &&
      !form.location.trim()
    ) {
      setFormError('Please enter the student location.')
      return
    }

    setFormLoading(true)

    try {
      const candidate =
        await findRelationshipCandidate(
          endTime,
          selectedProgram
        )

      if (candidate) {
        setRelationshipCandidate(candidate)
        setFormLoading(false)
        return
      }

      await submitScheduleRequest()

      setFormLoading(false)
      closeForm()
      await loadScheduleRequests()
    } catch (error) {
      setFormError(error.message)
      setFormLoading(false)
    }
  }

  async function confirmRelationship() {
    if (!relationshipCandidate) {
      return
    }

    setFormLoading(true)
    setFormError('')

    try {
      await submitScheduleRequest(
        relationshipCandidate
      )

      setRelationshipCandidate(null)
      setFormLoading(false)
      closeForm()
      await loadScheduleRequests()
    } catch (error) {
      setFormError(error.message)
      setFormLoading(false)
    }
  }

  async function declineRelationship() {
    setFormLoading(true)
    setFormError('')

    try {
      await submitScheduleRequest()

      setRelationshipCandidate(null)
      setFormLoading(false)
      closeForm()
      await loadScheduleRequests()
    } catch (error) {
      setFormError(error.message)
      setFormLoading(false)
    }
  }

  async function approveScheduleRequest(requestId) {
    setApprovingId(requestId)
    setActionError('')

    const { error } = await supabase.rpc(
      'approve_schedule_request',
      {
        p_request_id: requestId,
      }
    )

    if (error) {
      setActionError(error.message)
      setApprovingId(null)
      return
    }

    await loadScheduleRequests()
    setApprovingId(null)
  }

  async function rejectScheduleRequest(requestId) {
    setRejectingId(requestId)
    setActionError('')

    const { error } = await supabase.rpc(
      'reject_schedule_request',
      {
        p_request_id: requestId,
      }
    )

    if (error) {
      setActionError(error.message)
      setRejectingId(null)
      return
    }

    await loadScheduleRequests()
    setRejectingId(null)
  }

  const filteredScheduleRequests =
    scheduleRequests.filter((request) => {
      const searchText = search.toLowerCase()

      const studentName = (
        request.students?.profiles?.display_name ||
        ''
      ).toLowerCase()

      const coachName = (
        request.coaches?.profiles?.display_name ||
        ''
      ).toLowerCase()

      const status = (
        request.status || ''
      ).toLowerCase()

      return (
        studentName.includes(searchText) ||
        coachName.includes(searchText) ||
        status.includes(searchText)
      )
    })

  const selectedProgram = programs.find(
    (program) => program.id === form.program_id
  )

  const calculatedEndTime = calculateEndTime(
    form.start_time,
    selectedProgram?.duration
  )

  if (loading) {
    return (
      <div className="academy-app">
        <AcademyHeader />

        <div className="page-state">
          Loading schedule requests...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-page">
        <h1>Chessnuts Academy</h1>
        <p>{error}</p>
      </div>
    )
  }

  if (showForm) {
    return (
      <div className="academy-app">
        <AcademyHeader />

        <main className="academy-main">
          <div className="page-header">
            <div className="page-header-copy">
              <h1>Add Schedule Request</h1>

              <p>
                Create a schedule request for a student
              </p>
            </div>
          </div>

          <form
            className="card form-card"
            onSubmit={createScheduleRequest}
          >
            {formError && (
              <div className="error-box">
                {formError}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                Student
              </label>

              <select
                className="form-select"
                value={form.student_id}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    student_id: e.target.value,
                  }))
                }
              >
                <option value="">
                  Select student
                </option>

                {students.map((student) => (
                  <option
                    key={student.id}
                    value={student.id}
                  >
                    {getStudentName(student)}
                    {student.level
                      ? ` · ${getStudentLevelLabel(
                          student.level
                        )}`
                      : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Coach
              </label>

              <select
                className="form-select"
                value={form.coach_id}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    coach_id: e.target.value,
                  }))
                }
              >
                <option value="">
                  Select coach
                </option>

                {coaches.map((coach) => (
                  <option
                    key={coach.id}
                    value={coach.id}
                  >
                    {getCoachName(coach)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Program
              </label>

              <select
                className="form-select"
                value={form.program_id}
                onChange={(e) =>
                  handleProgramChange(
                    e.target.value
                  )
                }
              >
                <option value="">
                  Select program
                </option>

                {programs.map((program) => (
                  <option
                    key={program.id}
                    value={program.id}
                  >
                    {formatProgram(program)}
                  </option>
                ))}
              </select>

              {selectedProgram && (
                <div className="form-help">
                  Duration:{' '}
                  {selectedProgram.duration} minutes
                </div>
              )}
            </div>

            {selectedProgram?.location === 'COACH_PLACE' && (
              <div className="form-group">
                <label className="form-label">
                  Location
                </label>

                <input
                  className="form-input"
                  type="text"
                  value="Coach Place"
                  readOnly
                />

                <div className="form-help">
                  This program takes place at the coach location.
                </div>
              </div>
            )}

            {selectedProgram?.location === 'STUDENT_PLACE' && (
              <>
                <div className="form-group">
                  <label className="form-label">
                    Student Place
                  </label>

                  <input
                    className="form-input"
                    type="text"
                    value={form.location}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        location: e.target.value,
                      }))
                    }
                    placeholder="Enter student location"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Google Maps URL
                  </label>

                  <input
                    className="form-input"
                    type="url"
                    value={form.maps_url}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        maps_url: e.target.value,
                      }))
                    }
                    placeholder="Optional Google Maps link"
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">
                Day
              </label>

              <select
                className="form-select"
                value={form.day_of_week}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    day_of_week: e.target.value,
                  }))
                }
              >
                <option value="">
                  Select day
                </option>

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
                value={form.start_time}
                onChange={(e) =>
                  handleStartTimeChange(
                    e.target.value
                  )
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
                value={calculatedEndTime}
                readOnly
              />

              <div className="form-help">
                Automatically calculated from the
                selected program duration.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Timezone
              </label>

              <select
                className="form-select"
                value={form.timezone}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    timezone: e.target.value,
                  }))
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
                Notes
              </label>

              <textarea
                className="form-input"
                rows="4"
                value={form.notes}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    notes: e.target.value,
                  }))
                }
                placeholder="Optional notes..."
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeForm}
                disabled={formLoading}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={formLoading}
              >
                {formLoading
                  ? 'Checking...'
                  : 'Create Request'}
              </button>
            </div>
          </form>

          {relationshipCandidate && (
            <div className="modal-backdrop">
              <div className="modal-card">
                <h2>Same Location?</h2>

                <p>
                  This schedule is directly adjacent to{' '}
                  <strong>
                    {relationshipCandidate.studentName}
                  </strong>
                  's existing{' '}
                  {relationshipCandidate.type ===
                  'request'
                    ? 'schedule request'
                    : 'schedule'}
                  .
                </p>

                <p>
                  Is this at the same location with{' '}
                  <strong>
                    {relationshipCandidate.studentName}
                  </strong>
                  ?
                </p>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={declineRelationship}
                    disabled={formLoading}
                  >
                    {formLoading
                      ? 'Creating...'
                      : 'No'}
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={confirmRelationship}
                    disabled={formLoading}
                  >
                    {formLoading
                      ? 'Creating...'
                      : 'Yes, Same Location'}
                  </button>
                </div>
              </div>
            </div>
          )}
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
            <h1>Schedule Requests</h1>

            <p>
              Review student schedule requests
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={openForm}
          >
            + Add Request
          </button>
        </div>

        {actionError && (
          <div className="error-box">
            {actionError}
          </div>
        )}

        <div className="students-toolbar">
          <input
            className="search-input"
            type="text"
            placeholder="Search schedule requests..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />
        </div>

        <div className="card table-card">
          {filteredScheduleRequests.length === 0 ? (
            <div className="empty-state">
              {search
                ? 'No schedule requests match your search.'
                : 'No schedule requests found.'}
            </div>
          ) : (
            <div className="table-scroll">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Level</th>
                    <th>Coach</th>
                    <th>Program</th>
                    <th>Location</th>
                    <th>Day</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredScheduleRequests.map(
                    (request) => {
                      const status =
                        request.status ||
                        'unknown'

                      const isApproving =
                        approvingId ===
                        request.id

                      const isRejecting =
                        rejectingId ===
                        request.id

                      return (
                        <tr key={request.id}>
                          <td>
                            {request.students
                              ?.profiles
                              ?.display_name ||
                              'Unnamed Student'}
                          </td>

                          <td>
                            <span className="level-badge">
                              {getStudentLevelLabel(
                                request.student_level
                              )}
                            </span>
                          </td>

                          <td>
                            {request.coaches
                              ?.profiles
                              ?.display_name ||
                              'Unnamed Coach'}
                          </td>

                          <td>
                            {formatProgram(
                              request.programs
                            )}
                          </td>

                          <td>
                            {request.location ===
                            'coach_location'
                              ? 'Coach Place'
                              : request.location ||
                                '—'}
                          </td>

                          <td>
                            {getDayLabel(
                              request.day_of_week
                            )}
                          </td>

                          <td>
                            {formatTime(
                              request.start_time
                            )}
                            {'–'}
                            {formatTime(
                              request.end_time
                            )}
                          </td>

                          <td>
                            <span
                              className={`status-badge ${
                                status === 'approved'
                                  ? 'status-active'
                                  : 'status-inactive'
                              }`}
                            >
                              {status}
                            </span>
                          </td>

                          <td>
                            {status === 'pending' ? (
                              <div className="form-actions">
                                <button
                                  className="btn btn-primary"
                                  disabled={
                                    isApproving ||
                                    isRejecting
                                  }
                                  onClick={() =>
                                    approveScheduleRequest(
                                      request.id
                                    )
                                  }
                                >
                                  {isApproving
                                    ? 'Approving...'
                                    : 'Approve'}
                                </button>

                                <button
                                  className="btn btn-secondary"
                                  disabled={
                                    isApproving ||
                                    isRejecting
                                  }
                                  onClick={() =>
                                    rejectScheduleRequest(
                                      request.id
                                    )
                                  }
                                >
                                  {isRejecting
                                    ? 'Rejecting...'
                                    : 'Reject'}
                                </button>
                              </div>
                            ) : (
                              '—'
                            )}
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

export default ScheduleRequests
