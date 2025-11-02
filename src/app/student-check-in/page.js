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
      <div className="min-vh-100 d-flex align-items-center justify-content-center py-4 animated-gradient" dir="rtl" style={{
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Heebo, sans-serif'
      }}>
        {/* Animated background shapes */}
        <div style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          top: '-100px',
          right: '-100px',
          animation: 'float 6s ease-in-out infinite'
        }}></div>
        <div style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
          borderRadius: '50%',
          bottom: '-150px',
          left: '-150px',
          animation: 'float 8s ease-in-out infinite reverse'
        }}></div>

        <div className="container-fluid px-3 px-md-4" style={{ position: 'relative', zIndex: 1 }}>
          <div className="glass-success-card mx-auto" style={{ maxWidth: '900px' }}>
            <div className="p-4 p-md-5 text-center">
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

              <h1 className="display-3 fw-bold mb-4" style={{
                color: 'white',
                textShadow: '0 3px 20px rgba(0, 0, 0, 0.3)',
                fontFamily: 'Heebo, sans-serif',
                fontWeight: '900'
              }}>
                !שלום {studentInfo.name}
              </h1>

              {message && (
                <div className="mb-4 py-3 px-4" style={{
                  background: message.type === 'success'
                    ? 'rgba(39, 174, 96, 0.3)'
                    : 'rgba(231, 76, 60, 0.3)',
                  backdropFilter: 'blur(15px)',
                  WebkitBackdropFilter: 'blur(15px)',
                  borderRadius: '20px',
                  fontSize: '1.3rem',
                  color: 'white',
                  fontWeight: '600',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                  fontFamily: 'Heebo, sans-serif'
                }}>
                  {message.text}
                </div>
              )}

              {todaysLessons.length > 0 ? (
                <>
                  <h2 className="mb-4 fs-2" style={{
                    color: 'white',
                    fontWeight: '800',
                    textShadow: '0 2px 15px rgba(0, 0, 0, 0.3)',
                    fontFamily: 'Heebo, sans-serif'
                  }}>השיעורים שלך להיום:</h2>
                  <div className="row g-3 g-md-4">
                    {todaysLessons.map(lesson => (
                      <div key={lesson.id} className="col-12 col-md-6">
                        <div className={`glass-lesson-card h-100 position-relative ${lesson.checkedIn ? 'checked-in' : ''}`}>
                          {lesson.checkedIn && (
                            <div className="position-absolute top-0 end-0 m-3">
                              <div className="glass-badge-success">
                                <i className="bi bi-check-circle-fill me-2"></i>
                                נוכחות נרשמה
                              </div>
                            </div>
                          )}
                          <div className="p-4">
                            <h3 className="mb-3" style={{
                              fontSize: '1.75rem',
                              fontWeight: '800',
                              color: 'white',
                              textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
                              fontFamily: 'Heebo, sans-serif'
                            }}>{lesson.instrument}</h3>
                            <p className="mb-2" style={{
                              fontSize: '1.1rem',
                              color: 'white',
                              fontWeight: '500',
                              fontFamily: 'Heebo, sans-serif'
                            }}>
                              <strong style={{ fontWeight: '700' }}>מורה:</strong> {lesson.teacher}
                            </p>
                            <p className="mb-2" style={{
                              fontSize: '1.1rem',
                              color: 'white',
                              fontWeight: '500',
                              fontFamily: 'Heebo, sans-serif'
                            }}>
                              <strong style={{ fontWeight: '700' }}>חדר:</strong> {lesson.room}
                            </p>
                            <p className="mb-3" style={{
                              fontSize: '1.1rem',
                              color: 'white',
                              fontWeight: '500',
                              fontFamily: 'Heebo, sans-serif'
                            }}>
                              <strong style={{ fontWeight: '700' }}>שעה:</strong> {lesson.startTime}
                            </p>

                            {lesson.checkedIn ? (
                              <div className="text-center py-3">
                                <i className="bi bi-check-circle-fill" style={{
                                  fontSize: '4rem',
                                  color: 'rgba(39, 174, 96, 1)',
                                  filter: 'drop-shadow(0 4px 15px rgba(39, 174, 96, 0.5))'
                                }}></i>
                                <p className="fw-bold mt-3 mb-0" style={{
                                  fontSize: '1.2rem',
                                  color: 'white',
                                  textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                                  fontFamily: 'Heebo, sans-serif'
                                }}>
                                  ✓ נוכחות נרשמה בהצלחה
                                </p>
                              </div>
                            ) : (
                              <button
                                className="glass-checkin-button w-100"
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
                <div className="py-4 px-4" style={{
                  background: 'rgba(52, 152, 219, 0.3)',
                  backdropFilter: 'blur(15px)',
                  WebkitBackdropFilter: 'blur(15px)',
                  borderRadius: '20px',
                  fontSize: '1.3rem',
                  color: 'white',
                  fontWeight: '600',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                  fontFamily: 'Heebo, sans-serif'
                }}>
                  <i className="bi bi-info-circle me-2"></i>
                  אין לך שיעורים להיום
                </div>
              )}

              <button
                className="glass-back-button-success mt-4"
                onClick={resetCheckIn}
              >
                <i className="bi bi-arrow-right me-2"></i>
                חזרה
              </button>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }

          @keyframes gradientMove {
            0% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
            100% {
              background-position: 0% 50%;
            }
          }

          :global(.animated-gradient) {
            background: linear-gradient(135deg, #667eea, #764ba2, #f093fb, #667eea);
            background-size: 400% 400%;
            animation: gradientMove 15s ease infinite;
          }

          .glass-success-card {
            background: rgba(255, 255, 255, 0.12);
            backdrop-filter: blur(30px);
            -webkit-backdrop-filter: blur(30px);
            border-radius: 32px;
            border: 2px solid rgba(255, 255, 255, 0.25);
            box-shadow: 0 15px 50px rgba(0, 0, 0, 0.2);
            font-family: 'Heebo, sans-serif';
          }

          .glass-badge-success {
            font-family: 'Heebo, sans-serif';
            background: rgba(39, 174, 96, 0.8);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            color: white;
            padding: 0.6rem 1.2rem;
            border-radius: 20px;
            font-size: 1rem;
            font-weight: 700;
            box-shadow: 0 4px 15px rgba(39, 174, 96, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.3);
          }

          .glass-lesson-card {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(25px);
            -webkit-backdrop-filter: blur(25px);
            border-radius: 24px;
            border: 2px solid rgba(255, 255, 255, 0.25);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
            transition: all 0.3s ease;
            font-family: 'Heebo, sans-serif';
          }

          .glass-lesson-card.checked-in {
            background: rgba(39, 174, 96, 0.2);
            border-color: rgba(39, 174, 96, 0.5);
          }

          .glass-lesson-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 50px rgba(0, 0, 0, 0.25);
          }

          .glass-checkin-button {
            font-family: 'Heebo, sans-serif';
            background: linear-gradient(135deg, rgba(52, 152, 219, 0.7), rgba(41, 128, 185, 0.7));
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 16px;
            padding: 1rem 1.5rem;
            color: white;
            font-weight: 700;
            font-size: 1.15rem;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
          }

          .glass-checkin-button:hover {
            background: linear-gradient(135deg, rgba(52, 152, 219, 0.9), rgba(41, 128, 185, 0.9));
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(52, 152, 219, 0.6);
          }

          .glass-checkin-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .glass-back-button-success {
            font-family: 'Heebo, sans-serif';
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 18px;
            padding: 1rem 2.5rem;
            color: white;
            font-weight: 700;
            font-size: 1.3rem;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
          }

          .glass-back-button-success:hover {
            background: rgba(255, 255, 255, 0.25);
            transform: translateY(-3px);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            border-color: rgba(255, 255, 255, 0.5);
          }

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
      <div className="min-vh-100 d-flex align-items-center animated-gradient" dir="rtl" style={{
        fontFamily: 'Heebo, sans-serif',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Animated background shapes */}
        <div style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          top: '-100px',
          right: '-100px',
          animation: 'float 6s ease-in-out infinite'
        }}></div>

        <div className="container-fluid px-3 px-md-4" style={{ position: 'relative', zIndex: 1 }}>
          <div className="glass-confirm-card position-relative mx-auto" style={{ maxWidth: '600px' }}>
            {/* Loading Overlay */}
            {loading && (
              <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center rounded-4" style={{
                zIndex: 1000,
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)'
              }}>
                <div className="text-center">
                  <div className="spinner-border mb-3" role="status" style={{ width: '3rem', height: '3rem', color: 'white' }}>
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mb-0" style={{ color: 'white', fontWeight: '600', fontSize: '1.2rem' }}>...מאמת נוכחות</p>
                </div>
              </div>
            )}

            <div className="p-4 p-md-5">
              <div className="text-center mb-4">
                <h2 className="fw-bold mb-3" style={{
                  fontSize: '2.5rem',
                  color: 'white',
                  textShadow: '0 2px 15px rgba(0, 0, 0, 0.3)',
                  fontFamily: 'Heebo, sans-serif',
                  fontWeight: '900'
                }}>
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </h2>
                {selectedStudent.nextLesson && (
                  <div className="glass-lesson-info mb-4">
                    <div className="lesson-info-item">
                      <i className="bi bi-clock-fill"></i>
                      <span>{selectedStudent.nextLesson.startTime}</span>
                    </div>
                    <div className="lesson-info-item">
                      <i className="bi bi-door-closed-fill"></i>
                      <span>{selectedStudent.nextLesson.room} - {selectedStudent.nextLesson.instrument}</span>
                    </div>
                    <div className="lesson-info-item">
                      <i className="bi bi-person-badge-fill"></i>
                      <span>{selectedStudent.nextLesson.teacher}</span>
                      {selectedStudent.nextLesson.teacherCheckedIn ? (
                        <span className="teacher-badge success">הגיע</span>
                      ) : (
                        <span className="teacher-badge warning">לא הגיע</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <p className="text-center mb-3 fw-bold" style={{
                  color: 'white',
                  fontSize: '1.3rem',
                  textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
                  fontFamily: 'Heebo, sans-serif'
                }}>
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
                className="glass-back-button w-100"
                onClick={() => {
                  setSelectedStudent(null);
                  setSwipePosition(0);
                }}
                disabled={loading}
              >
                <i className="bi bi-arrow-right me-2"></i>
                חזרה
              </button>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }

          @keyframes gradientMove {
            0% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
            100% {
              background-position: 0% 50%;
            }
          }

          :global(.animated-gradient) {
            background: linear-gradient(135deg, #667eea, #764ba2, #f093fb, #667eea);
            background-size: 400% 400%;
            animation: gradientMove 15s ease infinite;
          }

          .glass-confirm-card {
            background: rgba(255, 255, 255, 0.12);
            backdrop-filter: blur(30px);
            -webkit-backdrop-filter: blur(30px);
            border-radius: 32px;
            border: 2px solid rgba(255, 255, 255, 0.25);
            box-shadow: 0 15px 50px rgba(0, 0, 0, 0.2);
            font-family: 'Heebo', sans-serif;
          }

          .glass-lesson-info {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 20px;
            padding: 1.25rem;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
          }

          .lesson-info-item {
            font-family: 'Heebo', sans-serif;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            gap: 0.75rem;
            padding: 0.6rem 0;
            color: white;
            font-size: 1.05rem;
            font-weight: 500;
          }

          .lesson-info-item i {
            color: rgba(255, 255, 255, 0.95);
            font-size: 1.2rem;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
          }

          .teacher-badge {
            font-family: 'Heebo', sans-serif;
            display: inline-block;
            padding: 0.35rem 0.85rem;
            border-radius: 14px;
            font-size: 0.85rem;
            font-weight: 700;
            margin-right: 0.4rem;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.35);
          }

          .teacher-badge.success {
            background: rgba(39, 174, 96, 0.7);
            color: white;
            box-shadow: 0 3px 10px rgba(39, 174, 96, 0.35);
          }

          .teacher-badge.warning {
            background: rgba(243, 156, 18, 0.7);
            color: white;
            box-shadow: 0 3px 10px rgba(243, 156, 18, 0.35);
          }

          .swipe-container {
            padding: 0;
            user-select: none;
            -webkit-user-select: none;
            touch-action: none;
          }

          .swipe-track {
            position: relative;
            height: 75px;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: 40px;
            overflow: hidden;
            border: 2px solid rgba(255, 255, 255, 0.25);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15), inset 0 2px 10px rgba(255, 255, 255, 0.1);
          }

          .swipe-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 1.15rem;
            font-weight: 700;
            color: white;
            pointer-events: none;
            z-index: 1;
            font-family: 'Heebo', sans-serif;
            text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          }

          .swipe-slider {
            position: absolute;
            top: 5px;
            left: 5px;
            width: 65px;
            height: 65px;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.75));
            border-radius: 35px;
            cursor: grab;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #667eea;
            font-size: 1.6rem;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
            transition: box-shadow 0.2s ease;
            z-index: 2;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
            border: 1px solid rgba(255, 255, 255, 0.5);
          }

          .swipe-slider:active {
            cursor: grabbing;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.35);
          }

          .glass-back-button {
            font-family: 'Heebo', sans-serif;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 16px;
            padding: 0.85rem 1.5rem;
            color: white;
            font-weight: 600;
            font-size: 1.05rem;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
          }

          .glass-back-button:hover {
            background: rgba(255, 255, 255, 0.25);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.18);
            border-color: rgba(255, 255, 255, 0.4);
          }

          .glass-back-button:active {
            transform: translateY(0);
          }

          .glass-back-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    );
  }

  // Visual Student Selector
  if (checkInMethod === 'visual') {
    return (
      <div className="min-vh-100 py-4 animated-gradient" dir="rtl" style={{
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Heebo, sans-serif'
      }}>
        {/* Animated background shapes */}
        <div style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          top: '-100px',
          right: '-100px',
          animation: 'float 6s ease-in-out infinite'
        }}></div>
        <div style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
          borderRadius: '50%',
          bottom: '-150px',
          left: '-150px',
          animation: 'float 8s ease-in-out infinite reverse'
        }}></div>

        <div className="container-fluid px-3 px-md-4" style={{ position: 'relative', zIndex: 1 }}>
          {/* Glass Header */}
          <div className="glass-header mb-4">
            <div>
              <h1 className="fw-bold mb-2" style={{ color: 'white', fontSize: '2.5rem', textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                קבלת תלמידים
              </h1>
              {students.length > 0 && (
                <div className="d-flex gap-2 flex-wrap">
                  {students.filter(s => !s.checkedIn).length > 0 && (
                    <span className="glass-badge waiting-badge">
                      <i className="bi bi-clock-history me-1"></i>
                      {students.filter(s => !s.checkedIn).length} ממתינים
                    </span>
                  )}
                  {students.filter(s => s.checkedIn).length > 0 && (
                    <span className="glass-badge success-badge">
                      <i className="bi bi-check-circle-fill me-1"></i>
                      {students.filter(s => s.checkedIn).length} נרשמו
                    </span>
                  )}
                </div>
              )}
            </div>
            <button
              className="glass-button"
              onClick={() => router.push('/login')}
            >
              <i className="bi bi-box-arrow-in-left me-2"></i>
              Login
            </button>
          </div>

          {initialLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border mb-3" role="status" style={{
                width: '3rem',
                height: '3rem',
                color: 'white',
                filter: 'drop-shadow(0 4px 10px rgba(255, 255, 255, 0.3))'
              }}>
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="fs-4" style={{ color: 'white', fontWeight: '600', textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                טוען תלמידים...
              </p>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-5" style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '24px',
              padding: '3rem 2rem',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
            }}>
              <i className="bi bi-calendar-x mb-3" style={{
                fontSize: '4rem',
                color: 'white',
                filter: 'drop-shadow(0 4px 10px rgba(255, 255, 255, 0.2))'
              }}></i>
              <p className="fs-4" style={{ color: 'white', fontWeight: '600', textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                אין תלמידים עם שיעורים בשעה הקרובה
              </p>
            </div>
          ) : null}

          {message && (
            <div className={`mb-3 py-3 px-4`} style={{
              background: message.type === 'success'
                ? 'rgba(39, 174, 96, 0.3)'
                : 'rgba(231, 76, 60, 0.3)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              borderRadius: '16px',
              fontSize: '1rem',
              color: 'white',
              fontWeight: '600',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
            }}>
              {message.text}
            </div>
          )}

          <div className="row g-3 g-md-4">
            {students.map(student => (
              <div key={student.id} className="col-12 col-sm-6 col-lg-4 col-xl-3">
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
          * {
            font-family: 'Heebo', sans-serif !important;
          }

          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }

          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes gradientMove {
            0% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
            100% {
              background-position: 0% 50%;
            }
          }

          :global(.animated-gradient) {
            background: linear-gradient(135deg, #667eea, #764ba2, #f093fb, #667eea);
            background-size: 400% 400%;
            animation: gradientMove 15s ease infinite;
          }

          .glass-header {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: 24px;
            padding: 1.5rem 2rem;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
            font-family: 'Heebo', sans-serif;
          }

          .glass-badge {
            font-family: 'Heebo', sans-serif;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.95rem;
            font-weight: 600;
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          }

          .waiting-badge {
            background: rgba(52, 152, 219, 0.3);
          }

          .success-badge {
            background: rgba(39, 174, 96, 0.3);
          }

          .glass-button {
            font-family: 'Heebo', sans-serif;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 16px;
            padding: 0.75rem 1.5rem;
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          }

          .glass-button:hover {
            background: rgba(255, 255, 255, 0.25);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
          }

          .student-card {
            background: rgba(255, 255, 255, 0.12);
            backdrop-filter: blur(30px);
            -webkit-backdrop-filter: blur(30px);
            border-radius: 28px;
            padding: 2rem;
            border: 2px solid rgba(255, 255, 255, 0.25);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            text-align: right;
            position: relative;
            cursor: pointer;
            user-select: none;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            min-height: 200px;
            width: 100%;
            animation: slideIn 0.5s ease-out;
          }

          .student-card.waiting {
            border: 2px solid rgba(255, 255, 255, 0.3);
          }

          .student-card.waiting:hover {
            transform: translateY(-10px);
            box-shadow: 0 20px 60px rgba(102, 126, 234, 0.5);
            border-color: rgba(255, 255, 255, 0.6);
            background: rgba(255, 255, 255, 0.18);
          }

          .student-card.waiting:active {
            transform: translateY(-6px);
          }

          .student-card.checked-in {
            background: linear-gradient(135deg, rgba(39, 174, 96, 0.25) 0%, rgba(39, 174, 96, 0.15) 100%);
            border: 2px solid rgba(39, 174, 96, 0.6);
            cursor: default;
          }

          .card-header-badge {
            font-family: 'Heebo', sans-serif;
            position: absolute;
            top: 0.75rem;
            left: 0.75rem;
            background: rgba(39, 174, 96, 0.9);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 700;
            box-shadow: 0 4px 15px rgba(39, 174, 96, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.3);
          }

          .student-name {
            font-family: 'Heebo', sans-serif;
            font-size: 1.8rem;
            font-weight: 900;
            color: white;
            margin: 0;
            line-height: 1.3;
            text-shadow: 0 2px 15px rgba(0, 0, 0, 0.3);
            letter-spacing: -0.02em;
          }

          .lesson-details {
            width: 100%;
            background: rgba(255, 255, 255, 0.12);
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.25);
            border-radius: 20px;
            padding: 1.25rem;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
            margin-top: auto;
          }

          .detail-item {
            font-family: 'Heebo', sans-serif;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            gap: 0.75rem;
            padding: 0.5rem 0;
            color: white;
            font-size: 1rem;
            font-weight: 500;
          }

          .detail-item i {
            color: rgba(255, 255, 255, 0.9);
            font-size: 1.1rem;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
          }

          .checked-in .detail-item i {
            color: rgba(255, 255, 255, 0.95);
          }

          .teacher-status {
            font-family: 'Heebo', sans-serif;
            display: inline-block;
            padding: 0.3rem 0.75rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 700;
            margin-right: 0.3rem;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.3);
          }

          .teacher-status.present {
            background: rgba(39, 174, 96, 0.6);
            color: white;
            box-shadow: 0 2px 8px rgba(39, 174, 96, 0.3);
          }

          .teacher-status.absent {
            background: rgba(243, 156, 18, 0.6);
            color: white;
            box-shadow: 0 2px 8px rgba(243, 156, 18, 0.3);
          }

          .tap-indicator {
            font-family: 'Heebo', sans-serif;
            margin-top: 0.5rem;
            padding: 1rem 1.5rem;
            background: linear-gradient(135deg, rgba(52, 152, 219, 0.6), rgba(41, 128, 185, 0.6));
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
            color: white;
            border-radius: 18px;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.75rem;
            font-size: 1.1rem;
            width: 100%;
            border: 2px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
            transition: all 0.3s ease;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }

          .tap-indicator i {
            font-size: 1.5rem;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
          }

          .student-card.waiting:hover .tap-indicator {
            background: linear-gradient(135deg, rgba(52, 152, 219, 0.85), rgba(41, 128, 185, 0.85));
            box-shadow: 0 8px 25px rgba(52, 152, 219, 0.6);
            transform: scale(1.02);
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
