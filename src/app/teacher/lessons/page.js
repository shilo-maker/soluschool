'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Alert, Form, Button, Modal } from 'react-bootstrap';
import TeacherNav from '@/components/TeacherNav';
import { formatDate } from '@/lib/dateUtils';
import { useRouter } from 'next/navigation';

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'מתוכנן', variant: 'primary' },
  { value: 'in_progress', label: 'בתהליך', variant: 'info' },
  { value: 'completed', label: 'הושלם', variant: 'success' },
  { value: 'cancelled', label: 'בוטל', variant: 'danger' },
  { value: 'no_show', label: 'לא הגיע', variant: 'warning' },
];

export default function TeacherLessonsPage() {
  const router = useRouter();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filter states
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Check-in modal
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [checkInType, setCheckInType] = useState('');

  // End-of-day confirmation modal
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [autoCheckedLessons, setAutoCheckedLessons] = useState([]);
  const [selectedLessonIds, setSelectedLessonIds] = useState([]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (loading === false) {
      fetchLessons();
    }
  }, [filterDate, filterStatus]);

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
      fetchLessons();
    } catch (err) {
      console.error('Auth check error:', err);
      router.push('/login');
    }
  };

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterDate) params.append('date', filterDate);
      if (filterStatus) params.append('status', filterStatus);

      const response = await fetch(`/api/lessons?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLessons(Array.isArray(data) ? data : []);

        // Auto checkout lessons that have ended
        await autoCheckoutEndedLessons(data);
      } else {
        setError('שגיאה בטעינת שיעורים');
      }
    } catch (err) {
      setError('שגיאה בטעינת שיעורים');
      console.error('Fetch lessons error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Automatically checkout lessons that have ended
  const autoCheckoutEndedLessons = async (lessonsList) => {
    const now = new Date();
    const today = now.toDateString();
    let checkedOutCount = 0;
    const todayAutoCheckedLessons = [];

    for (const lesson of lessonsList) {
      const lessonDateObj = new Date(lesson.date);
      if (lessonDateObj.toDateString() !== today) continue; // Only today's lessons

      if (lesson.teacherCheckIn && !lesson.teacherCheckOut && lesson.status === 'in_progress') {
        const lessonDate = new Date(lesson.date);
        const [hours, minutes] = lesson.endTime.split(':');
        lessonDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        // If lesson ended, auto checkout
        if (now > lessonDate) {
          try {
            await fetch(`/api/lessons/${lesson.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                teacherCheckOut: lessonDate.toISOString(),
                status: 'completed',
                autoCheckedOut: true,
              }),
            });
            checkedOutCount++;
          } catch (err) {
            console.error('Auto checkout error:', err);
          }
        }
      }

      // Collect auto-checked-in lessons
      if (lesson.teacherCheckIn && lessonDateObj.toDateString() === today) {
        todayAutoCheckedLessons.push(lesson);
      }
    }

    // Check if all lessons for today are complete
    const todayLessons = lessonsList.filter(l => {
      const ld = new Date(l.date);
      return ld.toDateString() === today && l.status !== 'cancelled';
    });

    const allComplete = todayLessons.every(l => l.teacherCheckOut || l.status === 'completed');

    // Show confirmation modal if there were auto-checked lessons and all are complete
    if (allComplete && todayAutoCheckedLessons.length > 1 && checkedOutCount > 0) {
      setAutoCheckedLessons(todayAutoCheckedLessons);
      setSelectedLessonIds(todayAutoCheckedLessons.map(l => l.id));
      setShowConfirmationModal(true);
    }
  };

  const handleConfirmLessons = async () => {
    try {
      // Mark lessons that were NOT selected as no_show
      const lessonsToUpdate = autoCheckedLessons.filter(l => !selectedLessonIds.includes(l.id));

      for (const lesson of lessonsToUpdate) {
        await fetch(`/api/lessons/${lesson.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'no_show',
            teacherCheckIn: null,
            teacherCheckOut: null,
          }),
        });
      }

      setShowConfirmationModal(false);
      setSuccess('השיעורים אומתו בהצלחה');
      fetchLessons();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('שגיאה באימות שיעורים');
      console.error('Confirm lessons error:', err);
    }
  };

  const getStatusBadge = (status) => {
    const statusOption = STATUS_OPTIONS.find((opt) => opt.value === status);
    return (
      <Badge bg={statusOption?.variant || 'secondary'}>
        {statusOption?.label || status}
      </Badge>
    );
  };

  // Check if lesson is within 60 minutes before start time
  const canCheckIn = (lesson) => {
    const now = new Date();
    const lessonDate = new Date(lesson.date);
    const [hours, minutes] = lesson.startTime.split(':');
    lessonDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const diffInMinutes = (lessonDate - now) / (1000 * 60);
    return diffInMinutes <= 60 && diffInMinutes >= -30; // 60 min before, 30 min after start
  };

  const handleCheckIn = (lesson, type) => {
    setSelectedLesson(lesson);
    setCheckInType(type);
    setShowCheckInModal(true);
  };

  const confirmCheckIn = async () => {
    if (!selectedLesson) return;

    try {
      const updateData = {};
      if (checkInType === 'checkIn') {
        updateData.teacherCheckIn = new Date().toISOString();
        updateData.status = 'in_progress';
        updateData.autoCheckInEnabled = true; // Flag to enable auto check-in for same day
      } else if (checkInType === 'checkOut') {
        updateData.teacherCheckOut = new Date().toISOString();
        updateData.status = 'completed';
      }

      const response = await fetch(`/api/lessons/${selectedLesson.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        // If checking in, also auto check-in all subsequent lessons on the same day
        if (checkInType === 'checkIn') {
          const sameDayLessons = lessons.filter(l => {
            const lessonDate = new Date(l.date).toDateString();
            const selectedDate = new Date(selectedLesson.date).toDateString();
            return lessonDate === selectedDate &&
                   l.startTime > selectedLesson.startTime &&
                   !l.teacherCheckIn &&
                   l.status !== 'cancelled';
          });

          // Auto check-in subsequent lessons
          for (const lesson of sameDayLessons) {
            await fetch(`/api/lessons/${lesson.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                teacherCheckIn: new Date().toISOString(),
                status: 'in_progress',
                autoCheckedIn: true,
              }),
            });
          }

          if (sameDayLessons.length > 0) {
            setSuccess(`נרשמת בהצלחה! ${sameDayLessons.length} שיעורים נוספים נרשמו אוטומטית`);
          } else {
            setSuccess('נרשמת בהצלחה לשיעור');
          }
        } else {
          setSuccess('יצאת בהצלחה מהשיעור');
        }

        setShowCheckInModal(false);
        fetchLessons();
        setTimeout(() => setSuccess(''), 5000);
      } else {
        const data = await response.json();
        setError(data.error || 'שגיאה בעדכון השיעור');
      }
    } catch (err) {
      setError('שגיאה בעדכון השיעור');
      console.error('Check-in error:', err);
    }
  };

  const handleUpdateStatus = async (lessonId, newStatus) => {
    try {
      const response = await fetch(`/api/lessons/${lessonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setSuccess('סטטוס עודכן בהצלחה');
        fetchLessons();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'שגיאה בעדכון סטטוס');
      }
    } catch (err) {
      setError('שגיאה בעדכון סטטוס');
      console.error('Update status error:', err);
    }
  };

  return (
    <>
      <TeacherNav />
      <Container fluid dir="rtl" className="py-4">
        {/* Header */}
        <Row className="mb-4">
          <Col>
            <h2>השיעורים שלי</h2>
            <p className="text-muted">נהל את השיעורים שלך ועדכן סטטוס</p>
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

        {/* Filters */}
        <Card className="mb-4">
          <Card.Body>
            <Row className="g-3">
              <Col md={3}>
                <Form.Label>סנן לפי תאריך</Form.Label>
                <Form.Control
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </Col>
              <Col md={3}>
                <Form.Label>סנן לפי סטטוס</Form.Label>
                <Form.Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">כל הסטטוסים</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={2} className="d-flex align-items-end">
                <Button
                  variant="secondary"
                  className="w-100"
                  onClick={() => {
                    setFilterDate('');
                    setFilterStatus('');
                  }}
                >
                  נקה סינונים
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Lessons Table */}
        <Card>
          <Card.Body>
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">טוען...</span>
                </div>
              </div>
            ) : lessons.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <p>לא נמצאו שיעורים</p>
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
                    <th>נוכחות</th>
                    <th>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {lessons.map((lesson) => (
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
                      <td>
                        <div className="d-flex gap-1">
                          {lesson.teacherCheckIn ? (
                            <Badge bg="success">✓ כניסה</Badge>
                          ) : (
                            <Badge bg="secondary">✗ כניסה</Badge>
                          )}
                          {lesson.teacherCheckOut ? (
                            <Badge bg="success">✓ יציאה</Badge>
                          ) : (
                            <Badge bg="secondary">✗ יציאה</Badge>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex gap-2 flex-wrap">
                          {!lesson.teacherCheckIn && lesson.status !== 'cancelled' && canCheckIn(lesson) && (
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => handleCheckIn(lesson, 'checkIn')}
                              title="ניתן להיכנס 60 דקות לפני השיעור"
                            >
                              ✓ כניסה
                            </Button>
                          )}
                          {!lesson.teacherCheckIn && lesson.status !== 'cancelled' && !canCheckIn(lesson) && (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled
                              title="ניתן להיכנס רק 60 דקות לפני השיעור"
                            >
                              🔒 כניסה
                            </Button>
                          )}
                          {lesson.status !== 'cancelled' && lesson.status !== 'no_show' && (
                            <Button
                              variant="outline-warning"
                              size="sm"
                              onClick={() => handleUpdateStatus(lesson.id, 'no_show')}
                            >
                              לא הגיע
                            </Button>
                          )}
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => router.push(`/teacher/lessons/${lesson.id}`)}
                          >
                            פרטים
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>

        {/* Check-in Confirmation Modal */}
        <Modal show={showCheckInModal} onHide={() => setShowCheckInModal(false)} dir="rtl">
          <Modal.Header closeButton>
            <Modal.Title>
              {checkInType === 'checkIn' ? 'כניסה לשיעור' : 'יציאה משיעור'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedLesson && (
              <div>
                <p>
                  <strong>תלמיד:</strong> {selectedLesson.student?.user?.firstName}{' '}
                  {selectedLesson.student?.user?.lastName}
                </p>
                <p>
                  <strong>שעה:</strong> {selectedLesson.startTime} - {selectedLesson.endTime}
                </p>
                <p>
                  <strong>חדר:</strong> {selectedLesson.room?.name}
                </p>
                <p className="mt-3">
                  {checkInType === 'checkIn'
                    ? 'האם אתה בטוח שברצונך לרשום כניסה לשיעור זה?'
                    : 'האם אתה בטוח שברצונך לרשום יציאה משיעור זה? השיעור יסומן כהושלם.'}
                </p>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCheckInModal(false)}>
              ביטול
            </Button>
            <Button
              variant={checkInType === 'checkIn' ? 'success' : 'primary'}
              onClick={confirmCheckIn}
            >
              {checkInType === 'checkIn' ? 'כניסה' : 'יציאה'}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* End-of-Day Confirmation Modal */}
        <Modal show={showConfirmationModal} onHide={() => setShowConfirmationModal(false)} size="lg" dir="rtl">
          <Modal.Header closeButton>
            <Modal.Title>אימות שיעורים היום</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Alert variant="info">
              <strong>רישום אוטומטי בוצע!</strong> נרשמת אוטומטית לכל השיעורים של היום.
              <br />
              אנא סמן את השיעורים שאתה <strong>אכן ביצעת</strong>. שיעורים שלא יסומנו יסומנו כ"לא הגיע".
            </Alert>

            <div className="mb-3">
              <Form.Check
                type="checkbox"
                label="בחר הכל"
                checked={selectedLessonIds.length === autoCheckedLessons.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedLessonIds(autoCheckedLessons.map(l => l.id));
                  } else {
                    setSelectedLessonIds([]);
                  }
                }}
              />
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {autoCheckedLessons.map((lesson) => (
                <Card key={lesson.id} className="mb-2">
                  <Card.Body>
                    <Form.Check
                      type="checkbox"
                      id={`lesson-${lesson.id}`}
                      checked={selectedLessonIds.includes(lesson.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLessonIds([...selectedLessonIds, lesson.id]);
                        } else {
                          setSelectedLessonIds(selectedLessonIds.filter(id => id !== lesson.id));
                        }
                      }}
                      label={
                        <div>
                          <strong>
                            {lesson.startTime} - {lesson.endTime}
                          </strong>
                          {' | '}
                          {lesson.student?.user?.firstName} {lesson.student?.user?.lastName}
                          {' | '}
                          <Badge bg="secondary">{lesson.instrument}</Badge>
                          {' | '}
                          <Badge bg="info">{lesson.room?.name}</Badge>
                        </div>
                      }
                    />
                  </Card.Body>
                </Card>
              ))}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowConfirmationModal(false)}>
              אאמת מאוחר יותר
            </Button>
            <Button variant="primary" onClick={handleConfirmLessons}>
              אשר שיעורים ({selectedLessonIds.length}/{autoCheckedLessons.length})
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </>
  );
}
