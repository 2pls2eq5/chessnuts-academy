import { useLocation } from 'react-router-dom'

function AcademyHeader() {
  const location = useLocation()

  const navItems = [
    {
      label: 'Dashboard',
      path: '/',
      active: location.pathname === '/',
    },
    {
      label: 'Students',
      path: '/students',
      active: location.pathname.startsWith('/students'),
    },
    {
      label: 'Coaches',
      path: '/coaches',
      comingSoon: true,
    },
    {
      label: 'Parents',
      path: '/parents',
      comingSoon: true,
    },
    {
      label: 'Schedule',
      path: '/schedule',
      comingSoon: true,
    },
    {
      label: 'Payments',
      path: '/payments',
      comingSoon: true,
    },
  ]

  return (
    <header className="academy-header">
      <div className="academy-header-inner">
        <div className="academy-brand">
          <div className="academy-brand-mark">
            C
          </div>

          <div className="academy-brand-text">
            <div className="academy-brand-title">
              Chessnuts Academy
            </div>

            <div className="academy-brand-subtitle">
              Admin Workspace
            </div>
          </div>
        </div>
      </div>

      <nav className="academy-nav">
        <div className="academy-nav-inner">
          {navItems.map((item) => {
            if (item.comingSoon) {
              return (
                <button
                  key={item.label}
                  className="academy-nav-item academy-nav-disabled"
                  disabled
                  title={`${item.label} — Coming Soon`}
                >
                  {item.label}
                </button>
              )
            }

            return (
              <button
                key={item.label}
                className={`academy-nav-item ${
                  item.active
                    ? 'academy-nav-active'
                    : ''
                }`}
                onClick={() => {
                  window.location.href =
                    item.path
                }}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </nav>
    </header>
  )
}

export default AcademyHeader
