import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Section from './pages/Section'
import About from './pages/About'
import Contact from './pages/Contact'
import EventList from './pages/EventList'
import EventDetail from './pages/EventDetail'
import NewsList from './pages/NewsList'
import GalleryPage from './pages/GalleryPage'
import ChildPage from './pages/ChildPage'
import EventArchive from './pages/EventArchive'
import LocationArchive from './pages/LocationArchive'

const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const AdminLogin = lazy(() => import('./pages/admin/Login'))
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const AdminSections = lazy(() => import('./pages/admin/Sections'))
const AdminChildPages = lazy(() => import('./pages/admin/ChildPages'))
const AdminNews = lazy(() => import('./pages/admin/News'))
const AdminEvents = lazy(() => import('./pages/admin/Events'))
const AdminGlobal = lazy(() => import('./pages/admin/Global'))

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/events" element={<EventArchive mode="all" />} />
          <Route path="/events/upcoming" element={<EventArchive mode="upcoming" />} />
          <Route path="/events/past" element={<EventArchive mode="past" />} />
          <Route path="/locations" element={<LocationArchive />} />
          <Route path="/locations/:locationSlug" element={<LocationArchive />} />

          <Route path="/:slug/evenemang" element={<EventList />} />
          <Route path="/:slug/evenemang/:eventId" element={<EventDetail />} />
          <Route path="/:slug/nyheter" element={<NewsList />} />
          <Route path="/:slug/galleri" element={<GalleryPage />} />

          <Route path="/:slug/:childSlug/evenemang" element={<EventList />} />
          <Route path="/:slug/:childSlug" element={<ChildPage />} />
          <Route path="/:slug" element={<Section />} />
        </Route>

        {/* Admin login (no layout wrapper — own full-screen shell) */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Admin Routes (auth gate lives inside AdminLayout) */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="global" element={<AdminGlobal />} />
          <Route path="sections" element={<AdminSections />} />
          <Route path="child-pages" element={<AdminChildPages />} />
          <Route path="news" element={<AdminNews />} />
          <Route path="events" element={<AdminEvents />} />
        </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
