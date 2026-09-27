import { useState } from 'react'
import { supabase } from '../lib/supabase'
import AcademyHeader from '../components/AcademyHeader'

function AddParent() {
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [gender, setGender] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdParent, setCreatedParent] =
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
        'admin-create-parent',
        {
          body: {
            username:
              username.trim(),

            display_name:
              displayName.trim(),

            date_of_birth:
              dateOfBirth || null,

            phone:
              phone.trim() || null,

            address:
              address.trim() || null,

            gender:
              gender || null,
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
          'Failed to create parent.'

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
            'Failed to create parent.'
        )
      }

      setCreatedParent(data)
    } catch (err) {
      console.error(
        'ADD PARENT ERROR:',
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
    if (!createdParent) {
      return
    }

    const text = [
      'Chessnuts Parent Account',
      `Name: ${createdParent.display_name}`,
      `Username: ${createdParent.username}`,
      `Initial Password: ${createdParent.initial_password}`,
    ].join('\n')

    try {
      await navigator.clipboard.writeText(
        text
      )

      setCopied(true)

      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (err) {
      console.error(err)
    }
  }

  if (createdParent) {
    return (
      <div className="academy-app">
        <AcademyHeader />

        <main className="academy-main">
          <div className="card success-card">
            <div className="success-icon">
              ✓
            </div>

            <h1>
              Parent Account Created
            </h1>

            <p>
              The Chessnuts account and
              Academy parent record have
              been created successfully.
            </p>

            <div className="credentials-box">
              <div className="credential-row">
                <div className="credential-label">
                  Name
                </div>

                <div className="credential-value">
                  {
                    createdParent.display_name
                  }
                </div>
              </div>

              <div className="credential-row">
                <div className="credential-label">
                  Username
                </div>

                <div className="credential-value credential-code">
                  {
                    createdParent.username
                  }
                </div>
              </div>

              <div className="credential-row">
                <div className="credential-label">
                  Initial Password
                </div>

                <div className="credential-value credential-code">
                  {
                    createdParent.initial_password
                  }
                </div>
              </div>
            </div>

            <div className="important-box">
              <strong>Important</strong>

              <p>
                This password is shown only
                now. Make sure you save it or
                give it to the parent.
              </p>
            </div>

            <div className="success-actions">
              <button
                className="btn btn-primary"
                onClick={
                  copyCredentials
                }
              >
                {copied
                  ? 'Copied!'
                  : 'Copy Credentials'}
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => {
                  window.location.href =
                    `/parents/${createdParent.parent_id}`
                }}
              >
                Open Parent
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => {
                  window.location.href =
                    '/parents'
                }}
              >
                Back to Parents
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
                  '/parents'
              }}
            >
              ← Back to Parents
            </button>
          </div>

          <div className="form-header">
            <h1>Add Parent</h1>

            <p>
              Create a Chessnuts account and
              Academy parent record.
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
                Parent Name
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
                placeholder="e.g. John Smith"
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
                placeholder="e.g. johnsmith"
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
                Phone
              </label>

              <input
                className="form-input"
                type="tel"
                value={phone}
                onChange={(event) =>
                  setPhone(
                    event.target.value
                  )
                }
                placeholder="e.g. 08123456789"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Address
              </label>

              <textarea
                className="form-input"
                value={address}
                onChange={(event) =>
                  setAddress(
                    event.target.value
                  )
                }
                placeholder="Parent address..."
                rows="3"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Gender
              </label>

              <select
                className="form-select"
                value={gender}
                onChange={(event) =>
                  setGender(
                    event.target.value
                  )
                }
                disabled={loading}
              >
                <option value="">
                  Select gender
                </option>

                <option value="male">
                  Male
                </option>

                <option value="female">
                  Female
                </option>
              </select>
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

            <button
              className="btn btn-primary form-submit"
              type="submit"
              disabled={loading}
            >
              {loading
                ? 'Creating Parent...'
                : 'Create Parent'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

export default AddParent
