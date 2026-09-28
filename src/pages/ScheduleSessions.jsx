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
const [actionLoading, setActionLoading] = useState(null)

const [schedule, setSchedule] = useState(null)
const [packages, setPackages] = useState([])
const [sessions, setSessions] = useState([])

const [error, setError] = useState('')

const [rescheduleSession, setRescheduleSession] =
useState(null)

const [availability, setAvailability] =
useState([])

const [availabilityLoading, setAvailabilityLoading] =
useState(false)

const [rescheduleDate, setRescheduleDate] =
useState('')

const [rescheduleTime, setRescheduleTime] =
useState('')

const scheduleId =
window.location.pathname.split('/')[2]

async function loadScheduleSessions() {
setLoading(true)
setError('')


/* =========================
   SCHEDULE
========================= */

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
  .eq('schedule_id', scheduleId)
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

useEffect(() => {
loadScheduleSessions()
}, [scheduleId])

/* =========================
SESSION ACTIONS
========================= */

async function handleCompleteSession(session) {
setActionLoading(session.id)
setError('')


const {
  error: completeError,
} = await supabase.rpc(
  'admin_complete_session',
  {
    p_session_id: session.id,
  }
)

if (completeError) {
  setError(completeError.message)
  setActionLoading(null)
  return
}

await loadScheduleSessions()
setActionLoading(null)


}

async function handleForfeitSession(session) {
const confirmed = window.confirm(
'Forfeit this session?\n\nThis session will be marked as used and will not be rescheduled.'
)


if (!confirmed) {
  return
}

setActionLoading(session.id)
setError('')

const {
  error: forfeitError,
} = await supabase.rpc(
  'admin_forfeit_session',
  {
    p_session_id: session.id,
  }
)

if (forfeitError) {
  setError(forfeitError.message)
  setActionLoading(null)
  return
}

await loadScheduleSessions()
setActionLoading(null)


}

/* =========================
RESCHEDULE
========================= */

async function handleOpenReschedule(session) {
setError('')
setRescheduleSession(session)
setAvailability([])
setRescheduleDate('')
setRescheduleTime('')
setAvailabilityLoading(true)


const {
  data,
  error: availabilityError,
} = await supabase.rpc(
  'get_actual_availability',
  {
    p_coach_id: schedule.coach_id,
    p_program_id: schedule.program_id,
    p_start_date: session.session_date,
  }
)

if (availabilityError) {
  setError(availabilityError.message)
  setAvailabilityLoading(false)
  return
}

setAvailability(data || [])
setAvailabilityLoading(false)


}

function handleCancelReschedule() {
if (actionLoading) {
return
}


setRescheduleSession(null)
setAvailability([])
setRescheduleDate('')
setRescheduleTime('')
setError('')


}

async function handleReschedule() {
if (!rescheduleSession) {
return
}


if (!rescheduleDate || !rescheduleTime) {
  setError(
    'Please select a new date and time.'
  )
  return
}

const confirmed = window.confirm(
  `Reschedule this session to ${formatDate(
    rescheduleDate
  )} at ${formatTime(rescheduleTime)}?`
)

if (!confirmed) {
  return
}

setActionLoading(
  rescheduleSession.id
)
setError('')

const {
  error: rescheduleError,
} = await supabase.rpc(
  'admin_reschedule_session',
  {
    p_session_id:
      rescheduleSession.id,
    p_new_date:
      rescheduleDate,
    p_new_start_time:
      rescheduleTime,
  }
)

if (rescheduleError) {
  setError(
    rescheduleError.message
  )
  setActionLoading(null)
  return
}

setRescheduleSession(null)
setAvailability([])
setRescheduleDate('')
setRescheduleTime('')

await loadScheduleSessions()

setActionLoading(null)


}

/* =========================
HELPERS
========================= */

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

function getUsedSessionCount(packageSessions) {
return packageSessions.filter(
(session) =>
session.status === 'completed' ||
session.status === 'cancelled'
).length
}

function getStatusClass(status) {
if (status === 'scheduled') {
return 'status-active'
}


if (status === 'completed') {
  return 'status-active'
}

if (
  status === 'cancelled' ||
  status === 'canceled'
) {
  return 'status-inactive'
}

return ''


}

function getAvailableDates() {
const dates = []


for (const slot of availability) {
  if (!dates.includes(slot.slot_date)) {
    dates.push(slot.slot_date)
  }
}

return dates


}

function getAvailableTimesForDate(date) {
return availability.filter(
(slot) =>
slot.slot_date === date
)
}

/* =========================
LOADING
========================= */

if (loading) {
return ( <div className="academy-app"> <AcademyHeader />


    <div className="page-state">
      Loading sessions...
    </div>
  </div>
)


}

/* =========================
ERROR
========================= */

if (error && !rescheduleSession) {
return ( <div className="academy-app"> <AcademyHeader />


    <main className="academy-main">
      <div className="error-box">
        {error}
      </div>
    </main>
  </div>
)


}

/* =========================
NOT FOUND
========================= */

if (!schedule) {
return ( <div className="academy-app"> <AcademyHeader />


    <main className="academy-main">
      <div className="empty-state">
        Schedule not found.
      </div>
    </main>
  </div>
)


}

/* =========================
PAGE
========================= */

return ( <div className="academy-app"> <AcademyHeader />


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

    {/* =========================
        SCHEDULE SUMMARY
    ========================= */}

    <div className="card detail-card">
      <div className="detail-card-header">
        <h2 className="detail-card-title">
          Schedule
        </h2>
      </div>

      <div className="detail-grid">
        <div>
          <div className="detail-label">
            Student
          </div>

          <div className="detail-value detail-value-strong">
            {getStudentName()}
          </div>
        </div>

        <div>
          <div className="detail-label">
            Coach
          </div>

          <div className="detail-value detail-value-strong">
            {getCoachName()}
          </div>
        </div>

        <div>
          <div className="detail-label">
            Program
          </div>

          <div className="detail-value">
            {getProgramLabel()}
          </div>
        </div>

        <div>
          <div className="detail-label">
            Recurring Time
          </div>

          <div className="detail-value">
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
          <div className="detail-label">
            Timezone
          </div>

          <div className="detail-value">
            {schedule.timezone}
          </div>
        </div>

        <div>
          <div className="detail-label">
            Schedule Status
          </div>

          <div className="detail-value">
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

    {/* =========================
        PACKAGES
    ========================= */}

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

          const usedSessionCount =
            getUsedSessionCount(
              packageSessions
            )

          return (
            <div
              className="card schedule-package"
              key={packageItem.id}
            >
              {/* Package Header */}

              <div className="schedule-package-header">
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

              {/* Package Body */}

              <div className="schedule-package-body">
                {/* Package Metadata */}

                <div className="schedule-package-meta">
                  <div className="schedule-package-meta-item">
                    <div className="detail-label">
                      Package Status
                    </div>

                    <div>
                      <span
                        className={`status-badge ${
                          packageItem.status ===
                          'suspended'
                            ? 'status-inactive'
                            : packageItem.status ===
                                'finished'
                              ? 'status-inactive'
                              : 'status-active'
                        }`}
                      >
                        {packageItem.status}
                      </span>
                    </div>
                  </div>

                  <div className="schedule-package-meta-item">
                    <div className="detail-label">
                      Payment
                    </div>

                    <div>
                      <span
                        className={`status-badge ${
                          packageItem.payment_status ===
                          'paid'
                            ? 'status-active'
                            : packageItem.payment_status ===
                                'cancelled'
                              ? 'status-inactive'
                              : ''
                        }`}
                      >
                        {
                          packageItem.payment_status
                        }
                      </span>
                    </div>
                  </div>

                  <div className="schedule-package-meta-item">
                    <div className="detail-label">
                      Sessions used
                    </div>

                    <div className="detail-value">
                      {usedSessionCount} / 4
                    </div>
                  </div>
                </div>

                {/* Sessions */}

                <div className="schedule-package-sessions">
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
                            <th>Actions</th>
                          </tr>
                        </thead>

                        <tbody>
                          {packageSessions.map(
                            (
                              session,
                              sessionIndex
                            ) => {
                              const isActionLoading =
                                actionLoading ===
                                session.id

                              const isRescheduling =
                                rescheduleSession?.id ===
                                session.id

                              return (
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

                                  <td>
                                    {session.status ===
                                    'scheduled' ? (
                                      <div className="schedule-actions">
                                        <button
                                          className="btn btn-secondary"
                                          disabled={
                                            isActionLoading ||
                                            rescheduleSession !==
                                              null
                                          }
                                          onClick={() =>
                                            handleCompleteSession(
                                              session
                                            )
                                          }
                                        >
                                          {isActionLoading &&
                                          !isRescheduling
                                            ? 'Working...'
                                            : 'Complete'}
                                        </button>

                                        <button
                                          className="btn btn-ghost"
                                          disabled={
                                            isActionLoading ||
                                            rescheduleSession !==
                                              null
                                          }
                                          onClick={() =>
                                            handleForfeitSession(
                                              session
                                            )
                                          }
                                        >
                                          Forfeit
                                        </button>

                                        <button
                                          className="btn btn-ghost"
                                          disabled={
                                            isActionLoading ||
                                            rescheduleSession !==
                                              null
                                          }
                                          onClick={() =>
                                            handleOpenReschedule(
                                              session
                                            )
                                          }
                                        >
                                          Reschedule
                                        </button>

                                        {isRescheduling && (
                                          <div
                                            style={{
                                              marginTop:
                                                '12px',
                                              minWidth:
                                                '280px',
                                            }}
                                          >
                                            {availabilityLoading ? (
                                              <div className="detail-value">
                                                Finding available slots...
                                              </div>
                                            ) : (
                                              <>
                                                <div
                                                  style={{
                                                    display:
                                                      'grid',
                                                    gap: '8px',
                                                  }}
                                                >
                                                  <select
                                                    className="form-input"
                                                    value={
                                                      rescheduleDate
                                                    }
                                                    onChange={(
                                                      event
                                                    ) => {
                                                      setRescheduleDate(
                                                        event
                                                          .target
                                                          .value
                                                      )
                                                      setRescheduleTime(
                                                        ''
                                                      )
                                                    }}
                                                  >
                                                    <option value="">
                                                      Select date
                                                    </option>

                                                    {getAvailableDates().map(
                                                      (
                                                        date
                                                      ) => (
                                                        <option
                                                          key={
                                                            date
                                                          }
                                                          value={
                                                            date
                                                          }
                                                        >
                                                          {formatDate(
                                                            date
                                                          )}
                                                        </option>
                                                      )
                                                    )}
                                                  </select>

                                                  <select
                                                    className="form-input"
                                                    value={
                                                      rescheduleTime
                                                    }
                                                    disabled={
                                                      !rescheduleDate
                                                    }
                                                    onChange={(
                                                      event
                                                    ) =>
                                                      setRescheduleTime(
                                                        event
                                                          .target
                                                          .value
                                                      )
                                                    }
                                                  >
                                                    <option value="">
                                                      Select time
                                                    </option>

                                                    {getAvailableTimesForDate(
                                                      rescheduleDate
                                                    ).map(
                                                      (
                                                        slot
                                                      ) => (
                                                        <option
                                                          key={`${slot.slot_date}-${slot.start_time}`}
                                                          value={
                                                            slot.start_time
                                                          }
                                                        >
                                                          {formatTime(
                                                            slot.start_time
                                                          )}
                                                          {'–'}
                                                          {formatTime(
                                                            slot.end_time
                                                          )}
                                                        </option>
                                                      )
                                                    )}
                                                  </select>
                                                </div>

                                                {availability.length ===
                                                  0 && (
                                                  <div
                                                    className="detail-value"
                                                    style={{
                                                      marginTop:
                                                        '8px',
                                                    }}
                                                  >
                                                    No available slots found in the next 14 days.
                                                  </div>
                                                )}

                                                <div
                                                  className="schedule-actions"
                                                  style={{
                                                    marginTop:
                                                      '10px',
                                                  }}
                                                >
                                                  <button
                                                    className="btn btn-secondary"
                                                    disabled={
                                                      !rescheduleDate ||
                                                      !rescheduleTime ||
                                                      isActionLoading
                                                    }
                                                    onClick={
                                                      handleReschedule
                                                    }
                                                  >
                                                    {isActionLoading
                                                      ? 'Working...'
                                                      : 'Confirm Reschedule'}
                                                  </button>

                                                  <button
                                                    className="btn btn-ghost"
                                                    disabled={
                                                      isActionLoading
                                                    }
                                                    onClick={
                                                      handleCancelReschedule
                                                    }
                                                  >
                                                    Close
                                                  </button>
                                                </div>

                                                {error && (
                                                  <div
                                                    className="error-box"
                                                    style={{
                                                      marginTop:
                                                        '10px',
                                                    }}
                                                  >
                                                    {error}
                                                  </div>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        )}
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
              </div>
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
