import { createContext, useContext, useEffect, useState } from 'react'
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updateProfile,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase'

const AuthContext = createContext(null)

export function useAuth() {
    return useContext(AuthContext)
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null)
    const [userRole, setUserRole] = useState('user')
    const [userDoc, setUserDoc] = useState(null)
    const [loading, setLoading] = useState(true)

    async function signup(email, password, displayName) {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(cred.user, { displayName })
        const role = email === import.meta.env.VITE_ADMIN_EMAIL ? 'admin' : 'user'
        await setDoc(doc(db, 'users', cred.user.uid), {
            email,
            displayName,
            role,
            createdAt: serverTimestamp(),
        })
        return cred
    }

    function login(email, password) {
        return signInWithEmailAndPassword(auth, email, password)
    }

    function logout() {
        return signOut(auth)
    }

    function resetPassword(email) {
        return sendPasswordResetEmail(auth, email)
    }

    async function fetchUserDoc(user) {
        if (!user) {
            setUserDoc(null)
            setUserRole('user')
            return
        }
        try {
            const snap = await getDoc(doc(db, 'users', user.uid))
            if (snap.exists()) {
                const data = snap.data()
                setUserDoc(data)
                setUserRole(data.role || 'user')
            }
        } catch (e) {
            console.error('Error fetching user doc:', e)
        }
    }

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user)
            await fetchUserDoc(user)
            setLoading(false)
        })
        return unsub
    }, [])

    const value = {
        currentUser,
        userRole,
        userDoc,
        loading,
        signup,
        login,
        logout,
        resetPassword,
        isAdmin: userRole === 'admin',
    }

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    )
}
