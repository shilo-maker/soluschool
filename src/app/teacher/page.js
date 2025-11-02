'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Alert, Button, Modal, Form } from 'react-bootstrap';
import TeacherNav from '@/components/TeacherNav';
import { formatDate } from '@/lib/dateUtils';
import { useRouter } from 'next/navigation';

export default function TeacherDashboard() {
  const router = useRouter();
  const [teacher, setTeacher] = useState(null);
  const [todayLessons, setTodayLessons] = useState([]);
  const [upcomingLessons, setUpcomingLessons] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkingIn, setCheckingIn] = useState({});
  const [unconfirmedLessons, setUnconfirmedLessons] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [updatingLesson, setUpdatingLesson] = useState({});
  const [lessonNotes, setLessonNotes] = useState({});

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
        return;
      }
      const data = await response.json();
      if (data.user.role !== 'teacher') {
        router.push('/');
        return;
      }
      fetchDashboardData();
    } catch (err) {
      console.error('Auth check error:', err);
      router.push('/login');
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch teacher data
      const teacherRes = await fetch('/api/teachers/me');
      if (teacherRes.ok) {
        const teacherData = await teacherRes.json();
        setTeacher(teacherData);
        setStats(teacherData.stats || {});
      }

      // Fetch today's lessons
      const today = new Date().toISOString().split('T')[0];
      const todayRes = await fetch(`/api/lessons?teacherId=me&date=${today}`);
      let todayData = [];
      if (todayRes.ok) {
        todayData = await todayRes.json();
        setTodayLessons(Array.isArray(todayData) ? todayData : []);
      }

      // Fetch upcoming lessons (next 7 days)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const upcomingRes = await fetch(`/api/lessons?teacherId=me&startDate=${today}&endDate=${nextWeek.toISOString().split('T')[0]}`);
      if (upcomingRes.ok) {
        const upcomingData = await upcomingRes.json();
        setUpcomingLessons(Array.isArray(upcomingData) ? upcomingData : []);
      }

      // Check for unconfirmed lessons (lessons that ended but status is still scheduled/in_progress)
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      const unconfirmed = (Array.isArray(todayData) ? todayData : []).filter(lesson => {
        // Only check lessons that are scheduled or in_progress
        if (lesson.status !== 'scheduled' && lesson.status !== 'in_progress') {
          return false;
        }

        // Check if lesson has ended
        const [endHour, endMinute] = lesson.endTime.split(':').map(Number);
        const lessonEnded = currentHour > endHour || (currentHour === endHour && currentMinute >= endMinute);

        return lessonEnded;
      });

      setUnconfirmedLessons(unconfirmed);

      // Show modal if there are unconfirmed lessons
      if (unconfirmed.length > 0) {
        setShowConfirmModal(true);
      }
    } catch (err) {
      setError('שגיאה בטעינת נתונים');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      scheduled: { label: 'מתוכנן', variant: 'primary' },
      in_progress: { label: 'בתהליך', variant: 'info' },
      completed: { label: 'הושלם', variant: 'success' },
      cancelled: { label: 'בוטל', variant: 'danger' },
      no_show: { label: 'לא הגיע', variant: 'warning' },
    };
    const statusInfo = statusMap[status] || { label: status, variant: 'secondary' };
    return <Badge bg={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  // Check if lesson is in the next 60 minutes and not checked in
  const canCheckInNow = (lesson) => {
    if (lesson.teacherCheckIn) return false; // Already checked in
    if (lesson.status === 'cancelled') return false;

    const now = new Date();
    const [hours, minutes] = lesson.startTime.split(':').map(Number);

    // Create lesson start time for today
    const lessonStart = new Date();
    lessonStart.setHours(hours, minutes, 0, 0);

    // Calculate time difference in minutes
    const diffInMinutes = (lessonStart - now) / (1000 * 60);

    // Can check in if lesson starts within next 60 minutes (and not in the past beyond 5 minutes)
    return diffInMinutes >= -5 && diffInMinutes <= 60;
  };

  const handleCheckIn = async (lessonId) => {
    try {
      setCheckingIn(prev => ({ ...prev, [lessonId]: true }));

      const response = await fetch(`/api/lessons/${lessonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherCheckIn: new Date().toISOString(),
          status: 'in_progress',
        }),
      });

      if (response.ok) {
        // Refresh dashboard data
        await fetchDashboardData();
      } else {
        const data = await response.json();
        setError(data.error || 'שגיאה בצ\'ק-אין');
      }
    } catch (err) {
      setError('שגיאה בצ\'ק-אין');
      console.error('Check-in error:', err);
    } finally {
      setCheckingIn(prev => ({ ...prev, [lessonId]: false }));
    }
  };

  const handleConfirmLesson = async (lessonId, newStatus) => {
    try {
      setUpdatingLesson(prev => ({ ...prev, [lessonId]: true }));

      const updateData = {
        status: newStatus,
      };

      // Add notes if provided
      if (lessonNotes[lessonId]) {
        updateData.teacherNotes = lessonNotes[lessonId];
      }

      const response = await fetch(`/api/lessons/${lessonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        // Remove from unconfirmed list
        setUnconfirmedLessons(prev => prev.filter(l => l.id !== lessonId));

        // Clear notes for this lesson
        setLessonNotes(prev => {
          const updated = { ...prev };
          delete updated[lessonId];
          return updated;
        });

        // Refresh dashboard data
        await fetchDashboardData();

        // Close modal if no more unconfirmed lessons
        if (unconfirmedLessons.length <= 1) {
          setShowConfirmModal(false);
        }
      } else {
        const data = await response.json();
        setError(data.error || 'שגיאה בעדכון שיעור');
      }
    } catch (err) {
      setError('שגיאה בעדכון שיעור');
      console.error('Confirm lesson error:', err);
    } finally {
      setUpdatingLesson(prev => ({ ...prev, [lessonId]: false }));
    }
  };

  if (loading) {
    return (
      <>
        <TeacherNav />
        <Container fluid dir="rtl">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">טוען...</span>
            </div>
          </div>
        </Container>
      </>
    );
  }

  return (
    <>
      <TeacherNav />
      <Container fluid dir="rtl" className="py-4">
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Lesson Confirmation Modal */}
        <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} size="lg" dir="rtl">
          <Modal.Header closeButton>
            <Modal.Title>אשר שיעורים שהסתיימו</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="text-muted mb-3">
              יש לך {unconfirmedLessons.length} שיעורים שהסתיימו היום. אנא אשר מה קרה עם כל שיעור:
            </p>
            {unconfirmedLessons.map((lesson) => (
              <Card key={lesson.id} className="mb-3">
                <Card.Body>
                  <Row>
                    <Col md={8}>
                      <h6>
                        <strong>{lesson.startTime}</strong> - {lesson.endTime}
                      </h6>
                      <p className="mb-2">
                        <strong>תלמיד:</strong> {lesson.student?.user?.firstName} {lesson.student?.user?.lastName}
                      </p>
                      <p className="mb-2">
                        <strong>כלי:</strong> {lesson.instrument}
                      </p>
                      <Form.Group className="mb-3">
                        <Form.Label>הערות לשיעור (אופציונלי)</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          placeholder="מה למדתם? איך היה השיעור? הערות לתלמיד..."
                          value={lessonNotes[lesson.id] || ''}
                          onChange={(e) => setLessonNotes(prev => ({
                            ...prev,
                            [lesson.id]: e.target.value
                          }))}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4} className="d-flex flex-column gap-2">
                      <Button
                        variant="success"
                        onClick={() => handleConfirmLesson(lesson.id, 'completed')}
                        disabled={updatingLesson[lesson.id]}
                      >
                        {updatingLesson[lesson.id] ? 'מעדכן...' : '✓ הושלם'}
                      </Button>
                      <Button
                        variant="warning"
                        onClick={() => handleConfirmLesson(lesson.id, 'no_show')}
                        disabled={updatingLesson[lesson.id]}
                      >
                        {updatingLesson[lesson.id] ? 'מעדכן...' : 'לא הגיע'}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleConfirmLesson(lesson.id, 'cancelled')}
                        disabled={updatingLesson[lesson.id]}
                      >
                        {updatingLesson[lesson.id] ? 'מעדכן...' : 'בוטל'}
                      </Button>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            ))}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
              אאשר מאוחר יותר
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Welcome Header */}
        <Row className="mb-4">
          <Col>
            <h2>שלום, {teacher?.user?.firstName || 'מורה'}! 👋</h2>
            <p className="text-muted">סיכום של היום והשבוע הקרוב</p>
          </Col>
        </Row>

        {/* Stats Cards */}
        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-primary">{todayLessons.length}</h3>
                <p className="text-muted mb-0">שיעורים היום</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-success">{stats?.totalLessons || 0}</h3>
                <p className="text-muted mb-0">סה"כ שיעורים</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-info">{stats?.completedLessons || 0}</h3>
                <p className="text-muted mb-0">שיעורים שהושלמו</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card
              className="text-center"
              style={{ cursor: 'pointer' }}
              onClick={() => router.push('/teacher-absences')}
            >
              <Card.Body>
                <h3 className="text-warning">🏖️</h3>
                <p className="text-muted mb-0">דיווח היעדרות</p>
                <small className="text-primary">לחץ לדיווח</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Today's Lessons */}
        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Header>
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">📚 השיעורים שלי היום</h5>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => router.push('/teacher/lessons')}
                  >
                    כל השיעורים
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                {todayLessons.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <p>אין שיעורים היום 🎉</p>
                  </div>
                ) : (
                  <Table responsive hover>
                    <thead>
                      <tr>
                        <th>שעה</th>
                        <th>תלמיד</th>
                        <th>כלי</th>
                        <th>חדר</th>
                        <th>סטטוס</th>
                        <th>פעולות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayLessons.map((lesson) => (
                        <tr key={lesson.id}>
                          <td>
                            <strong>{lesson.startTime}</strong> - {lesson.endTime}
                          </td>
                          <td>
                            {lesson.student?.user?.firstName} {lesson.student?.user?.lastName}
                          </td>
                          <td>{lesson.instrument}</td>
                          <td>{lesson.room?.name}</td>
                          <td>{getStatusBadge(lesson.status)}</td>
                          <td>
                            {lesson.teacherCheckIn ? (
                              <Badge bg="success" className="me-2">
                                ✓ נכנסת בהצלחה
                              </Badge>
                            ) : canCheckInNow(lesson) ? (
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleCheckIn(lesson.id)}
                                disabled={checkingIn[lesson.id]}
                                className="me-2"
                              >
                                {checkingIn[lesson.id] ? (
                                  <>
                                    <span className="spinner-border spinner-border-sm me-1"></span>
                                    מבצע...
                                  </>
                                ) : (
                                  '✓ צ\'ק-אין עכשיו'
                                )}
                              </Button>
                            ) : null}
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => router.push(`/teacher/lessons/${lesson.id}`)}
                            >
                              פרטים
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Upcoming Lessons */}
        <Row>
          <Col>
            <Card>
              <Card.Header>
                <h5 className="mb-0">📅 שיעורים קרובים (7 ימים הבאים)</h5>
              </Card.Header>
              <Card.Body>
                {upcomingLessons.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <p>אין שיעורים מתוכננים</p>
                  </div>
                ) : (
                  <Table responsive hover>
                    <thead>
                      <tr>
                        <th>תאריך</th>
                        <th>שעה</th>
                        <th>תלמיד</th>
                        <th>כלי</th>
                        <th>חדר</th>
                        <th>סטטוס</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcomingLessons.slice(0, 10).map((lesson) => (
                        <tr key={lesson.id}>
                          <td>{formatDate(lesson.date)}</td>
                          <td>
                            {lesson.startTime} - {lesson.endTime}
                          </td>
                          <td>
                            {lesson.student?.user?.firstName} {lesson.student?.user?.lastName}
                          </td>
                          <td>{lesson.instrument}</td>
                          <td>{lesson.room?.name}</td>
                          <td>{getStatusBadge(lesson.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
}
