'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Form, Button, Alert, Badge, Modal } from 'react-bootstrap';
import AdminNav from '@/components/AdminNav';
import { useRouter, useParams } from 'next/navigation';

export default function TeacherPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const teacherId = params.id;

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
      fetchPaymentData();
    } catch (err) {
      console.error('Auth check error:', err);
      router.push('/login');
    }
  };

  const fetchPaymentData = async () => {
    try {
      const response = await fetch(`/api/teachers/${teacherId}/payment`);
      if (response.ok) {
        const paymentData = await response.json();
        setData(paymentData);
      } else {
        setError('שגיאה בטעינת נתוני תשלום מורה');
      }
    } catch (err) {
      setError('שגיאה בטעינת נתוני תשלום מורה');
      console.error('Fetch payment data error:', err);
    }
  };

  const handleSelectLesson = (lessonId) => {
    if (selectedLessons.includes(lessonId)) {
      setSelectedLessons(selectedLessons.filter((id) => id !== lessonId));
    } else {
      setSelectedLessons([...selectedLessons, lessonId]);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedLessons(data.unpaidLessons.map((l) => l.id));
    } else {
      setSelectedLessons([]);
    }
  };

  const calculateSelectedTotal = () => {
    return data.unpaidLessons
      .filter((l) => selectedLessons.includes(l.id))
      .reduce((sum, l) => sum + l.soluPortion, 0);
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();

    if (selectedLessons.length === 0) {
      setError('אנא בחר לפחות שיעור אחד');
      return;
    }

    try {
      const response = await fetch(`/api/teachers/${teacherId}/payment`, {
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
        fetchPaymentData();
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
          <Alert variant="warning">לא נמצא מידע על המורה</Alert>
        </Container>
      </>
    );
  }

  const { teacher, unpaidLessons, summary } = data;
  const selectedTotal = selectedLessons.length > 0 ? calculateSelectedTotal() : 0;

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
            <Button variant="link" onClick={() => router.push('/admin/teachers')}>
              ← חזרה למורים
            </Button>
            <h2>תשלום מורה: {teacher.name}</h2>
            <p className="text-muted">
              {teacher.email} {teacher.phone && `• ${teacher.phone}`}
            </p>
            <p className="text-muted">
              מחיר שיעור: ₪{teacher.lessonRate.toFixed(2)}
            </p>
          </Col>
        </Row>

        <Row className="g-4 mb-4">
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
                <h6 className="text-muted mb-2">סה"כ לתשלום (חלק SOLU)</h6>
                <h2 className="mb-0 text-danger">₪{summary.soluPortion.toFixed(2)}</h2>
              </Card.Body>
            </Card>
          </Col>

          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h6 className="text-muted mb-2">שיעורים נבחרו</h6>
                <h2 className="mb-0 text-info">{selectedLessons.length}</h2>
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
                <h5 className="mb-0">שיעורים ממתינים לתשלום מ-SOLU</h5>
                <Button
                  variant="success"
                  disabled={selectedLessons.length === 0}
                  onClick={() => setShowPaymentModal(true)}
                >
                  💰 סמן כשולם ({selectedLessons.length})
                </Button>
              </Card.Header>
              <Card.Body>
                {unpaidLessons.length === 0 ? (
                  <div className="text-center text-muted py-5">
                    <div style={{ fontSize: '3rem' }}>✅</div>
                    <p>אין שיעורים ממתינים לתשלום!</p>
                  </div>
                ) : (
                  <Table striped hover responsive>
                    <thead>
                      <tr>
                        <th>
                          <Form.Check
                            type="checkbox"
                            checked={selectedLessons.length === unpaidLessons.length}
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th>תאריך</th>
                        <th>שעה</th>
                        <th>כלי</th>
                        <th>תלמיד</th>
                        <th>חדר</th>
                        <th>מחיר שיעור</th>
                        <th>חלק SOLU</th>
                        <th>תלמיד שילם</th>
                        <th>מסבסד שילם</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unpaidLessons.map((lesson) => (
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
                          <td>{lesson.studentName}</td>
                          <td>{lesson.roomName}</td>
                          <td>₪{lesson.lessonRate.toFixed(2)}</td>
                          <td>
                            <Badge bg="info">₪{lesson.soluPortion.toFixed(2)}</Badge>
                          </td>
                          <td>
                            {lesson.studentPaid ? (
                              <Badge bg="success">✓ שולם</Badge>
                            ) : (
                              <Badge bg="secondary">לא שולם</Badge>
                            )}
                          </td>
                          <td>
                            {lesson.subsidizerPaid ? (
                              <Badge bg="success">✓ שולם</Badge>
                            ) : (
                              <Badge bg="secondary">לא שולם</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="7" className="text-end">
                          <strong>סה"כ נבחרו (חלק SOLU):</strong>
                        </td>
                        <td>
                          <strong className="text-success">₪{selectedTotal.toFixed(2)}</strong>
                        </td>
                        <td colSpan="2"></td>
                      </tr>
                    </tfoot>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Payment Modal */}
        <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} dir="rtl">
          <Modal.Header closeButton>
            <Modal.Title>אישור תשלום למורה</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleProcessPayment}>
            <Modal.Body>
              <Alert variant="info">
                <strong>מורה:</strong> {teacher.name}
                <br />
                <strong>סה"כ לתשלום:</strong> ₪{selectedTotal.toFixed(2)}
                <br />
                <strong>שיעורים:</strong> {selectedLessons.length}
                <br />
                <small className="text-muted">זהו החלק של SOLU (סבסוד) מהשיעורים</small>
              </Alert>

              <Form.Group className="mb-3">
                <Form.Label>אמצעי תשלום</Form.Label>
                <Form.Select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                >
                  <option value="bank_transfer">העברה בנקאית</option>
                  <option value="cash">מזומן</option>
                  <option value="check">צ'ק</option>
                  <option value="paypal">PayPal</option>
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
