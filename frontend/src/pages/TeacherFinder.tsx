import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { UserCheck, Search, Calendar, Clock, MapPin, BookOpen, AlertCircle, Sparkles } from 'lucide-react';

export const TeacherFinder: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('Verma');
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<number>(2); // Default Tuesday
  const [scheduleData, setScheduleData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    doSearch('Verma');
  }, []);

  const doSearch = async (query: string) => {
    if (!query.trim()) return;
    try {
      const results = await api.searchTeachers(query);
      setTeachers(results);
      if (results.length > 0 && !selectedTeacher) {
        selectTeacher(results[0]);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const selectTeacher = async (teacher: any) => {
    setSelectedTeacher(teacher);
    loadSchedule(teacher.id, selectedDay);
  };

  const loadSchedule = async (teacherId: string, day: number) => {
    setLoading(true);
    try {
      const data = await api.getTeacherSchedule(teacherId, day);
      setScheduleData(data);
    } catch (err: any) {
      alert(`Error loading schedule: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDayChange = (day: number) => {
    setSelectedDay(day);
    if (selectedTeacher) {
      loadSchedule(selectedTeacher.id, day);
    }
  };

  const days = [
    { num: 1, label: 'Mon' },
    { num: 2, label: 'Tue' },
    { num: 3, label: 'Wed' },
    { num: 4, label: 'Thu' },
    { num: 5, label: 'Fri' },
    { num: 6, label: 'Sat' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Title */}
      <div>
        <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <UserCheck size={26} color="#818CF8" /> Module B: Teacher Venue Finder
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.25rem' }}>
          Locate faculty members across campus venues based on official published class schedules.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              className="input-control"
              placeholder="Search faculty name (e.g. Dr. Rajesh Verma, Dr. Ananya Sharma, Prof. K.P. Nautiyal)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                doSearch(e.target.value);
              }}
              style={{ paddingLeft: '2.5rem' }}
            />
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
          <button className="btn btn-primary" onClick={() => doSearch(searchQuery)}>
            Search
          </button>
        </div>

        {/* Suggestion Chips */}
        {teachers.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
            {teachers.map((t) => (
              <button
                key={t.id}
                className={`btn btn-sm ${selectedTeacher?.id === t.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => selectTeacher(t)}
              >
                {t.full_name} ({t.faculty_id})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Schedule Content */}
      {selectedTeacher && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 320px) 1fr', gap: '1.5rem' }}>
          {/* Teacher Profile Card */}
          <div className="glass-card" style={{ padding: '1.5rem', height: 'fit-content' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '1rem' }}>
              {selectedTeacher.full_name.charAt(0)}
            </div>

            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{selectedTeacher.full_name}</h3>
            <div style={{ fontSize: '0.85rem', color: '#818CF8', fontWeight: 600, fontFamily: 'var(--font-mono)', marginBottom: '0.75rem' }}>
              {selectedTeacher.faculty_id}
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
              <div><strong>Department:</strong> {selectedTeacher.department}</div>
              <div><strong>Email:</strong> {selectedTeacher.email}</div>
            </div>

            {/* Next Scheduled Class Card */}
            {scheduleData?.next_scheduled_class && (
              <div style={{ padding: '0.85rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: '#34D399', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Next Class Today
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  {scheduleData.next_scheduled_class.subject_code} - {scheduleData.next_scheduled_class.venue_name}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {scheduleData.next_scheduled_class.start_time} - {scheduleData.next_scheduled_class.end_time}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: 'rgba(0,0,0,0.25)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem' }}>
              <AlertCircle size={16} color="#FBBF24" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <div>{scheduleData?.disclaimer || "Reports official scheduled venue information, not real-time physical GPS tracking."}</div>
            </div>
          </div>

          {/* Schedule View */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem' }}>Scheduled Classes for {scheduleData?.day_name}</h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {scheduleData?.scheduled_classes?.length || 0} teaching sessions recorded in active timetable
                </div>
              </div>

              {/* Day Selector Buttons */}
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {days.map((d) => (
                  <button
                    key={d.num}
                    className={`btn btn-sm ${selectedDay === d.num ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleDayChange(d.num)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading schedule...</div>
            ) : scheduleData?.scheduled_classes?.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No scheduled classes on {scheduleData?.day_name} for {selectedTeacher.full_name}.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {scheduleData?.scheduled_classes?.map((sc: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      padding: '1.1rem',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-sm)', background: sc.entry_type === 'LAB' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: sc.entry_type === 'LAB' ? '#F43F5E' : '#818CF8' }}>
                        <BookOpen size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                          {sc.subject_code}: {sc.subject_name}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          Section: <strong>{sc.section}</strong> • Type: {sc.entry_type} {sc.source_ref && `• ${sc.source_ref}`}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#A5B4FC', display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'flex-end' }}>
                        <MapPin size={16} /> {sc.venue_name}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        <Clock size={13} style={{ display: 'inline', marginRight: '0.25rem' }} />
                        {sc.start_time} - {sc.end_time} ({sc.building})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Free Periods Section */}
            {scheduleData?.free_periods && scheduleData.free_periods.length > 0 && (
              <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Free Academic Periods on {scheduleData.day_name}
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {scheduleData.free_periods.map((fp: any, idx: number) => (
                    <span key={idx} style={{ padding: '0.35rem 0.75rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#34D399', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>
                      {fp.start_time} - {fp.end_time} ({fp.duration_minutes}m)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
