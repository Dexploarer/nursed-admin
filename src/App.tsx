import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { ClientProviders } from './components/ClientProviders';
import { useSidebar } from './components/SidebarProvider';
import Home from './pages/Home';
import Students from './pages/Students';
import StudentView from './pages/StudentView';
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
import Attendance from './pages/Attendance';
import Preceptors from './pages/Preceptors';
import PreceptorEvalForm from './pages/PreceptorEvalForm';
import TeachingCalendar from './pages/TeachingCalendar';
import AllLessonPlans from './pages/AllLessonPlans';
import ClinicalSchedule from './pages/ClinicalSchedule';
import DailyTracking from './pages/DailyTracking';
import HourApprovals from './pages/HourApprovals';
import VRTracking from './pages/VRTracking';
import { useMenuEvents, setAboutDialogTrigger } from './hooks/useMenuEvents';
import { clsx } from 'clsx';
import { useState, useEffect } from 'react';
import { AboutDialog } from './components/AboutDialog';

function AppContent() {
  const { isCollapsed } = useSidebar();
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  
  // Listen for native menu events from Tauri
  useMenuEvents();

  // Register about dialog trigger
  useEffect(() => {
    setAboutDialogTrigger(() => setShowAboutDialog(true));
  }, []);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-stone-50 to-zinc-50 text-slate-900">
      <Sidebar />
      <main 
        className="flex-1 min-w-0 transition-[margin-left] duration-300 ease-in-out"
        style={{
          marginLeft: isCollapsed ? '5rem' : '16rem', // w-20 = 5rem (80px), w-64 = 16rem (256px)
        }}
      >
        <div className="p-6 lg:p-8">
          <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/students" element={<Students />} />
                  <Route path="/students/view" element={<StudentView />} />
                  <Route path="/curriculum" element={<Curriculum />} />
                  <Route path="/teaching-calendar" element={<TeachingCalendar />} />
                  <Route path="/lesson-plans" element={<AllLessonPlans />} />
                  <Route path="/clinicals" element={<Clinicals />} />
                  <Route path="/clinical-logs" element={<Clinicals />} />
                  <Route path="/preceptors" element={<Preceptors />} />
                  <Route path="/skills-matrix" element={<SkillsMatrix />} />
                  <Route path="/attendance" element={<Attendance />} />
                  <Route path="/gradebook" element={<Gradebook />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/lab" element={<Lab />} />
                  <Route path="/knowledge" element={<Knowledge />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/assistant" element={<Assistant />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/clinical-schedule" element={<ClinicalSchedule />} />
                  <Route path="/daily-tracking" element={<DailyTracking />} />
                  <Route path="/hour-approvals" element={<HourApprovals />} />
                  <Route path="/vr-tracking" element={<VRTracking />} />
          </Routes>
        </div>
      </main>
      <AboutDialog isOpen={showAboutDialog} onClose={() => setShowAboutDialog(false)} />
    </div>
  );
}

function App() {
  return (
    <ClientProviders>
      <Routes>
        {/* Standalone route for preceptor evaluation (no sidebar) */}
        <Route path="/evaluate" element={<PreceptorEvalForm />} />
        {/* All other routes with sidebar */}
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </ClientProviders>
  );
}

export default App;
