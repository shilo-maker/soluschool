'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import AdminNav from '@/components/AdminNav';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalRooms: 0,
    todayLessons: 0,
    weekLessons: 0,
    attendanceRate: 0,
    upcomingLessons: 0,
    activeSchedules: 0,
  });

  useEffect(() => {
    checkAuth();
    loadStats();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Unauthorized');

      const data = await res.json();

      if (data.user.role !== 'admin') {
        router.push('/login');
        return;
      }

      setUser(data.user);
    } catch (err) {
      localStorage.removeItem('token');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="text-center py-5">
        <p>טוען...</p>
      </Container>
    );
  }

  return (
    <>
      <AdminNav />
      <Container fluid>
        <Row className="mb-4">
          <Col>
            <h2>שלום, {user?.firstName}!</h2>
            <p className="text-muted">ברוך הבא לממשק הניהול של בית הספר למוזיקה</p>
          </Col>
        </Row>

        <Row className="g-4 mb-4">
          <Col md={6} lg={3}>
            <Card className="text-center h-100 stat-card stat-card-primary">
              <Card.Body>
                <div className="mb-2" style={{ fontSize: '2rem' }}>👨‍🎓</div>
                <h6 className="text-muted mb-2">Students</h6>
                {statsLoading ? (
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                ) : (
                  <h2 className="mb-0 stat-value">{stats.totalStudents}</h2>
                )}
              </Card.Body>
              <Card.Footer className="bg-transparent">
                <Button variant="link" href="/admin/students" className="text-decoration-none">
                  Manage →
                </Button>
              </Card.Footer>
            </Card>
          </Col>

          <Col md={6} lg={3}>
            <Card className="text-center h-100 stat-card stat-card-info">
              <Card.Body>
                <div className="mb-2" style={{ fontSize: '2rem' }}>👨‍🏫</div>
                <h6 className="text-muted mb-2">Teachers</h6>
                {statsLoading ? (
                  <div className="spinner-border text-info" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                ) : (
                  <h2 className="mb-0 stat-value">{stats.totalTeachers}</h2>
                )}
              </Card.Body>
              <Card.Footer className="bg-transparent">
                <Button variant="link" href="/admin/teachers" className="text-decoration-none">
                  Manage →
                </Button>
              </Card.Footer>
            </Card>
          </Col>

          <Col md={6} lg={3}>
            <Card className="text-center h-100 stat-card stat-card-success">
              <Card.Body>
                <div className="mb-2" style={{ fontSize: '2rem' }}>📅</div>
                <h6 className="text-muted mb-2">Today's Lessons</h6>
                {statsLoading ? (
                  <div className="spinner-border text-success" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                ) : (
                  <h2 className="mb-0 stat-value">{stats.todayLessons}</h2>
                )}
              </Card.Body>
              <Card.Footer className="bg-transparent">
                <Button variant="link" href="/admin/lessons" className="text-decoration-none">
                  View →
                </Button>
              </Card.Footer>
            </Card>
          </Col>

          <Col md={6} lg={3}>
            <Card className="text-center h-100 stat-card stat-card-danger">
              <Card.Body>
                <div className="mb-2" style={{ fontSize: '2rem' }}>📊</div>
                <h6 className="text-muted mb-2">Attendance Rate</h6>
                {statsLoading ? (
                  <div className="spinner-border text-danger" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                ) : (
                  <>
                    <h2 className="mb-0 stat-value">{stats.attendanceRate}%</h2>
                    <small className="text-muted">This week</small>
                  </>
                )}
              </Card.Body>
              <Card.Footer className="bg-transparent">
                <Button variant="link" href="/admin/reports" className="text-decoration-none">
                  Reports →
                </Button>
              </Card.Footer>
            </Card>
          </Col>
        </Row>

        <Row className="g-4 mb-4">
          <Col md={6} lg={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h6 className="text-muted mb-2">Rooms</h6>
                {statsLoading ? (
                  <div className="spinner-border spinner-border-sm" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                ) : (
                  <h2 className="mb-0">{stats.totalRooms}</h2>
                )}
              </Card.Body>
            </Card>
          </Col>

          <Col md={6} lg={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h6 className="text-muted mb-2">This Week</h6>
                {statsLoading ? (
                  <div className="spinner-border spinner-border-sm" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                ) : (
                  <>
                    <h2 className="mb-0">{stats.weekLessons}</h2>
                    <small className="text-muted">lessons</small>
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>

          <Col md={6} lg={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h6 className="text-muted mb-2">Upcoming</h6>
                {statsLoading ? (
                  <div className="spinner-border spinner-border-sm" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                ) : (
                  <>
                    <h2 className="mb-0">{stats.upcomingLessons}</h2>
                    <small className="text-muted">next 7 days</small>
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>

          <Col md={6} lg={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h6 className="text-muted mb-2">Active Schedules</h6>
                {statsLoading ? (
                  <div className="spinner-border spinner-border-sm" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                ) : (
                  <h2 className="mb-0">{stats.activeSchedules}</h2>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="g-4">
          <Col lg={8}>
            <Card>
              <Card.Header>
                <h5 className="mb-0">התחלה מהירה</h5>
              </Card.Header>
              <Card.Body>
                <p className="mb-3">
                  ברוך הבא למערכת ניהול בית הספר למוזיקה של SOLU. כדי להתחיל:
                </p>
                <ol className="mb-3">
                  <li className="mb-2">
                    <strong>צור חדרים:</strong> הוסף את חדרי הלימוד שלך{' '}
                    <a href="/admin/rooms">כאן</a>
                  </li>
                  <li className="mb-2">
                    <strong>הוסף מורים:</strong> צור חשבונות למורים{' '}
                    <a href="/admin/teachers">כאן</a>
                  </li>
                  <li className="mb-2">
                    <strong>רשום תלמידים:</strong> הוסף תלמידים למערכת{' '}
                    <a href="/admin/students">כאן</a>
                  </li>
                  <li className="mb-2">
                    <strong>צור מערכת שעות:</strong> קבע שיעורים קבועים{' '}
                    <a href="/admin/schedules">כאן</a>
                  </li>
                  <li className="mb-2">
                    <strong>צפה בתצוגה חיה:</strong> עקוב אחר השיעורים בזמן אמת{' '}
                    <a href="/live" target="_blank">כאן</a>
                  </li>
                </ol>
                <div className="alert alert-info mb-0">
                  <strong>💡 טיפ:</strong> תלמידים ומורים יכולים להיכנס באמצעות PIN במסך הנוכחות
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card>
              <Card.Header>
                <h5 className="mb-0">קישורים מהירים</h5>
              </Card.Header>
              <Card.Body>
                <div className="d-grid gap-2">
                  <Button variant="outline-primary" href="/live" target="_blank">
                    🖥️ תצוגה חיה
                  </Button>
                  <Button variant="outline-primary" href="/checkin" target="_blank">
                    📱 מסך נוכחות
                  </Button>
                  <Button variant="outline-primary" href="/admin/reports">
                    📊 דוחות
                  </Button>
                  <Button variant="outline-primary" onClick={() => window.open('http://localhost:5555', '_blank')}>
                    🗄️ Prisma Studio
                  </Button>
                </div>
              </Card.Body>
            </Card>

            <Card className="mt-3">
              <Card.Header>
                <h5 className="mb-0">מידע מערכת</h5>
              </Card.Header>
              <Card.Body>
                <small className="text-muted">
                  <div className="mb-2">
                    <strong>גרסה:</strong> 1.0.0
                  </div>
                  <div className="mb-2">
                    <strong>מסד נתונים:</strong> PostgreSQL
                  </div>
                  <div className="mb-2">
                    <strong>סטטוס:</strong> <span className="text-success">פעיל</span>
                  </div>
                </small>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
}
