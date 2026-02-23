export default function Tooltip({ text, children }) {
    return (
        <span className="tooltip-wrapper">
            {children}
            <span className="tooltip-bubble">{text}</span>
        </span>
    )
}
