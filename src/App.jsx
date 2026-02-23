import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Calculator from './pages/Calculator'
import SavedActivities from './pages/SavedActivities'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Calculator />} />
          <Route path="/Calculator" element={<Calculator />} />
          <Route path="/savedactivities" element={<SavedActivities />} />
          <Route path="/SavedActivities" element={<SavedActivities />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
