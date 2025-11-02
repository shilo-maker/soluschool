'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';

export default function StudentCheckInPage() {
  const router = useRouter();
  const [checkInMethod, setCheckInMethod] = useState('visual'); // Always use visual selector
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [todaysLessons, setTodaysLessons] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null); // For swipe confirmation
  const [swipePosition, setSwipePosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Fetch all students for visual selector
  useEffect(() => {
    fetchStudents();

    // Connect to Socket.io for real-time updates
    const socket = io();

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    // Listen for check-in updates
    socket.on('student-checkin-update', () => {
      console.log('Received check-in update, refreshing...');
      fetchStudents();
    });

    socket.on('teacher-checkin-update', () => {
      console.log('Received teacher check-in update, refreshing...');
      fetchStudents();
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/student-check-in');
      const data = await response.json();
      if (data.success) {
        console.log('Students data:', data.students);
        setStudents(data.students);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleCheckIn = async (method, value, lessonId = null) => {
    setLoading(true);
    setMessage(null);

    try {
      const body = { method, value };
      if (lessonId) {
        body.lessonId = lessonId;
      }

      const response = await fetch('/api/student-check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStudentInfo(data.student);
        setTodaysLessons(data.todaysLessons || []);
        setMessage({ type: 'success', text: data.message });

        // Auto-reset after 5 seconds
        setTimeout(() => {
          resetCheckIn();
        }, 5000);
      } else {
        setMessage({ type: 'error', text: data.error || 'שגיאה בזיהוי' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'שגיאה בחיבור לשרת' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };


  const handleLessonCheckIn = async (lessonId) => {
    setLoading(true);

    try {
      const response = await fetch('/api/student-check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'studentId',
          value: studentInfo.id,
          lessonId
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update lessons list
        setTodaysLessons(prev =>
          prev.map(lesson =>
            lesson.id === lessonId
              ? { ...lesson, checkedIn: true, checkedInAt: new Date() }
              : lesson
          )
        );
        setMessage({
          type: 'success',
          text: data.alreadyCheckedIn ? data.message : 'נוכחות נרשמה בהצלחה!'
        });

        setTimeout(() => setMessage(null), 2000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'שגיאה ברישום נוכחות' });
    } finally {
      setLoading(false);
    }
  };

  const resetCheckIn = () => {
    setStudentInfo(null);
    setTodaysLessons([]);
    setMessage(null);
    setSelectedStudent(null);
    setSwipePosition(0);
    setIsDragging(false);
    // Refresh the student list
    fetchStudents();
  };

  // Swipe handlers
  const handleSwipeStart = (e) => {
    setIsDragging(true);
  };

  const handleSwipeMove = (e) => {
    if (!isDragging) return;

    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const maxSwipe = rect.width - 80; // 80px is the slider width

    let clientX;
    if (e.type === 'touchmove') {
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }

    const position = Math.max(0, Math.min(maxSwipe, clientX - rect.left - 40));
    setSwipePosition(position);

    // If swiped to the end (95% or more), trigger check-in
    if (position >= maxSwipe * 0.95) {
      setIsDragging(false);
      handleSwipeComplete();
    }
  };

  const handleSwipeEnd = () => {
    setIsDragging(false);
    // If not completed, reset
    if (swipePosition < 200) {
      setSwipePosition(0);
    }
  };

  const handleSwipeComplete = async () => {
    if (selectedStudent && !loading) {
      setLoading(true); // Show loading state immediately
      // Pass the specific lesson ID for check-in
      const lessonId = selectedStudent.nextLesson?.id;
      await handleCheckIn('studentId', selectedStudent.id, lessonId);
      setSelectedStudent(null);
      setSwipePosition(0);
    }
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setSwipePosition(0);
    setMessage(null);
  };

  // Show lessons after successful check-in
  if (studentInfo) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-gradient-primary py-4" dir="rtl">
        <div className="container-fluid px-3 px-md-4">
          <div className="card shadow-lg border-0 rounded-4 mx-auto" style={{ maxWidth: '900px' }}>
            <div className="card-body p-4 p-md-5 text-center">
              {/* Success Animation */}
              <div className="mb-4">
                <div className="success-checkmark" style={{ transform: 'scale(1.3)' }}>
                  <div className="check-icon">
                    <span className="icon-line line-tip"></span>
                    <span className="icon-line line-long"></span>
                    <div className="icon-circle"></div>
                    <div className="icon-fix"></div>
                  </div>
                </div>
              </div>

              <h1 className="display-3 fw-bold text-success mb-4">
                !שלום {studentInfo.name}
              </h1>

              {message && (
                <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} mb-4 fs-4`}>
                  {message.text}
                </div>
              )}

              {todaysLessons.length > 0 ? (
                <>
                  <h2 className="mb-4 fs-2">השיעורים שלך להיום:</h2>
                  <div className="row g-3 g-md-4">
                    {todaysLessons.map(lesson => (
                      <div key={lesson.id} className="col-12 col-md-6">
                        <div className={`card h-100 border-3 ${lesson.checkedIn ? 'border-success bg-success bg-opacity-10' : 'border-primary'} position-relative`}>
                          {lesson.checkedIn && (
                            <div className="position-absolute top-0 end-0 m-3">
                              <div className="badge bg-success fs-5 px-3 py-2">
                                <i className="bi bi-check-circle-fill me-1"></i>
                                נוכחות נרשמה
                              </div>
                            </div>
                          )}
                          <div className="card-body p-4">
                            <h3 className="card-title mb-3">{lesson.instrument}</h3>
                            <p className="mb-2 fs-5">
                              <strong>מורה:</strong> {lesson.teacher}
                            </p>
                            <p className="mb-2 fs-5">
                              <strong>חדר:</strong> {lesson.room}
                            </p>
                            <p className="mb-3 fs-5">
                              <strong>שעה:</strong> {lesson.startTime}
                            </p>

                            {lesson.checkedIn ? (
                              <div className="text-center py-3">
                                <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '4rem' }}></i>
                                <p className="text-success fw-bold mt-3 mb-0 fs-5">
                                  ✓ נוכחות נרשמה בהצלחה
                                </p>
                              </div>
                            ) : (
                              <button
                                className="btn btn-primary btn-lg w-100 py-3 fs-5"
                                onClick={() => handleLessonCheckIn(lesson.id)}
                                disabled={loading}
                              >
                                <i className="bi bi-check2-square me-2"></i>
                                רישום נוכחות
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="alert alert-info fs-4 py-3">
                  <i className="bi bi-info-circle me-2"></i>
                  אין לך שיעורים להיום
                </div>
              )}

              <button
                className="btn btn-outline-secondary btn-lg mt-4 py-3 fs-4 px-5"
                onClick={resetCheckIn}
              >
                <i className="bi bi-arrow-right me-2"></i>
                חזרה
              </button>
            </div>
          </div>
        </div>

        <style jsx>{`
          .bg-gradient-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }

          .success-checkmark {
            width: 80px;
            height: 80px;
            margin: 0 auto;
          }

          .check-icon {
            width: 80px;
            height: 80px;
            position: relative;
            border-radius: 50%;
            box-sizing: content-box;
            border: 4px solid #4CAF50;
            animation: scaleAnimation 0.3s ease-in-out;
          }

          .icon-line {
            height: 5px;
            background-color: #4CAF50;
            display: block;
            border-radius: 2px;
            position: absolute;
            z-index: 10;
          }

          .line-tip {
            top: 46px;
            left: 14px;
            width: 25px;
            transform: rotate(45deg);
            animation: tipInPlace 0.3s ease-in-out 0.3s;
            animation-fill-mode: both;
          }

          .line-long {
            top: 38px;
            right: 8px;
            width: 47px;
            transform: rotate(-45deg);
            animation: longInPlace 0.3s ease-in-out 0.4s;
            animation-fill-mode: both;
          }

          .icon-circle {
            top: -4px;
            left: -4px;
            z-index: 10;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            position: absolute;
            box-sizing: content-box;
            border: 4px solid rgba(76, 175, 80, 0.5);
          }

          .icon-fix {
            top: 8px;
            width: 5px;
            left: 26px;
            z-index: 1;
            height: 85px;
            position: absolute;
            transform: rotate(-45deg);
            background-color: #fff;
          }

          @keyframes scaleAnimation {
            0% {
              opacity: 0;
              transform: scale(1.5);
            }
            100% {
              opacity: 1;
              transform: scale(1);
            }
          }

          @keyframes tipInPlace {
            0% {
              width: 0;
              left: 1px;
              top: 19px;
            }
            100% {
              width: 25px;
              left: 14px;
              top: 46px;
            }
          }

          @keyframes longInPlace {
            0% {
              width: 0;
              right: 46px;
              top: 54px;
            }
            100% {
              width: 47px;
              right: 8px;
              top: 38px;
            }
          }
        `}</style>
      </div>
    );
  }

  // Main selection screen
  if (!checkInMethod) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-gradient-primary" dir="rtl">
        <div className="container">
          <div className="text-center mb-5">
            <h1 className="display-3 fw-bold text-white mb-3">
              !ברוכים הבאים
            </h1>
            <p className="lead text-white-50">
              בחר את הדרך המועדפת עליך לרישום נוכחות
            </p>
          </div>

          <div className="row g-4">
            {/* QR Code Option */}
            <div className="col-md-4">
              <div
                className="card h-100 border-0 shadow-lg hover-card"
                onClick={() => setCheckInMethod('qr')}
                style={{ cursor: 'pointer' }}
              >
                <div className="card-body text-center p-5">
                  <div className="mb-4">
                    <i className="bi bi-qr-code display-1 text-primary"></i>
                  </div>
                  <h3 className="card-title fw-bold mb-3">QR סריקת קוד</h3>
                  <p className="text-muted">
                    סרוק את הקוד שלך עם המצלמה
                  </p>
                </div>
              </div>
            </div>

            {/* Visual Selection Option */}
            <div className="col-md-4">
              <div
                className="card h-100 border-0 shadow-lg hover-card"
                onClick={() => setCheckInMethod('visual')}
                style={{ cursor: 'pointer' }}
              >
                <div className="card-body text-center p-5">
                  <div className="mb-4">
                    <i className="bi bi-person-circle display-1 text-success"></i>
                  </div>
                  <h3 className="card-title fw-bold mb-3">לחץ על השם שלך</h3>
                  <p className="text-muted">
                    מצא ולחץ על השם שלך מהרשימה
                  </p>
                </div>
              </div>
            </div>

            {/* PIN Option */}
            <div className="col-md-4">
              <div
                className="card h-100 border-0 shadow-lg hover-card"
                onClick={() => setCheckInMethod('pin')}
                style={{ cursor: 'pointer' }}
              >
                <div className="card-body text-center p-5">
                  <div className="mb-4">
                    <i className="bi bi-123 display-1 text-warning"></i>
                  </div>
                  <h3 className="card-title fw-bold mb-3">PIN הזן קוד</h3>
                  <p className="text-muted">
                    4 הזן את הקוד שלך בן
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          .bg-gradient-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }

          .hover-card {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }

          .hover-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3) !important;
          }
        `}</style>
      </div>
    );
  }

  // QR Scanner View
  if (checkInMethod === 'qr') {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-gradient-primary" dir="rtl">
        <div className="container">
          <div className="card shadow-lg border-0 rounded-4">
            <div className="card-body p-5">
              <div className="text-center mb-4">
                <h2 className="fw-bold">QR סרוק את קוד ה</h2>
                <p className="text-muted">הצב את הקוד מול המצלמה</p>
              </div>

              <div id="qr-reader" className="mb-4"></div>

              {message && (
                <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'}`}>
                  {message.text}
                </div>
              )}

              <button
                className="btn btn-outline-secondary w-100"
                onClick={resetCheckIn}
              >
                <i className="bi bi-arrow-right me-2"></i>
                חזרה
              </button>
            </div>
          </div>
        </div>

        <style jsx>{`
          .bg-gradient-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
        `}</style>
      </div>
    );
  }

  // Swipe to Confirm Screen
  if (checkInMethod === 'visual' && selectedStudent) {
    return (
      <div className="min-vh-100 d-flex align-items-center" dir="rtl" style={{ background: '#f8f9fa' }}>
        <div className="container-fluid px-3 px-md-4">
          <div className="card shadow-lg border-0 rounded-4 position-relative mx-auto" style={{ maxWidth: '500px' }}>
            {/* Loading Overlay */}
            {loading && (
              <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-90 rounded-4" style={{ zIndex: 1000 }}>
                <div className="text-center">
                  <div className="spinner-border text-primary mb-2" role="status" style={{ width: '2.5rem', height: '2.5rem' }}>
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-primary mb-0">...מאמת נוכחות</p>
                </div>
              </div>
            )}

            <div className="card-body p-4">
              <div className="text-center mb-3">
                <h2 className="fw-bold mb-2" style={{ fontSize: '1.75rem', color: '#2c3e50' }}>
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </h2>
                {selectedStudent.nextLesson && (
                  <div style={{ fontSize: '0.95rem', color: '#7f8c8d' }}>
                    <div className="mb-1">
                      <i className="bi bi-clock-fill me-2"></i>
                      {selectedStudent.nextLesson.startTime}
                    </div>
                    <div className="mb-1">
                      <i className="bi bi-door-closed-fill me-2"></i>
                      {selectedStudent.nextLesson.room} - {selectedStudent.nextLesson.instrument}
                    </div>
                    <div>
                      <i className="bi bi-person-badge-fill me-2"></i>
                      {selectedStudent.nextLesson.teacher}
                      {selectedStudent.nextLesson.teacherCheckedIn ? (
                        <span className="badge bg-success ms-2" style={{ fontSize: '0.75rem' }}>הגיע</span>
                      ) : (
                        <span className="badge bg-warning text-dark ms-2" style={{ fontSize: '0.75rem' }}>לא הגיע</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-3">
                <p className="text-center mb-2 fw-semibold" style={{ color: '#34495e', fontSize: '1rem' }}>
                  החלק לאישור נוכחות
                </p>

                <div
                  className="swipe-container"
                  onMouseMove={handleSwipeMove}
                  onMouseUp={handleSwipeEnd}
                  onMouseLeave={handleSwipeEnd}
                  onTouchMove={handleSwipeMove}
                  onTouchEnd={handleSwipeEnd}
                >
                  <div className="swipe-track">
                    <div className="swipe-text">
                      {swipePosition > 200 ? '✓ שחרר לאישור' : 'החלק ←'}
                    </div>
                    <div
                      className="swipe-slider"
                      style={{ transform: `translateX(${swipePosition}px)` }}
                      onMouseDown={handleSwipeStart}
                      onTouchStart={handleSwipeStart}
                    >
                      <i className="bi bi-chevron-double-left"></i>
                    </div>
                  </div>
                </div>
              </div>

              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setSelectedStudent(null);
                  setSwipePosition(0);
                }}
                disabled={loading}
                style={{ borderRadius: '10px', padding: '0.6rem' }}
              >
                <i className="bi bi-arrow-right me-2"></i>
                חזרה
              </button>
            </div>
          </div>
        </div>

        <style jsx>{`
          .swipe-container {
            padding: 0;
            user-select: none;
            -webkit-user-select: none;
            touch-action: none;
          }

          .swipe-track {
            position: relative;
            height: 70px;
            background: linear-gradient(90deg, #e9ecef 0%, #27ae60 100%);
            border-radius: 35px;
            overflow: hidden;
            box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.1);
          }

          .swipe-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 1.1rem;
            font-weight: 600;
            color: #7f8c8d;
            pointer-events: none;
            z-index: 1;
          }

          .swipe-slider {
            position: absolute;
            top: 4px;
            left: 4px;
            width: 62px;
            height: 62px;
            background: linear-gradient(135deg, #3498db, #2980b9);
            border-radius: 31px;
            cursor: grab;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.5rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            transition: box-shadow 0.2s ease;
            z-index: 2;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
          }

          .swipe-slider:active {
            cursor: grabbing;
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
          }
        `}</style>
      </div>
    );
  }

  // Visual Student Selector
  if (checkInMethod === 'visual') {
    return (
      <div className="min-vh-100 py-3" dir="rtl" style={{ background: '#f8f9fa' }}>
        <div className="container-fluid px-3 px-md-4">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h1 className="fw-bold mb-2" style={{ color: '#2c3e50', fontSize: '2rem' }}>
                קבלת תלמידים
              </h1>
              {students.length > 0 && (
                <div className="d-flex gap-2 flex-wrap">
                  {students.filter(s => !s.checkedIn).length > 0 && (
                    <span className="badge rounded-pill px-2 py-1" style={{ background: '#3498db', fontSize: '0.9rem' }}>
                      <i className="bi bi-clock-history me-1"></i>
                      {students.filter(s => !s.checkedIn).length} ממתינים
                    </span>
                  )}
                  {students.filter(s => s.checkedIn).length > 0 && (
                    <span className="badge rounded-pill px-2 py-1" style={{ background: '#27ae60', fontSize: '0.9rem' }}>
                      <i className="bi bi-check-circle-fill me-1"></i>
                      {students.filter(s => s.checkedIn).length} נרשמו
                    </span>
                  )}
                </div>
              )}
            </div>
            <button
              className="btn btn-light shadow-sm"
              style={{ borderRadius: '10px', padding: '0.5rem 1rem' }}
              onClick={() => router.push('/login')}
            >
              <i className="bi bi-box-arrow-in-left me-2"></i>
              Login
            </button>
          </div>

          {initialLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted fs-5">טוען תלמידים...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-4">
              <i className="bi bi-calendar-x text-muted mb-2" style={{ fontSize: '3rem' }}></i>
              <p className="text-muted fs-5">אין תלמידים עם שיעורים בשעה הקרובה</p>
            </div>
          ) : null}

          {message && (
            <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} mb-2 py-2 shadow-sm`} style={{ borderRadius: '10px', fontSize: '0.95rem' }}>
              {message.text}
            </div>
          )}

          <div className="row g-2 g-md-3">
            {students.map(student => (
              <div key={student.id} className="col-6 col-md-4 col-lg-3 col-xl-2">
                {student.checkedIn ? (
                  <div className="student-card checked-in h-100">
                    <div className="card-header-badge">
                      <i className="bi bi-check-circle-fill me-1"></i>
                      נרשם
                    </div>
                    <h3 className="student-name">{student.firstName} {student.lastName}</h3>
                    {student.nextLesson && (
                      <div className="lesson-details">
                        <div className="detail-item">
                          <i className="bi bi-clock-fill"></i>
                          <span>{student.nextLesson.startTime}</span>
                        </div>
                        <div className="detail-item">
                          <i className="bi bi-door-closed-fill"></i>
                          <span>{student.nextLesson.room} - {student.nextLesson.instrument}</span>
                        </div>
                        <div className="detail-item">
                          <i className="bi bi-person-badge-fill"></i>
                          <span>{student.nextLesson.teacher}</span>
                          {student.nextLesson.teacherCheckedIn ? (
                            <span className="teacher-status present">הגיע</span>
                          ) : (
                            <span className="teacher-status absent">לא הגיע</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    className="student-card waiting h-100"
                    onClick={() => handleStudentSelect(student)}
                    disabled={loading}
                  >
                    <h3 className="student-name">{student.firstName} {student.lastName}</h3>
                    {student.nextLesson && (
                      <div className="lesson-details">
                        <div className="detail-item">
                          <i className="bi bi-clock-fill"></i>
                          <span>{student.nextLesson.startTime}</span>
                        </div>
                        <div className="detail-item">
                          <i className="bi bi-door-closed-fill"></i>
                          <span>{student.nextLesson.room} - {student.nextLesson.instrument}</span>
                        </div>
                        <div className="detail-item">
                          <i className="bi bi-person-badge-fill"></i>
                          <span>{student.nextLesson.teacher}</span>
                          {student.nextLesson.teacherCheckedIn ? (
                            <span className="teacher-status present">הגיע</span>
                          ) : (
                            <span className="teacher-status absent">לא הגיע</span>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="tap-indicator">
                      <i className="bi bi-hand-index-thumb"></i>
                      <span>לחץ לרישום</span>
                    </div>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <style jsx>{`
          .student-card {
            background: white;
            border-radius: 16px;
            padding: 1.25rem;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border: none;
            text-align: center;
            position: relative;
            cursor: pointer;
            user-select: none;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            aspect-ratio: 1 / 1;
            width: 100%;
          }

          .student-card.waiting {
            border: 2px solid #e0e0e0;
          }

          .student-card.waiting:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 16px rgba(52, 152, 219, 0.15);
            border-color: #3498db;
          }

          .student-card.waiting:active {
            transform: translateY(-2px);
          }

          .student-card.checked-in {
            background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
            border: 2px solid #27ae60;
            cursor: default;
          }

          .card-header-badge {
            position: absolute;
            top: 0.75rem;
            left: 0.75rem;
            background: #27ae60;
            color: white;
            padding: 0.35rem 0.75rem;
            border-radius: 16px;
            font-size: 0.8rem;
            font-weight: 600;
            box-shadow: 0 2px 6px rgba(39, 174, 96, 0.3);
          }

          .student-name {
            font-size: 1.3rem;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 0.75rem;
            margin-top: 0.5rem;
            line-height: 1.2;
          }

          .lesson-details {
            width: 100%;
            background: rgba(255, 255, 255, 0.5);
            border-radius: 10px;
            padding: 0.75rem 0.5rem;
            margin-top: auto;
          }

          .detail-item {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.4rem;
            padding: 0.3rem 0;
            color: #34495e;
            font-size: 0.9rem;
            flex-wrap: wrap;
          }

          .detail-item i {
            color: #3498db;
            font-size: 1rem;
          }

          .checked-in .detail-item i {
            color: #27ae60;
          }

          .teacher-status {
            display: inline-block;
            padding: 0.2rem 0.6rem;
            border-radius: 10px;
            font-size: 0.75rem;
            font-weight: 600;
            margin-right: 0.3rem;
          }

          .teacher-status.present {
            background: #27ae60;
            color: white;
          }

          .teacher-status.absent {
            background: #f39c12;
            color: white;
          }

          .tap-indicator {
            margin-top: 0.75rem;
            padding: 0.6rem;
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
            border-radius: 10px;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.4rem;
            font-size: 0.95rem;
            width: 100%;
          }

          .tap-indicator i {
            font-size: 1.2rem;
          }

          .bg-gradient-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
        `}</style>
      </div>
    );
  }

  // PIN Pad
  if (checkInMethod === 'pin') {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-gradient-primary" dir="rtl">
        <div className="container">
          <div className="card shadow-lg border-0 rounded-4" style={{ maxWidth: '500px', margin: '0 auto' }}>
            <div className="card-body p-5">
              <div className="text-center mb-4">
                <h2 className="fw-bold">PIN הזן קוד</h2>
                <p className="text-muted">4 הזן את הקוד האישי שלך בן</p>
              </div>

              {/* PIN Display */}
              <div className="pin-display mb-4">
                <div className="d-flex justify-content-center gap-3">
                  {[0, 1, 2, 3].map(index => (
                    <div key={index} className="pin-dot">
                      {pin.length > index ? '●' : '○'}
                    </div>
                  ))}
                </div>
              </div>

              {message && (
                <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} mb-4`}>
                  {message.text}
                </div>
              )}

              {/* Number Pad */}
              <div className="row g-3 mb-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <div key={num} className="col-4">
                    <button
                      className="btn btn-primary btn-lg w-100 number-btn"
                      onClick={() => handlePinInput(num.toString())}
                      disabled={loading}
                    >
                      {num}
                    </button>
                  </div>
                ))}
                <div className="col-4">
                  <button
                    className="btn btn-outline-secondary btn-lg w-100"
                    onClick={resetCheckIn}
                  >
                    <i className="bi bi-x-lg"></i>
                  </button>
                </div>
                <div className="col-4">
                  <button
                    className="btn btn-primary btn-lg w-100 number-btn"
                    onClick={() => handlePinInput('0')}
                    disabled={loading}
                  >
                    0
                  </button>
                </div>
                <div className="col-4">
                  <button
                    className="btn btn-outline-danger btn-lg w-100"
                    onClick={handlePinDelete}
                  >
                    <i className="bi bi-backspace"></i>
                  </button>
                </div>
              </div>

              <button
                className="btn btn-outline-secondary w-100"
                onClick={resetCheckIn}
              >
                <i className="bi bi-arrow-right me-2"></i>
                חזרה
              </button>
            </div>
          </div>
        </div>

        <style jsx>{`
          .bg-gradient-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }

          .pin-display {
            padding: 30px 0;
          }

          .pin-dot {
            width: 60px;
            height: 60px;
            border: 3px solid #dee2e6;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            background: white;
            transition: all 0.3s ease;
          }

          .number-btn {
            height: 80px;
            font-size: 2rem;
            font-weight: bold;
            border-radius: 15px;
            transition: all 0.2s ease;
          }

          .number-btn:active {
            transform: scale(0.95);
          }
        `}</style>
      </div>
    );
  }

  return null;
}
