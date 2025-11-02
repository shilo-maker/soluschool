'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Alert, Form, Button } from 'react-bootstrap';
import TeacherNav from '@/components/TeacherNav';
import { formatDate } from '@/lib/dateUtils';
import { useRouter, useParams } from 'next/navigation';

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'מתוכנן', variant: 'primary' },
  { value: 'in_progress', label: 'בתהליך', variant: 'info' },
  { value: 'completed', label: 'הושלם', variant: 'success' },
  { value: 'cancelled', label: 'בוטל', variant: 'danger' },
  { value: 'no_show', label: 'לא הגיע', variant: 'warning' },
];

export default function LessonDetailPage() {
  const router = useRouter();
  const params = useParams();
  const lessonId = params.id;

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [teacherNotes, setTeacherNotes] = useState('');
  const [saving, setSaving] = useState(false);

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
      fetchLesson();
    } catch (err) {
      console.error('Auth check error:', err);
      router.push('/login');
    }
  };

  const fetchLesson = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/lessons/${lessonId}`);
      if (response.ok) {
        const data = await response.json();
        setLesson(data);
        setTeacherNotes(data.teacherNotes || '');
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

  const handleSaveNotes = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/lessons/${lessonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherNotes }),
      });

      if (response.ok) {
        setSuccess('הערות נשמרו בהצלחה');
        fetchLesson();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'שגיאה בשמירת הערות');
      }
    } catch (err) {
      setError('שגיאה בשמירת הערות');
      console.error('Save notes error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      const response = await fetch(`/api/lessons/${lessonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherCheckIn: new Date().toISOString(),
          status: 'in_progress',
        }),
      });

      if (response.ok) {
        setSuccess('נרשמת בהצלחה לשיעור');
        fetchLesson();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'שגיאה ברישום כניסה');
      }
    } catch (err) {
      setError('שגיאה ברישום כניסה');
      console.error('Check-in error:', err);
    }
  };

  const handleCheckOut = async () => {
    try {
      const response = await fetch(`/api/lessons/${lessonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherCheckOut: new Date().toISOString(),
          status: 'completed',
        }),
      });

      if (response.ok) {
        setSuccess('יצאת בהצלחה מהשיעור');
        fetchLesson();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'שגיאה ברישום יציאה');
      }
    } catch (err) {
      setError('שגיאה ברישום יציאה');
      console.error('Check-out error:', err);
    }
  };

  const getStatusBadge = (status) => {
    const statusOption = STATUS_OPTIONS.find((opt) => opt.value === status);
    return (
      <Badge bg={statusOption?.variant || 'secondary'} className="fs-6">
        {statusOption?.label || status}
      </Badge>
    );
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

  if (!lesson) {
    return (
      <>
        <TeacherNav />
        <Container fluid dir="rtl" className="py-4">
          <Alert variant="danger">שיעור לא נמצא</Alert>
          <Button variant="secondary" onClick={() => router.push('/teacher/lessons')}>
            חזרה לשיעורים
          </Button>
        </Container>
      </>
    );
  }

  return (
    <>
      <TeacherNav />
      <Container fluid dir="rtl" className="py-4">
        {/* Header */}
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h2>פרטי שיעור</h2>
                <p className="text-muted">
                  {formatDate(lesson.date)} | {lesson.startTime} - {lesson.endTime}
                </p>
              </div>
              <Button variant="outline-secondary" onClick={() => router.push('/teacher/lessons')}>
                ← חזרה לשיעורים
              </Button>
            </div>
          </Col>
        </Row>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <Row>
          {/* Lesson Details */}
          <Col md={6}>
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">פרטי השיעור</h5>
              </Card.Header>
              <Card.Body>
                <Row className="mb-3">
                  <Col sm={4}>
                    <strong>סטטוס:</strong>
                  </Col>
                  <Col sm={8}>{getStatusBadge(lesson.status)}</Col>
                </Row>
                <Row className="mb-3">
                  <Col sm={4}>
                    <strong>תלמיד:</strong>
                  </Col>
                  <Col sm={8}>
                    {lesson.student?.user?.firstName} {lesson.student?.user?.lastName}
                  </Col>
                </Row>
                <Row className="mb-3">
                  <Col sm={4}>
                    <strong>כלי:</strong>
                  </Col>
                  <Col sm={8}>{lesson.instrument}</Col>
                </Row>
                <Row className="mb-3">
                  <Col sm={4}>
                    <strong>חדר:</strong>
                  </Col>
                  <Col sm={8}>{lesson.room?.name}</Col>
                </Row>
                <Row className="mb-3">
                  <Col sm={4}>
                    <strong>משך:</strong>
                  </Col>
                  <Col sm={8}>{lesson.duration} דקות</Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Attendance */}
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">נוכחות</h5>
              </Card.Header>
              <Card.Body>
                <Row className="mb-3">
                  <Col sm={4}>
                    <strong>כניסת מורה:</strong>
                  </Col>
                  <Col sm={8}>
                    {lesson.teacherCheckIn ? (
                      <span className="text-success">
                        ✓ {new Date(lesson.teacherCheckIn).toLocaleTimeString('he-IL')}
                      </span>
                    ) : (
                      <span className="text-muted">✗ לא נרשם</span>
                    )}
                  </Col>
                </Row>
                <Row className="mb-3">
                  <Col sm={4}>
                    <strong>יציאת מורה:</strong>
                  </Col>
                  <Col sm={8}>
                    {lesson.teacherCheckOut ? (
                      <span className="text-success">
                        ✓ {new Date(lesson.teacherCheckOut).toLocaleTimeString('he-IL')}
                      </span>
                    ) : (
                      <span className="text-muted">✗ לא נרשם</span>
                    )}
                  </Col>
                </Row>
                <Row className="mb-3">
                  <Col sm={4}>
                    <strong>כניסת תלמיד:</strong>
                  </Col>
                  <Col sm={8}>
                    {lesson.studentCheckIn ? (
                      <span className="text-success">
                        ✓ {new Date(lesson.studentCheckIn).toLocaleTimeString('he-IL')}
                      </span>
                    ) : (
                      <span className="text-muted">✗ לא נרשם</span>
                    )}
                  </Col>
                </Row>
                <Row className="mb-3">
                  <Col sm={4}>
                    <strong>יציאת תלמיד:</strong>
                  </Col>
                  <Col sm={8}>
                    {lesson.studentCheckOut ? (
                      <span className="text-success">
                        ✓ {new Date(lesson.studentCheckOut).toLocaleTimeString('he-IL')}
                      </span>
                    ) : (
                      <span className="text-muted">✗ לא נרשם</span>
                    )}
                  </Col>
                </Row>

                <div className="d-flex gap-2 mt-4">
                  {!lesson.teacherCheckIn && lesson.status !== 'cancelled' && (
                    <Button variant="success" onClick={handleCheckIn}>
                      ✓ רישום כניסה
                    </Button>
                  )}
                  {lesson.teacherCheckIn && !lesson.teacherCheckOut && lesson.status !== 'cancelled' && (
                    <Button variant="primary" onClick={handleCheckOut}>
                      ✓ רישום יציאה
                    </Button>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Teacher Notes */}
          <Col md={6}>
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">הערות מורה</h5>
              </Card.Header>
              <Card.Body>
                <Form.Group className="mb-3">
                  <Form.Label>הערות על השיעור</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={10}
                    value={teacherNotes}
                    onChange={(e) => setTeacherNotes(e.target.value)}
                    placeholder="כתוב כאן הערות על השיעור, התקדמות התלמיד, נושאים שנלמדו, ועוד..."
                  />
                  <Form.Text className="text-muted">
                    ההערות שלך יעזרו לעקוב אחר התקדמות התלמיד
                  </Form.Text>
                </Form.Group>
                <Button
                  variant="primary"
                  onClick={handleSaveNotes}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      שומר...
                    </>
                  ) : (
                    'שמור הערות'
                  )}
                </Button>
              </Card.Body>
            </Card>

            {/* Cancellation Info */}
            {lesson.status === 'cancelled' && (
              <Card className="mb-4 border-danger">
                <Card.Header className="bg-danger text-white">
                  <h5 className="mb-0">מידע על ביטול</h5>
                </Card.Header>
                <Card.Body>
                  <Row className="mb-2">
                    <Col sm={4}>
                      <strong>סיבת ביטול:</strong>
                    </Col>
                    <Col sm={8}>{lesson.cancellationReason || 'לא צוין'}</Col>
                  </Row>
                  {lesson.cancelledBy && (
                    <Row>
                      <Col sm={4}>
                        <strong>בוטל על ידי:</strong>
                      </Col>
                      <Col sm={8}>
                        {lesson.cancelledBy.firstName} {lesson.cancelledBy.lastName}
                      </Col>
                    </Row>
                  )}
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
      </Container>
    </>
  );
}
