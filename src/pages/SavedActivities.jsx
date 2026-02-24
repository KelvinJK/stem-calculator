/**
 * SavedActivities — legacy page, redirected to MyQuotes
 * The new quotation/session tracking system uses /sessions (MyQuotes.jsx)
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SavedActivities() {
    const navigate = useNavigate()
    useEffect(() => { navigate('/sessions', { replace: true }) }, [navigate])
    return null
}
