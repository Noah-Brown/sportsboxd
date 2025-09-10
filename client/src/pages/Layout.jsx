import { Outlet, Link } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <header className="flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold">Sportsboxd</Link>
        <div className="flex items-center gap-2">
          <a className="text-sm text-gray-600" href="https://example.com">MVP</a>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
