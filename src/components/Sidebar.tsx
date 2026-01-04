import { Link, useLocation } from 'react-router-dom';
import { 
  Home, Users, BookOpen, Activity, LogOut, Calendar, CheckCircle, Settings, 
  BarChart3, User, Menu, X, Sparkles, Stethoscope, ClipboardCheck, UserCheck, 
  CalendarDays, ClipboardList, CheckSquare, Gamepad2, FileText, GraduationCap,
  ChevronRight, LayoutDashboard
} from 'lucide-react';
import { useInstructor } from './InstructorProvider';
import { useSidebar } from './SidebarProvider';
import { RecentlyViewed } from './RecentlyViewed';
import { clsx } from 'clsx';
import { useState } from 'react';

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  badge?: number;
}

interface NavSection {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  color: string;
}

const Sidebar = () => {
  const { displayName, profile, isSetup } = useInstructor();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['main', 'curriculum']));

  const navSections: NavSection[] = [
    {
      title: 'Main',
      icon: LayoutDashboard,
      color: 'emerald',
      items: [
        { icon: Home, label: 'Dashboard', path: '/' },
        { icon: BarChart3, label: 'Analytics', path: '/analytics' },
        { icon: Users, label: 'Students', path: '/students' },
        { icon: ClipboardCheck, label: 'Attendance', path: '/attendance' },
        { icon: CheckCircle, label: 'Skills Tracker', path: '/students/skills' },
        { icon: BookOpen, label: 'Gradebook', path: '/gradebook' },
        { icon: Stethoscope, label: 'Clinical Logs', path: '/clinicals' },
        { icon: UserCheck, label: 'Preceptors', path: '/preceptors' },
        { icon: Calendar, label: 'Schedule', path: '/calendar' },
      ],
    },
    {
      title: 'Curriculum',
      icon: GraduationCap,
      color: 'cyan',
      items: [
        { icon: GraduationCap, label: 'Curriculum Map', path: '/curriculum' },
        { icon: CalendarDays, label: 'Teaching Calendar', path: '/teaching-calendar' },
        { icon: FileText, label: 'Lesson Plans', path: '/lesson-plans' },
      ],
    },
    {
      title: 'Clinical Tracking',
      icon: Stethoscope,
      color: 'amber',
      items: [
        { icon: CalendarDays, label: 'Clinical Schedule', path: '/clinical-schedule' },
        { icon: ClipboardList, label: 'Daily Tracking', path: '/daily-tracking' },
        { icon: CheckSquare, label: 'Hour Approvals', path: '/hour-approvals' },
        { icon: Gamepad2, label: 'VR Tracking', path: '/vr-tracking' },
      ],
    },
    {
      title: 'AI Tools',
      icon: Sparkles,
      color: 'violet',
      items: [
        { icon: Sparkles, label: 'Co-Instructor', path: '/assistant' },
        { icon: BookOpen, label: 'Knowledge Base', path: '/knowledge' },
        { icon: Activity, label: 'Curriculum Lab', path: '/lab' },
        { icon: Settings, label: 'AI Settings', path: '/settings' },
      ],
    },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const toggleSection = (sectionTitle: string) => {
    if (isCollapsed) return;
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionTitle)) {
        next.delete(sectionTitle);
      } else {
        next.add(sectionTitle);
      }
      return next;
    });
  };

  const getColorClasses = (color: string, isActive: boolean) => {
    const colors: Record<string, { bg: string; text: string; border: string; icon: string; indicator: string }> = {
      emerald: {
        bg: isActive ? 'bg-emerald-500/20' : 'hover:bg-slate-800',
        text: isActive ? 'text-emerald-400' : 'text-slate-300',
        border: isActive ? 'border-emerald-500/30' : 'border-transparent',
        icon: isActive ? 'text-emerald-400' : 'text-slate-400',
        indicator: 'bg-emerald-500',
      },
      cyan: {
        bg: isActive ? 'bg-cyan-500/20' : 'hover:bg-slate-800',
        text: isActive ? 'text-cyan-400' : 'text-slate-300',
        border: isActive ? 'border-cyan-500/30' : 'border-transparent',
        icon: isActive ? 'text-cyan-400' : 'text-slate-400',
        indicator: 'bg-cyan-500',
      },
      amber: {
        bg: isActive ? 'bg-amber-500/20' : 'hover:bg-slate-800',
        text: isActive ? 'text-amber-400' : 'text-slate-300',
        border: isActive ? 'border-amber-500/30' : 'border-transparent',
        icon: isActive ? 'text-amber-400' : 'text-slate-400',
        indicator: 'bg-amber-500',
      },
      violet: {
        bg: isActive ? 'bg-violet-500/20' : 'hover:bg-slate-800',
        text: isActive ? 'text-violet-400' : 'text-slate-300',
        border: isActive ? 'border-violet-500/30' : 'border-transparent',
        icon: isActive ? 'text-violet-400' : 'text-slate-400',
        indicator: 'bg-violet-500',
      },
    };
    return colors[color] || colors.emerald;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={toggleSidebar}
        />
      )}
      
      <aside 
        className={clsx(
          "bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-r border-slate-800/60 flex flex-col h-screen fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out shadow-2xl",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800/60 shrink-0 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            {!isCollapsed ? (
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative">
                  <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-lg shadow-lg">
                    <Stethoscope className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900 shadow-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                    NursEd
                  </h1>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Admin Portal</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full">
                <div className="relative">
                  <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-lg shadow-lg">
                    <Stethoscope className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900 shadow-sm" />
                </div>
              </div>
            )}
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all duration-200 shrink-0 hover:scale-105 active:scale-95 border border-slate-800 hover:border-slate-700"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {navSections.map((section) => {
            const SectionIcon = section.icon;
            const isExpanded = expandedSections.has(section.title);
            const hasActiveItem = section.items.some(item => isActive(item.path));
            
            return (
              <div key={section.title} className="mb-4 last:mb-0">
                {/* Section Header */}
                {!isCollapsed ? (
                  <button
                    onClick={() => toggleSection(section.title)}
                    className={clsx(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 mb-1",
                      hasActiveItem 
                        ? "bg-slate-800/50" 
                        : "hover:bg-slate-800/30"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <SectionIcon 
                        className={clsx(
                          "w-4 h-4 transition-colors",
                          hasActiveItem 
                            ? (section.color === 'emerald' ? 'text-emerald-400' : 
                               section.color === 'cyan' ? 'text-cyan-400' :
                               section.color === 'amber' ? 'text-amber-400' : 'text-violet-400')
                            : "text-slate-500"
                        )} 
                      />
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        {section.title}
                      </span>
                    </div>
                    <ChevronRight 
                      className={clsx(
                        "w-3 h-3 text-slate-500 transition-transform duration-200",
                        isExpanded && "rotate-90"
                      )} 
                    />
                  </button>
                ) : (
                  <div className="flex justify-center py-2 mb-1">
                    <SectionIcon className="w-4 h-4 text-slate-500" />
                  </div>
                )}

                {/* Section Items */}
                {(!isCollapsed ? isExpanded : true) && (
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.path);
                      const colors = getColorClasses(section.color, active);
                      
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={clsx(
                            "group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative border",
                            colors.bg,
                            colors.text,
                            colors.border,
                            "hover:shadow-lg hover:shadow-black/20",
                            isCollapsed && "justify-center"
                          )}
                          title={isCollapsed ? item.label : undefined}
                        >
                          {/* Active Indicator */}
                          {active && (
                            <div 
                              className={clsx("absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full", colors.indicator)}
                            />
                          )}
                          
                          {/* Icon */}
                          <div className={clsx(
                            "relative shrink-0 transition-transform duration-200",
                            active && "scale-110",
                            "group-hover:scale-105"
                          )}>
                            <Icon className={clsx(
                              "w-5 h-5 transition-colors",
                              colors.icon
                            )} />
                          </div>
                          
                          {/* Label */}
                          {!isCollapsed && (
                            <span className="text-sm font-semibold truncate flex-1">
                              {item.label}
                            </span>
                          )}
                          
                          {/* Badge */}
                          {item.badge && !isCollapsed && (
                            <span className="px-2 py-0.5 text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-pink-500 rounded-full shadow-sm">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Recently Viewed */}
        {!isCollapsed && (
          <div className="px-3 pt-2 border-t border-slate-800/60 shrink-0">
            <RecentlyViewed />
          </div>
        )}

        {/* Profile Section */}
        <div className="p-3 border-t border-slate-800/60 bg-slate-900/50 backdrop-blur-sm shrink-0">
          <Link 
            to="/profile" 
            className={clsx(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
              isActive('/profile') 
                ? "bg-emerald-500/20 shadow-lg border border-emerald-500/30" 
                : "hover:bg-slate-800/50 border border-transparent",
              isCollapsed && "justify-center"
            )}
            title={isCollapsed ? (isSetup ? displayName : 'Setup Profile') : undefined}
          >
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 via-cyan-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-slate-800">
                {isSetup && displayName ? displayName.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
              </div>
              {isSetup && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-slate-900 shadow-sm" />
              )}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-200 truncate">
                  {isSetup ? displayName : 'Setup Profile'}
                </div>
                {isSetup && profile.email && (
                  <div className="text-xs text-slate-400 truncate">{profile.email}</div>
                )}
              </div>
            )}
          </Link>
          
          {isSetup && !isCollapsed && (
            <button 
              className="flex items-center gap-3 px-3 py-2.5 text-slate-400 rounded-xl hover:bg-rose-500/10 hover:text-rose-400 cursor-pointer text-sm transition-all duration-200 w-full mt-2 group border border-transparent hover:border-rose-500/20"
              onClick={() => {
                if (window.__TAURI__) {
                  window.__TAURI__.core.exit();
                }
              }}
            >
              <LogOut className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              <span className="truncate font-semibold">Close App</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
