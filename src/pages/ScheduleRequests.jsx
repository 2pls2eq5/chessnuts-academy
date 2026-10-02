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

function getStudentName(student) {
  return student?.profiles?.display_name || '—'
}

function getCoachName(coach) {
  return coach?.profiles?.display_name || '—'
}

function formatProgram(program) {
  if (!program) return '—'

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

function formatDay(day) {
  return DAYS.find((item) => item.value === day)?.label || '—'
}

function formatTime(time) {
  if (!time) return '—'
  return time.slice(0, 5)
}

function normalizeLocation(location) {
  return location?.trim().toLowerCase() || null
}

function calculateEndTime(startTime, duration) {
  if (!startTime || !duration) return null

  const [hours, minutes] = startTime.split(':').map(Number)

  const totalMinutes = hours * 60 + minutes + Number(duration)
  const endHours = Math.floor(totalMinutes / 60) % 24
  const endMinutes = totalMinutes % 60

  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}:00`
}

function isAdjacent(endTime, startTime) {
  if (!endTime || !startTime) return false

  return endTime.slice(0, 5) === startTime.slice(0, 5)
}

function formatLocation(location) {
  const normalized = normalizeLocation(location)

  if (normalized === 'coach_location') {
    return 'Coach Place'
  }

  if (normalized === 'student_location') {
    return 'Student Place'
  }

  return location || '—'
}

export default function ScheduleRequests() {
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
    day_of_week: 1,
    start_time: '16:00',
    timezone: 'Asia/Jakarta',
    location: '',
    maps_url: '',
    notes: '',
  })

  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [actionError, setActionError] = useState('')

  const [approvingId, setApprovingId] = useState(null)
  const [rejectingId, setRejectingId] = useState(null)

  const [locationCandidate, setLocationCandidate] = useState(null)
  const [showLocationModal, setShowLocationModal] = useState(false)

  async function loadData() {
    setLoading(true)
    setActionError('')

    const [
      requestsResult,
      studentsResult,
      coachesResult,
      programsResult,
    ] = await Promise.all([
      supabase
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
        .order('created_at', { ascending: false }),

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
        .order('id'),

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
        .order('id'),

      supabase
        .from('programs')
        .select(`
          id,
          type,
          mode,
          location,
          duration
        `)
        .order('type', { ascending: true })
        .order('mode', { ascending: true })
        .order('duration', { ascending: true }),
    ])

    if (requestsResult.error) {
      setActionError(requestsResult.error.message)
    }

    if (studentsResult.error) {
      setActionError(studentsResult.error.message)
    }

    if (coachesResult.error) {
      setActionError(coachesResult.error.message)
    }

    if (programsResult.error) {
      setActionError(programsResult.error.message)
    }

    setScheduleRequests(requestsResult.data || [])
    setStudents(studentsResult.data || [])
    setCoaches(coachesResult.data || [])
    setPrograms(programsResult.data || [])

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const selectedProgram = programs.find(
    (program) => program.id === form.program_id
  )

  function handleFormChange(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function resetForm() {
    setForm({
      student_id: '',
      coach_id: '',
      program_id: '',
      day_of_week: 1,
      start_time: '16:00',
      timezone: 'Asia/Jakarta',
      location: '',
      maps_url: '',
      notes: '',
    })

    setFormError('')
    setLocationCandidate(null)
    setShowLocationModal(false)
  }

  function closeForm() {
    if (formLoading) return

    setShowForm(false)
    resetForm()
  }

  async function findAdjacentLocationCandidate() {
    const endTime = calculateEndTime(
      form.start_time,
      selectedProgram?.duration
    )

    if (!endTime) return null

    const [requestsResult, schedulesResult] = await Promise.all([
      supabase
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
          maps_url,
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
        .in('status', ['pending', 'approved']),

      supabase
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
          maps_url,
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
        .eq('status', 'active'),
    ])

    if (requestsResult.error) {
      throw requestsResult.error
    }

    if (schedulesResult.error) {
      throw schedulesResult.error
    }

    const requestCandidates = (requestsResult.data || [])
      .filter(
        (item) =>
          normalizeLocation(item.location) === 'student_location'
      )
      .filter(
        (item) =>
          item.student_id !== form.student_id
      )

    for (const candidate of requestCandidates) {
      if (isAdjacent(endTime, candidate.start_time)) {
        return {
          type: 'request',
          id: candidate.id,
          studentName: getStudentName(candidate.students),
          location: candidate.location,
          maps_url: candidate.maps_url,
          start_time: candidate.start_time,
          end_time: candidate.end_time,
        }
      }
    }

    const scheduleCandidates = (schedulesResult.data || [])
      .filter(
        (item) =>
          normalizeLocation(item.location) === 'student_location'
      )
      .filter(
        (item) =>
          item.student_id !== form.student_id
      )

    for (const candidate of scheduleCandidates) {
      if (isAdjacent(endTime, candidate.start_time)) {
        return {
          type: 'schedule',
          id: candidate.id,
          studentName: getStudentName(candidate.students),
          location: candidate.location,
          maps_url: candidate.maps_url,
          start_time: candidate.start_time,
          end_time: candidate.end_time,
        }
      }
    }

    return null
  }

  async function createScheduleRequestRpc({
    relatedRequestId = null,
    relatedScheduleId = null,
  } = {}) {
    const endTime = calculateEndTime(
      form.start_time,
      selectedProgram?.duration
    )

    if (!endTime) {
      throw new Error('Unable to calculate class end time.')
    }

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
        p_related_request_id: relatedRequestId,
        p_related_schedule_id: relatedScheduleId,
      }
    )

    if (error) {
      throw error
    }
  }

  async function submitScheduleRequest(event) {
    event.preventDefault()

    setFormError('')
    setFormLoading(true)

    try {
      if (!form.student_id) {
        throw new Error('Please select a student.')
      }

      if (!form.coach_id) {
        throw new Error('Please select a coach.')
      }

      if (!form.program_id) {
        throw new Error('Please select a program.')
      }

      if (!form.start_time) {
        throw new Error('Please select a start time.')
      }

      const programLocation = normalizeLocation(
        selectedProgram?.location
      )

      if (!programLocation) {
        throw new Error('Program location is not configured.')
      }

      if (programLocation === 'student_location') {
        if (!form.location.trim()) {
          throw new Error('Please enter the Student Place.')
        }

        if (
          normalizeLocation(form.location) === 'coach_location' ||
          normalizeLocation(form.location) === 'student_location'
        ) {
          throw new Error('Please enter the actual Student Place.')
        }
      }

      if (programLocation === 'coach_location') {
        setForm((current) => ({
          ...current,
          location: 'coach_location',
          maps_url: '',
        }))
      }

      /*
       * PRIVATE + STUDENT LOCATION:
       * Check whether this class immediately follows another
       * Student Place class for the same coach.
       */
      if (
        programLocation === 'student_location' &&
        String(selectedProgram?.type).toLowerCase() === 'private'
      ) {
        const candidate = await findAdjacentLocationCandidate()

        if (candidate) {
          setLocationCandidate(candidate)
          setShowLocationModal(true)
          setFormLoading(false)
          return
        }
      }

      await createScheduleRequestRpc()

      setShowForm(false)
      resetForm()
      await loadData()
    } catch (error) {
      setFormError(error.message || 'Failed to create schedule request.')
    } finally {
      setFormLoading(false)
    }
  }

  async function confirmSameLocation() {
    if (!locationCandidate) return

    setFormError('')
    setFormLoading(true)
    setShowLocationModal(false)

    try {
      await createScheduleRequestRpc({
        relatedRequestId:
          locationCandidate.type === 'request'
            ? locationCandidate.id
            : null,
        relatedScheduleId:
          locationCandidate.type === 'schedule'
            ? locationCandidate.id
            : null,
      })

      setShowForm(false)
      resetForm()
      await loadData()
    } catch (error) {
      setFormError(
        error.message || 'Failed to create related schedule request.'
      )
    } finally {
      setFormLoading(false)
    }
  }

  function declineSameLocation() {
    setShowLocationModal(false)
    setLocationCandidate(null)

    setFormError(
      'This request cannot be created because the Student Place is different from the adjacent class.'
    )
  }

  async function approveScheduleRequest(requestId) {
    setActionError('')
    setApprovingId(requestId)

    try {
      const { error } = await supabase.rpc(
        'approve_schedule_request',
        {
          p_request_id: requestId,
        }
      )

      if (error) {
        throw error
      }

      await loadData()
    } catch (error) {
      setActionError(
        error.message || 'Failed to approve schedule request.'
      )
    } finally {
      setApprovingId(null)
    }
  }

  async function rejectScheduleRequest(requestId) {
    setActionError('')
    setRejectingId(requestId)

    try {
      const { error } = await supabase.rpc(
        'reject_schedule_request',
        {
          p_request_id: requestId,
        }
      )

      if (error) {
        throw error
      }

      await loadData()
    } catch (error) {
      setActionError(
        error.message || 'Failed to reject schedule request.'
      )
    } finally {
      setRejectingId(null)
    }
  }

  const filteredRequests = scheduleRequests.filter((request) => {
    const query = search.trim().toLowerCase()

    if (!query) return true

    const studentName = getStudentName(request.students).toLowerCase()
    const coachName = getCoachName(request.coaches).toLowerCase()
    const programName = formatProgram(request.programs).toLowerCase()
    const location = formatLocation(request.location).toLowerCase()

    return (
      studentName.includes(query) ||
      coachName.includes(query) ||
      programName.includes(query) ||
      location.includes(query)
    )
  })

  return (
    <div>
      <AcademyHeader />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              Schedule Requests
            </h1>

            <p className="text-gray-600 mt-1">
              Manage student schedule requests.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
            className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800"
          >
            New Request
          </button>
        </div>

        {actionError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700">
            {actionError}
          </div>
        )}

        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search student, coach, program, or location..."
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        {loading ? (
          <div className="py-10 text-center text-gray-500">
            Loading...
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-xl">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3">Student</th>
                  <th className="text-left px-4 py-3">Level</th>
                  <th className="text-left px-4 py-3">Coach</th>
                  <th className="text-left px-4 py-3">Program</th>
                  <th className="text-left px-4 py-3">Location</th>
                  <th className="text-left px-4 py-3">Day</th>
                  <th className="text-left px-4 py-3">Time</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No schedule requests found.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((request) => (
                    <tr key={request.id}>
                      <td className="px-4 py-3">
                        {getStudentName(request.students)}
                      </td>

                      <td className="px-4 py-3">
                        {request.student_level
                          ? getStudentLevelLabel(
                              request.student_level
                            )
                          : '—'}
                      </td>

                      <td className="px-4 py-3">
                        {getCoachName(request.coaches)}
                      </td>

                      <td className="px-4 py-3">
                        {formatProgram(request.programs)}
                      </td>

                      <td className="px-4 py-3">
                        <div>
                          {formatLocation(request.location)}

                          {request.maps_url && (
                            <a
                              href={request.maps_url}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-blue-600 hover:underline text-xs mt-1"
                            >
                              Maps
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {formatDay(request.day_of_week)}
                      </td>

                      <td className="px-4 py-3">
                        {formatTime(request.start_time)}
                        {' – '}
                        {formatTime(request.end_time)}
                      </td>

                      <td className="px-4 py-3">
                        {request.status}
                      </td>

                      <td className="px-4 py-3">
                        {request.status === 'pending' ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                approveScheduleRequest(request.id)
                              }
                              disabled={approvingId === request.id}
                              className="px-3 py-1.5 rounded-lg bg-green-600 text-white disabled:opacity-50"
                            >
                              {approvingId === request.id
                                ? '...'
                                : 'Approve'}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                rejectScheduleRequest(request.id)
                              }
                              disabled={rejectingId === request.id}
                              className="px-3 py-1.5 rounded-lg bg-red-600 text-white disabled:opacity-50"
                            >
                              {rejectingId === request.id
                                ? '...'
                                : 'Reject'}
                            </button>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                New Schedule Request
              </h2>

              <button
                type="button"
                onClick={closeForm}
                disabled={formLoading}
                className="text-gray-500 hover:text-gray-800"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={submitScheduleRequest}
              className="p-6 space-y-4"
            >
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Student
                </label>

                <select
                  name="student_id"
                  value={form.student_id}
                  onChange={handleFormChange}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">
                    Select student
                  </option>

                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {getStudentName(student)}
                      {student.level
                        ? ` · ${getStudentLevelLabel(student.level)}`
                        : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Coach
                </label>

                <select
                  name="coach_id"
                  value={form.coach_id}
                  onChange={handleFormChange}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">
                    Select coach
                  </option>

                  {coaches.map((coach) => (
                    <option key={coach.id} value={coach.id}>
                      {getCoachName(coach)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Program
                </label>

                <select
                  name="program_id"
                  value={form.program_id}
                  onChange={handleFormChange}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">
                    Select program
                  </option>

                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {formatProgram(program)}
                    </option>
                  ))}
                </select>
              </div>

              {normalizeLocation(selectedProgram?.location) ===
                'student_location' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Student Place
                    </label>

                    <input
                      type="text"
                      name="location"
                      value={form.location}
                      onChange={handleFormChange}
                      placeholder="e.g. Student's home"
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Google Maps URL
                    </label>

                    <input
                      type="url"
                      name="maps_url"
                      value={form.maps_url}
                      onChange={handleFormChange}
                      placeholder="Optional"
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </>
              )}

              {normalizeLocation(selectedProgram?.location) ===
                'coach_location' && (
                <div className="p-3 rounded-lg bg-gray-50 text-sm text-gray-600">
                  <strong>Coach Place</strong>
                  <div className="mt-1">
                    The exact station/location is handled separately.
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Day
                </label>

                <select
                  name="day_of_week"
                  value={form.day_of_week}
                  onChange={handleFormChange}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  {DAYS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Start Time
                </label>

                <input
                  type="time"
                  name="start_time"
                  value={form.start_time}
                  onChange={handleFormChange}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Timezone
                </label>

                <select
                  name="timezone"
                  value={form.timezone}
                  onChange={handleFormChange}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  {TIMEZONES.map((timezone) => (
                    <option key={timezone} value={timezone}>
                      {timezone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Notes
                </label>

                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleFormChange}
                  rows="3"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={formLoading}
                  className="px-4 py-2 rounded-lg border"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
                >
                  {formLoading ? 'Creating...' : 'Create Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLocationModal && locationCandidate && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold">
              Same Student Place?
            </h2>

            <p className="mt-3 text-sm text-gray-600">
              This request is immediately adjacent to another
              Student Place class for the same coach.
            </p>

            <div className="mt-4 p-4 rounded-lg bg-gray-50">
              <div className="font-medium">
                {locationCandidate.studentName}
              </div>

              <div className="text-sm text-gray-600 mt-1">
                {formatTime(locationCandidate.start_time)}
                {' – '}
                {formatTime(locationCandidate.end_time)}
              </div>

              <div className="text-sm mt-2">
                {locationCandidate.location}
              </div>

              {locationCandidate.maps_url && (
                <a
                  href={locationCandidate.maps_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-blue-600 hover:underline text-sm mt-1"
                >
                  Open Maps
                </a>
              )}
            </div>

            <p className="mt-4 text-sm">
              Is the new class at the same Student Place?
            </p>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={declineSameLocation}
                disabled={formLoading}
                className="px-4 py-2 rounded-lg border"
              >
                No
              </button>

              <button
                type="button"
                onClick={confirmSameLocation}
                disabled={formLoading}
                className="px-4 py-2 rounded-lg bg-black text-white"
              >
                {formLoading ? 'Creating...' : 'Yes, Same Place'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
