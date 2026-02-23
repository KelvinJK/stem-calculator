import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Calculator, BookMarked, Menu, X, Beaker } from 'lucide-react'

const navItems = [
    { title: 'Calculator', url: '/', icon: Calculator },
    { title: 'Saved Activities', url: '/savedactivities', icon: BookMarked },
]

export default function Layout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const location = useLocation()

    const isActive = (url) => {
        if (url === '/') return location.pathname === '/' || location.pathname === '/Calculator'
        return location.pathname.toLowerCase() === url.toLowerCase()
    }

    return (
        <div className="app-layout">
            {/* Backdrop for mobile */}
            {sidebarOpen && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 99 }}
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <Beaker size={22} color="white" />
                    </div>
                    <div className="sidebar-title">
                        <h2>STEM Sessions</h2>
                        <p>Cost Calculator</p>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.title}
                            to={item.url}
                            className={`nav-item ${isActive(item.url) ? 'active' : ''}`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            <item.icon />
                            <span>{item.title}</span>
                        </NavLink>
                    ))}
                </nav>

                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #eff6ff, #eef2ff)',
                        borderRadius: '12px',
                        padding: '1rem',
                        fontSize: '0.75rem',
                        color: '#64748b',
                        lineHeight: 1.5,
                    }}>
                        <strong style={{ color: '#1e3a5f', display: 'block', marginBottom: '0.25rem' }}>💡 Pro Tip</strong>
                        Save your frequently used activity templates to quickly load them in the calculator.
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                {/* Mobile header */}
                <header style={{
                    background: 'white',
                    borderBottom: '1px solid #e2e8f0',
                    padding: '0.875rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                }}
                    className="hidden-desktop"
                >
                    <button
                        className="btn btn-secondary btn-icon"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        style={{ display: 'flex' }}
                    >
                        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                    <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e3a5f' }}>STEM Sessions</h1>
                </header>

                <div style={{ flex: 1, overflow: 'auto' }}>
                    {children}
                </div>
            </main>
        </div>
    )
}
