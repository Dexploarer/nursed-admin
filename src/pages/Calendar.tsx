import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { seedEvents } from '@/lib/data';
import {
  Calendar as CalendarIcon,
  MapPin,
  Users,
  FileCheck,
  Send,
  Filter,
  Plus,
  Stethoscope,
  GraduationCap,
  Clock,
  Bell,
  ChevronRight
} from 'lucide-react';
import 'react-day-picker/dist/style.css';

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [filter, setFilter] = useState<'all' | 'clinical' | 'school' | 'exam'>('all');

  // Filter events based on selection
  const filteredEvents = seedEvents.filter(event => {
    if (filter === 'all') return true;
    return event.type === filter;
  });

  const selectedDateEvents = filteredEvents.filter(event =>
    selectedDate && event.date.toDateString() === selectedDate.toDateString()
  );

  const css = `
    .rdp {
      --rdp-accent-color: #4f46e5;
      --rdp-background-color: #eef2ff;
    }
    .rdp-day_selected {
      background-color: #4f46e5 !important;
      color: white !important;
      font-weight: 700;
    }
    .rdp-day_selected:hover {
      background-color: #4338ca !important;
    }
    .rdp-day:hover {
      background-color: #eef2ff;
    }
  `;

  const getEventColor = (type: string) => {
    switch (type) {
      case 'clinical': return 'from-indigo-500 to-purple-500';
      case 'exam': return 'from-red-500 to-pink-500';
      case 'school': return 'from-teal-500 to-cyan-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  const getEventBg = (type: string) => {
    switch (type) {
      case 'clinical': return 'bg-indigo-50 border-indigo-200';
      case 'exam': return 'bg-red-50 border-red-200';
      case 'school': return 'bg-teal-50 border-teal-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 -m-8 p-8">
      <style>{css}</style>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-black text-gray-900 flex items-center gap-3 mb-2">
                <CalendarIcon className="w-10 h-10 text-indigo-600" />
                Academic Calendar
              </h1>
              <p className="text-gray-600 text-lg">Manage clinicals, exams & curriculum events</p>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:border-indigo-600 hover:text-indigo-600 transition-all font-semibold shadow-sm">
                <Bell className="w-5 h-5" />
                Notifications
              </button>
              <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl hover:shadow-xl transition-all font-semibold shadow-lg">
                <Plus className="w-5 h-5" />
                Schedule Event
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-indigo-100 rounded-xl">
                  <Stethoscope className="w-6 h-6 text-indigo-600" />
                </div>
                <span className="text-2xl font-black text-indigo-600">
                  {seedEvents.filter(e => e.type === 'clinical').length}
                </span>
              </div>
              <div className="text-sm text-gray-500 font-medium">Clinical Days</div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-red-100 rounded-xl">
                  <FileCheck className="w-6 h-6 text-red-600" />
                </div>
                <span className="text-2xl font-black text-red-600">
                  {seedEvents.filter(e => e.type === 'exam').length}
                </span>
              </div>
              <div className="text-sm text-gray-500 font-medium">Exams Scheduled</div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-teal-100 rounded-xl">
                  <GraduationCap className="w-6 h-6 text-teal-600" />
                </div>
                <span className="text-2xl font-black text-teal-600">
                  {seedEvents.filter(e => e.type === 'school').length}
                </span>
              </div>
              <div className="text-sm text-gray-500 font-medium">School Events</div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <CalendarIcon className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-2xl font-black text-purple-600">{seedEvents.length}</span>
              </div>
              <div className="text-sm text-gray-500 font-medium">Total Events</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar: Calendar & Filters */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
              <div className="flex justify-center mb-4">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={{
                    event: seedEvents.map(e => e.date)
                  }}
                  modifiersStyles={{
                    event: { fontWeight: 'bold', textDecoration: 'underline', textDecorationColor: '#4f46e5' }
                  }}
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-5 h-5 text-gray-600" />
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Event Filters</h3>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`w-full text-left p-4 rounded-xl text-sm font-semibold transition-all ${
                    filter === 'all'
                      ? 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>All Events</span>
                    <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs font-black">
                      {seedEvents.length}
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => setFilter('clinical')}
                  className={`w-full text-left p-4 rounded-xl text-sm font-semibold transition-all ${
                    filter === 'clinical'
                      ? 'bg-gradient-to-r from-indigo-100 to-indigo-50 text-indigo-900 shadow-sm'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4" />
                      <span>Clinical Days</span>
                    </div>
                    <span className="bg-indigo-200 text-indigo-700 px-3 py-1 rounded-full text-xs font-black">
                      {seedEvents.filter(e => e.type === 'clinical').length}
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => setFilter('exam')}
                  className={`w-full text-left p-4 rounded-xl text-sm font-semibold transition-all ${
                    filter === 'exam'
                      ? 'bg-gradient-to-r from-red-100 to-red-50 text-red-900 shadow-sm'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4" />
                      <span>Exams</span>
                    </div>
                    <span className="bg-red-200 text-red-700 px-3 py-1 rounded-full text-xs font-black">
                      {seedEvents.filter(e => e.type === 'exam').length}
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => setFilter('school')}
                  className={`w-full text-left p-4 rounded-xl text-sm font-semibold transition-all ${
                    filter === 'school'
                      ? 'bg-gradient-to-r from-teal-100 to-teal-50 text-teal-900 shadow-sm'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      <span>School Events</span>
                    </div>
                    <span className="bg-teal-200 text-teal-700 px-3 py-1 rounded-full text-xs font-black">
                      {seedEvents.filter(e => e.type === 'school').length}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </aside>

          {/* Main Content: Event List */}
          <main className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">
                    {selectedDate ? format(selectedDate, 'EEEE, MMMM do, yyyy') : 'Select a date'}
                  </h2>
                  <p className="text-gray-500 font-medium mt-1">
                    {selectedDateEvents.length} event{selectedDateEvents.length !== 1 && 's'} scheduled
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {selectedDateEvents.length === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                    <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-semibold text-lg mb-2">No events scheduled</p>
                    <p className="text-gray-400 text-sm mb-4">This day is free of scheduled activities</p>
                    <button className="text-indigo-600 text-sm font-bold hover:underline flex items-center gap-1 mx-auto">
                      <Plus className="w-4 h-4" />
                      Add Event for This Day
                    </button>
                  </div>
                ) : (
                  selectedDateEvents.map(event => (
                    <div key={event.id} className={`rounded-2xl border-2 overflow-hidden hover:shadow-lg transition-all ${getEventBg(event.type)}`}>
                      <div className={`h-2 w-full bg-gradient-to-r ${getEventColor(event.type)}`} />
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider bg-gradient-to-r ${getEventColor(event.type)} text-white`}>
                                {event.type}
                              </span>
                              {event.status === 'packet-sent' && (
                                <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-500 text-white flex items-center gap-1">
                                  <Send className="w-3 h-3" /> Packet Sent
                                </span>
                              )}
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-1">{event.title}</h3>
                          </div>
                          <button className="text-gray-400 hover:text-indigo-600 p-2 hover:bg-white rounded-lg transition-colors">
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="flex items-center gap-3 text-sm text-gray-700 font-medium">
                            <div className="p-2 bg-white rounded-lg">
                              <MapPin className="w-4 h-4 text-indigo-600" />
                            </div>
                            {event.location}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-700 font-medium">
                            <div className="p-2 bg-white rounded-lg">
                              <Users className="w-4 h-4 text-indigo-600" />
                            </div>
                            Proctor: <span className="font-bold text-gray-900">{event.proctor}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-700 font-medium col-span-2">
                            <div className="p-2 bg-white rounded-lg">
                              <Clock className="w-4 h-4 text-indigo-600" />
                            </div>
                            07:00 AM - 03:00 PM (8 hours)
                          </div>
                        </div>

                        {event.type === 'clinical' && (
                          <div className="bg-white rounded-xl p-5 border-2 border-gray-100">
                            <div className="flex justify-between items-center mb-4">
                              <div>
                                <h4 className="font-black text-sm text-gray-900 mb-1">Proctor Packet Management</h4>
                                <p className="text-xs text-gray-500">Includes roster, evaluation forms, and instructor notes</p>
                              </div>
                              <div className="flex gap-2">
                                <button className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-200 transition-colors">
                                  View Packet
                                </button>
                                <button className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg text-sm font-bold hover:shadow-lg transition-all flex items-center gap-2">
                                  <Send className="w-4 h-4" />
                                  Resend
                                </button>
                              </div>
                            </div>

                            {/* Feedback Preview */}
                            <div className="pt-4 border-t border-gray-200">
                              <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Live Proctor Feedback</h5>
                              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border-2 border-amber-200">
                                <div className="flex-shrink-0 w-3 h-3 rounded-full bg-amber-400 mt-1 animate-pulse" />
                                <div className="flex-1">
                                  <p className="text-xs font-black text-amber-900 mb-1">Sarah Jenkins, RN - Clinical Instructor</p>
                                  <p className="text-sm text-amber-800 leading-relaxed">&quot;Student group arrived on time. One student (J. Doe) needs additional review on sterile technique protocol.&quot;</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </main>
        </div>
    </div>
  );
}
