import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

import Dashboard from './pages/Dashboard'

import Students from './pages/Students'
import StudentDetail from './pages/StudentDetail'
import AddStudent from './pages/AddStudent'

import Coaches from './pages/Coaches'
import CoachDetail from './pages/CoachDetail'
import AddCoach from './pages/AddCoach'

import Parents from './pages/Parents'
import ParentDetail from './pages/ParentDetail'
import AddParent from './pages/AddParent'

import Availability from './pages/Availability'

function App() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function initApp() {
      setLoading(true)
      setError('')

      /* =========================
         AUTH
      ========================= */

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        const returnTo = encodeURIComponent(
          window.location.href
        )

        window.location.href =
          `https://chessnuts.fun/login?returnTo=${returnTo}`

        return
      }

      setUser(user)

      /* =========================
         PROFILE
      ========================= */

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }

      setProfile(profileData)

      /* =========================
         ROLE
      ========================= */

      const {
        data: roleData,
        error: roleError,
      } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)

      if (roleError) {
        setError(roleError.message)
        setLoading(false)
        return
      }

      const admin =
        (roleData || []).some(
          (item) => item.role === 'ADMIN'
        )

      setIsAdmin(admin)
      setLoading(false)
    }

    initApp()
  }, [])

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        Loading...
      </div>
    )
  }

  /* =========================
     ERROR
  ========================= */

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          padding: '40px',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <h1>Chessnuts Academy</h1>

        <p
          style={{
            color: '#b00020',
          }}
        >
          {error}
        </p>
      </div>
    )
  }

  /* =========================
     ACCESS DENIED
  ========================= */

  if (!isAdmin) {
    return (
      <div
        style={{
          minHeight: '100vh',
          padding: '40px',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <h1>Chessnuts Academy</h1>

        <h2>Access denied</h2>

        <p>
          You need the ADMIN role to access
          this dashboard.
        </p>
      </div>
    )
  }

  /* =========================
     ROUTING
  ========================= */

  const path =
    window.location.pathname

  /* =========================
     STUDENTS
  ========================= */

  if (path === '/students/add') {
    return (
      <AddStudent
        user={user}
        profile={profile}
      />
    )
  }

  if (path === '/students') {
    return (
      <Students
        user={user}
        profile={profile}
      />
    )
  }

  if (
    path.startsWith('/students/')
  ) {
    const studentId =
      path.split('/')[2]

    return (
      <StudentDetail
        studentId={studentId}
        user={user}
        profile={profile}
      />
    )
  }

  /* =========================
     COACHES
  ========================= */

  if (path === '/coaches/add') {
    return (
      <AddCoach
        user={user}
        profile={profile}
      />
    )
  }

  if (path === '/coaches') {
    return (
      <Coaches
        user={user}
        profile={profile}
      />
    )
  }

  if (
    path.startsWith('/coaches/')
  ) {
    const coachId =
      path.split('/')[2]

    return (
      <CoachDetail
        coachId={coachId}
        user={user}
        profile={profile}
      />
    )
  }

  /* =========================
     PARENTS
  ========================= */

  if (path === '/parents/add') {
    return (
      <AddParent
        user={user}
        profile={profile}
      />
    )
  }

  if (
    path.startsWith('/parents/')
  ) {
    const parentId =
      path.split('/')[2]

    return (
      <ParentDetail
        parentId={parentId}
        user={user}
        profile={profile}
      />
    )
  }

  if (path === '/parents') {
    return (
      <Parents
        user={user}
        profile={profile}
      />
    )
  }

  /* =========================
     SCHEDULE
  ========================= */
  
  if (path === '/schedule/availability') {
  return (
    <Availability
      user={user}
      profile={profile}
    />
  )
}

  /* =========================
     DASHBOARD
  ========================= */

  return (
    <Dashboard
      user={user}
      profile={profile}
    />
  )
}

export default App
