import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import Feed from './pages/Feed.jsx'
import Game from './pages/Game.jsx'
import Layout from './pages/Layout.jsx'
import Auth from './pages/Auth.jsx'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Feed /> },
      { path: '/game/:id', element: <Game /> },
      { path: '/auth', element:<Auth /> }
    ]
  }
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)

