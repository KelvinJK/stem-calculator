import { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Calculator, BookMarked, Menu, X, Beaker, Moon, Sun, LogOut, LayoutDashboard, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const navItems = [
    { title: 'Calculator', url: '/', icon: Calculator },
    { title: 'Saved Activities', url: '/savedactivities', icon: BookMarked },
]

export default function Layout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [theme, setTheme] = useState(() => localStorage.getItem('stem-theme') || 'light')
    const location = useLocation()
    const navigate = useNavigate()
    const { currentUser, isAdmin, logout } = useAuth()

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('stem-theme', theme)
    }, [theme])

    const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')

    const isActive = (url) => {
        if (url === '/') return location.pathname === '/'
        return location.pathname.toLowerCase().startsWith(url.toLowerCase())
    }

    async function handleLogout() {
        try {
            await logout()
            navigate('/login')
        } catch {
            toast.error('Failed to sign out.')
        }
    }

    return (
        <div className="app-layout">
            {sidebarOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99 }}
                    onClick={() => setSidebarOpen(false)} />
            )}

            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                {/* Brand */}
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <Beaker size={22} color="white" />
                    </div>
                    <div className="sidebar-title">
                        <h2>STEM Sessions</h2>
                        <p>Cost Calculator</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="sidebar-nav">
                    {navItems.map(item => (
                        <NavLink key={item.title} to={item.url}
                            className={`nav-item ${isActive(item.url) ? 'active' : ''}`}
                            onClick={() => setSidebarOpen(false)}>
                            <item.icon size={19} />
                            <span>{item.title}</span>
                        </NavLink>
                    ))}

                    {isAdmin && (
                        <NavLink to="/admin"
                            className={`nav-item ${isActive('/admin') ? 'active' : ''}`}
                            onClick={() => setSidebarOpen(false)}>
                            <LayoutDashboard size={19} />
                            <span>Admin Dashboard</span>
                        </NavLink>
                    )}
                </nav>

                {/* Pro tip */}
                <div style={{ padding: '0 1rem', marginBottom: '0.75rem' }}>
                    <div className="sidebar-tip">
                        💡 <strong>Pro Tip</strong><br />
                        Save activities as templates to reuse them quickly in future sessions.
                    </div>
                </div>

                {/* User + controls */}
                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <div className="user-avatar">
                            <User size={16} color="white" />
                        </div>
                        <div className="user-info">
                            <div className="user-name">{currentUser?.displayName || 'User'}</div>
                            <div className="user-email">{currentUser?.email}</div>
                        </div>
                    </div>
                    <div className="sidebar-controls">
                        <button className="ctrl-btn" onClick={toggleTheme} title="Toggle dark mode">
                            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                        </button>
                        <button className="ctrl-btn ctrl-btn-danger" onClick={handleLogout} title="Sign out">
                            <LogOut size={17} />
                        </button>
                    </div>
                </div>
            </aside>

            <main className="main-content">
                {/* Mobile header */}
                <header className="mobile-header">
                    <button className="btn btn-secondary btn-icon"
                        onClick={() => setSidebarOpen(s => !s)}
                        style={{ display: 'flex' }}>
                        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                    <h1 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
                        STEM Sessions
                    </h1>
                    <button className="ctrl-btn" onClick={toggleTheme}>
                        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                    </button>
                </header>

                <div style={{ flex: 1, overflow: 'auto' }}>
                    {children}
                </div>
            </main>
        </div>
    )
}
