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
  const [actionLoading, setActionLoading] =
    useState(null)

  const [schedules, setSchedules] = useState([])
  const [packages, setPackages] = useState([])
  const [sessions, setSessions] = useState([])

  const [error, setError] = useState('')

  const [suspendSchedule, setSuspendSchedule] =
    useState(null)

  const [cancelSchedule, setCancelSchedule] =
    useState(null)

  async function loadSchedulesOverview() {
    setLoading(true)
    setError('')

    /* =========================
       SCHEDULES
    ========================= */

    const {
      data: schedulesData,
      error: schedulesError,
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
      .order('id', {
        ascending: true,
      })

    if (schedulesError) {
      setError(schedulesError.message)
      setLoading(false)
      return
    }

    /* =========================
       PACKAGES
    ========================= */

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
      .order('created_at', {
        ascending: true,
      })

    if (packagesError) {
      setError(packagesError.message)
      setLoading(false)
      return
    }

    /* =========================
       SESSIONS
    ========================= */

    const {
      data: sessionsData,
      error: sessionsError,
    } = await supabase
      .from('class_sessions')
      .select(`
        id,
        package_id,
        status,
        session_date
      `)

    if (sessionsError) {
      setError(sessionsError.message)
      setLoading(false)
      return
    }

    setSchedules(schedulesData || [])
    setPackages(packagesData || [])
    setSessions(sessionsData || [])
    setLoading(false)
  }

  useEffect(() => {
    loadSchedulesOverview()
  }, [])

  /* =========================
     HELPERS
  ========================= */

  function getStudentName(schedule) {
    return (
      schedule?.students?.profiles
        ?.display_name ||
      'Unnamed Student'
    )
  }

  function getCoachName(schedule) {
    return (
      schedule?.coaches?.profiles
        ?.display_name ||
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

  function getProgramLabel(schedule) {
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

  function getSchedulePackages(scheduleId) {
    return packages.filter(
      (packageItem) =>
        packageItem.schedule_id === scheduleId
    )
  }

  function getCompletedSessionCount(
    scheduleItem
  ) {
    /*
      Count completed sessions belonging
      to the current ongoing package.

      This is important after renewal:
      old completed packages should not make
      Renew immediately available again.
    */

    const currentPackage = packages
      .filter(
        (packageItem) =>
          packageItem.schedule_id ===
            scheduleItem.id &&
          packageItem.status === 'ongoing'
      )
      .sort(
        (a, b) =>
          new Date(b.purchased_at) -
          new Date(a.purchased_at)
      )[0]

    if (!currentPackage) {
      return 0
    }

    return sessions.filter(
      (sessionItem) =>
        sessionItem.package_id ===
          currentPackage.id &&
        sessionItem.status === 'completed'
    ).length
  }

  function getStatusClass(status) {
    if (
      status === 'active' ||
      status === 'ongoing' ||
      status === 'paid'
    ) {
      return 'status-active'
    }

    if (
      status === 'suspended' ||
      status === 'cancelled' ||
      status === 'completed' ||
      status === 'pending'
    ) {
      return 'status-inactive'
    }

    return ''
  }

  /* =========================
     GENERATE
  ========================= */

  async function handleGenerate(scheduleItem) {
    setActionLoading(scheduleItem.id)
    setError('')

    const {
      error: generateError,
    } = await supabase.rpc(
      'admin_generate_package',
      {
        p_schedule_id:
          scheduleItem.id,
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

  /* =========================
     RENEW
  ========================= */

  async function handleRenew(scheduleItem) {
    setActionLoading(scheduleItem.id)
    setError('')

    const {
      error: renewError,
    } = await supabase.rpc(
      'admin_renew_package',
      {
        p_schedule_id:
          scheduleItem.id,
      }
    )

    if (renewError) {
      console.error(
        'Renew package error:',
        renewError
      )

      setError(renewError.message)
      setActionLoading(null)
      return
    }

    await loadSchedulesOverview()

    setActionLoading(null)
  }

  /* =========================
     SUSPEND
  ========================= */

  async function handleSuspend() {
    if (!suspendSchedule) {
      return
    }

    setActionLoading(
      suspendSchedule.id
    )
    setError('')

    const {
      error: suspendError,
    } = await supabase.rpc(
      'admin_suspend_schedule',
      {
        p_schedule_id:
          suspendSchedule.id,
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

    setSuspendSchedule(null)

    await loadSchedulesOverview()

    setActionLoading(null)
  }

  /* =========================
     RESUME
  ========================= */

  async function handleResume(scheduleItem) {
    setActionLoading(scheduleItem.id)
    setError('')

    const {
      error: resumeError,
    } = await supabase.rpc(
      'admin_resume_schedule',
      {
        p_schedule_id:
          scheduleItem.id,
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
  }

  /* =========================
     CANCEL
  ========================= */

  async function handleCancel() {
    if (!cancelSchedule) {
      return
    }

    setActionLoading(
      cancelSchedule.id
    )
    setError('')

    const {
      error: cancelError,
    } = await supabase.rpc(
      'admin_cancel_schedule',
      {
        p_schedule_id:
          cancelSchedule.id,
      }
    )

    if (cancelError) {
      console.error(
        'Cancel schedule error:',
        cancelError
      )

      setError(cancelError.message)
      setActionLoading(null)
      return
    }

    setCancelSchedule(null)

    await loadSchedulesOverview()

    setActionLoading(null)
  }

  /* =========================
     ACTIONS
  ========================= */

  function renderActions(scheduleItem) {
    const isLoading =
      actionLoading === scheduleItem.id

    const schedulePackages =
      getSchedulePackages(
        scheduleItem.id
      )

    const hasPackage =
      schedulePackages.length > 0

    const completedSessions =
      getCompletedSessionCount(
        scheduleItem
      )

    if (
      scheduleItem.status ===
      'cancelled'
    ) {
      return (
        <div className="schedule-actions">
          <button
            className="btn btn-ghost"
            onClick={() =>
              window.location.href =
                `/schedules/${scheduleItem.id}/sessions`
            }
          >
            View Sessions
          </button>
        </div>
      )
    }

    if (
      scheduleItem.status ===
      'suspended'
    ) {
      return (
        <div className="schedule-actions">
          {/* Resume */}

          <button
            className="btn btn-secondary"
            disabled={isLoading}
            onClick={() =>
              handleResume(
                scheduleItem
              )
            }
          >
            {isLoading
              ? 'Working...'
              : 'Resume'}
          </button>

          {/* Cancel */}

          <button
            className="btn btn-ghost"
            disabled={isLoading}
            onClick={() =>
              setCancelSchedule(
                scheduleItem
              )
            }
          >
            Cancel
          </button>

          {/* View Sessions */}

          <button
            className="btn btn-ghost"
            disabled={isLoading}
            onClick={() =>
              window.location.href =
                `/schedules/${scheduleItem.id}/sessions`
            }
          >
            View Sessions
          </button>
        </div>
      )
    }

    if (!hasPackage) {
      return (
        <div className="schedule-actions">
          {/* Generate */}

          <button
            className="btn btn-secondary"
            disabled={isLoading}
            onClick={() =>
              handleGenerate(
                scheduleItem
              )
            }
          >
            {isLoading
              ? 'Generating...'
              : 'Generate Sessions'}
          </button>

          {/* Cancel */}

          <button
            className="btn btn-ghost"
            disabled={isLoading}
            onClick={() =>
              setCancelSchedule(
                scheduleItem
              )
            }
          >
            Cancel
          </button>
        </div>
      )
    }

    return (
      <div className="schedule-actions">
        {/* Renew */}

        <button
          className="btn btn-secondary"
          disabled={
            isLoading ||
            completedSessions < 4
          }
          title={
            completedSessions < 4
              ? 'Available after 4 sessions are completed'
              : 'Renew package'
          }
          onClick={() =>
            handleRenew(
              scheduleItem
            )
          }
        >
          {isLoading
            ? 'Renewing...'
            : 'Renew'}
        </button>

        {/* Suspend */}

        <button
          className="btn btn-ghost"
          disabled={isLoading}
          onClick={() =>
            setSuspendSchedule(
              scheduleItem
            )
          }
        >
          Suspend
        </button>

        {/* Cancel */}

        <button
          className="btn btn-ghost"
          disabled={isLoading}
          onClick={() =>
            setCancelSchedule(
              scheduleItem
            )
          }
        >
          Cancel
        </button>

        {/* View Sessions */}

        <button
          className="btn btn-ghost"
          disabled={isLoading}
          onClick={() =>
            window.location.href =
              `/schedules/${scheduleItem.id}/sessions`
          }
        >
          View Sessions
        </button>
      </div>
    )
  }

  /* =========================
     LOADING
  ========================= */

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

  /* =========================
     ERROR
  ========================= */

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

  /* =========================
     PAGE
  ========================= */

  return (
    <div className="academy-app">
      <AcademyHeader />

      <main className="academy-main">
        <div className="page-header">
          <div className="page-header-copy">
            <h1>Schedules</h1>

            <p>
              Manage recurring student
              schedules and generated
              sessions
            </p>
          </div>
        </div>

        {schedules.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              No schedules found.
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="table-scroll">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Coach</th>
                    <th>Program</th>
                    <th>Recurring Time</th>
                    <th>Status</th>
                    <th>Sessions</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {schedules.map(
                    (scheduleItem) => {
                      const schedulePackages =
                        getSchedulePackages(
                          scheduleItem.id
                        )

                      const completedSessions =
                        getCompletedSessionCount(
                          scheduleItem
                        )

                      return (
                        <tr
                          key={
                            scheduleItem.id
                          }
                        >
                          <td>
                            <div className="detail-value-strong">
                              {getStudentName(
                                scheduleItem
                              )}
                            </div>
                          </td>

                          <td>
                            {getCoachName(
                              scheduleItem
                            )}
                          </td>

                          <td>
                            {getProgramLabel(
                              scheduleItem
                            )}
                          </td>

                          <td>
                            {getDayLabel(
                              scheduleItem.day_of_week
                            )}
                            {' · '}
                            {formatTime(
                              scheduleItem.start_time
                            )}
                            {'–'}
                            {formatTime(
                              scheduleItem.end_time
                            )}
                          </td>

                          <td>
                            <span
                              className={`status-badge ${
                                scheduleItem.status ===
                                'active'
                                  ? 'status-active'
                                  : 'status-inactive'
                              }`}
                            >
                              {
                                scheduleItem.status
                              }
                            </span>
                          </td>

                          <td>
                            {schedulePackages.length ===
                            0 ? (
                              'None'
                            ) : (
                              <div>
                                <div>
                                  {
                                    schedulePackages.length
                                  }{' '}
                                  package
                                  {schedulePackages.length !==
                                  1
                                    ? 's'
                                    : ''}
                                </div>

                                {scheduleItem.status ===
                                  'active' && (
                                  <div
                                    className="detail-value"
                                    style={{
                                      marginTop:
                                        '4px',
                                    }}
                                  >
                                    {
                                      completedSessions
                                    }{' '}
                                    completed
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          <td>
                            {renderActions(
                              scheduleItem
                            )}
                          </td>
                        </tr>
                      )
                    }
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* =========================
          SUSPEND MODAL
      ========================= */}

      {suspendSchedule && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Suspend Schedule</h2>
            </div>

            <div className="modal-body">
              <p>
                Suspend the schedule for{' '}
                <strong>
                  {getStudentName(
                    suspendSchedule
                  )}
                </strong>
                ?
              </p>

              <p>
                Future scheduled sessions
                will be placed on hold.
              </p>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                disabled={
                  actionLoading ===
                  suspendSchedule.id
                }
                onClick={() =>
                  setSuspendSchedule(null)
                }
              >
                Close
              </button>

              <button
                className="btn btn-primary"
                disabled={
                  actionLoading ===
                  suspendSchedule.id
                }
                onClick={
                  handleSuspend
                }
              >
                {actionLoading ===
                suspendSchedule.id
                  ? 'Suspending...'
                  : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================
          CANCEL MODAL
      ========================= */}

      {cancelSchedule && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Cancel Schedule</h2>
            </div>

            <div className="modal-body">
              <p>
                Cancel the schedule for{' '}
                <strong>
                  {getStudentName(
                    cancelSchedule
                  )}
                </strong>
                ?
              </p>

              <p>
                This will cancel future
                sessions and finish the
                current package.
              </p>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                disabled={
                  actionLoading ===
                  cancelSchedule.id
                }
                onClick={() =>
                  setCancelSchedule(null)
                }
              >
                Close
              </button>

              <button
                className="btn btn-primary"
                disabled={
                  actionLoading ===
                  cancelSchedule.id
                }
                onClick={
                  handleCancel
                }
              >
                {actionLoading ===
                cancelSchedule.id
                  ? 'Cancelling...'
                  : 'Cancel Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Schedules
