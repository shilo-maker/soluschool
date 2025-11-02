'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Form, Button, Modal, Alert, Badge } from 'react-bootstrap';
import AdminNav from '@/components/AdminNav';
import { useRouter, useParams } from 'next/navigation';

export default function StudentAccountPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [data, setData] = useState(null);
  const [selectedLessons, setSelectedLessons] = useState(new Set());
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [processing, setProcessing] = useState(false);

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
      fetchAccountData();
    } catch (err) {
      console.error('Auth check error:', err);
      router.push('/login');
    }
  };

  const fetchAccountData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/students/${studentId}/account`);
      if (response.ok) {
        const accountData = await response.json();
        setData(accountData);
      } else {
        setError('Error loading student account');
      }
    } catch (err) {
      setError('Error loading student account');
      console.error('Fetch account data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleLesson = (lessonId) => {
    const newSelected = new Set(selectedLessons);
    if (newSelected.has(lessonId)) {
      newSelected.delete(lessonId);
    } else {
      newSelected.add(lessonId);
    }
    setSelectedLessons(newSelected);
  };

  const toggleAll = () => {
    if (selectedLessons.size === data.lessons.length) {
      setSelectedLessons(new Set());
    } else {
      setSelectedLessons(new Set(data.lessons.map(l => l.id)));
    }
  };

  const calculateSelected = () => {
    if (!data) return { count: 0, total: 0 };
    const selectedLessonsList = data.lessons.filter(l => selectedLessons.has(l.id));
    return {
      count: selectedLessonsList.length,
      total: selectedLessonsList.reduce((sum, l) => sum + l.studentPortion, 0),
    };
  };

  const handlePayment = async () => {
    if (selectedLessons.size === 0) {
      setError('בחר לפחות שיעור אחד לתשלום');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const { total } = calculateSelected();
      const response = await fetch(`/api/students/${studentId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonIds: Array.from(selectedLessons),
          paymentMethod,
          amount: total,
          notes: paymentNotes || undefined,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(result.message);
        setShowPaymentModal(false);
        setSelectedLessons(new Set());
        setPaymentNotes('');
        await fetchAccountData();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'שגיאה בעיבוד התשלום');
      }
    } catch (err) {
      setError('שגיאה בעיבוד התשלום');
      console.error('Payment error:', err);
    } finally {
      setProcessing(false);
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
          <Alert variant="warning">לא נמצא מידע עבור תלמיד זה</Alert>
          <Button onClick={() => router.push('/admin/financial')}>חזור</Button>
        </Container>
      </>
    );
  }

  const { student, lessons, summary } = data;
  const selected = calculateSelected();

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
            <Button variant="outline-secondary" onClick={() => router.push('/admin/financial')} className="mb-3">
              ← חזור ללוח הפיננסי
            </Button>
            <h2>חשבון תלמיד: {student.name}</h2>
            <p className="text-muted">
              📧 {student.email} | 📱 {student.phone}
            </p>
          </Col>
        </Row>

        <Row className="g-3 mb-4">
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h6 className="text-muted mb-2">שיעורים ממתינים</h6>
                <h2 className="mb-0">{summary.totalLessons}</h2>
              </Card.Body>
            </Card>
          </Col>

          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h6 className="text-muted mb-2">סכום כולל</h6>
                <h2 className="mb-0 text-warning">₪{summary.totalAmount.toFixed(2)}</h2>
              </Card.Body>
            </Card>
          </Col>

          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h6 className="text-muted mb-2">סובסידיה SOLU</h6>
                <h2 className="mb-0 text-success">₪{student.soluSubsidy.toFixed(2)}</h2>
                <small className="text-muted">לכל שיעור</small>
              </Card.Body>
            </Card>
          </Col>

          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h6 className="text-muted mb-2">סובסידיה נוספת</h6>
                <h2 className="mb-0 text-info">
                  ₪{student.additionalSubsidy.hasSubsidy ? student.additionalSubsidy.subsidyPerLesson.toFixed(2) : '0.00'}
                </h2>
                <small className="text-muted">לכל שיעור</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">שיעורים לתשלום</h5>
                {lessons.length > 0 && (
                  <Button
                    size="sm"
                    variant="success"
                    disabled={selectedLessons.size === 0}
                    onClick={() => setShowPaymentModal(true)}
                  >
                    💳 דיווח תשלום ({selected.count}) - ₪{selected.total.toFixed(2)}
                  </Button>
                )}
              </Card.Header>
              <Card.Body>
                {lessons.length === 0 ? (
                  <div className="text-center text-muted py-5">
                    <div style={{ fontSize: '3rem' }}>✅</div>
                    <p>כל השיעורים שולמו!</p>
                  </div>
                ) : (
                  <Table striped hover responsive>
                    <thead>
                      <tr>
                        <th>
                          <Form.Check
                            type="checkbox"
                            checked={selectedLessons.size === lessons.length}
                            onChange={toggleAll}
                          />
                        </th>
                        <th>תאריך</th>
                        <th>שעה</th>
                        <th>כלי</th>
                        <th>מורה</th>
                        <th>חדר</th>
                        <th>מחיר שיעור</th>
                        <th>SOLU</th>
                        <th>מסובסד</th>
                        <th>חלק תלמיד</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lessons.map((lesson) => (
                        <tr key={lesson.id} style={{ cursor: 'pointer' }} onClick={() => toggleLesson(lesson.id)}>
                          <td onClick={(e) => e.stopPropagation()}>
                            <Form.Check
                              type="checkbox"
                              checked={selectedLessons.has(lesson.id)}
                              onChange={() => toggleLesson(lesson.id)}
                            />
                          </td>
                          <td>{new Date(lesson.date).toLocaleDateString('he-IL')}</td>
                          <td>{lesson.startTime} - {lesson.endTime}</td>
                          <td>{lesson.instrument}</td>
                          <td>{lesson.teacherName}</td>
                          <td>{lesson.roomName}</td>
                          <td>₪{lesson.lessonRate.toFixed(2)}</td>
                          <td>
                            <Badge bg="success">-₪{lesson.soluSubsidy.toFixed(2)}</Badge>
                          </td>
                          <td>
                            {lesson.subsidizerAmount > 0 ? (
                              <Badge bg="info">-₪{lesson.subsidizerAmount.toFixed(2)}</Badge>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td>
                            <strong>₪{lesson.studentPortion.toFixed(2)}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="9" className="text-end"><strong>סה"כ:</strong></td>
                        <td><strong>₪{summary.totalAmount.toFixed(2)}</strong></td>
                      </tr>
                      {selected.count > 0 && (
                        <tr className="table-warning">
                          <td colSpan="9" className="text-end"><strong>נבחר ({selected.count}):</strong></td>
                          <td><strong>₪{selected.total.toFixed(2)}</strong></td>
                        </tr>
                      )}
                    </tfoot>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} dir="rtl">
          <Modal.Header closeButton>
            <Modal.Title>עיבוד תשלום</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="mb-3">
              <h5>פרטי תשלום</h5>
              <p>תלמיד: <strong>{student.name}</strong></p>
              <p>שיעורים: <strong>{selected.count}</strong></p>
              <p>סכום: <strong className="text-success">₪{selected.total.toFixed(2)}</strong></p>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>אמצעי תשלום</Form.Label>
              <Form.Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="cash">מזומן</option>
                <option value="credit">כרטיס אשראי</option>
                <option value="bank_transfer">העברה בנקאית</option>
                <option value="check">שיק</option>
                <option value="bit">Bit</option>
                <option value="paypal">PayPal</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>הערות (אופציונלי)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="הערות נוספות על התשלום..."
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPaymentModal(false)} disabled={processing}>
              ביטול
            </Button>
            <Button variant="success" onClick={handlePayment} disabled={processing}>
              {processing ? 'מעבד...' : `אשר תשלום - ₪${selected.total.toFixed(2)}`}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </>
  );
}
