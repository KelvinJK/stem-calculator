import { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    // On mount, restore session from localStorage
    useEffect(() => {
        const token = localStorage.getItem('stem_token')
        const saved = localStorage.getItem('stem_user')
        if (token && saved) {
            setUser(JSON.parse(saved))
            // Re-validate token against /me
            authApi.me()
                .then(u => { setUser(u); localStorage.setItem('stem_user', JSON.stringify(u)) })
                .catch(() => logout())
                .finally(() => setLoading(false))
        } else {
            setLoading(false)
        }
    }, [])

    async function login(email, password) {
        const { token, user } = await authApi.login({ email, password })
        localStorage.setItem('stem_token', token)
        localStorage.setItem('stem_user', JSON.stringify(user))
        setUser(user)
        return user
    }

    async function register(name, email, password) {
        const { token, user } = await authApi.register({ name, email, password })
        localStorage.setItem('stem_token', token)
        localStorage.setItem('stem_user', JSON.stringify(user))
        setUser(user)
        return user
    }

    function logout() {
        localStorage.removeItem('stem_token')
        localStorage.removeItem('stem_user')
        setUser(null)
    }

    const isAdmin = user?.role === 'admin'
    const isCurator = user?.role === 'curator'
    const isMarketing = user?.role === 'marketing'
    const canEdit = isAdmin || isCurator   // curator + admin can modify materials/activities

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin, isCurator, isMarketing, canEdit }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
    return ctx
}
