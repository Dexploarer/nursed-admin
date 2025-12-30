'use client';

import Link from 'next/link';
import { Home, Users, BookOpen, Activity, LogOut, Calendar, CheckCircle, Settings, BarChart3, User } from 'lucide-react';
import { useInstructor } from './InstructorProvider';
import { RecentlyViewed } from './RecentlyViewed';

const Sidebar = () => {
  const { displayName, profile, isSetup } = useInstructor();

  return (
    <aside className="w-64 bg-white border-r border-[#dfe6e9] flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6 border-b border-[#dfe6e9]">
        <h1 className="text-xl font-bold text-[#0f4c75] flex items-center gap-2">
          <Activity className="w-6 h-6" />
          NursEd Admin
        </h1>
        <p className="text-xs text-gray-500 mt-1">Page County Tech Center</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <Link href="/" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-50 hover:text-[#0f4c75]">
          <Home className="w-5 h-5" />
          Dashboard
        </Link>
        <Link href="/analytics" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-50 hover:text-[#0f4c75]">
          <BarChart3 className="w-5 h-5" />
          Analytics
        </Link>
        <Link href="/students" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-50 hover:text-[#0f4c75]">
          <Users className="w-5 h-5" />
          Students
        </Link>
        <Link href="/students/skills" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-50 hover:text-[#0f4c75]">
          <CheckCircle className="w-5 h-5" />
          Skills Tracker
        </Link>
        <Link href="/gradebook" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-50 hover:text-[#0f4c75]">
          <BookOpen className="w-5 h-5" />
          Gradebook
        </Link>
        <Link href="/curriculum" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-50 hover:text-[#0f4c75]">
          <BookOpen className="w-5 h-5" />
          Curriculum Map
        </Link>
        <Link href="/clinicals" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-50 hover:text-[#0f4c75]">
          <Activity className="w-5 h-5" />
          Clinical Logs
        </Link>
        <Link href="/calendar" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-50 hover:text-[#0f4c75]">
          <Calendar className="w-5 h-5" />
          Schedule
        </Link>
        <div className="pt-4 mt-4 border-t border-gray-100">
          <p className="px-3 text-xs font-semibold text-gray-400 uppercase mb-2">AI Tools</p>
          <Link href="/assistant" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-blue-50 hover:text-[#0f4c75]">
            <Activity className="w-5 h-5" />
            Co-Instructor
          </Link>
          <Link href="/knowledge" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-blue-50 hover:text-[#0f4c75]">
            <BookOpen className="w-5 h-5" />
            Knowledge Base
          </Link>
          <Link href="/lab" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-blue-50 hover:text-[#0f4c75]">
            <BookOpen className="w-5 h-5" />
            Curriculum Lab
          </Link>
          <Link href="/settings" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-blue-50 hover:text-[#0f4c75]">
            <Settings className="w-5 h-5" />
            AI Settings
          </Link>
        </div>
      </nav>

      <div className="pt-4 border-t border-gray-100">
        <RecentlyViewed />
      </div>

      <div className="p-4 border-t border-[#dfe6e9] space-y-2">
        <Link href="/profile" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-50">
          <User className="w-5 h-5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {isSetup ? displayName : 'Setup Profile'}
            </div>
            {isSetup && profile.email && (
              <div className="text-xs text-gray-400 truncate">{profile.email}</div>
            )}
          </div>
        </Link>
        {isSetup && (
          <div className="flex items-center gap-3 px-3 py-2 text-gray-500 rounded-md hover:bg-gray-50 cursor-pointer text-sm">
            <LogOut className="w-4 h-4" />
            Close App
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
