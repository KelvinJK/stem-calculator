import { CheckCircle, AlertCircle, Info } from 'lucide-react'

const icons = {
    success: <CheckCircle size={18} color="#16a34a" />,
    error: <AlertCircle size={18} color="#dc2626" />,
    info: <Info size={18} color="#2563eb" />,
}

export default function Toast({ msg, type = 'success' }) {
    return (
        <div className="toast-container">
            <div className={`toast ${type}`}>
                {icons[type] || icons.info}
                {msg}
            </div>
        </div>
    )
}
