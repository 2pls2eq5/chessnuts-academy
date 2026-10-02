import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getStudentLevelLabel } from '../utils/studentLevels';
import AcademyHeader from '../components/AcademyHeader';

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const TIMEZONES = [
  'Asia/Jakarta',
  'Asia/Makassar',
  'Asia/Jayapura',
];

function normalizeLocation(value) {
  return String(value || '').trim().toLowerCase();
}

function calculateEndTime(startTime, durationMinutes) {
  if (!startTime || !durationMinutes) {
    return '';
  }

  const [hours, minutes] = startTime.split(':').map(Number);

  const totalMinutes =
    hours * 60 + minutes + Number(durationMinutes);

  const endHours =
    Math.floor(totalMinutes / 60) % 24;

  const endMinutes = totalMinutes % 60;

  return `${String(endHours).padStart(2, '0')}:${String(
    endMinutes
  ).padStart(2, '0')}:00`;
}

function isAdjacent(startA, endA, startB, endB) {
  return endA === startB || endB === startA;
}

export default function ScheduleRequests() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [scheduleRequests, setScheduleRequests] = useState([]);
  const [students, setStudents] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [programs, setPrograms] = useState([]);

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const [locationCandidate, setLocationCandidate] = useState(null);
  const [showLocationModal, setShowLocationModal] =
    useState(false);

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
  });

  const selectedProgram = programs.find(
    (program) => program.id === form.program_id
  );

  const programLocation = normalizeLocation(
    selectedProgram?.location
  );

  const isStudentLocation =
    programLocation === 'student_location';

  const isCoachLocation =
    programLocation === 'coach_location';

  const endTime = selectedProgram
    ? calculateEndTime(
        form.start_time,
        selectedProgram.duration
      )
    : '';

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      await Promise.all([
        loadScheduleRequests(),
        loadFormData(),
      ]);
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          'Failed to load schedule requests.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadScheduleRequests() {
    const { data, error: queryError } = await supabase
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
        notes,
        status,
        student_level,
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
          name,
          type,
          mode,
          location,
          duration
        )
      `)
      .order('created_at', {
        ascending: false,
      });

    if (queryError) {
      throw queryError;
    }

    setScheduleRequests(data || []);
  }

  async function loadFormData() {
    const [
      studentsResult,
      coachesResult,
      programsResult,
    ] = await Promise.all([
      supabase
        .from('students')
        .select(`
          id,
          profiles (
            display_name
          )
        `)
        .eq('status', 'active'),

      supabase
        .from('coaches')
        .select(`
          id,
          profiles (
            display_name
          )
        `)
        .eq('status', 'active'),

      supabase
        .from('programs')
        .select(`
          id,
          name,
          type,
          mode,
          location,
          duration
        `)
        .eq('is_active', true)
        .order('name'),
    ]);

    if (studentsResult.error) {
      throw studentsResult.error;
    }

    if (coachesResult.error) {
      throw coachesResult.error;
    }

    if (programsResult.error) {
      throw programsResult.error;
    }

    setStudents(studentsResult.data || []);
    setCoaches(coachesResult.data || []);
    setPrograms(programsResult.data || []);
  }

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
    });

    setLocationCandidate(null);
    setShowLocationModal(false);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);
    setError('');
    resetForm();
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (name === 'program_id') {
      setForm((current) => ({
        ...current,
        program_id: value,
        location: '',
        maps_url: '',
      }));

      setLocationCandidate(null);
      setShowLocationModal(false);
    }
  }

  async function findAdjacentLocationCandidate() {
    if (
      !form.coach_id ||
      form.day_of_week === '' ||
      !form.start_time ||
      !endTime ||
      !form.timezone
    ) {
      return null;
    }

    const dayOfWeek = Number(form.day_of_week);

    const [
      requestsResult,
      schedulesResult,
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
          location,
          status,
          students (
            profiles (
              display_name
            )
          ),
          programs (
            name,
            type,
            mode,
            location
          )
        `)
        .eq('coach_id', form.coach_id)
        .eq('day_of_week', dayOfWeek)
        .eq('timezone', form.timezone)
        .in('status', ['pending', 'approved']),

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
          location,
          status,
          students (
            profiles (
              display_name
            )
          ),
          programs (
            name,
            type,
            mode,
            location
          )
        `)
        .eq('coach_id', form.coach_id)
        .eq('day_of_week', dayOfWeek)
        .eq('timezone', form.timezone)
        .eq('status', 'active'),
    ]);

    if (requestsResult.error) {
      throw requestsResult.error;
    }

    if (schedulesResult.error) {
      throw schedulesResult.error;
    }

    const requestCandidates = (
      requestsResult.data || []
    ).filter(
      (item) =>
        normalizeLocation(item.location) ===
        'student_location'
    );

    const scheduleCandidates = (
      schedulesResult.data || []
    ).filter(
      (item) =>
        normalizeLocation(item.location) ===
        'student_location'
    );

    const candidates = [
      ...requestCandidates.map((item) => ({
        ...item,
        source: 'request',
      })),
      ...scheduleCandidates.map((item) => ({
        ...item,
        source: 'schedule',
      })),
    ];

    return (
      candidates.find((item) =>
        isAdjacent(
          form.start_time,
          endTime,
          item.start_time,
          item.end_time
        )
      ) || null
    );
  }

  async function createScheduleRequestRpc({
    relatedRequestId = null,
    relatedScheduleId = null,
  } = {}) {
    const { data, error: rpcError } =
      await supabase.rpc(
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
          p_location: isCoachLocation
            ? 'coach_location'
            : form.location.trim() || null,
          p_maps_url: isStudentLocation
            ? form.maps_url.trim() || null
            : null,
          p_related_request_id: relatedRequestId,
          p_related_schedule_id: relatedScheduleId,
        }
      );

    if (rpcError) {
      throw rpcError;
    }

    return data;
  }

  async function submitScheduleRequest() {
    setError('');

    if (
      !form.student_id ||
      !form.coach_id ||
      !form.program_id ||
      form.day_of_week === '' ||
      !form.start_time ||
      !form.timezone
    ) {
      setError(
        'Please complete all required fields.'
      );
      return;
    }

    if (!selectedProgram) {
      setError(
        'Please select a valid program.'
      );
      return;
    }

    if (!endTime) {
      setError(
        'The selected start time cannot fit the program duration.'
      );
      return;
    }

    if (
      isStudentLocation &&
      !form.location.trim()
    ) {
      setError(
        'Location is required for Student Place programs.'
      );
      return;
    }

    setSaving(true);

    try {
      /*
       * PRIVATE + STUDENT_LOCATION:
       *
       * Check for an adjacent Student Place class.
       * If found, ask whether this is the same location.
       */
      if (
        isStudentLocation &&
        normalizeLocation(selectedProgram.type) ===
          'private'
      ) {
        const candidate =
          await findAdjacentLocationCandidate();

        if (candidate) {
          setLocationCandidate(candidate);
          setShowLocationModal(true);
          setSaving(false);
          return;
        }
      }

      await createScheduleRequestRpc();

      await loadScheduleRequests();

      setShowForm(false);
      resetForm();
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          'Failed to create schedule request.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmSameLocation() {
    if (!locationCandidate) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const relatedRequestId =
        locationCandidate.source === 'request'
          ? locationCandidate.id
          : null;

      const relatedScheduleId =
        locationCandidate.source === 'schedule'
          ? locationCandidate.id
          : null;

      await createScheduleRequestRpc({
        relatedRequestId,
        relatedScheduleId,
      });

      await loadScheduleRequests();

      setShowForm(false);
      resetForm();
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          'The related Student Place could not be created.'
      );

      setShowLocationModal(false);
      setLocationCandidate(null);
    } finally {
      setSaving(false);
    }
  }

  function declineSameLocation() {
    setShowLocationModal(false);
    setLocationCandidate(null);

    setError(
      'Request cancelled because the location is different from the adjacent class.'
    );
  }

  async function approveRequest(requestId) {
    if (saving) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { error: rpcError } =
        await supabase.rpc(
          'approve_schedule_request',
          {
            p_request_id: requestId,
          }
        );

      if (rpcError) {
        throw rpcError;
      }

      await loadScheduleRequests();
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          'Failed to approve schedule request.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function rejectRequest(requestId) {
    if (saving) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { error: rpcError } =
        await supabase.rpc(
          'reject_schedule_request',
          {
            p_request_id: requestId,
          }
        );

      if (rpcError) {
        throw rpcError;
      }

      await loadScheduleRequests();
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          'Failed to reject schedule request.'
      );
    } finally {
      setSaving(false);
    }
  }

  function getStudentName(student) {
    return (
      student?.profiles?.display_name ||
      'Unknown Student'
    );
  }

  function getCoachName(coach) {
    return (
      coach?.profiles?.display_name ||
      'Unknown Coach'
    );
  }

  function formatTime(time) {
    if (!time) {
      return '-';
    }

    return time.slice(0, 5);
  }

  function formatStatus(status) {
    if (!status) {
      return '-';
    }

    return (
      status.charAt(0).toUpperCase() +
      status.slice(1)
    );
  }

  function getLocationLabel(location) {
    const normalized =
      normalizeLocation(location);

    if (
      normalized === 'student_location'
    ) {
      return 'Student Place';
    }

    if (
      normalized === 'coach_location'
    ) {
      return 'Coach Place';
    }

    return location || '-';
  }

  const filteredRequests =
    scheduleRequests.filter((request) => {
      const studentName =
        getStudentName(
          request.students
        ).toLowerCase();

      const coachName =
        getCoachName(
          request.coaches
        ).toLowerCase();

      const programName = (
        request.programs?.name || ''
      ).toLowerCase();

      const searchText =
        search.toLowerCase();

      return (
        studentName.includes(searchText) ||
        coachName.includes(searchText) ||
        programName.includes(searchText)
      );
    });

  if (loading) {
    return (
      <div className="academy-app">
        <AcademyHeader />

        <main className="academy-main">
          <div className="page-state">
            Loading schedule requests...
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="academy-app">
      <AcademyHeader />

      <main className="academy-main">
        <div className="page-header">
          <div className="page-header-copy">
            <h1>Schedule Requests</h1>

            <p>
              Manage student requests for recurring
              schedules.
            </p>
          </div>

          {!showForm && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setError('');
                setShowForm(true);
              }}
            >
              + New Request
            </button>
          )}
        </div>

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        {showForm ? (
          <div className="card form-card">
            <div className="form-header">
              <h1>
                New Schedule Request
              </h1>

              <p>
                Create a recurring schedule request
                for a student.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">
                Student
              </label>

              <select
                className="form-select"
                name="student_id"
                value={form.student_id}
                onChange={handleChange}
                disabled={saving}
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
                name="coach_id"
                value={form.coach_id}
                onChange={handleChange}
                disabled={saving}
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
                name="program_id"
                value={form.program_id}
                onChange={handleChange}
                disabled={saving}
              >
                <option value="">
                  Select program
                </option>

                {programs.map((program) => (
                  <option
                    key={program.id}
                    value={program.id}
                  >
                    {program.name} — {program.type} —{' '}
                    {program.mode}
                  </option>
                ))}
              </select>
            </div>

            {selectedProgram && (
              <div className="form-group">
                <label className="form-label">
                  Location Type
                </label>

                <input
                  className="form-input"
                  value={getLocationLabel(
                    selectedProgram.location
                  )}
                  disabled
                  readOnly
                />
              </div>
            )}

            {isStudentLocation && (
              <>
                <div className="form-group">
                  <label className="form-label">
                    Location *
                  </label>

                  <input
                    className="form-input"
                    type="text"
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    placeholder="e.g. Starbucks Sunter Mall, lantai 2"
                    disabled={saving}
                  />

                  <div className="form-help">
                    Enter the actual location where
                    the class will take place.
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Google Maps URL
                  </label>

                  <input
                    className="form-input"
                    type="url"
                    name="maps_url"
                    value={form.maps_url}
                    onChange={handleChange}
                    placeholder="https://maps.google.com/..."
                    disabled={saving}
                  />

                  <div className="form-help">
                    Optional. You can paste a Google
                    Maps link.
                  </div>
                </div>
              </>
            )}

            {isCoachLocation && (
              <div className="form-group">
                <label className="form-label">
                  Location
                </label>

                <input
                  className="form-input"
                  value="Coach Place"
                  disabled
                  readOnly
                />

                <div className="form-help">
                  The exact Coach Place / station will
                  be handled separately.
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                Day
              </label>

              <select
                className="form-select"
                name="day_of_week"
                value={form.day_of_week}
                onChange={handleChange}
                disabled={saving}
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
                name="start_time"
                value={form.start_time}
                onChange={handleChange}
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                End Time
              </label>

              <input
                className="form-input"
                value={
                  endTime
                    ? formatTime(endTime)
                    : ''
                }
                placeholder="Calculated from program duration"
                disabled
                readOnly
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Timezone
              </label>

              <select
                className="form-select"
                name="timezone"
                value={form.timezone}
                onChange={handleChange}
                disabled={saving}
              >
                {TIMEZONES.map(
                  (timezone) => (
                    <option
                      key={timezone}
                      value={timezone}
                    >
                      {timezone}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Notes
              </label>

              <textarea
                className="form-input"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Optional notes"
                disabled={saving}
              />
            </div>

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
                type="button"
                className="btn btn-primary"
                onClick={
                  submitScheduleRequest
                }
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : 'Create Request'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="students-toolbar">
              <input
                className="search-input"
                type="text"
                placeholder="Search student, coach, or program..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
              />
            </div>

            <div className="card table-card">
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
                    {filteredRequests.length ===
                    0 ? (
                      <tr>
                        <td
                          colSpan="9"
                          className="empty-state"
                        >
                          No schedule requests
                          found.
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map(
                        (request) => (
                          <tr
                            key={request.id}
                          >
                            <td>
                              <strong>
                                {getStudentName(
                                  request.students
                                )}
                              </strong>
                            </td>

                            <td>
                              {request.student_level
                                ? getStudentLevelLabel(
                                    request.student_level
                                  )
                                : '-'}
                            </td>

                            <td>
                              {getCoachName(
                                request.coaches
                              )}
                            </td>

                            <td>
                              {request
                                .programs
                                ?.name || '-'}
                            </td>

                            <td>
                              {getLocationLabel(
                                request.location
                              )}
                            </td>

                            <td>
                              {DAYS.find(
                                (day) =>
                                  day.value ===
                                  request.day_of_week
                              )?.label || '-'}
                            </td>

                            <td>
                              {formatTime(
                                request.start_time
                              )}{' '}
                              –{' '}
                              {formatTime(
                                request.end_time
                              )}
                            </td>

                            <td>
                              <span className="status-badge">
                                {formatStatus(
                                  request.status
                                )}
                              </span>
                            </td>

                            <td>
                              {request.status ===
                                'pending' && (
                                <div className="form-actions schedule-actions">
                                  <button
                                    className="btn btn-primary"
                                    onClick={() =>
                                      approveRequest(
                                        request.id
                                      )
                                    }
                                    disabled={
                                      saving
                                    }
                                  >
                                    Approve
                                  </button>

                                  <button
                                    className="btn btn-secondary"
                                    onClick={() =>
                                      rejectRequest(
                                        request.id
                                      )
                                    }
                                    disabled={
                                      saving
                                    }
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {showLocationModal &&
        locationCandidate && (
          <div className="modal-overlay">
            <div
              className="modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="location-modal-title"
            >
              <div className="modal-header">
                <h2 id="location-modal-title">
                  Same Student Place?
                </h2>
              </div>

              <div className="modal-body">
                <p>
                  This class is immediately
                  adjacent to another class where
                  the coach is already going to a
                  Student Place.
                </p>

                <div className="card">
                  <div>
                    {locationCandidate
                      .students?.profiles
                      ?.display_name ||
                      'Another student'}
                  </div>

                  <div>
                    {locationCandidate
                      .programs?.name ||
                      'Another program'}
                  </div>

                  <div>
                    {formatTime(
                      locationCandidate.start_time
                    )}{' '}
                    –{' '}
                    {formatTime(
                      locationCandidate.end_time
                    )}
                  </div>

                  <div>
                    {getLocationLabel(
                      locationCandidate.location
                    )}
                  </div>
                </div>

                <p>
                  Is your requested class at the{' '}
                  <strong>
                    same location
                  </strong>
                  ?
                </p>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={
                    declineSameLocation
                  }
                  disabled={saving}
                >
                  No, Different Location
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={
                    confirmSameLocation
                  }
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : 'Yes, Same Location'}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
