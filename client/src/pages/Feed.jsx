import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { io } from 'socket.io-client'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const socket = io(API);

export default function Feed() {
  const [feed, setFeed] = useState([])
  const [games, setGames] = useState([])
  const [username, setUsername] = useState('Guest123')
  const [form, setForm] = useState({ game_id: '', mode: 'tv', rating: 5, comment: '' })

  useEffect(() => {
    axios.get(`${API}/api/feed`).then(r => setFeed(r.data))
    axios.get(`${API}/api/games`).then(r => {
      setGames(r.data)
      if (r.data[0]) setForm(f => ({...f, game_id: r.data[0].id}))
    })
    socket.on('checkin:new', (payload) => {
      setFeed(prev => [{
        id: payload.id,
        game_id: payload.game_id,
        mode: payload.mode,
        rating: payload.rating,
        comment: payload.comment,
        created_at: payload.created_at,
        league: '',
        game_date: '',
        home_team: '',
        away_team: '',
        venue: '',
        username: payload.username
      }, ...prev])
    })
    return () => {
      socket.off('checkin:new')
    }
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    const body = { username, ...form }
    await axios.post(`${API}/api/checkins`, body)
    setForm(f => ({...f, comment: ''}))
  }

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="md:col-span-2 space-y-3">
        <h2 className="text-xl font-semibold">Latest check-ins</h2>
        {feed.map(item => (
          <div key={item.id} className="card">
            <div className="flex justify-between">
              <div className="font-medium">{item.username}</div>
              <div className="text-xs text-gray-500">{new Date(item.created_at).toLocaleString()}</div>
            </div>
            <div className="mt-1">
              <Link className="text-blue-600 underline" to={`/game/${item.game_id}`}>View game</Link>
            </div>
            <div className="text-sm mt-2">Mode: {item.mode} {item.rating ? `• Rating: ${item.rating}/5` : ''}</div>
            {item.comment && <div className="text-gray-700 mt-1">{item.comment}</div>}
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Check in</h2>
        <form onSubmit={submit} className="card space-y-2">
          <label className="text-sm">Username</label>
          <input className="input" value={username} onChange={e => setUsername(e.target.value)} />
          <label className="text-sm">Game</label>
          <select className="input" value={form.game_id} onChange={e => setForm(f => ({...f, game_id: e.target.value}))}>
            {games.map(g => <option key={g.id} value={g.id}>{g.away_team} @ {g.home_team}</option>)}
          </select>
          <label className="text-sm">Mode</label>
          <select className="input" value={form.mode} onChange={e => setForm(f => ({...f, mode: e.target.value}))}>
            <option value="tv">Watched on TV/stream</option>
            <option value="in_person">Attended in person</option>
          </select>
          <label className="text-sm">Rating (1-5)</label>
          <input className="input" type="number" min="1" max="5" value={form.rating} onChange={e => setForm(f => ({...f, rating: Number(e.target.value)}))} />
          <label className="text-sm">Comment</label>
          <textarea className="input" rows="3" value={form.comment} onChange={e => setForm(f => ({...f, comment: e.target.value}))} />
          <button className="btn btn-primary">Check in</button>
        </form>
        <div className="card text-sm text-gray-600">
          API URL: <code>{API}</code>
        </div>
      </div>
    </div>
  )
}
