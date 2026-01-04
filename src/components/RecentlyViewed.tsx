import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getRecentlyViewed, RecentlyViewedStudent } from '@/lib/recently-viewed';
import { Clock } from 'lucide-react';
import { useSidebar } from './SidebarProvider';
import { clsx } from 'clsx';

export function RecentlyViewed() {
  const [recentStudents, setRecentStudents] = useState<RecentlyViewedStudent[]>([]);
  const { isCollapsed } = useSidebar();

  useEffect(() => {
    const recent = getRecentlyViewed();
    setRecentStudents(recent);

    // Listen for changes to recently viewed
    const interval = setInterval(() => {
      const updated = getRecentlyViewed();
      setRecentStudents(updated);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  if (recentStudents.length === 0) {
    return null;
  }

  return (
    <div className="px-2 pb-2">
      {!isCollapsed && (
        <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          <Clock className="w-3 h-3" />
          Recent
        </div>
      )}
      {isCollapsed && (
        <div className="flex justify-center py-2">
          <Clock className="w-4 h-4 text-gray-400" />
        </div>
      )}
      <div className="space-y-1">
        {recentStudents.slice(0, isCollapsed ? 3 : 5).map(student => (
          <Link
            key={student.id}
            to={`/students/view?id=${student.id}`}
            className={clsx(
              "flex items-center gap-2 px-2 py-2 text-sm rounded-lg hover:bg-gray-100/80 transition-colors group",
              isCollapsed ? "justify-center" : ""
            )}
            title={isCollapsed ? `${student.firstName} ${student.lastName}` : undefined}
          >
            <div className="shrink-0 w-6 h-6 rounded-full bg-linear-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-semibold shadow-sm">
              {student.firstName.charAt(0)}{student.lastName.charAt(0)}
            </div>
            {!isCollapsed && (
              <span className="truncate text-gray-700 group-hover:text-blue-600 font-medium">
                {student.firstName} {student.lastName}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
