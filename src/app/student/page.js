'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Alert, Button } from 'react-bootstrap';
import StudentNav from '@/components/StudentNav';
import { formatDate } from '@/lib/dateUtils';
import { useRouter } from 'next/navigation';

export default function StudentDashboard() {
  const router = useRouter();
  const [student, setStudent] = useState(null);
  const [todayLessons, setTodayLessons] = useState([]);
  const [upcomingLessons, setUpcomingLessons] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkingIn, setCheckingIn] = useState({});

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
      if (data.user.role !== 'student') {
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

      // Fetch student data
      const studentRes = await fetch('/api/students/me');
      if (studentRes.ok) {
        const studentData = await studentRes.json();
        setStudent(studentData);
        setStats(studentData.stats || {});
      }

      // Fetch today's lessons
      const today = new Date().toISOString().split('T')[0];
      const todayRes = await fetch(`/api/lessons?date=${today}`);
      if (todayRes.ok) {
        const todayData = await todayRes.json();
        setTodayLessons(Array.isArray(todayData) ? todayData : []);
      }

      // Fetch upcoming lessons (next 7 days)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const upcomingRes = await fetch(`/api/lessons?startDate=${today}&endDate=${nextWeek.toISOString().split('T')[0]}`);
      if (upcomingRes.ok) {
        const upcomingData = await upcomingRes.json();
        setUpcomingLessons(Array.isArray(upcomingData) ? upcomingData : []);
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

  // Check if lesson is in the next 60 minutes and student hasn't checked in
  const canCheckInNow = (lesson) => {
    if (lesson.studentCheckIn) return false; // Already checked in
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
          studentCheckIn: new Date().toISOString(),
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

  if (loading) {
    return (
      <>
        <StudentNav />
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
      <StudentNav />
      <Container fluid dir="rtl" className="py-4">
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Welcome Header */}
        <Row className="mb-4">
          <Col>
            <h2>שלום, {student?.user?.firstName || 'תלמיד'}! 👋</h2>
            <p className="text-muted">סיכום של השיעורים שלך היום והשבוע הקרוב</p>
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
                <h3 className="text-info">{stats?.upcomingLessons || 0}</h3>
                <p className="text-muted mb-0">שיעורים קרובים</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-success">{stats?.completedLessons || 0}</h3>
                <p className="text-muted mb-0">שיעורים שהושלמו</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-secondary">{stats?.totalLessons || 0}</h3>
                <p className="text-muted mb-0">סה"כ שיעורים</p>
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
                    onClick={() => router.push('/student/lessons')}
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
                        <th>מורה</th>
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
                            {lesson.teacher?.user?.firstName} {lesson.teacher?.user?.lastName}
                          </td>
                          <td>{lesson.instrument}</td>
                          <td>{lesson.room?.name}</td>
                          <td>{getStatusBadge(lesson.status)}</td>
                          <td>
                            {lesson.studentCheckIn ? (
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
                              onClick={() => router.push(`/student/lessons/${lesson.id}`)}
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
                        <th>מורה</th>
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
                            {lesson.teacher?.user?.firstName} {lesson.teacher?.user?.lastName}
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
