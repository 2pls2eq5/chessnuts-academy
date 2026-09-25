import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { STUDENT_LEVELS } from '../constants/studentLevels'
import AcademyHeader from '../components/AcademyHeader'

function AddStudent() {
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [joinDate, setJoinDate] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [level, setLevel] = useState('BASIC_1')
  const [status, setStatus] = useState('active')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdStudent, setCreatedStudent] =
    useState(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')
    setCopied(false)

    if (!displayName.trim()) {
      setError('Display name is required.')
      return
    }

    if (!username.trim()) {
      setError('Username is required.')
      return
    }

    if (
      !/^[a-zA-Z0-9_]+$/.test(
        username.trim()
      )
    ) {
      setError(
        'Username can only contain letters, numbers, and underscores.'
      )
      return
    }

    setLoading(true)

    try {
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        throw new Error(
          sessionError.message
        )
      }

      const accessToken =
        sessionData?.session?.access_token

      if (!accessToken) {
        throw new Error(
          'No login session found. Please log in again.'
        )
      }

      const {
        data,
        error: functionError,
      } = await supabase.functions.invoke(
        'admin-create-student',
        {
          body: {
            username: username.trim(),
            display_name:
              displayName.trim(),
            date_of_birth:
              dateOfBirth || null,
            join_date:
              joinDate || null,
            level,
            status,
          },
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },
        }
      )

      if (functionError) {
        console.error(
          'EDGE FUNCTION ERROR:',
          functionError
        )

        let message =
          functionError.message ||
          'Failed to create student.'

        if (functionError.context) {
          try {
            const response =
              functionError.context

            const responseBody =
              await response.json()

            console.error(
              'EDGE FUNCTION RESPONSE:',
              responseBody
            )

            if (responseBody?.error) {
              message =
                responseBody.error
            }

            if (responseBody?.message) {
              message =
                responseBody.message
            }
          } catch (parseError) {
            console.error(
              'Could not parse Edge Function response:',
              parseError
            )
          }
        }

        throw new Error(message)
      }

      if (!data?.success) {
        throw new Error(
          data?.error ||
            'Failed to create student.'
        )
      }

      setCreatedStudent(data)
    } catch (err) {
      console.error(
        'ADD STUDENT ERROR:',
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function copyCredentials() {
    if (!createdStudent) {
      return
    }

    const text = [
      'Chessnuts Student Account',
      `Name: ${createdStudent.display_name}`,
      `Username: ${createdStudent.username}`,
      `Initial Password: ${createdStudent.initial_password}`,
    ].join('\n')

    try {
      await navigator.clipboard.writeText(text)

      setCopied(true)

      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (err) {
      console.error(err)
    }
  }

  if (createdStudent) {
    return (
      <div className="academy-app">
        <AcademyHeader />

        <main className="academy-main">
          <div className="card success-card">
            <div className="success-icon">
              ✓
            </div>

            <h1>
              Student Account Created
            </h1>

            <p>
              The Chessnuts account and
              Academy student record have
              been created successfully.
            </p>

            <div className="credentials-box">
              <div className="credential-row">
                <div className="credential-label">
                  Name
                </div>

                <div className="credential-value">
                  {createdStudent.display_name}
                </div>
              </div>

              <div className="credential-row">
                <div className="credential-label">
                  Username
                </div>

                <div className="credential-value credential-code">
                  {createdStudent.username}
                </div>
              </div>

              <div className="credential-row">
                <div className="credential-label">
                  Initial Password
                </div>

                <div className="credential-value credential-code">
                  {
                    createdStudent.initial_password
                  }
                </div>
              </div>
            </div>

            <div className="important-box">
              <strong>Important</strong>

              <p>
                This password is shown only
                now. Make sure you save it or
                give it to the student or
                parent.
              </p>
            </div>

            <div className="success-actions">
              <button
                className="btn btn-primary"
                onClick={copyCredentials}
              >
                {copied
                  ? 'Copied!'
                  : 'Copy Credentials'}
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => {
                  window.location.href =
                    `/students/${createdStudent.student_id}`
                }}
              >
                Open Student
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => {
                  window.location.href =
                    '/students'
                }}
              >
                Back to Students
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="academy-app">
      <AcademyHeader />

      <main className="academy-main">
        <div className="form-card card">
          <div className="detail-back">
            <button
              className="btn btn-ghost"
              onClick={() => {
                window.location.href =
                  '/students'
              }}
            >
              ← Back to Students
            </button>
          </div>

          <div className="form-header">
            <h1>Add Student</h1>

            <p>
              Create a Chessnuts account and
              Academy student record.
            </p>
          </div>

          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">
                Student Name
              </label>

              <input
                className="form-input"
                type="text"
                value={displayName}
                onChange={(event) =>
                  setDisplayName(
                    event.target.value
                  )
                }
                placeholder="e.g. Jonathan"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Username
              </label>

              <input
                className="form-input"
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(
                    event.target.value
                  )
                }
                placeholder="e.g. jonathan123"
                disabled={loading}
                autoComplete="off"
              />

              <div className="form-help">
                Letters, numbers, and
                underscores only.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Date of Birth
              </label>

              <input
                className="form-input"
                type="date"
                value={dateOfBirth}
                onChange={(event) =>
                  setDateOfBirth(
                    event.target.value
                  )
                }
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Join Date
              </label>

              <input
                className="form-input"
                type="date"
                value={joinDate}
                onChange={(event) =>
                  setJoinDate(
                    event.target.value
                  )
                }
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Level
              </label>

              <select
                className="form-select"
                value={level}
                onChange={(event) =>
                  setLevel(
                    event.target.value
                  )
                }
                disabled={loading}
              >
                {STUDENT_LEVELS.map(
                  (item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Status
              </label>

              <select
                className="form-select"
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value
                  )
                }
                disabled={loading}
              >
                <option value="active">
                  Active
                </option>

                <option value="inactive">
                  Inactive
                </option>
              </select>
            </div>

            <button
              className="btn btn-primary form-submit"
              type="submit"
              disabled={loading}
            >
              {loading
                ? 'Creating Student...'
                : 'Create Student'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

export default AddStudent
