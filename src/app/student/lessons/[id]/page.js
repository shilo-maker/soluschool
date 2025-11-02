'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Alert, Button } from 'react-bootstrap';
import StudentNav from '@/components/StudentNav';
import { formatDate } from '@/lib/dateUtils';
import { useRouter, useParams } from 'next/navigation';

export default function StudentLessonDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      fetchLesson();
    } catch (err) {
      console.error('Auth check error:', err);
      router.push('/login');
    }
  };

  const fetchLesson = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/lessons/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setLesson(data);
      } else {
        setError('שגיאה בטעינת פרטי השיעור');
      }
    } catch (err) {
      setError('שגיאה בטעינת פרטי השיעור');
      console.error('Fetch lesson error:', err);
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

  if (!lesson) {
    return (
      <>
        <StudentNav />
        <Container fluid dir="rtl" className="py-4">
          <Alert variant="danger">השיעור לא נמצא</Alert>
          <Button variant="primary" onClick={() => router.push('/student/lessons')}>
            חזור לרשימת השיעורים
          </Button>
        </Container>
      </>
    );
  }

  return (
    <>
      <StudentNav />
      <Container fluid dir="rtl" className="py-4">
        {/* Header */}
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h2>פרטי שיעור</h2>
                <p className="text-muted">מידע מפורט על השיעור</p>
              </div>
              <Button variant="outline-secondary" onClick={() => router.push('/student/lessons')}>
                ← חזור לרשימה
              </Button>
            </div>
          </Col>
        </Row>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Row>
          {/* Main Lesson Info */}
          <Col md={8}>
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">פרטי השיעור</h5>
              </Card.Header>
              <Card.Body>
                <Row className="mb-3">
                  <Col md={6}>
                    <strong>תאריך:</strong>
                    <div className="mt-1">{formatDate(lesson.date)}</div>
                  </Col>
                  <Col md={6}>
                    <strong>שעה:</strong>
                    <div className="mt-1">
                      {lesson.startTime} - {lesson.endTime}
                    </div>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <strong>מורה:</strong>
                    <div className="mt-1">
                      {lesson.teacher?.user?.firstName} {lesson.teacher?.user?.lastName}
                    </div>
                  </Col>
                  <Col md={6}>
                    <strong>כלי נגינה:</strong>
                    <div className="mt-1">
                      <Badge bg="secondary">{lesson.instrument}</Badge>
                    </div>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <strong>חדר:</strong>
                    <div className="mt-1">{lesson.room?.name}</div>
                  </Col>
                  <Col md={6}>
                    <strong>משך:</strong>
                    <div className="mt-1">{lesson.duration} דקות</div>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={12}>
                    <strong>סטטוס:</strong>
                    <div className="mt-1">{getStatusBadge(lesson.status)}</div>
                  </Col>
                </Row>

                {lesson.teacherNotes && (
                  <Row className="mb-3">
                    <Col md={12}>
                      <Alert variant="info" className="mb-0">
                        <strong>📝 הערות מהמורה:</strong>
                        <div className="mt-2" style={{ whiteSpace: 'pre-wrap' }}>
                          {lesson.teacherNotes}
                        </div>
                      </Alert>
                    </Col>
                  </Row>
                )}

                {lesson.status === 'cancelled' && lesson.cancellationReason && (
                  <Row className="mb-0">
                    <Col md={12}>
                      <Alert variant="warning" className="mb-0">
                        <strong>סיבת ביטול:</strong>
                        <div className="mt-1">{lesson.cancellationReason}</div>
                        {lesson.cancelledBy && (
                          <div className="mt-1 small">
                            בוטל על ידי: {lesson.cancelledBy.firstName} {lesson.cancelledBy.lastName}
                          </div>
                        )}
                      </Alert>
                    </Col>
                  </Row>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Side Info */}
          <Col md={4}>
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">מידע נוסף</h5>
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <strong>זמני נוכחות:</strong>
                  <div className="mt-2 small">
                    <div className="mb-1">
                      🎓 מורה:{' '}
                      {lesson.teacherCheckIn
                        ? new Date(lesson.teacherCheckIn).toLocaleTimeString('he-IL', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'לא נכנס'}
                    </div>
                    <div className="mb-1">
                      👤 תלמיד:{' '}
                      {lesson.studentCheckIn
                        ? new Date(lesson.studentCheckIn).toLocaleTimeString('he-IL', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'לא נכנס'}
                    </div>
                  </div>
                </div>

                <div className="mb-0">
                  <strong>פרטי קשר מורה:</strong>
                  <div className="mt-1 small">
                    {lesson.teacher?.user?.phone && (
                      <div>📞 {lesson.teacher.user.phone}</div>
                    )}
                    {lesson.teacher?.user?.email && (
                      <div>📧 {lesson.teacher.user.email}</div>
                    )}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
}
