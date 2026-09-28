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

function Schedules() {
  const [loading, setLoading] = useState(true)
  const [schedules, setSchedules] = useState([])
  const [packages, setPackages] = useState([])
  const [requestCount, setRequestCount] = useState(0)
  const [availabilityCount, setAvailabilityCount] = useState(0)
  const [actionLoading, setActionLoading] = useState(null)
  const [error, setError] = useState('')

  const [suspendModalOpen, setSuspendModalOpen] =
    useState(false)

  const [selectedSchedule, setSelectedSchedule] =
    useState(null)

  async function loadSchedulesOverview() {
    setLoading(true)
    setError('')

    const [
      {
        data: schedulesData,
        error: schedulesError,
      },
      {
        data: packagesData,
        error: packagesError,
      },
      {
        count: requestCountData,
        error: requestError,
      },
      {
        count: availabilityCountData,
        error: availabilityError,
      },
    ] = await Promise.all([
      supabase
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
        .order('day_of_week', {
          ascending: true,
        })
        .order('start_time', {
          ascending: true,
        }),

      supabase
        .from('student_packages')
        .select(`
          id,
          schedule_id,
          student_id,
          program_id,
          status,
          payment_status
        `),

      supabase
        .from('student_schedule_requests')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('status', 'pending'),

      supabase
        .from('coach_availability')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('status', 'active'),
    ])

    if (schedulesError) {
      setError(schedulesError.message)
      setLoading(false)
      return
    }

    if (packagesError) {
      setError(packagesError.message)
      setLoading(false)
      return
    }

    if (requestError) {
      setError(requestError.message)
      setLoading(false)
      return
    }

    if (availabilityError) {
      setError(availabilityError.message)
      setLoading(false)
      return
    }

    setSchedules(schedulesData || [])
    setPackages(packagesData || [])
    setRequestCount(requestCountData || 0)
    setAvailabilityCount(
      availabilityCountData || 0
    )

    setLoading(false)
  }

  useEffect(() => {
    loadSchedulesOverview()
  }, [])

  function getStudentName(scheduleItem) {
    return (
      scheduleItem.students?.profiles?.display_name ||
      'Unnamed Student'
    )
  }

  function getCoachName(scheduleItem) {
    return (
      scheduleItem.coaches?.profiles?.display_name ||
      'Unnamed Coach'
    )
  }

  function getDayLabel(dayOfWeek) {
    return DAYS[Number(dayOfWeek)] || 'Unknown'
  }

  function formatTime(time) {
    return time?.slice(0, 5) || '—'
  }

  function getProgramLabel(scheduleItem) {
    const program = scheduleItem.programs

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
      typeLabel[program.type] || program.type,
      modeLabel[program.mode] || program.mode,
    ]

    if (
      program.location &&
      program.type !== 'SCHOOL'
    ) {
      parts.push(
        locationLabel[program.location] ||
          program.location
      )
    }

    if (program.duration) {
      parts.push(`${program.duration} min`)
    }

    return parts.join(' · ')
  }

  function hasGeneratedPackage(scheduleItem) {
    return packages.some(
      (packageItem) =>
        packageItem.schedule_id === scheduleItem.id
    )
  }

  async function handleGenerateSessions(scheduleItem) {
    setActionLoading(scheduleItem.id)
    setError('')

    const { error: generateError } =
      await supabase.rpc(
        'admin_generate_package',
        {
          p_schedule_id: scheduleItem.id,
        }
      )

    if (generateError) {
      console.error(
        'Generate package error:',
        generateError
      )

      setError(generateError.message)
      setActionLoading(null)
      return
    }

    await loadSchedulesOverview()

    setActionLoading(null)
  }

  function openSuspendModal(scheduleItem) {
    setSelectedSchedule(scheduleItem)
    setSuspendModalOpen(true)
  }

  function closeSuspendModal() {
    if (actionLoading) {
      return
    }

    setSuspendModalOpen(false)
    setSelectedSchedule(null)
  }

  async function handleSuspend() {
    if (!selectedSchedule) {
      return
    }

    setActionLoading(selectedSchedule.id)
    setError('')

    const { error: suspendError } =
      await supabase.rpc(
        'admin_suspend_schedule',
        {
          p_schedule_id: selectedSchedule.id,
        }
      )

    if (suspendError) {
      console.error(
        'Suspend schedule error:',
        suspendError
      )

      setError(suspendError.message)
      setActionLoading(null)
      return
    }

    setSuspendModalOpen(false)
    setSelectedSchedule(null)

    await loadSchedulesOverview()

    setActionLoading(null)
  }

  async function handleAction(action, scheduleItem) {
    if (action === 'resume') {
      setActionLoading(scheduleItem.id)
      setError('')

      const { error: resumeError } =
        await supabase.rpc(
          'admin_resume_schedule',
          {
            p_schedule_id: scheduleItem.id,
          }
        )

      if (resumeError) {
        console.error(
          'Resume schedule error:',
          resumeError
        )

        setError(resumeError.message)
        setActionLoading(null)
        return
      }

      await loadSchedulesOverview()

      setActionLoading(null)
      return
    }

    console.log(
      `Schedule action: ${action}`,
      scheduleItem
    )
  }

  function viewSessions(scheduleItem) {
    window.location.href =
      `/schedules/${scheduleItem.id}/sessions`
  }

  function renderActions(scheduleItem) {
    const generated =
      hasGeneratedPackage(scheduleItem)

    const isLoading =
      actionLoading === scheduleItem.id

    if (scheduleItem.status === 'suspended') {
      return (
        <div className="form-actions schedule-actions">
          <button
            className="btn btn-secondary"
            onClick={() =>
              handleAction(
                'resume',
                scheduleItem
              )
            }
            disabled={isLoading}
          >
            {isLoading
              ? 'Resuming...'
              : 'Resume'}
          </button>

          <button
            className="btn btn-secondary"
            onClick={() =>
              handleAction(
                'cancel',
                scheduleItem
              )
            }
            disabled={isLoading}
          >
            Cancel
          </button>

          {generated && (
            <button
              className="btn btn-primary"
              onClick={() =>
                viewSessions(scheduleItem)
              }
              disabled={isLoading}
            >
              View Sessions
            </button>
          )}
        </div>
      )
    }

    if (!generated) {
      return (
        <div className="form-actions schedule-actions">
          <button
            className="btn btn-primary"
            onClick={() =>
              handleGenerateSessions(
                scheduleItem
              )
            }
            disabled={isLoading}
          >
            {isLoading
              ? 'Generating...'
              : 'Generate Sessions'}
          </button>

          <button
            className="btn btn-secondary"
            onClick={() =>
              handleAction(
                'cancel',
                scheduleItem
              )
            }
            disabled={isLoading}
          >
            Cancel
          </button>
        </div>
      )
    }

    return (
      <div className="form-actions schedule-actions">
        <button
          className="btn btn-primary"
          onClick={() =>
            handleAction(
              'renew',
              scheduleItem
            )
          }
          disabled={isLoading}
        >
          Renew
        </button>

        <button
          className="btn btn-secondary"
          onClick={() =>
            openSuspendModal(scheduleItem)
          }
          disabled={isLoading}
        >
          Suspend
        </button>

        <button
          className="btn btn-secondary"
          onClick={() =>
            handleAction(
              'cancel',
              scheduleItem
            )
          }
          disabled={isLoading}
        >
          Cancel
        </button>

        <button
          className="btn btn-secondary"
          onClick={() =>
            viewSessions(scheduleItem)
          }
          disabled={isLoading}
        >
          View Sessions
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="academy-app">
        <AcademyHeader />

        <div className="page-state">
          Loading schedules...
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

  return (
    <div className="academy-app">
      <AcademyHeader />

      <main className="academy-main">
        <div className="page-header">
          <div className="page-header-copy">
            <h1>Schedules</h1>

            <p>
              Manage and view the Academy teaching
              schedules
            </p>
          </div>
        </div>

        {/* Schedule Management */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(2, minmax(0, 1fr))',
            gap: '20px',
            marginBottom: '24px',
          }}
        >
          {/* Coach Availability */}
          <div
            className="card"
            style={{
              textAlign: 'center',
              padding: '24px',
            }}
          >
            <div className="form-header">
              <h2>Coach Availability</h2>

              <p>
                Manage recurring times when coaches are
                available for scheduling.
              </p>
            </div>

            <p>
              <strong>{availabilityCount}</strong>{' '}
              active availability ranges
            </p>

            <div
              className="form-actions"
              style={{
                justifyContent: 'center',
              }}
            >
              <button
                className="btn btn-primary"
                onClick={() => {
                  window.location.href =
                    '/schedules/availability'
                }}
              >
                Manage Availability
              </button>
            </div>
          </div>

          {/* Schedule Requests */}
          <div
            className="card"
            style={{
              textAlign: 'center',
              padding: '24px',
            }}
          >
            <div className="form-header">
              <h2>Schedule Requests</h2>

              <p>
                Review schedule requests submitted by
                students.
              </p>
            </div>

            <p>
              <strong>{requestCount}</strong>{' '}
              pending requests
            </p>

            <div
              className="form-actions"
              style={{
                justifyContent: 'center',
              }}
            >
              <button
                className="btn btn-primary"
                onClick={() => {
                  window.location.href =
                    '/schedules/requests'
                }}
              >
                View Requests
              </button>
            </div>
          </div>
        </div>

        {/* Schedules */}
        <div className="card table-card">
          <div
            className="form-header"
            style={{
              padding: '24px 24px 16px',
              margin: 0,
              textAlign: 'center',
            }}
          >
            <h2>Schedules</h2>

            <p>
              Approved recurring student schedules
            </p>
          </div>

          {schedules.length === 0 ? (
            <div
              className="empty-state"
              style={{
                padding: '24px',
              }}
            >
              No schedules found.
            </div>
          ) : (
            <div className="table-scroll">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Time</th>
                    <th>Student</th>
                    <th>Coach</th>
                    <th>Program</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {schedules.map((scheduleItem) => (
                    <tr key={scheduleItem.id}>
                      <td>
                        {getDayLabel(
                          scheduleItem.day_of_week
                        )}
                      </td>

                      <td>
                        {formatTime(
                          scheduleItem.start_time
                        )}
                        {'–'}
                        {formatTime(
                          scheduleItem.end_time
                        )}
                      </td>

                      <td>
                        {getStudentName(scheduleItem)}
                      </td>

                      <td>
                        {getCoachName(scheduleItem)}
                      </td>

                      <td>
                        {getProgramLabel(
                          scheduleItem
                        )}
                      </td>

                      <td>
                        <span
                          className={`status-badge ${
                            scheduleItem.status ===
                            'suspended'
                              ? 'status-inactive'
                              : 'status-active'
                          }`}
                        >
                          {scheduleItem.status ===
                          'suspended'
                            ? 'Suspended'
                            : 'Active'}
                        </span>
                      </td>

                      <td>
                        {renderActions(
                          scheduleItem
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Suspend Confirmation Modal */}
      {suspendModalOpen &&
        selectedSchedule && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px',
            }}
          >
            <div
              className="card"
              style={{
                width: '100%',
                maxWidth: '480px',
                padding: '28px',
              }}
            >
              <div className="form-header">
                <h2>Suspend Schedule?</h2>

                <p>
                  This will suspend the recurring
                  schedule and put future scheduled
                  sessions on hold.
                </p>
              </div>

              <div
                style={{
                  background:
                    'var(--background-secondary)',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '24px',
                }}
              >
                <strong>
                  {getStudentName(
                    selectedSchedule
                  )}
                </strong>

                <div
                  style={{
                    marginTop: '6px',
                  }}
                >
                  {getDayLabel(
                    selectedSchedule.day_of_week
                  )}{' '}
                  ·{' '}
                  {formatTime(
                    selectedSchedule.start_time
                  )}
                  {'–'}
                  {formatTime(
                    selectedSchedule.end_time
                  )}
                </div>

                <div
                  style={{
                    marginTop: '6px',
                  }}
                >
                  {getCoachName(
                    selectedSchedule
                  )}
                </div>
              </div>

              <div
                className="form-actions"
                style={{
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  className="btn btn-secondary"
                  onClick={closeSuspendModal}
                  disabled={
                    actionLoading ===
                    selectedSchedule.id
                  }
                >
                  Keep Active
                </button>

                <button
                  className="btn btn-primary"
                  onClick={handleSuspend}
                  disabled={
                    actionLoading ===
                    selectedSchedule.id
                  }
                >
                  {actionLoading ===
                  selectedSchedule.id
                    ? 'Suspending...'
                    : 'Suspend Schedule'}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

export default Schedules
