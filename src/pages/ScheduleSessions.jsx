import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
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

function ScheduleSessions() {
  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState(null)
  const [packages, setPackages] = useState([])
  const [sessions, setSessions] = useState([])
  const [error, setError] = useState('')

  const scheduleId =
    window.location.pathname.split('/')[2]

  useEffect(() => {
    async function loadScheduleSessions() {
      setLoading(true)
      setError('')

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
        .eq('id', scheduleId)
        .single()

      if (scheduleError) {
        setError(scheduleError.message)
        setLoading(false)
        return
      }

      const {
        data: packagesData,
        error: packagesError,
      } = await supabase
        .from('student_packages')
        .select(`
          id,
          student_id,
          program_id,
          schedule_id,
          purchased_at,
          payment_status,
          status,
          created_at
        `)
        .eq('schedule_id', scheduleId)
        .order('created_at', {
          ascending: true,
        })

      if (packagesError) {
        setError(packagesError.message)
        setLoading(false)
        return
      }

      const packageIds =
        (packagesData || []).map(
          (packageItem) => packageItem.id
        )

      let sessionsData = []

      if (packageIds.length > 0) {
        const {
          data,
          error: sessionsError,
        } = await supabase
          .from('class_sessions')
          .select(`
            id,
            package_id,
            session_date,
            start_time,
            end_time,
            status,
            notes
          `)
          .in('package_id', packageIds)
          .order('session_date', {
            ascending: true,
          })
          .order('start_time', {
            ascending: true,
          })

        if (sessionsError) {
          setError(sessionsError.message)
          setLoading(false)
          return
        }

        sessionsData = data || []
      }

      setSchedule(scheduleData)
      setPackages(packagesData || [])
      setSessions(sessionsData)
      setLoading(false)
    }

    loadScheduleSessions()
  }, [scheduleId])

  function getStudentName() {
    return (
      schedule?.students?.profiles?.display_name ||
      'Unnamed Student'
    )
  }

  function getCoachName() {
    return (
      schedule?.coaches?.profiles?.display_name ||
      'Unnamed Coach'
    )
  }

  function getDayLabel(dayOfWeek) {
    return (
      DAYS[Number(dayOfWeek)] ||
      'Unknown'
    )
  }

  function formatTime(time) {
    return time?.slice(0, 5) || '—'
  }

  function formatDate(date) {
    if (!date) {
      return '—'
    }

    const value = new Date(
      `${date}T00:00:00`
    )

    return value.toLocaleDateString(
      'en-US',
      {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }
    )
  }

  function getProgramLabel() {
    const program = schedule?.programs

    if (!program) {
      return 'Unknown Program'
    }

    const typeLabel = {
      PRIVATE: 'Private',
      GROUP: 'Group',
      SCHOOL: 'School',
    }

    const modeLabel = {
      ONLINE: 'Online',
      OFFLINE: 'Offline',
    }

    const locationLabel = {
      COACH_PLACE: 'Coach Place',
      STUDENT_PLACE: 'Student Place',
    }

    const parts = [
      typeLabel[program.type] ||
        program.type,
      modeLabel[program.mode] ||
        program.mode,
    ]

    if (
      program.location &&
      program.type !== 'SCHOOL'
    ) {
      parts.push(
        locationLabel[
          program.location
        ] || program.location
      )
    }

    if (program.duration) {
      parts.push(
        `${program.duration} min`
      )
    }

    return parts.join(' · ')
  }

  function getPackageSessions(packageId) {
    return sessions.filter(
      (session) =>
        session.package_id === packageId
    )
  }

  function getStatusClass(status) {
    if (status === 'scheduled') {
      return 'status-active'
    }

    if (
      status === 'cancelled' ||
      status === 'canceled'
    ) {
      return 'status-inactive'
    }

    return 'status-badge'
  }

  if (loading) {
    return (
      <div className="academy-app">
        <AcademyHeader />

        <div className="page-state">
          Loading sessions...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="academy-app">
        <AcademyHeader />

        <main className="academy-main">
          <div className="error-box">
            {error}
          </div>
        </main>
      </div>
    )
  }

  if (!schedule) {
    return (
      <div className="academy-app">
        <AcademyHeader />

        <main className="academy-main">
          <div className="empty-state">
            Schedule not found.
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
            <h1>Schedule Sessions</h1>

            <p>
              View the sessions generated from
              this schedule
            </p>
          </div>

          <div className="form-actions">
            <button
              className="btn btn-secondary"
              onClick={() => {
                window.location.href =
                  '/schedules'
              }}
            >
              Back to Schedules
            </button>
          </div>
        </div>

        {/* Schedule Summary */}
        <div className="card detail-card">
          <div className="form-header">
            <h2>Schedule</h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(2, minmax(0, 1fr))',
              gap: '20px',
            }}
          >
            <div>
              <div className="form-label">
                Student
              </div>

              <div>
                {getStudentName()}
              </div>
            </div>

            <div>
              <div className="form-label">
                Coach
              </div>

              <div>
                {getCoachName()}
              </div>
            </div>

            <div>
              <div className="form-label">
                Program
              </div>

              <div>
                {getProgramLabel()}
              </div>
            </div>

            <div>
              <div className="form-label">
                Recurring Time
              </div>

              <div>
                {getDayLabel(
                  schedule.day_of_week
                )}
                {' · '}
                {formatTime(
                  schedule.start_time
                )}
                {'–'}
                {formatTime(
                  schedule.end_time
                )}
              </div>
            </div>

            <div>
              <div className="form-label">
                Timezone
              </div>

              <div>
                {schedule.timezone}
              </div>
            </div>

            <div>
              <div className="form-label">
                Schedule Status
              </div>

              <div>
                <span
                  className={`status-badge ${
                    schedule.status ===
                    'suspended'
                      ? 'status-inactive'
                      : 'status-active'
                  }`}
                >
                  {schedule.status ===
                  'suspended'
                    ? 'Suspended'
                    : 'Active'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Packages */}
        {packages.length === 0 ? (
          <div
            className="card"
            style={{
              marginTop: '24px',
            }}
          >
            <div className="empty-state">
              No packages have been generated
              for this schedule yet.
            </div>
          </div>
        ) : (
          <div
            style={{
              marginTop: '24px',
            }}
          >
            {packages.map((packageItem, index) => {
              const packageSessions =
                getPackageSessions(
                  packageItem.id
                )

              return (
                <div
                  className="card"
                  key={packageItem.id}
                  style={{
                    marginBottom: '24px',
                  }}
                >
                  <div className="form-header">
                    <h2>
                      Package {index + 1}
                    </h2>

                    <p>
                      Created{' '}
                      {formatDate(
                        packageItem.purchased_at?.slice(
                          0,
                          10
                        )
                      )}
                    </p>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '24px',
                      flexWrap: 'wrap',
                      marginBottom: '20px',
                    }}
                  >
                    <div>
                      <div className="form-label">
                        Package Status
                      </div>

                      <span className="status-badge status-active">
                        {packageItem.status}
                      </span>
                    </div>

                    <div>
                      <div className="form-label">
                        Payment
                      </div>

                      <span className="status-badge">
                        {packageItem.payment_status}
                      </span>
                    </div>

                    <div>
                      <div className="form-label">
                        Sessions
                      </div>

                      <div>
                        {
                          packageSessions.length
                        }{' '}
                        / 4
                      </div>
                    </div>
                  </div>

                  {packageSessions.length ===
                  0 ? (
                    <div className="empty-state">
                      No sessions found for
                      this package.
                    </div>
                  ) : (
                    <div className="table-scroll">
                      <table className="students-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Status</th>
                            <th>Notes</th>
                          </tr>
                        </thead>

                        <tbody>
                          {packageSessions.map(
                            (
                              session,
                              sessionIndex
                            ) => (
                              <tr
                                key={
                                  session.id
                                }
                              >
                                <td>
                                  {sessionIndex +
                                    1}
                                </td>

                                <td>
                                  {formatDate(
                                    session.session_date
                                  )}
                                </td>

                                <td>
                                  {formatTime(
                                    session.start_time
                                  )}
                                  {'–'}
                                  {formatTime(
                                    session.end_time
                                  )}
                                </td>

                                <td>
                                  <span
                                    className={`status-badge ${getStatusClass(
                                      session.status
                                    )}`}
                                  >
                                    {
                                      session.status
                                    }
                                  </span>
                                </td>

                                <td>
                                  {session.notes ||
                                    '—'}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

export default ScheduleSessions
