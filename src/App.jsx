import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Section from './pages/Section'
import About from './pages/About'
import Contact from './pages/Contact'
import EventList from './pages/EventList'
import NewsList from './pages/NewsList'
import GalleryPage from './pages/GalleryPage'
import ChildPage from './pages/ChildPage'

// Admin
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/Dashboard'
import AdminSections from './pages/admin/Sections'
import AdminNews from './pages/admin/News'
import AdminEvents from './pages/admin/Events'
import AdminGlobal from './pages/admin/Global'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          
          {/* Specific section sub-routes must come before the generic :childSlug */}
          <Route path="/:slug/evenemang" element={<EventList />} />
          <Route path="/:slug/nyheter" element={<NewsList />} />
          <Route path="/:slug/galleri" element={<GalleryPage />} />
          
          {/* Child pages (e.g. /flen-varldsorkester/musaik-projektet) */}
          <Route path="/:slug/:childSlug" element={<ChildPage />} />
          
          {/* Section overview page */}
          <Route path="/:slug" element={<Section />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="global" element={<AdminGlobal />} />
          <Route path="sections" element={<AdminSections />} />
          <Route path="news" element={<AdminNews />} />
          <Route path="events" element={<AdminEvents />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
