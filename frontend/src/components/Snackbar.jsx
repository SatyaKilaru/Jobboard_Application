import { useEffect, useState } from 'react'
import { X, AlertCircle } from 'lucide-react'

export default function Snackbar({ message, onClose, duration = 4000 }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!message) return
    setVisible(true)
    const hide = setTimeout(() => setVisible(false), duration)
    const remove = setTimeout(onClose, duration + 300)
    return () => { clearTimeout(hide); clearTimeout(remove) }
  }, [message, duration, onClose])

  if (!message) return null

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-900 text-white text-sm font-medium rounded-2xl shadow-2xl min-w-64 max-w-sm">
        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
        <span className="flex-1">{message}</span>
        <button
          onClick={() => { setVisible(false); setTimeout(onClose, 300) }}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
