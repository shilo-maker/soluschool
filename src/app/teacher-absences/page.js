'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TeacherAbsencesPage() {
  const router = useRouter();
  const [absences, setAbsences] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReportForm, setShowReportForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    teacherId: '',
    startDate: '',
    endDate: '',
    reason: '',
    notes: '',
  });

  useEffect(() => {
    fetchAbsences();
    fetchTeachers();
  }, []);

  const fetchAbsences = async () => {
    try {
      const response = await fetch('/api/teacher-absences');
      const data = await response.json();
      if (data.success) {
        setAbsences(data.absences);
      }
    } catch (error) {
      console.error('Error fetching absences:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await fetch('/api/teachers');
      const data = await response.json();
      if (data.success) {
        setTeachers(data.teachers);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/teacher-absences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        alert(`היעדרות דווחה בהצלחה. ${data.affectedLessons.length} שיעורים מושפעים.`);
        setShowReportForm(false);
        setFormData({
          teacherId: '',
          startDate: '',
          endDate: '',
          reason: '',
          notes: '',
        });
        fetchAbsences();

        // Navigate to the substitute request page if there are affected lessons
        if (data.affectedLessons.length > 0) {
          router.push(`/teacher-absences/${data.absence.id}`);
        }
      } else {
        alert(`שגיאה: ${data.error}`);
      }
    } catch (error) {
      console.error('Error reporting absence:', error);
      alert('שגיאה בדיווח היעדרות');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { text: 'ממתין', className: 'badge-warning' },
      coverage_needed: { text: 'נדרש כיסוי', className: 'badge-danger' },
      partially_covered: { text: 'מכוסה חלקית', className: 'badge-info' },
      fully_covered: { text: 'מכוסה במלואו', className: 'badge-success' },
      cancelled: { text: 'בוטל', className: 'badge-secondary' },
    };
    const badge = statusMap[status] || { text: status, className: 'badge-secondary' };
    return <span className={`badge ${badge.className}`}>{badge.text}</span>;
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>היעדרויות מורים</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowReportForm(!showReportForm)}
        >
          {showReportForm ? 'ביטול' : '+ דיווח היעדרות'}
        </button>
      </div>

      {/* Report Absence Form */}
      {showReportForm && (
        <div className="card mb-4">
          <div className="card-header card-gradient-header">
            <h5 className="mb-0">דיווח היעדרות מורה</h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">בחר מורה *</label>
                <select
                  className="form-select"
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  required
                >
                  <option value="">-- בחר מורה --</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.user.firstName} {teacher.user.lastName} ({teacher.instruments.join(', ')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">תאריך התחלה *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">תאריך סיום *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">סיבה</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="למשל: טיול משפחתי, אירוע, מחלה"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">הערות נוספות</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="d-flex gap-2">
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={submitting}
                >
                  {submitting ? 'שולח...' : 'שלח דיווח'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowReportForm(false)}
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Absences List */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">היעדרויות קיימות</h5>
        </div>
        <div className="card-body">
          {absences.length === 0 ? (
            <p className="text-muted text-center py-4">אין היעדרויות רשומות</p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>מורה</th>
                    <th>תקופה</th>
                    <th>סיבה</th>
                    <th>שיעורים מושפעים</th>
                    <th>סטטוס</th>
                    <th>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {absences.map((absence) => (
                    <tr key={absence.id}>
                      <td>
                        {absence.teacher.user.firstName} {absence.teacher.user.lastName}
                      </td>
                      <td>
                        {new Date(absence.startDate).toLocaleDateString('he-IL')} -{' '}
                        {new Date(absence.endDate).toLocaleDateString('he-IL')}
                      </td>
                      <td>{absence.reason || '-'}</td>
                      <td>
                        <span className="badge badge-info">
                          {absence.substituteRequests.length}
                        </span>
                      </td>
                      <td>{getStatusBadge(absence.status)}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => router.push(`/teacher-absences/${absence.id}`)}
                        >
                          צפה בפרטים
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
