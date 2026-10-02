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
  const [scheduleRequests, setScheduleRequests] =
    useState([])

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
    notes: '',
    location: '',
    maps_url: '',
  })

  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [actionError, setActionError] = useState('')
  const [approvingId, setApprovingId] = useState(null)
  const [rejectingId, setRejectingId] = useState(null)

  const [relatedCandidate, setRelatedCandidate] =
    useState(null)

  const [showRelatedModal, setShowRelatedModal] =
    useState(false)

  const [pendingRequestData, setPendingRequestData] =
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
        notes,
        status,
        student_level,
        location,
        maps_url,
        related_request_id,
        related_schedule_id,
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
      notes: '',
      location: '',
      maps_url: '',
    })

    setFormError('')
    setPendingRequestData(null)
    setRelatedCandidate(null)
    setShowRelatedModal(false)
  }

  function openForm() {
    resetForm()
    setActionError('')
    setShowForm(true)
  }

  function closeForm() {
    if (formLoading) {
      return
    }

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
        selectedProgram?.location ===
        'student_location'
          ? current.location
          : selectedProgram?.location ===
              'coach_location'
            ? 'coach_location'
            : '',
      maps_url:
        selectedProgram?.location ===
        'student_location'
          ? current.maps_url
          : '',
    }))
  }

  function handleStartTimeChange(startTime) {
    setForm((current) => ({
      ...current,
      start_time: startTime,
    }))
  }

  function isAdjacent(
    candidateStart,
    candidateEnd,
    newStart,
    newEnd
  ) {
    return (
      candidateEnd?.slice(0, 5) ===
        newStart?.slice(0, 5) ||
      newEnd?.slice(0, 5) ===
        candidateStart?.slice(0, 5)
    )
  }

  async function findAdjacentLocationCandidate({
    coachId,
    programId,
    dayOfWeek,
    startTime,
    endTime,
    timezone,
  }) {
    /*
     * First check pending/approved requests.
     */

    const {
      data: requestData,
      error: requestError,
    } = await supabase
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
        status,
        location,
        maps_url,
        students (
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
      .eq('coach_id', coachId)
      .eq('day_of_week', dayOfWeek)
      .eq('timezone', timezone)
      .in('status', ['pending', 'approved'])

    if (requestError) {
      throw requestError
    }

    const adjacentRequest = (requestData || []).find(
      (request) =>
        request.id &&
        request.program_id !== null &&
        request.location === 'student_location' &&
        isAdjacent(
          request.start_time,
          request.end_time,
          startTime,
          endTime
        )
    )

    if (adjacentRequest) {
      return {
        kind: 'request',
        id: adjacentRequest.id,
        studentName:
          adjacentRequest.students?.profiles
            ?.display_name || 'Unnamed Student',
        startTime: adjacentRequest.start_time,
        endTime: adjacentRequest.end_time,
        location: adjacentRequest.location,
        mapsUrl: adjacentRequest.maps_url,
        program: adjacentRequest.programs,
      }
    }

    /*
     * Then check existing recurring schedules.
     */

    const {
      data: scheduleData,
      error: scheduleError,
    } = await supabase
      .from('student_schedules')
      .select(`
        id,
        student_id,
        coach_id,
        program_id,
        day_of_week,
        start_time,
        end_time,
        timezone,
        status,
        location,
        maps_url,
        students (
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
      .eq('coach_id', coachId)
      .eq('day_of_week', dayOfWeek)
      .eq('timezone', timezone)
      .eq('status', 'active')

    if (scheduleError) {
      throw scheduleError
    }

    const adjacentSchedule = (scheduleData || []).find(
      (schedule) =>
        schedule.location === 'student_location' &&
        isAdjacent(
          schedule.start_time,
          schedule.end_time,
          startTime,
          endTime
        )
    )

    if (adjacentSchedule) {
      return {
        kind: 'schedule',
        id: adjacentSchedule.id,
        studentName:
          adjacentSchedule.students?.profiles
            ?.display_name || 'Unnamed Student',
        startTime: adjacentSchedule.start_time,
        endTime: adjacentSchedule.end_time,
        location: adjacentSchedule.location,
        mapsUrl: adjacentSchedule.maps_url,
        program: adjacentSchedule.programs,
      }
    }

    return null
  }

  async function submitScheduleRequest({
    relatedRequestId = null,
    relatedScheduleId = null,
  }) {
    if (!pendingRequestData) {
      return
    }

    setFormLoading(true)
    setFormError('')

    const {
      studentId,
      coachId,
      programId,
      dayOfWeek,
      startTime,
      endTime,
      timezone,
      notes,
      location,
      mapsUrl,
    } = pendingRequestData

    const { data, error } = await supabase.rpc(
      'create_schedule_request',
      {
        p_student_id: studentId,
        p_coach_id: coachId,
        p_program_id: programId,
        p_day_of_week: dayOfWeek,
        p_start_time: startTime,
        p_end_time: endTime,
        p_timezone: timezone,
        p_notes: notes,
        p_location: location,
        p_maps_url: mapsUrl,
        p_related_request_id:
          relatedRequestId,
        p_related_schedule_id:
          relatedScheduleId,
      }
    )

    if (error) {
      setFormError(error.message)
      setFormLoading(false)
      return
    }

    setFormLoading(false)

    setPendingRequestData(null)
    setRelatedCandidate(null)
    setShowRelatedModal(false)

    closeForm()
    await loadScheduleRequests()

    return data
  }

  async function createAndRejectScheduleRequest() {
    const request = await submitScheduleRequest({
      relatedRequestId: null,
      relatedScheduleId: null,
    })

    if (!request) {
      return
    }

    setFormLoading(true)
    setFormError('')

    const { error } = await supabase.rpc(
      'reject_schedule_request',
      {
        p_request_id: request.id,
      }
    )

    if (error) {
      setFormError(error.message)
      setFormLoading(false)
      return
    }

    setFormLoading(false)

    setPendingRequestData(null)
    setRelatedCandidate(null)
    setShowRelatedModal(false)

    closeForm()
    await loadScheduleRequests()
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

    const programLocation =
      selectedProgram.location

    if (programLocation === 'student_location') {
      if (!form.location.trim()) {
        setFormError(
          'Please enter the student location.'
        )
        return
      }
    }

    if (programLocation === 'coach_location') {
      if (form.location.trim() !== 'coach_location') {
        setFormError(
          'Coach location is handled automatically.'
        )
        return
      }
    }

    const requestData = {
      studentId: form.student_id,
      coachId: form.coach_id,
      programId: form.program_id,
      dayOfWeek: Number(form.day_of_week),
      startTime: form.start_time,
      endTime,
      timezone: form.timezone,
      notes: form.notes.trim() || null,
      location:
        programLocation === 'coach_location'
          ? 'coach_location'
          : form.location.trim(),
      mapsUrl:
        programLocation === 'student_location'
          ? form.maps_url.trim() || null
          : null,
    }

    /*
     * GROUP:
     * No frontend confirmation.
     * The database function automatically handles
     * the group relationship.
     */

    if (
      programLocation === 'student_location' &&
      selectedProgram.type === 'GROUP'
    ) {
      setPendingRequestData(requestData)

      await submitScheduleRequest({
        relatedRequestId: null,
        relatedScheduleId: null,
      })

      return
    }

    /*
     * PRIVATE + STUDENT_LOCATION:
     * Look for an adjacent student-location request/schedule.
     */

    if (
      programLocation === 'student_location' &&
      selectedProgram.type === 'PRIVATE'
    ) {
      setFormLoading(true)

      try {
        const candidate =
          await findAdjacentLocationCandidate({
            coachId: requestData.coachId,
            programId: requestData.programId,
            dayOfWeek: requestData.dayOfWeek,
            startTime: requestData.startTime,
            endTime: requestData.endTime,
            timezone: requestData.timezone,
          })

        setFormLoading(false)

        if (candidate) {
          setPendingRequestData(requestData)
          setRelatedCandidate(candidate)
          setShowRelatedModal(true)
          return
        }
      } catch (candidateError) {
        setFormLoading(false)
        setFormError(candidateError.message)
        return
      }
    }

    /*
     * No relationship required.
     */

    setPendingRequestData(requestData)

    await submitScheduleRequest({
      relatedRequestId: null,
      relatedScheduleId: null,
    })
  }

  async function confirmRelatedLocation() {
    if (!relatedCandidate) {
      return
    }

    if (relatedCandidate.kind === 'request') {
      await submitScheduleRequest({
        relatedRequestId: relatedCandidate.id,
        relatedScheduleId: null,
      })

      return
    }

    await submitScheduleRequest({
      relatedRequestId: null,
      relatedScheduleId: relatedCandidate.id,
    })
  }

  async function rejectBecauseDifferentLocation() {
    await createAndRejectScheduleRequest()
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

            {selectedProgram?.location ===
              'student_location' && (
              <>
                <div className="form-group">
                  <label className="form-label">
                    Student Location
                  </label>

                  <textarea
                    className="form-input"
                    rows="3"
                    value={form.location}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        location: e.target.value,
                      }))
                    }
                    placeholder="Enter the teaching location..."
                  />

                  <div className="form-help">
                    Example: Starbucks Sunter Mall,
                    lantai 2, dekat entrance utama.
                  </div>
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

            {selectedProgram?.location ===
              'coach_location' && (
              <div className="form-group">
                <label className="form-label">
                  Location
                </label>

                <input
                  className="form-input"
                  type="text"
                  value="coach_location"
                  readOnly
                />

                <div className="form-help">
                  Coach location is currently stored as
                  a temporary location type.
                </div>
              </div>
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
                  ? 'Creating...'
                  : 'Create Request'}
              </button>
            </div>
          </form>
        </main>

        {showRelatedModal &&
          relatedCandidate && (
            <div
              className="modal-overlay"
              role="dialog"
              aria-modal="true"
            >
              <div className="modal">
                <div className="modal-header">
                  <h2>Same Location?</h2>
                </div>

                <div className="modal-body">
                  <p>
                    This private class is immediately
                    adjacent to another student-location
                    class.
                  </p>

                  <p>
                    Is this at the same location with{' '}
                    <strong>
                      {relatedCandidate.studentName}
                    </strong>
                    ?
                  </p>

                  <div className="card">
                    <div>
                      <strong>
                        {relatedCandidate.kind ===
                        'request'
                          ? 'Schedule Request'
                          : 'Schedule'}
                      </strong>
                    </div>

                    <div>
                      {getDayLabel(
                        form.day_of_week
                      )}
                      {' · '}
                      {formatTime(
                        relatedCandidate.startTime
                      )}
                      {'–'}
                      {formatTime(
                        relatedCandidate.endTime
                      )}
                    </div>

                    {relatedCandidate.location && (
                      <div>
                        {relatedCandidate.location}
                      </div>
                    )}
                  </div>

                  <p className="form-help">
                    If you select No, this request will
                    be rejected because the adjacent
                    student-location class cannot be
                    combined into the same visit.
                  </p>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={formLoading}
                    onClick={
                      rejectBecauseDifferentLocation
                    }
                  >
                    {formLoading
                      ? 'Processing...'
                      : 'No'}
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={formLoading}
                    onClick={confirmRelatedLocation}
                  >
                    {formLoading
                      ? 'Processing...'
                      : 'Yes, Same Location'}
                  </button>
                </div>
              </div>
            </div>
          )}
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
