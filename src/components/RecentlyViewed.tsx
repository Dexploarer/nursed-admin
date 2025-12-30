
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getRecentlyViewed, RecentlyViewedStudent } from '@/lib/recently-viewed';
import { Clock, User } from 'lucide-react';

export function RecentlyViewed() {
  const [recentStudents, setRecentStudents] = useState<RecentlyViewedStudent[]>([]);

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
    <div className="px-4 pb-4">
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase">
        <Clock className="w-3 h-3" />
        Recent
      </div>
      <div className="space-y-1">
        {recentStudents.map(student => (
          <Link
            key={student.id}
            to={`/students/view?id=${student.id}`}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-50 hover:text-[#0f4c75] transition-colors"
          >
            <User className="w-4 h-4 flex-shrink-0 text-gray-400" />
            <span className="truncate">
              {student.firstName} {student.lastName}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
