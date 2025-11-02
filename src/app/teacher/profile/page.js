'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Badge } from 'react-bootstrap';
import TeacherNav from '@/components/TeacherNav';
import { useRouter } from 'next/navigation';

export default function TeacherProfilePage() {
  const router = useRouter();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form fields
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');

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
      fetchProfile();
    } catch (err) {
      console.error('Auth check error:', err);
      router.push('/login');
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teachers/me');
      if (response.ok) {
        const data = await response.json();
        setTeacher(data);
        setPhone(data.user?.phone || '');
        setBio(data.bio || '');
      } else {
        setError('שגיאה בטעינת פרטי הפרופיל');
      }
    } catch (err) {
      setError('שגיאה בטעינת פרטי הפרופיל');
      console.error('Fetch profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/teachers/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          bio,
        }),
      });

      if (response.ok) {
        setSuccess('הפרופיל עודכן בהצלחה');
        fetchProfile();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'שגיאה בעדכון הפרופיל');
      }
    } catch (err) {
      setError('שגיאה בעדכון הפרופיל');
      console.error('Update profile error:', err);
    } finally {
      setSaving(false);
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

  if (!teacher) {
    return (
      <>
        <TeacherNav />
        <Container fluid dir="rtl" className="py-4">
          <Alert variant="danger">לא נמצא פרופיל מורה</Alert>
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
            <h2>הפרופיל שלי</h2>
            <p className="text-muted">עדכן את הפרטים האישיים שלך</p>
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
          {/* Profile Information */}
          <Col md={8}>
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">מידע אישי</h5>
              </Card.Header>
              <Card.Body>
                <Form onSubmit={handleSubmit}>
                  <Row className="mb-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>שם פרטי</Form.Label>
                        <Form.Control
                          type="text"
                          value={teacher.user?.firstName || ''}
                          disabled
                          readOnly
                        />
                        <Form.Text className="text-muted">
                          לא ניתן לשנות שם דרך הפרופיל
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>שם משפחה</Form.Label>
                        <Form.Control
                          type="text"
                          value={teacher.user?.lastName || ''}
                          disabled
                          readOnly
                        />
                        <Form.Text className="text-muted">
                          לא ניתן לשנות שם דרך הפרופיל
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label>אימייל</Form.Label>
                    <Form.Control
                      type="email"
                      value={teacher.user?.email || ''}
                      disabled
                      readOnly
                    />
                    <Form.Text className="text-muted">
                      לא ניתן לשנות אימייל דרך הפרופיל
                    </Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>טלפון</Form.Label>
                    <Form.Control
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="הכנס מספר טלפון"
                      dir="ltr"
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>ביוגרפיה</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="ספר קצת על עצמך, ההשכלה המוזיקלית שלך, ניסיון הוראה..."
                    />
                  </Form.Group>

                  <Button
                    variant="primary"
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        שומר...
                      </>
                    ) : (
                      'שמור שינויים'
                    )}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          {/* Teaching Details */}
          <Col md={4}>
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">פרטי הוראה</h5>
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <strong>כלים שאני מלמד:</strong>
                  <div className="mt-2">
                    {teacher.instruments && teacher.instruments.length > 0 ? (
                      teacher.instruments.map((instrument, index) => (
                        <Badge key={index} bg="primary" className="me-1 mb-1">
                          {instrument}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted">לא צוין</span>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <strong>תעריף שיעור:</strong>
                  <div className="mt-1">
                    ₪{teacher.lessonRate || 0} לשיעור
                  </div>
                </div>

                <div className="mb-0">
                  <strong>סטטיסטיקות:</strong>
                  <ul className="mt-2 mb-0">
                    <li>סה"כ שיעורים: {teacher.stats?.totalLessons || 0}</li>
                    <li>סה"כ תלמידים: {teacher.stats?.totalStudents || 0}</li>
                  </ul>
                </div>
              </Card.Body>
            </Card>

            <Card>
              <Card.Header>
                <h5 className="mb-0">פרטי חשבון</h5>
              </Card.Header>
              <Card.Body>
                <div className="mb-2">
                  <strong>תפקיד:</strong>
                  <Badge bg="info" className="ms-2">מורה</Badge>
                </div>
                <div className="mb-2">
                  <strong>תאריך הצטרפות:</strong>
                  <div className="small text-muted">
                    {new Date(teacher.createdAt).toLocaleDateString('he-IL')}
                  </div>
                </div>
                <div className="mb-0">
                  <strong>עדכון אחרון:</strong>
                  <div className="small text-muted">
                    {new Date(teacher.updatedAt).toLocaleDateString('he-IL')}
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
