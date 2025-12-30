'use client';

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
  MoreVertical,
  Stethoscope,
  GraduationCap,
  Clock
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
    .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover {
      background-color: #4f46e5;
    }
  `;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50">
      <style>{css}</style>
      
      {/* Sidebar: Calendar & Filters */}
      <aside className="w-96 border-r bg-white p-6 flex flex-col h-full overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-indigo-600" />
            Schedule
          </h1>
          <p className="text-sm text-gray-500">Manage clinicals, exams & curriculum.</p>
        </div>

        <div className="border rounded-xl p-4 shadow-sm bg-white mb-6 flex justify-center">
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

        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Filter className="w-3 h-3" /> Filters
          </h3>
          <div className="space-y-2">
            <button 
              onClick={() => setFilter('all')}
              className={`w-full text-left p-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${filter === 'all' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <span>All Events</span>
              <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs">{seedEvents.length}</span>
            </button>
            <button 
              onClick={() => setFilter('clinical')}
              className={`w-full text-left p-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${filter === 'clinical' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4" /> Clinicals
              </div>
              <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-xs">
                {seedEvents.filter(e => e.type === 'clinical').length}
              </span>
            </button>
            <button 
               onClick={() => setFilter('exam')}
               className={`w-full text-left p-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${filter === 'exam' ? 'bg-red-50 text-red-700' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4" /> Exams
              </div>
              <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs">
                {seedEvents.filter(e => e.type === 'exam').length}
              </span>
            </button>
             <button 
               onClick={() => setFilter('school')}
               className={`w-full text-left p-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${filter === 'school' ? 'bg-teal-50 text-teal-700' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" /> School Events
              </div>
              <span className="bg-teal-100 text-teal-600 px-2 py-0.5 rounded-full text-xs">
                {seedEvents.filter(e => e.type === 'school').length}
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content: Daily View / Proctor Operations */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              {selectedDate ? format(selectedDate, 'MMMM do, yyyy') : 'Select a date'}
            </h2>
            <p className="text-gray-500">
              {selectedDateEvents.length} event{selectedDateEvents.length !== 1 && 's'} scheduled
            </p>
          </div>
          <button className="btn btn-primary bg-indigo-600 hover:bg-indigo-700 shadow-md">
            + Schedule Event
          </button>
        </header>

        <div className="space-y-6">
          {selectedDateEvents.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
               <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
               <p className="text-gray-400 font-medium">No events scheduled for this day.</p>
               <button className="text-indigo-600 text-sm font-medium hover:underline mt-2">Add Clinical or Exam</button>
            </div>
          ) : (
            selectedDateEvents.map(event => (
              <div key={event.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className={`h-1.5 w-full ${
                  event.type === 'clinical' ? 'bg-indigo-500' : 
                  event.type === 'exam' ? 'bg-red-500' : 'bg-teal-500'
                }`} />
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide ${
                          event.type === 'clinical' ? 'bg-indigo-100 text-indigo-700' : 
                          event.type === 'exam' ? 'bg-red-100 text-red-700' : 'bg-teal-100 text-teal-700'
                        }`}>
                          {event.type}
                        </span>
                        {event.status === 'packet-sent' && (
                          <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                            <Send className="w-3 h-3" /> Packet Sent
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">{event.title}</h3>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                     <div className="flex items-center gap-3 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {event.location}
                     </div>
                     <div className="flex items-center gap-3 text-sm text-gray-600">
                        <Users className="w-4 h-4 text-gray-400" />
                        Proctor: <span className="font-medium text-gray-900">{event.proctor}</span>
                     </div>
                     <div className="flex items-center gap-3 text-sm text-gray-600">
                        <Clock className="w-4 h-4 text-gray-400" />
                        07:00 AM - 03:00 PM
                     </div>
                  </div>

                  {event.type === 'clinical' && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-sm text-gray-800 mb-1">Proctor Packet Status</h4>
                          <p className="text-xs text-gray-500">Includes roster, eval forms, and instructor notes.</p>
                        </div>
                        <div className="flex gap-2">
                           <button className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm">
                             View Packet
                           </button>
                           <button className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm flex items-center gap-2">
                             <Send className="w-4 h-4" />
                             Resend to Proctor
                           </button>
                        </div>
                      </div>
                      
                      {/* Feedback Loop Preview */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                         <h5 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Proctor Feedback (Real-time)</h5>
                         <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                           <div className="w-2 h-2 rounded-full bg-yellow-400 mt-1.5" />
                           <div>
                              <p className="text-xs font-bold text-yellow-800">Note from Sarah Jenkins, RN:</p>
                              <p className="text-sm text-yellow-700 mt-1">&quot;Student group arrived on time. One student (J. Doe) needs review on sterile technique.&quot;</p>
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
      </main>
    </div>
  );
}
