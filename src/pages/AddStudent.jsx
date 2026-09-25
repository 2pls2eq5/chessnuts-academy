import { useState } from 'react'
import { supabase } from '../lib/supabase'

function AddStudent() {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [joinDate, setJoinDate] = useState('')
  const [level, setLevel] = useState('Beginner')
  const [status, setStatus] = useState('active')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()

    setSaving(true)
    setError('')

    const { data, error } = await supabase.rpc(
      'admin_create_student',
      {
        p_username: username,
        p_display_name: displayName,
        p_date_of_birth: dateOfBirth || null,
        p_join_date: joinDate || null,
        p_level: level,
        p_status: status,
      }
    )

    if (error) {
      console.error(error)
      setError(error.message)
      setSaving(false)
      return
    }

    window.location.href = `/students/${data}`
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f7f7f7',
        fontFamily: 'Arial, sans-serif',
        padding: '40px',
      }}
    >
      <div
        style={{
          maxWidth: '700px',
          margin: '0 auto',
        }}
      >
        <button
          onClick={() => {
            window.location.href = '/students'
          }}
          style={{
            marginBottom: '20px',
            padding: '10px 14px',
            cursor: 'pointer',
          }}
        >
          ← Back to Students
        </button>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '30px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          }}
        >
          <h1
            style={{
              marginTop: 0,
              marginBottom: '8px',
            }}
          >
            Add Student
          </h1>

          <p
            style={{
              color: '#666',
              marginBottom: '30px',
            }}
          >
            Create a new student in Chessnuts Academy.
          </p>

          {error && (
            <div
              style={{
                background: '#ffe8e8',
                color: '#b00020',
                padding: '12px 14px',
                borderRadius: '8px',
                marginBottom: '20px',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label>Display Name</label>

              <input
                type="text"
                value={displayName}
                onChange={(e) =>
                  setDisplayName(e.target.value)
                }
                placeholder="e.g. Jonathan"
                required
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label>Username</label>

              <input
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value)
                }
                placeholder="e.g. jonathan"
                required
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label>Date of Birth</label>

              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) =>
                  setDateOfBirth(e.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label>Join Date</label>

              <input
                type="date"
                value={joinDate}
                onChange={(e) =>
                  setJoinDate(e.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label>Level</label>

              <select
                value={level}
                onChange={(e) =>
                  setLevel(e.target.value)
                }
                style={inputStyle}
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

            <div style={{ marginBottom: '30px' }}>
              <label>Status</label>

              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value)
                }
                style={inputStyle}
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
              type="submit"
              disabled={saving}
              style={{
                width: '100%',
                padding: '13px',
                border: 'none',
                borderRadius: '8px',
                background: '#111',
                color: '#fff',
                fontSize: '16px',
                cursor: saving
                  ? 'default'
                  : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving
                ? 'Creating Student...'
                : 'Create Student'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

const inputStyle = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  marginTop: '7px',
  padding: '11px 12px',
  border: '1px solid #ccc',
  borderRadius: '7px',
  fontSize: '15px',
}

export default AddStudent
