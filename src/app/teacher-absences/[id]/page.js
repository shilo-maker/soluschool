'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function AbsenceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [absence, setAbsence] = useState(null);
  const [affectedLessons, setAffectedLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [availableSubstitutes, setAvailableSubstitutes] = useState([]);
  const [searchingSubstitutes, setSearchingSubstitutes] = useState(false);
  const [selectedSubstitute, setSelectedSubstitute] = useState(null);
  const [selectedSubstitutes, setSelectedSubstitutes] = useState([]); // NEW: For broadcast mode
  const [broadcastMode, setBroadcastMode] = useState(false); // NEW: Toggle broadcast mode

  useEffect(() => {
    fetchAbsenceDetails();
  }, [params.id]);

  const fetchAbsenceDetails = async () => {
    try {
      const response = await fetch(`/api/teacher-absences/${params.id}`);
      const data = await response.json();

      if (data.success) {
        setAbsence(data.absence);

        // Get affected lessons
        const lessonsResponse = await fetch(
          `/api/lessons?teacherId=${data.absence.teacherId}&startDate=${new Date(data.absence.startDate).toISOString().split('T')[0]}&endDate=${new Date(data.absence.endDate).toISOString().split('T')[0]}&status=scheduled`
        );
        const lessonsData = await lessonsResponse.json();
        if (lessonsData.success) {
          setAffectedLessons(lessonsData.lessons);
        }
      }
    } catch (error) {
      console.error('Error fetching absence details:', error);
    } finally {
      setLoading(false);
    }
  };

  const findSubstitutes = async (lesson) => {
    setSelectedLesson(lesson);
    setSearchingSubstitutes(true);
    setAvailableSubstitutes([]);
    setSelectedSubstitutes([]); // Reset selected substitutes
    setBroadcastMode(false); // Reset broadcast mode

    try {
      const response = await fetch('/api/teachers/find-substitutes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instrument: lesson.instrument,
          date: lesson.date,
          startTime: lesson.startTime,
          endTime: lesson.endTime,
          originalTeacherId: absence.teacherId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAvailableSubstitutes(data.availableTeachers);
      } else {
        alert(`שגיאה: ${data.error}`);
      }
    } catch (error) {
      console.error('Error finding substitutes:', error);
      alert('שגיאה בחיפוש מורים מחליפים');
    } finally {
      setSearchingSubstitutes(false);
    }
  };

  const toggleSubstituteSelection = (teacherId) => {
    setSelectedSubstitutes((prev) => {
      if (prev.includes(teacherId)) {
        return prev.filter((id) => id !== teacherId);
      } else {
        return [...prev, teacherId];
      }
    });
  };

  const requestSubstitute = async (substituteTeacherId) => {
    if (!selectedLesson) return;

    try {
      const response = await fetch('/api/substitute-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          absenceId: params.id,
          lessonIds: [selectedLesson.id],
          substituteTeacherId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('בקשת התחליף נשלחה בהצלחה!');
        setSelectedLesson(null);
        setAvailableSubstitutes([]);
        setSelectedSubstitute(null);
        setSelectedSubstitutes([]);
        setBroadcastMode(false);
        fetchAbsenceDetails();
      } else {
        alert(`שגיאה: ${data.error}`);
      }
    } catch (error) {
      console.error('Error requesting substitute:', error);
      alert('שגיאה בשליחת בקשת תחליף');
    }
  };

  const requestBroadcast = async () => {
    if (!selectedLesson || selectedSubstitutes.length === 0) return;

    if (selectedSubstitutes.length === 1) {
      alert('יש לבחור לפחות 2 מורים עבור מצב שידור');
      return;
    }

    try {
      const response = await fetch('/api/substitute-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          absenceId: params.id,
          lessonIds: [selectedLesson.id],
          substituteTeacherIds: selectedSubstitutes,
          broadcastMode: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`בקשות התחליף נשלחו ל-${selectedSubstitutes.length} מורים. הראשון שיאשר יקבל את השיעור!`);
        setSelectedLesson(null);
        setAvailableSubstitutes([]);
        setSelectedSubstitute(null);
        setSelectedSubstitutes([]);
        setBroadcastMode(false);
        fetchAbsenceDetails();
      } else {
        alert(`שגיאה: ${data.error}`);
      }
    } catch (error) {
      console.error('Error requesting broadcast:', error);
      alert('שגיאה בשליחת בקשות תחליף');
    }
  };

  const getSubstituteRequestStatus = (lessonId) => {
    if (!absence) return null;

    const request = absence.substituteRequests.find((r) => r.lessonId === lessonId);
    return request;
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { text: 'ממתין', className: 'badge-warning' },
      substitute_suggested: { text: 'תחליף הוצע', className: 'badge-info' },
      awaiting_approval: { text: 'ממתין לאישור', className: 'badge-info' },
      approved: { text: 'אושר', className: 'badge-success' },
      declined: { text: 'נדחה', className: 'badge-danger' },
      completed: { text: 'הושלם', className: 'badge-success' },
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

  if (!absence) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">היעדרות לא נמצאה</div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <button
        className="btn btn-ghost mb-3"
        onClick={() => router.push('/teacher-absences')}
      >
        ← חזרה לרשימת היעדרויות
      </button>

      {/* Absence Details */}
      <div className="card mb-4">
        <div className="card-header card-gradient-header">
          <h4 className="mb-0">פרטי היעדרות</h4>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <p>
                <strong>מורה:</strong> {absence.teacher.user.firstName}{' '}
                {absence.teacher.user.lastName}
              </p>
              <p>
                <strong>תקופה:</strong>{' '}
                {new Date(absence.startDate).toLocaleDateString('he-IL')} -{' '}
                {new Date(absence.endDate).toLocaleDateString('he-IL')}
              </p>
            </div>
            <div className="col-md-6">
              <p>
                <strong>סיבה:</strong> {absence.reason || '-'}
              </p>
              <p>
                <strong>סטטוס:</strong> {getStatusBadge(absence.status)}
              </p>
            </div>
          </div>
          {absence.notes && (
            <div className="mt-3">
              <strong>הערות:</strong>
              <p className="mb-0">{absence.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Affected Lessons */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">שיעורים מושפעים ({affectedLessons.length})</h5>
        </div>
        <div className="card-body">
          {affectedLessons.length === 0 ? (
            <p className="text-muted text-center py-4">אין שיעורים מושפעים</p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>תאריך</th>
                    <th>שעה</th>
                    <th>תלמיד</th>
                    <th>כלי</th>
                    <th>חדר</th>
                    <th>סטטוס תחליף</th>
                    <th>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {affectedLessons.map((lesson) => {
                    const substituteRequest = getSubstituteRequestStatus(lesson.id);
                    return (
                      <tr key={lesson.id}>
                        <td>{new Date(lesson.date).toLocaleDateString('he-IL')}</td>
                        <td>
                          {lesson.startTime} - {lesson.endTime}
                        </td>
                        <td>
                          {lesson.student.user.firstName} {lesson.student.user.lastName}
                        </td>
                        <td>{lesson.instrument}</td>
                        <td>{lesson.room.name}</td>
                        <td>
                          {substituteRequest ? (
                            <>
                              {getStatusBadge(substituteRequest.status)}
                              {substituteRequest.substituteTeacher && (
                                <div className="small text-muted">
                                  {substituteRequest.substituteTeacher.user.firstName}{' '}
                                  {substituteRequest.substituteTeacher.user.lastName}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-muted">לא נבקש</span>
                          )}
                        </td>
                        <td>
                          {!substituteRequest && (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => findSubstitutes(lesson)}
                            >
                              מצא תחליף
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Find Substitutes Modal/Section */}
      {selectedLesson && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">מורים זמינים לתחליף</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setSelectedLesson(null);
                    setAvailableSubstitutes([]);
                  }}
                />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <p>
                    <strong>שיעור:</strong> {new Date(selectedLesson.date).toLocaleDateString('he-IL')}{' '}
                    | {selectedLesson.startTime} - {selectedLesson.endTime} | {selectedLesson.instrument}
                  </p>
                  <p>
                    <strong>תלמיד:</strong> {selectedLesson.student.user.firstName}{' '}
                    {selectedLesson.student.user.lastName}
                  </p>
                </div>

                {searchingSubstitutes ? (
                  <div className="text-center py-4">
                    <div className="spinner"></div>
                    <p className="mt-2">מחפש מורים זמינים...</p>
                  </div>
                ) : availableSubstitutes.length === 0 ? (
                  <div className="alert alert-warning">
                    לא נמצאו מורים זמינים עבור שיעור זה
                  </div>
                ) : (
                  <>
                    {/* Broadcast Mode Toggle */}
                    {availableSubstitutes.length > 1 && (
                      <div className="mb-3 p-3 bg-light rounded">
                        <div className="form-check form-switch">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="broadcastModeToggle"
                            checked={broadcastMode}
                            onChange={(e) => {
                              setBroadcastMode(e.target.checked);
                              if (!e.target.checked) {
                                setSelectedSubstitutes([]);
                              }
                            }}
                          />
                          <label className="form-check-label" htmlFor="broadcastModeToggle">
                            <strong>מצב שידור</strong> - שלח לכמה מורים, הראשון שיאשר יקבל את השיעור
                          </label>
                        </div>
                      </div>
                    )}

                    <div className="list-group">
                      {availableSubstitutes.map((teacher) => (
                        <div
                          key={teacher.id}
                          className="list-group-item"
                        >
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center flex-grow-1">
                              {broadcastMode && (
                                <input
                                  type="checkbox"
                                  className="form-check-input me-3"
                                  checked={selectedSubstitutes.includes(teacher.id)}
                                  onChange={() => toggleSubstituteSelection(teacher.id)}
                                />
                              )}
                              <div>
                                <h6 className="mb-1">
                                  {teacher.user.firstName} {teacher.user.lastName}
                                </h6>
                                <p className="mb-1 small">
                                  <strong>כלים:</strong> {teacher.instruments.join(', ')}
                                </p>
                                <p className="mb-0 small text-muted">
                                  שיעורים שהושלמו: {teacher.totalLessonsCompleted}
                                </p>
                              </div>
                            </div>
                            {!broadcastMode && (
                              <button
                                className="btn btn-primary"
                                onClick={() => requestSubstitute(teacher.id)}
                              >
                                שלח בקשה
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {broadcastMode && (
                      <div className="mt-3">
                        <button
                          className="btn btn-primary w-100"
                          onClick={requestBroadcast}
                          disabled={selectedSubstitutes.length < 2}
                        >
                          שלח ל-{selectedSubstitutes.length} מורים נבחרים
                          {selectedSubstitutes.length < 2 && ' (נדרשים לפחות 2)'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
