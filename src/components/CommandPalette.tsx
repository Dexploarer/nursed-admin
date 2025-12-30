
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Clock, BarChart3, Calendar, BookOpen, Users, Settings, X } from 'lucide-react';
import { loadStudents } from '@/lib/db';
import { Student } from '@/types';

interface Command {
  id: string;
  title: string;
  icon: React.ReactNode;
  action: () => void;
  category: string;
}

export function CommandPalette() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    loadStudents().then(setStudents).catch(console.error);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navigationCommands: Command[] = [
    {
      id: 'nav-dashboard',
      title: 'Dashboard',
      icon: <BarChart3 className="w-4 h-4" />,
      action: () => {
        navigate('/');
        setIsOpen(false);
      },
      category: 'Navigation',
    },
    {
      id: 'nav-students',
      title: 'Students',
      icon: <Users className="w-4 h-4" />,
      action: () => {
        navigate('/students');
        setIsOpen(false);
      },
      category: 'Navigation',
    },
    {
      id: 'nav-clinicals',
      title: 'Clinical Hours',
      icon: <Clock className="w-4 h-4" />,
      action: () => {
        navigate('/clinicals');
        setIsOpen(false);
      },
      category: 'Navigation',
    },
    {
      id: 'nav-analytics',
      title: 'Analytics',
      icon: <BarChart3 className="w-4 h-4" />,
      action: () => {
        navigate('/analytics');
        setIsOpen(false);
      },
      category: 'Navigation',
    },
    {
      id: 'nav-calendar',
      title: 'Calendar',
      icon: <Calendar className="w-4 h-4" />,
      action: () => {
        navigate('/calendar');
        setIsOpen(false);
      },
      category: 'Navigation',
    },
    {
      id: 'nav-curriculum',
      title: 'Curriculum Map',
      icon: <BookOpen className="w-4 h-4" />,
      action: () => {
        navigate('/curriculum');
        setIsOpen(false);
      },
      category: 'Navigation',
    },
    {
      id: 'nav-settings',
      title: 'Settings',
      icon: <Settings className="w-4 h-4" />,
      action: () => {
        navigate('/settings');
        setIsOpen(false);
      },
      category: 'Navigation',
    },
  ];

  const studentCommands: Command[] = useMemo(() =>
    students.map(student => ({
      id: `student-${student.id}`,
      title: `${student.firstName} ${student.lastName}`,
      icon: <User className="w-4 h-4" />,
      action: () => {
        navigate(`/students/view?id=${student.id}`);
        setIsOpen(false);
      },
      category: 'Students',
    }))
  , [students]);

  const allCommands = useMemo(() =>
    [...navigationCommands, ...studentCommands]
  , [studentCommands]);

  const filteredCommands = useMemo(() => {
    if (!search) return allCommands.slice(0, 10);

    const searchLower = search.toLowerCase();
    return allCommands
      .filter(cmd => cmd.title.toLowerCase().includes(searchLower))
      .slice(0, 8);
  }, [search, allCommands]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Command Palette */}
      <div className="fixed top-[20vh] left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
        <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for pages, students, or actions..."
              className="flex-1 outline-none text-gray-900 placeholder-gray-400"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {filteredCommands.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No results found for "{search}"
              </div>
            ) : (
              <div className="py-2">
                {Object.entries(
                  filteredCommands.reduce((acc, cmd) => {
                    if (!acc[cmd.category]) acc[cmd.category] = [];
                    acc[cmd.category].push(cmd);
                    return acc;
                  }, {} as Record<string, Command[]>)
                ).map(([category, commands]) => (
                  <div key={category} className="mb-2">
                    <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      {category}
                    </div>
                    {commands.map(cmd => (
                      <button
                        key={cmd.id}
                        onClick={cmd.action}
                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg text-gray-600">
                          {cmd.icon}
                        </div>
                        <span className="text-gray-900">{cmd.title}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">Enter</kbd>
                Select
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">Esc</kbd>
              Close
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
