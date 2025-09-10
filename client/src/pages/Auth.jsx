import { useState } from 'react'
import axios from 'axios'
import { API } from '../lib/api.js'

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    try {
      const res = await axios.post(`${API}/api/${mode}`, { username, password }, { withCredentials: true })
      setMsg(`Success: ${res.data.username}`)
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error')
    }
  }

  return (
    <div className="card space-y-3 max-w-sm mx-auto">
      <h2 className="text-xl font-semibold">{mode === 'login' ? 'Login' : 'Register'}</h2>
      <form onSubmit={submit} className="space-y-2">
        <input className="input" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
        <input className="input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        <button className="btn btn-primary w-full">{mode}</button>
      </form>
      <div className="text-sm text-gray-600">{msg}</div>
      <button className="text-blue-600 text-sm underline" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        Switch to {mode === 'login' ? 'Register' : 'Login'}
      </button>
    </div>
  )
}