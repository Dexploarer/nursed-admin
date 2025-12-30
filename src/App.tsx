import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { ClientProviders } from './components/ClientProviders';
import Home from './pages/Home';
import Students from './pages/Students';
import Curriculum from './pages/Curriculum';
import Clinicals from './pages/Clinicals';
import Gradebook from './pages/Gradebook';
import Calendar from './pages/Calendar';
import Lab from './pages/Lab';
import Knowledge from './pages/Knowledge';
import Analytics from './pages/Analytics';
import Assistant from './pages/Assistant';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import SkillsMatrix from './pages/SkillsMatrix';
import { useMenuEvents } from './hooks/useMenuEvents';

function App() {
  // Listen for native menu events from Tauri
  useMenuEvents();

  return (
    <ClientProviders>
      <div className="flex min-h-screen bg-[#f8f9fa] text-[#2d3436]">
        <Sidebar />
        <main className="flex-1 ml-64 p-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/students" element={<Students />} />
            <Route path="/curriculum" element={<Curriculum />} />
            <Route path="/clinicals" element={<Clinicals />} />
            <Route path="/clinical-logs" element={<Clinicals />} />
            <Route path="/skills-matrix" element={<SkillsMatrix />} />
            <Route path="/gradebook" element={<Gradebook />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/lab" element={<Lab />} />
            <Route path="/knowledge" element={<Knowledge />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>
      </div>
    </ClientProviders>
  );
}

export default App;
