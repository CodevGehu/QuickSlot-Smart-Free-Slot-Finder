import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { UserCheck, Search, Clock, MapPin, BookOpen, AlertCircle, Calendar } from 'lucide-react';

export const TeacherFinder: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('Bhatt');
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1); // Default Monday
  const [scheduleData, setScheduleData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const popularFaculty = [
    'Dr. Chandradeep Bhatt',
    'Dr. Aashish Garg',
    'Mr. Himanshu Namdev',
    'Ms. Preeti Choudhary',
    'Mr. Tushar Sharma',
    'Mr. Mukesh Kumar',
    'Mr. Aniket Rawat',
    'Ms. Manika Manwal'
  ];

  useEffect(() => {
    doSearch('Bhatt');
  }, []);

  const doSearch = async (query: string) => {
    if (!query.trim()) return;
    try {
      const results = await api.searchTeachers(query);
      setTeachers(results);
      if (results.length > 0) {
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
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <UserCheck size={28} color="#6366f1" /> Teacher Schedule & Venue Lookup
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '0.3rem' }}>
          Search faculty members to view their scheduled lecture classrooms, laboratory practicals, and free consultation periods.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="card glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search by faculty name (e.g. Dr. Chandradeep Bhatt, Dr. Aashish Garg, Mr. Himanshu Namdev)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') doSearch(searchQuery); }}
              style={{ paddingLeft: '2.5rem' }}
            />
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
          <button className="btn btn-primary" onClick={() => doSearch(searchQuery)}>
            Search
          </button>
        </div>

        {/* Quick Suggestion Pills */}
        <div style={{ marginTop: '0.9rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Popular Department Faculty:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {popularFaculty.map((fName) => (
              <button
                key={fName}
                className="btn btn-outline"
                style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem', borderRadius: '14px' }}
                onClick={() => {
                  setSearchQuery(fName);
                  doSearch(fName);
                }}
              >
                {fName}
              </button>
            ))}
          </div>
        </div>

        {/* Search Results */}
        {teachers.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem', paddingTop: '0.8rem', borderTop: '1px solid var(--border-color)' }}>
            {teachers.map((t) => (
              <button
                key={t.id}
                className={`btn ${selectedTeacher?.id === t.id ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.85rem', padding: '0.35rem 0.8rem' }}
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
          <div className="card glass-panel" style={{ padding: '1.5rem', height: 'fit-content' }}>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '1.4rem', 
              fontWeight: 700, 
              color: 'white', 
              marginBottom: '1rem' 
            }}>
              {selectedTeacher.full_name.charAt(selectedTeacher.full_name.indexOf('.') !== -1 ? selectedTeacher.full_name.indexOf('.') + 2 : 0)}
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.2rem 0' }}>{selectedTeacher.full_name}</h3>
            <div style={{ fontSize: '0.85rem', color: '#818cf8', fontWeight: 600, marginBottom: '0.75rem' }}>
              {selectedTeacher.faculty_id}
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
              <div><strong>Department:</strong> {selectedTeacher.department}</div>
              <div><strong>Institutional Email:</strong> {selectedTeacher.email}</div>
            </div>

            {/* Next Scheduled Class Card */}
            {scheduleData?.next_scheduled_class && (
              <div style={{ padding: '0.85rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Next Class Today
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                  {scheduleData.next_scheduled_class.subject_code}: {scheduleData.next_scheduled_class.subject_name}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Room: <strong>{scheduleData.next_scheduled_class.venue_name}</strong> • Sec {scheduleData.next_scheduled_class.section}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#34d399', marginTop: '0.2rem' }}>
                  {scheduleData.next_scheduled_class.start_time} - {scheduleData.next_scheduled_class.end_time}
                </div>
              </div>
            )}

            {/* Official Disclaimer */}
            <div style={{ marginTop: '1.2rem', padding: '0.75rem', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem' }}>
              <AlertCircle size={16} color="#fbbf24" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <div>{scheduleData?.disclaimer || "Displays scheduled timetable venue, not real-time physical GPS location."}</div>
            </div>
          </div>

          {/* Schedule View */}
          <div className="card glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem', paddingBottom: '0.8rem', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                  Scheduled Classes for {scheduleData?.day_name}
                </h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {scheduleData?.scheduled_classes?.length || 0} teaching sessions recorded in official timetable
                </div>
              </div>

              {/* Day Selector Buttons */}
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {days.map((d) => (
                  <button
                    key={d.num}
                    className={`btn ${selectedDay === d.num ? 'btn-primary' : 'btn-outline'}`}
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                    onClick={() => handleDayChange(d.num)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading verified schedule...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {/* Scheduled Classes List */}
                {scheduleData?.scheduled_classes?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {scheduleData.scheduled_classes.map((cls: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          padding: '1rem',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '0.8rem'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#818cf8' }}>
                              {cls.subject_code}
                            </span>
                            <span className="badge badge-secondary">{cls.entry_type}</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              Section {cls.section}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#ffffff', marginTop: '0.25rem', fontWeight: 600 }}>
                            {cls.subject_name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            Source: {cls.source_ref}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.95rem', color: '#34d399' }}>
                            <Clock size={16} /> {cls.start_time} - {cls.end_time}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem', justifyContent: 'flex-end' }}>
                            <MapPin size={14} /> <strong>{cls.venue_name}</strong> ({cls.building})
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                    No scheduled lectures or laboratory practicals on this day.
                  </div>
                )}

                {/* Free Periods for Consultation */}
                {scheduleData?.free_periods?.length > 0 && (
                  <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34d399', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Clock size={16} /> Free Consultation Windows
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {scheduleData.free_periods.map((fp: any, idx: number) => (
                        <div
                          key={idx}
                          style={{
                            padding: '0.4rem 0.8rem',
                            borderRadius: '6px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            fontSize: '0.85rem',
                            color: '#34d399'
                          }}
                        >
                          {fp.start_time} - {fp.end_time} ({fp.duration_minutes} mins available)
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
