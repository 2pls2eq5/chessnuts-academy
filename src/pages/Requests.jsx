import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getStudentLevelLabel } from '../constants/studentLevels'
import AcademyHeader from '../components/AcademyHeader'

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

function Requests() {
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [approvingId, setApprovingId] = useState(null)

  async function loadRequests() {
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

    setRequests(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadRequests()
  }, [])

  async function approveRequest(requestId) {
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

    await loadRequests()
    setApprovingId(null)
  }

  function getStudentName(request) {
    return (
      request.students?.profiles?.display_name ||
      'Unnamed Student'
    )
  }

  function getCoachName(request) {
    return (
      request.coaches?.profiles?.display_name ||
      'Unnamed Coach'
    )
  }

  function getDayLabel(dayOfWeek) {
    return DAYS[Number(dayOfWeek)] || 'Unknown'
  }

  function formatTime(time) {
    return time?.slice(0, 5) || '—'
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

  const filteredRequests = requests.filter((request) => {
    const searchText = search.toLowerCase()

    const studentName = getStudentName(request).toLowerCase()
    const coachName = getCoachName(request).toLowerCase()
    const status = (request.status || '').toLowerCase()

    return (
      studentName.includes(searchText) ||
      coachName.includes(searchText) ||
      status.includes(searchText)
    )
  })

  if (loading) {
    return (
      <div className="academy-app">
        <AcademyHeader />

        <div className="page-state">
          Loading requests...
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

  return (
    <div className="academy-app">
      <AcademyHeader />

      <main className="academy-main">
        <div className="page-header">
          <div className="page-header-copy">
            <h1>Requests</h1>

            <p>
              Review student schedule requests
            </p>
          </div>
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
            placeholder="Search requests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="card table-card">
          {filteredRequests.length === 0 ? (
            <div className="empty-state">
              {search
                ? 'No requests match your search.'
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
                  {filteredRequests.map((request) => {
                    const status =
                      request.status || 'unknown'

                    const isApproving =
                      approvingId === request.id

                    return (
                      <tr key={request.id}>
                        <td>
                          {getStudentName(request)}
                        </td>

                        <td>
                          <span className="level-badge">
                            {getStudentLevelLabel(
                              request.student_level
                            )}
                          </span>
                        </td>

                        <td>
                          {getCoachName(request)}
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
                                : status === 'pending'
                                  ? 'status-badge'
                                  : 'status-inactive'
                            }`}
                          >
                            {status}
                          </span>
                        </td>

                        <td>
                          {status === 'pending' ? (
                            <button
                              className="btn btn-primary"
                              disabled={isApproving}
                              onClick={() =>
                                approveRequest(
                                  request.id
                                )
                              }
                            >
                              {isApproving
                                ? 'Approving...'
                                : 'Approve'}
                            </button>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default Requests
