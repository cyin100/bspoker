
import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App'
import Home from './pages/Home'
import Lobby from './pages/Lobby'
import Game from './pages/Game'
import NotFound from './pages/NotFound'
const router = createBrowserRouter([{ path: '/', element: <App />, children: [
  { index: true, element: <Home /> },
  { path: ':code', element: <Lobby /> },
  { path: ':code/play', element: <Game /> },
  { path: '404', element: <NotFound /> },
  { path: '*', element: <NotFound /> },
] }])
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><RouterProvider router={router} /></React.StrictMode>)
