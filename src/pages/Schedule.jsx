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

function Schedule() {
  const [loading, setLoading] = useState(true)
  const [schedules, setSchedules] = useState([])
  const [requestCount, setRequestCount] = useState(0)
  const [availabilityCount, setAvailabilityCount] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadScheduleOverview() {
      setLoading(true)
      setError('')

      const [
        { data: scheduleData, error: scheduleError },
        { count: requestCountData, error: requestError },
        { count: availabilityCountData, error: availabilityError },
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
            students (
              profiles (
                display_name
              )
            ),
            coaches (
              profiles (
                display_name
              )
            )
          `)
          .order('day_of_week', { ascending: true })
          .order('start_time', { ascending: true }),

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

      if (scheduleError) {
        setError(scheduleError.message)
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

      setSchedules(scheduleData || [])
      setRequestCount(requestCountData || 0)
      setAvailabilityCount(availabilityCountData || 0)

      setLoading(false)
    }

    loadScheduleOverview()
  }, [])

  function getStudentName(schedule) {
    return (
      schedule.students?.profiles?.display_name ||
      'Unnamed Student'
    )
  }

  function getCoachName(schedule) {
    return (
      schedule.coaches?.profiles?.display_name ||
      'Unnamed Coach'
    )
  }

  function getDayLabel(dayOfWeek) {
    return DAYS[Number(dayOfWeek)] || 'Unknown'
  }

  function formatTime(time) {
    return time?.slice(0, 5) || '—'
  }

  if (loading) {
    return (
      <div className="academy-app">
        <AcademyHeader />
        <div className="page-state">
          Loading schedule...
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
            <h1>Schedule</h1>
            <p>
              Manage and view the Academy teaching schedule
            </p>
          </div>
        </div>

        {/* Upcoming Schedules */}
        <div className="card table-card">
          <div
            className="form-header"
            style={{
              padding: '24px 24px 16px',
              margin: 0,
            }}
          >
            <h2>Upcoming Schedules</h2>
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
                    <th>Timezone</th>
                  </tr>
                </thead>

                <tbody>
                  {schedules.map((schedule) => (
                    <tr key={schedule.id}>
                      <td>
                        {getDayLabel(
                          schedule.day_of_week
                        )}
                      </td>

                      <td>
                        {formatTime(schedule.start_time)}
                        {'–'}
                        {formatTime(schedule.end_time)}
                      </td>

                      <td>
                        {getStudentName(schedule)}
                      </td>

                      <td>
                        {getCoachName(schedule)}
                      </td>

                      <td>
                        {schedule.timezone}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Schedule Management */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(2, minmax(0, 1fr))',
            gap: '20px',
            marginTop: '24px',
          }}
        >
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

            <div className="form-actions">
              <button
                className="btn btn-primary"
                onClick={() => {
                  window.location.href =
                    '/schedule/availability'
                }}
              >
                Manage Availability
              </button>
            </div>
          </div>

          <div
            className="card"
            style={{
              textAlign: 'center',
              padding: '24px',
            }}
          >
            <div className="form-header">
              <h2>Student Requests</h2>

              <p>
                Review schedule requests submitted by
                students.
              </p>
            </div>

            <p>
              <strong>{requestCount}</strong>{' '}
              pending requests
            </p>

            <div className="form-actions">
              <button
                className="btn btn-primary"
                onClick={() => {
                  window.location.href =
                    '/schedule/requests'
                }}
              >
                View Requests
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Schedule
