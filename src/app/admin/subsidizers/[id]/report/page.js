'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Form, Button, Alert, Badge, Modal, Accordion } from 'react-bootstrap';
import AdminNav from '@/components/AdminNav';
import { useRouter, useParams } from 'next/navigation';

export default function SubsidizerReportPage() {
  const router = useRouter();
  const params = useParams();
  const subsidizerId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [data, setData] = useState(null);
  const [selectedLessons, setSelectedLessons] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: 'bank_transfer',
    referenceNumber: '',
    notes: '',
  });

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
      const authData = await response.json();
      if (authData.user.role !== 'admin') {
        router.push('/');
        return;
      }
      setLoading(false);
      fetchReport();
    } catch (err) {
      console.error('Auth check error:', err);
      router.push('/login');
    }
  };

  const fetchReport = async () => {
    try {
      const response = await fetch(`/api/subsidizers/${subsidizerId}/report`);
      if (response.ok) {
        const reportData = await response.json();
        setData(reportData);
      } else {
        setError('שגיאה בטעינת דוח מסבסד');
      }
    } catch (err) {
      setError('שגיאה בטעינת דוח מסבסד');
      console.error('Fetch report error:', err);
    }
  };

  const handleSelectLesson = (lessonId) => {
    if (selectedLessons.includes(lessonId)) {
      setSelectedLessons(selectedLessons.filter((id) => id !== lessonId));
    } else {
      setSelectedLessons([...selectedLessons, lessonId]);
    }
  };

  const handleSelectAllForStudent = (student) => {
    const studentLessonIds = student.lessons.map((l) => l.id);
    const allSelected = studentLessonIds.every((id) => selectedLessons.includes(id));

    if (allSelected) {
      // Deselect all lessons for this student
      setSelectedLessons(selectedLessons.filter((id) => !studentLessonIds.includes(id)));
    } else {
      // Select all lessons for this student
      const newSelection = [...new Set([...selectedLessons, ...studentLessonIds])];
      setSelectedLessons(newSelection);
    }
  };

  const calculateSelectedTotal = () => {
    if (!data) return 0;
    let total = 0;
    data.studentReports.forEach((student) => {
      student.lessons.forEach((lesson) => {
        if (selectedLessons.includes(lesson.id)) {
          total += lesson.amount;
        }
      });
    });
    return total;
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();

    if (selectedLessons.length === 0) {
      setError('אנא בחר לפחות שיעור אחד');
      return;
    }

    try {
      const response = await fetch(`/api/subsidizers/${subsidizerId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonIds: selectedLessons,
          ...paymentForm,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(`תשלום עובד בהצלחה! ${result.lessonsMarkedPaid} שיעורים סומנו כשולמו. סה"כ: ₪${result.totalAmount.toFixed(2)}`);
        setShowPaymentModal(false);
        setSelectedLessons([]);
        setPaymentForm({
          paymentMethod: 'bank_transfer',
          referenceNumber: '',
          notes: '',
        });
        fetchReport();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'שגיאה בעיבוד תשלום');
      }
    } catch (err) {
      setError('שגיאה בעיבוד תשלום');
      console.error('Process payment error:', err);
    }
  };

  if (loading) {
    return (
      <>
        <AdminNav />
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

  if (!data) {
    return (
      <>
        <AdminNav />
        <Container fluid dir="rtl">
          <Alert variant="warning">לא נמצא מידע על המסבסד</Alert>
        </Container>
      </>
    );
  }

  const { subsidizer, studentReports, summary } = data;
  const selectedTotal = calculateSelectedTotal();

  return (
    <>
      <AdminNav />
      <Container fluid dir="rtl" className="py-4">
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

        <Row className="mb-4">
          <Col>
            <Button variant="link" onClick={() => router.push('/admin/subsidizers')}>
              ← חזרה למסבסדים
            </Button>
            <h2>דוח מסבסד: {subsidizer.name}</h2>
            <p className="text-muted">
              {subsidizer.email && `${subsidizer.email}`}
              {subsidizer.phone && ` • ${subsidizer.phone}`}
            </p>
          </Col>
        </Row>

        <Row className="g-4 mb-4">
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h6 className="text-muted mb-2">תלמידים</h6>
                <h2 className="mb-0">{summary.totalStudents}</h2>
              </Card.Body>
            </Card>
          </Col>

          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h6 className="text-muted mb-2">שיעורים לא שולמו</h6>
                <h2 className="mb-0">{summary.totalLessons}</h2>
              </Card.Body>
            </Card>
          </Col>

          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h6 className="text-muted mb-2">סכום חייב</h6>
                <h2 className="mb-0 text-danger">₪{summary.totalOwed.toFixed(2)}</h2>
              </Card.Body>
            </Card>
          </Col>

          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h6 className="text-muted mb-2">סכום נבחר</h6>
                <h2 className="mb-0 text-success">₪{selectedTotal.toFixed(2)}</h2>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">שיעורים לפי תלמיד</h5>
                <Button
                  variant="success"
                  disabled={selectedLessons.length === 0}
                  onClick={() => setShowPaymentModal(true)}
                >
                  💰 סמן כשולם ({selectedLessons.length})
                </Button>
              </Card.Header>
              <Card.Body>
                {studentReports.length === 0 ? (
                  <div className="text-center text-muted py-5">
                    <div style={{ fontSize: '3rem' }}>✅</div>
                    <p>אין שיעורים ממתינים לתשלום!</p>
                  </div>
                ) : (
                  <Accordion>
                    {studentReports.map((student, index) => (
                      <Accordion.Item eventKey={index.toString()} key={student.studentId}>
                        <Accordion.Header>
                          <div className="d-flex justify-content-between align-items-center w-100 me-3">
                            <div>
                              <strong>{student.studentName}</strong>
                              <br />
                              <small className="text-muted">{student.studentEmail}</small>
                            </div>
                            <div className="text-end">
                              <Badge bg="warning" className="me-2">
                                {student.lessonCount} שיעורים
                              </Badge>
                              <Badge bg="danger">₪{student.totalOwed.toFixed(2)}</Badge>
                            </div>
                          </div>
                        </Accordion.Header>
                        <Accordion.Body>
                          <div className="mb-2">
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() => handleSelectAllForStudent(student)}
                            >
                              {student.lessons.every((l) => selectedLessons.includes(l.id))
                                ? 'בטל בחירת הכל'
                                : 'בחר הכל'}
                            </Button>
                          </div>
                          <Table size="sm" striped hover>
                            <thead>
                              <tr>
                                <th></th>
                                <th>תאריך</th>
                                <th>שעה</th>
                                <th>כלי</th>
                                <th>מורה</th>
                                <th>חדר</th>
                                <th>סכום</th>
                              </tr>
                            </thead>
                            <tbody>
                              {student.lessons.map((lesson) => (
                                <tr
                                  key={lesson.id}
                                  className={selectedLessons.includes(lesson.id) ? 'table-active' : ''}
                                >
                                  <td>
                                    <Form.Check
                                      type="checkbox"
                                      checked={selectedLessons.includes(lesson.id)}
                                      onChange={() => handleSelectLesson(lesson.id)}
                                    />
                                  </td>
                                  <td>{new Date(lesson.date).toLocaleDateString('he-IL')}</td>
                                  <td>
                                    {lesson.startTime} - {lesson.endTime}
                                  </td>
                                  <td>{lesson.instrument}</td>
                                  <td>{lesson.teacherName}</td>
                                  <td>{lesson.roomName}</td>
                                  <td>
                                    <strong>₪{lesson.amount.toFixed(2)}</strong>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td colSpan="6" className="text-end">
                                  <strong>סה"כ לתלמיד:</strong>
                                </td>
                                <td>
                                  <strong>₪{student.totalOwed.toFixed(2)}</strong>
                                </td>
                              </tr>
                            </tfoot>
                          </Table>
                        </Accordion.Body>
                      </Accordion.Item>
                    ))}
                  </Accordion>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Payment Modal */}
        <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} dir="rtl">
          <Modal.Header closeButton>
            <Modal.Title>אישור תשלום ממסבסד</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleProcessPayment}>
            <Modal.Body>
              <Alert variant="info">
                <strong>מסבסד:</strong> {subsidizer.name}
                <br />
                <strong>סה"כ לתשלום:</strong> ₪{selectedTotal.toFixed(2)}
                <br />
                <strong>שיעורים:</strong> {selectedLessons.length}
              </Alert>

              <Form.Group className="mb-3">
                <Form.Label>אמצעי תשלום</Form.Label>
                <Form.Select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                >
                  <option value="bank_transfer">העברה בנקאית</option>
                  <option value="check">צ'ק</option>
                  <option value="cash">מזומן</option>
                  <option value="other">אחר</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>מספר אסמכתא (אופציונלי)</Form.Label>
                <Form.Control
                  type="text"
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                  placeholder="מספר עסקה / צ'ק / אסמכתא"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>הערות (אופציונלי)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="הערות נוספות"
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>
                ביטול
              </Button>
              <Button variant="success" type="submit">
                אשר תשלום - ₪{selectedTotal.toFixed(2)}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </Container>
    </>
  );
}
