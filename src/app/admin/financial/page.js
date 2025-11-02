'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Alert, Accordion, Button } from 'react-bootstrap';
import AdminNav from '@/components/AdminNav';
import { useRouter } from 'next/navigation';

export default function AdminFinancialPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

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
      fetchDashboard();
    } catch (err) {
      console.error('Auth check error:', err);
      router.push('/login');
    }
  };

  const fetchDashboard = async () => {
    try {
      const response = await fetch('/api/financial/dashboard');
      if (response.ok) {
        const dashboardData = await response.json();
        setData(dashboardData);
      } else {
        setError('Error loading financial dashboard');
      }
    } catch (err) {
      setError('Error loading financial dashboard');
      console.error('Fetch dashboard error:', err);
    } finally {
      setLoading(false);
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
          <Alert variant="warning">לא נמצא מידע פיננסי</Alert>
        </Container>
      </>
    );
  }

  const { summary, students, subsidizers, teachers } = data;

  return (
    <>
      <AdminNav />
      <Container fluid dir="rtl" className="py-4">
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Row className="mb-4">
          <Col>
            <h2>לוח פיננסי מרכזי</h2>
            <p className="text-muted">סקירה מלאה של כל התשלומים הממתינים</p>
          </Col>
        </Row>

        {/* Summary Cards */}
        <Row className="g-4 mb-4">
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h6 className="text-muted mb-2">תלמידים חייבים</h6>
                <h2 className="mb-0 text-warning">₪{summary.totalStudentOwed.toFixed(2)}</h2>
                <small className="text-muted">{students.length} תלמידים</small>
              </Card.Body>
            </Card>
          </Col>

          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h6 className="text-muted mb-2">מסובסדים חייבים</h6>
                <h2 className="mb-0 text-info">₪{summary.totalSubsidizerOwed.toFixed(2)}</h2>
                <small className="text-muted">{subsidizers.length} מסובסדים</small>
              </Card.Body>
            </Card>
          </Col>

          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h6 className="text-muted mb-2">SOLU חייבת למורים</h6>
                <h2 className="mb-0 text-danger">₪{summary.totalSoluOwedToTeachers.toFixed(2)}</h2>
                <small className="text-muted">{teachers.length} מורים</small>
              </Card.Body>
            </Card>
          </Col>

          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h6 className="text-muted mb-2">שיעורים לא שולמו</h6>
                <h2 className="mb-0">{summary.totalUnpaidLessons}</h2>
                <small className="text-muted">מתוך {summary.totalCompletedLessons} שיעורים</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Students Section */}
        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Header>
                <h5 className="mb-0">💰 תשלומים ממתינים מתלמידים</h5>
              </Card.Header>
              <Card.Body>
                {students.length === 0 ? (
                  <div className="text-center text-muted py-5">
                    <div style={{ fontSize: '3rem' }}>✅</div>
                    <p>כל התלמידים שילמו!</p>
                  </div>
                ) : (
                  <Accordion>
                    {students.map((student, idx) => (
                      <Accordion.Item eventKey={idx.toString()} key={student.studentId}>
                        <Accordion.Header>
                          <div className="d-flex justify-content-between align-items-center w-100 me-3">
                            <div>
                              <strong>{student.studentName}</strong>
                              <Badge bg="warning" className="ms-2">
                                {student.unpaidLessons} שיעורים
                              </Badge>
                            </div>
                            <h5 className="mb-0 text-warning">₪{student.totalOwed.toFixed(2)}</h5>
                          </div>
                        </Accordion.Header>
                        <Accordion.Body>
                          <Table size="sm" striped>
                            <thead>
                              <tr>
                                <th>תאריך</th>
                                <th>כלי</th>
                                <th>סכום</th>
                              </tr>
                            </thead>
                            <tbody>
                              {student.lessons.map((lesson) => (
                                <tr key={lesson.id}>
                                  <td>{new Date(lesson.date).toLocaleDateString('he-IL')}</td>
                                  <td>{lesson.instrument}</td>
                                  <td>₪{lesson.amount.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td colSpan="2"><strong>סה"כ</strong></td>
                                <td><strong>₪{student.totalOwed.toFixed(2)}</strong></td>
                              </tr>
                            </tfoot>
                          </Table>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => router.push(`/admin/students/${student.studentId}/account`)}
                          >
                            דיווח קבלת תשלום
                          </Button>
                        </Accordion.Body>
                      </Accordion.Item>
                    ))}
                  </Accordion>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Subsidizers Section */}
        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Header>
                <h5 className="mb-0">🏢 תשלומים ממתינים ממסובסדים</h5>
              </Card.Header>
              <Card.Body>
                {subsidizers.length === 0 ? (
                  <div className="text-center text-muted py-5">
                    <div style={{ fontSize: '3rem' }}>✅</div>
                    <p>כל המסובסדים שילמו!</p>
                  </div>
                ) : (
                  <Accordion>
                    {subsidizers.map((subsidizer, idx) => (
                      <Accordion.Item eventKey={idx.toString()} key={subsidizer.subsidizerId}>
                        <Accordion.Header>
                          <div className="d-flex justify-content-between align-items-center w-100 me-3">
                            <div>
                              <strong>{subsidizer.subsidizerName}</strong>
                              <Badge bg="info" className="ms-2">
                                {subsidizer.unpaidLessons} שיעורים
                              </Badge>
                              <small className="text-muted d-block">{subsidizer.subsidizerEmail}</small>
                            </div>
                            <h5 className="mb-0 text-info">₪{subsidizer.totalOwed.toFixed(2)}</h5>
                          </div>
                        </Accordion.Header>
                        <Accordion.Body>
                          <Table size="sm" striped>
                            <thead>
                              <tr>
                                <th>תלמיד</th>
                                <th>שיעורים</th>
                                <th>סכום</th>
                              </tr>
                            </thead>
                            <tbody>
                              {subsidizer.students.map((student, sIdx) => (
                                <tr key={sIdx}>
                                  <td>{student.studentName}</td>
                                  <td>{student.lessons}</td>
                                  <td>₪{student.amount.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td colSpan="2"><strong>סה"כ</strong></td>
                                <td><strong>₪{subsidizer.totalOwed.toFixed(2)}</strong></td>
                              </tr>
                            </tfoot>
                          </Table>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => router.push(`/admin/subsidizers/${subsidizer.subsidizerId}/report`)}
                          >
                            צור דוח לשליחה
                          </Button>
                        </Accordion.Body>
                      </Accordion.Item>
                    ))}
                  </Accordion>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Teachers Section */}
        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Header>
                <h5 className="mb-0">👨‍🏫 תשלומים ממתינים למורים (מ-SOLU)</h5>
              </Card.Header>
              <Card.Body>
                {teachers.length === 0 ? (
                  <div className="text-center text-muted py-5">
                    <div style={{ fontSize: '3rem' }}>✅</div>
                    <p>כל המורים קיבלו תשלום!</p>
                  </div>
                ) : (
                  <Table striped hover responsive>
                    <thead>
                      <tr>
                        <th>מורה</th>
                        <th>שיעורים לא שולמו</th>
                        <th>חלק SOLU</th>
                        <th>סה"כ לשלם</th>
                        <th>פעולות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teachers.map((teacher) => (
                        <tr key={teacher.teacherId}>
                          <td>{teacher.teacherName}</td>
                          <td>
                            <Badge bg="secondary">{teacher.unpaidLessons}</Badge>
                          </td>
                          <td>₪{teacher.soluPortion.toFixed(2)}</td>
                          <td>
                            <strong className="text-danger">₪{teacher.totalOwed.toFixed(2)}</strong>
                          </td>
                          <td>
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => router.push(`/admin/teachers/${teacher.teacherId}/payment`)}
                            >
                              דיווח ביצוע תשלום
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="2"><strong>סה"כ</strong></td>
                        <td><strong>₪{summary.totalSoluOwedToTeachers.toFixed(2)}</strong></td>
                        <td><strong>₪{summary.totalTeacherOwed.toFixed(2)}</strong></td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Action Buttons */}
        <Row>
          <Col className="d-flex gap-3">
            <Button variant="primary" size="lg" onClick={fetchDashboard}>
              🔄 רענן נתונים
            </Button>
            <Button variant="outline-primary" size="lg" onClick={() => router.push('/admin/payments')}>
              היסטוריית תשלומים
            </Button>
            <Button variant="outline-secondary" size="lg" onClick={() => router.push('/admin/billing')}>
              חיוב מורים
            </Button>
          </Col>
        </Row>
      </Container>
    </>
  );
}
