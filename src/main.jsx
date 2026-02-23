import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <AuthProvider>
            <App />
            <Toaster
                position="bottom-right"
                toastOptions={{
                    duration: 3500,
                    style: {
                        background: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        fontSize: '0.875rem',
                        fontFamily: 'Inter, sans-serif',
                    },
                    success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
                    error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
                }}
            />
        </AuthProvider>
    </React.StrictMode>
)
