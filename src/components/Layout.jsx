import { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
    Calculator, Package, FlaskConical, FileText, Menu, X,
    Beaker, Moon, Sun, LogOut, LayoutDashboard, User, TrendingUp
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Layout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [theme, setTheme] = useState(() => localStorage.getItem('stem-theme') || 'light')
    const location = useLocation()
    const navigate = useNavigate()
    const { user, isAdmin, canEdit, logout } = useAuth()

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('stem-theme', theme)
    }, [theme])

    const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')

    function isActive(url) {
        if (url === '/') return location.pathname === '/'
        return location.pathname.toLowerCase().startsWith(url.toLowerCase())
    }

    function handleLogout() {
        logout()
        navigate('/login')
        toast.success('Signed out')
    }

    // Build nav dynamically based on role
    const navItems = [
        { title: 'My Quotes', url: '/sessions', icon: FileText },
        { title: 'New Quote', url: '/quotation/new', icon: Calculator },
        { title: 'Materials', url: '/materials', icon: Package },
        ...(canEdit ? [{ title: 'Activities', url: '/activities', icon: FlaskConical }] : []),
        ...(isAdmin ? [{ title: 'Admin Dashboard', url: '/admin', icon: LayoutDashboard }] : []),
    ]

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
                </nav>

                {/* Role badge tip */}
                {user && (
                    <div style={{ padding: '0 1rem', marginBottom: '0.75rem' }}>
                        <div className="sidebar-tip">
                            🔑 Signed in as <strong style={{ textTransform: 'capitalize' }}>{user.role}</strong>
                            {user.role === 'marketing' && (
                                <><br />Contact an admin to unlock curator access.</>
                            )}
                        </div>
                    </div>
                )}

                {/* User + controls */}
                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <div className="user-avatar">
                            <User size={16} color="white" />
                        </div>
                        <div className="user-info">
                            <div className="user-name">{user?.name || 'User'}</div>
                            <div className="user-email">{user?.email}</div>
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
