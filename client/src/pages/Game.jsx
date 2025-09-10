import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { io } from 'socket.io-client'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function Game() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [username, setUsername] = useState('Guest123')
  const [comment, setComment] = useState('')

  useEffect(() => {
    axios.get(`${API}/api/games/${id}`).then(r => setData(r.data))
    const socket = io(API);
    socket.emit('room:join', id)
    socket.on('comment:new', (c) => {
      setData(prev => ({ ...prev, comments: [c, ...(prev?.comments||[])] }))
    })
    return () => socket.disconnect()
  }, [id])

  if (!data) return <div>Loading...</div>
  const { game, comments, checkins } = data

  const submit = async (e) => {
    e.preventDefault()
    await axios.post(`${API}/api/games/${id}/comments`, { username, body: comment })
    setComment('')
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="text-sm text-gray-600">{game.league} • {new Date(game.date).toLocaleString()}</div>
        <div className="text-2xl font-semibold mt-1">{game.away_team} @ {game.home_team}</div>
        {game.venue && <div className="text-gray-700">{game.venue}</div>}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Live discussion</h3>
          <form onSubmit={submit} className="card space-y-2">
            <input className="input" value={username} onChange={e => setUsername(e.target.value)} />
            <textarea className="input" rows="3" value={comment} onChange={e => setComment(e.target.value)} placeholder="Share your take..." />
            <button className="btn btn-primary">Post</button>
          </form>
          <div className="space-y-2">
            {comments.map(c => (
              <div key={c.id} className="card">
                <div className="flex justify-between">
                  <div className="font-medium">{c.username}</div>
                  <div className="text-xs text-gray-500">{new Date(c.created_at).toLocaleString()}</div>
                </div>
                <div className="mt-1">{c.body}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Recent check-ins</h3>
          {checkins.map(ch => (
            <div key={ch.id} className="card">
              <div className="flex justify-between">
                <div className="font-medium">{ch.username}</div>
                <div className="text-xs text-gray-500">{new Date(ch.created_at).toLocaleString()}</div>
              </div>
              <div className="text-sm mt-1">Mode: {ch.mode} {ch.rating ? `• Rating ${ch.rating}/5` : ''}</div>
              {ch.comment && <div className="mt-1">{ch.comment}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
