import { useState } from 'react'
import { supabase } from '../lib/supabase'

function AddStudent({ user, profile }) {
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [joinDate, setJoinDate] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [level, setLevel] = useState('Beginner')
  const [status, setStatus] = useState('active')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdStudent, setCreatedStudent] = useState(null)
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

    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      setError(
        'Username can only contain letters, numbers, and underscores.'
      )
      return
    }

    setLoading(true)

    try {
      // --------------------------------------------------
      // Get current login session
      // --------------------------------------------------

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

      // --------------------------------------------------
      // Call Edge Function
      // --------------------------------------------------

      const {
        data,
        error: functionError,
      } = await supabase.functions.invoke(
        'admin-create-student',
        {
          body: {
            username: username.trim(),
            display_name: displayName.trim(),
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

      // --------------------------------------------------
      // Handle Edge Function error
      // --------------------------------------------------

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

      // --------------------------------------------------
      // Validate success response
      // --------------------------------------------------

      if (!data?.success) {
        throw new Error(
          data?.error ||
            'Failed to create student.'
        )
      }

      // --------------------------------------------------
      // Student successfully created
      // --------------------------------------------------

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

  // ==================================================
  // SUCCESS SCREEN
  // ==================================================

  if (createdStudent) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#f5f5f5',
          padding: '40px',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: '700px',
            margin: '0 auto',
            background: '#ffffff',
            borderRadius: '12px',
            padding: '32px',
            boxShadow:
              '0 2px 10px rgba(0,0,0,0.08)',
          }}
        >
          <h1
            style={{
              marginTop: 0,
            }}
          >
            Student Account Created
          </h1>

          <p>
            The Chessnuts account and Academy
            student record have been created
            successfully.
          </p>

          <div
            style={{
              marginTop: '24px',
              padding: '20px',
              background: '#f7f7f7',
              borderRadius: '8px',
            }}
          >
            <div
              style={{
                marginBottom: '16px',
              }}
            >
              <strong>Name</strong>

              <div>
                {createdStudent.display_name}
              </div>
            </div>

            <div
              style={{
                marginBottom: '16px',
              }}
            >
              <strong>Username</strong>

              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '18px',
                }}
              >
                {createdStudent.username}
              </div>
            </div>

            <div>
              <strong>Initial Password</strong>

              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '18px',
                  wordBreak: 'break-all',
                }}
              >
                {createdStudent.initial_password}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: '20px',
              padding: '16px',
              background: '#fff8e1',
              borderRadius: '8px',
              fontSize: '14px',
            }}
          >
            <strong>Important:</strong>

            <p
              style={{
                marginBottom: 0,
              }}
            >
              This password is shown only now.
              Make sure you save it or give it
              to the student or parent.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginTop: '24px',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={copyCredentials}
              style={{
                padding: '10px 16px',
                border: 'none',
                borderRadius: '6px',
                background: '#111',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              {copied
                ? 'Copied!'
                : 'Copy Credentials'}
            </button>

            <button
              onClick={() => {
                window.location.href =
                  `/students/${createdStudent.student_id}`
              }}
              style={{
                padding: '10px 16px',
                border: '1px solid #ccc',
                borderRadius: '6px',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              Open Student
            </button>

            <button
              onClick={() => {
                window.location.href =
                  '/students'
              }}
              style={{
                padding: '10px 16px',
                border: '1px solid #ccc',
                borderRadius: '6px',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              Back to Students
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ==================================================
  // ADD STUDENT FORM
  // ==================================================

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f5f5',
        padding: '40px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '700px',
          margin: '0 auto',
          background: '#ffffff',
          borderRadius: '12px',
          padding: '32px',
          boxShadow:
            '0 2px 10px rgba(0,0,0,0.08)',
        }}
      >
        <button
          onClick={() => {
            window.location.href =
              '/students'
          }}
          style={{
            marginBottom: '20px',
            border: 'none',
            background: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          ← Back to Students
        </button>

        <h1
          style={{
            marginTop: 0,
          }}
        >
          Add Student
        </h1>

        <p
          style={{
            color: '#666',
          }}
        >
          Create a Chessnuts account and
          Academy student record.
        </p>

        {error && (
          <div
            style={{
              marginTop: '20px',
              padding: '12px',
              background: '#ffecec',
              color: '#b00020',
              borderRadius: '6px',
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            marginTop: '24px',
          }}
        >
          {/* STUDENT NAME */}

          <div
            style={{
              marginBottom: '20px',
            }}
          >
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 'bold',
              }}
            >
              Student Name
            </label>

            <input
              type="text"
              value={displayName}
              onChange={(event) =>
                setDisplayName(
                  event.target.value
                )
              }
              placeholder="e.g. Jonathan"
              disabled={loading}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px',
                border:
                  '1px solid #ccc',
                borderRadius: '6px',
              }}
            />
          </div>

          {/* USERNAME */}

          <div
            style={{
              marginBottom: '20px',
            }}
          >
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 'bold',
              }}
            >
              Username
            </label>

            <input
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
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px',
                border:
                  '1px solid #ccc',
                borderRadius: '6px',
              }}
            />

            <div
              style={{
                marginTop: '6px',
                fontSize: '13px',
                color: '#777',
              }}
            >
              Letters, numbers, and
              underscores only.
            </div>
          </div>

          {/* DATE OF BIRTH */}

          <div
            style={{
              marginBottom: '20px',
            }}
          >
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 'bold',
              }}
            >
              Date of Birth
            </label>

            <input
              type="date"
              value={dateOfBirth}
              onChange={(event) =>
                setDateOfBirth(
                  event.target.value
                )
              }
              disabled={loading}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px',
                border:
                  '1px solid #ccc',
                borderRadius: '6px',
              }}
            />
          </div>

          {/* JOIN DATE */}

          <div
            style={{
              marginBottom: '20px',
            }}
          >
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 'bold',
              }}
            >
              Join Date
            </label>

            <input
              type="date"
              value={joinDate}
              onChange={(event) =>
                setJoinDate(
                  event.target.value
                )
              }
              disabled={loading}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px',
                border:
                  '1px solid #ccc',
                borderRadius: '6px',
              }}
            />
          </div>

          {/* LEVEL */}

          <div
            style={{
              marginBottom: '20px',
            }}
          >
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 'bold',
              }}
            >
              Level
            </label>

            <select
              value={level}
              onChange={(event) =>
                setLevel(
                  event.target.value
                )
              }
              disabled={loading}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px',
                border:
                  '1px solid #ccc',
                borderRadius: '6px',
                background: '#fff',
              }}
            >
              <option value="Beginner">
                Beginner
              </option>

              <option value="Intermediate">
                Intermediate
              </option>

              <option value="Advanced">
                Advanced
              </option>
            </select>
          </div>

          {/* STATUS */}

          <div
            style={{
              marginBottom: '28px',
            }}
          >
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 'bold',
              }}
            >
              Status
            </label>

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value
                )
              }
              disabled={loading}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px',
                border:
                  '1px solid #ccc',
                borderRadius: '6px',
                background: '#fff',
              }}
            >
              <option value="active">
                Active
              </option>

              <option value="inactive">
                Inactive
              </option>
            </select>
          </div>

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              border: 'none',
              borderRadius: '6px',
              background: loading
                ? '#999'
                : '#111',
              color: '#fff',
              cursor: loading
                ? 'default'
                : 'pointer',
              fontSize: '16px',
            }}
          >
            {loading
              ? 'Creating Student...'
              : 'Create Student'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AddStudent
