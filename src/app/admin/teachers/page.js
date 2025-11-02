'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal, Form, Badge, Alert, InputGroup } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import AdminNav from '@/components/AdminNav';

const INSTRUMENTS = [
  'פסנתר',
  'גיטרה',
  'בס',
  'תופים',
  'חליל',
  'סקסופון',
  'חצוצרה',
  'שירה',
  'כינור',
  'ויולה',
  'צ\'לו',
  'קלרינט',
  'אקורדיון',
  'אחר'
];

export default function TeachersPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [teacherPin, setTeacherPin] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    instruments: [],
    lessonRate: 80,
    bio: '',
    language: 'he',
    isActive: true,
  });

  useEffect(() => {
    checkAuth();
    loadTeachers();
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
      }
    } catch (err) {
      localStorage.removeItem('token');
      router.push('/login');
    }
  };

  const loadTeachers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/teachers', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to load teachers');

      const data = await res.json();
      setTeachers(data.teachers || []);
    } catch (err) {
      setMessage({ type: 'danger', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (teacher = null) => {
    if (teacher) {
      setEditingTeacher(teacher);
      setFormData({
        email: teacher.user.email,
        password: '',
        firstName: teacher.user.firstName,
        lastName: teacher.user.lastName,
        phone: teacher.user.phone || '',
        instruments: teacher.instruments || [],
        lessonRate: teacher.lessonRate,
        bio: teacher.bio || '',
        language: teacher.user.language,
        isActive: teacher.user.isActive,
      });
    } else {
      setEditingTeacher(null);
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        instruments: [],
        lessonRate: 80,
        bio: '',
        language: 'he',
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTeacher(null);
    setShowPassword(false);
    setSubmitting(false);
  };

  const handleInstrumentToggle = (instrument) => {
    setFormData((prev) => ({
      ...prev,
      instruments: prev.instruments.includes(instrument)
        ? prev.instruments.filter((i) => i !== instrument)
        : [...prev.instruments, instrument],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const url = editingTeacher ? `/api/teachers/${editingTeacher.id}` : '/api/teachers';
      const method = editingTeacher ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        lessonRate: parseFloat(formData.lessonRate),
      };

      // Don't send empty password on update
      if (editingTeacher && !formData.password) {
        delete payload.password;
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save teacher');
      }

      setMessage({
        type: 'success',
        text: editingTeacher
          ? 'Teacher updated successfully'
          : `Teacher created successfully. PIN: ${data.pin}`,
      });

      handleCloseModal();
      loadTeachers();
    } catch (err) {
      setMessage({ type: 'danger', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewPin = async (teacher) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/teachers/${teacher.id}/get-pin`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get PIN');
      }

      setTeacherPin(data.pin);
      setSelectedTeacher(teacher);
      setShowPinModal(true);
    } catch (err) {
      setMessage({ type: 'danger', text: err.message });
    }
  };

  const handleResetPin = async (teacher) => {
    if (!confirm('Are you sure you want to reset this teacher\'s PIN?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/teachers/${teacher.id}/reset-pin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset PIN');
      }

      setMessage({ type: 'success', text: `PIN reset successfully. New PIN: ${data.pin}` });
    } catch (err) {
      setMessage({ type: 'danger', text: err.message });
    }
  };

  const handleViewQR = async (teacher) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/teachers/${teacher.id}/qr`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get QR code');
      }

      setQrCode(data.qrCode);
      setSelectedTeacher(teacher);
      setShowQRModal(true);
    } catch (err) {
      setMessage({ type: 'danger', text: err.message });
    }
  };

  const handleDelete = async (teacherId) => {
    if (!confirm('Are you sure you want to deactivate this teacher?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/teachers/${teacherId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete teacher');
      }

      setMessage({ type: 'success', text: data.message });
      loadTeachers();
    } catch (err) {
      setMessage({ type: 'danger', text: err.message });
    }
  };

  if (loading) {
    return (
      <Container className="py-5">
        <p>Loading...</p>
      </Container>
    );
  }

  return (
    <>
      <AdminNav />
      <Container fluid>
        <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>ניהול מורים</h2>
              <p className="text-muted">נהל את המורים של בית הספר</p>
            </div>
            <Button variant="primary" onClick={() => handleOpenModal()}>
              + הוסף מורה חדש
            </Button>
          </div>
        </Col>
      </Row>

      {message && (
        <Alert
          variant={message.type}
          dismissible
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      <Card>
        <Card.Body>
          {teachers.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted">אין מורים במערכת</p>
              <Button variant="primary" onClick={() => handleOpenModal()}>
                צור מורה ראשון
              </Button>
            </div>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>שם</th>
                  <th>אימייל</th>
                  <th>כלים</th>
                  <th>מחיר לשיעור</th>
                  <th>סטטוס</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => (
                  <tr key={teacher.id}>
                    <td>
                      <strong>
                        {teacher.user.firstName} {teacher.user.lastName}
                      </strong>
                    </td>
                    <td className="text-muted">{teacher.user.email}</td>
                    <td>
                      <small className="text-muted">
                        {teacher.instruments.join(', ') || '-'}
                      </small>
                    </td>
                    <td>₪{teacher.lessonRate}</td>
                    <td>
                      <Badge bg={teacher.user.isActive ? 'success' : 'secondary'}>
                        {teacher.user.isActive ? 'פעיל' : 'לא פעיל'}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-1 mb-1"
                        onClick={() => handleOpenModal(teacher)}
                      >
                        ערוך
                      </Button>
                      <Button
                        variant="outline-info"
                        size="sm"
                        className="me-1 mb-1"
                        onClick={() => handleViewPin(teacher)}
                      >
                        PIN
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        className="me-1 mb-1"
                        onClick={() => handleViewQR(teacher)}
                      >
                        QR
                      </Button>
                      <Button
                        variant="outline-warning"
                        size="sm"
                        className="me-1 mb-1"
                        onClick={() => handleResetPin(teacher)}
                      >
                        איפוס PIN
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        className="mb-1"
                        onClick={() => handleDelete(teacher.id)}
                      >
                        השבת
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Add/Edit Teacher Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg" dir="rtl">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingTeacher ? 'ערוך מורה' : 'הוסף מורה חדש'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>שם פרטי *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>שם משפחה *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>אימייל *</Form.Label>
              <Form.Control
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                dir="ltr"
              />
            </Form.Group>

            {!editingTeacher && (
              <Form.Group className="mb-3">
                <Form.Label>סיסמה</Form.Label>
                <div className="position-relative">
                  <Form.Control
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="השאר ריק לסיסמה אוטומטית"
                    dir="ltr"
                    style={{ paddingRight: '45px' }}
                  />
                  <Button
                    variant="link"
                    className="position-absolute top-0 end-0 text-muted"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      border: 'none',
                      background: 'none',
                      padding: '0.375rem 0.75rem',
                      height: '100%',
                      zIndex: 10
                    }}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </Button>
                </div>
                <Form.Text className="text-muted">
                  אם לא תזין סיסמה, המערכת תיצור אחת באופן אוטומטי
                </Form.Text>
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Label>טלפון</Form.Label>
              <Form.Control
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                dir="ltr"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>יכול ללמד על: *</Form.Label>
              <div className="border rounded overflow-hidden">
                {INSTRUMENTS.map((instrument, index) => (
                  <div
                    key={instrument}
                    className="p-2 px-3"
                    onClick={() => handleInstrumentToggle(instrument)}
                    style={{
                      backgroundColor: index % 2 === 0 ? '#f8f9fa' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e9ecef';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
                    }}
                  >
                    <Form.Check
                      type="checkbox"
                      label={instrument}
                      checked={formData.instruments.includes(instrument)}
                      onChange={() => {}} // Handled by parent div
                      style={{ pointerEvents: 'none' }}
                    />
                  </div>
                ))}
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>מחיר לשיעור (₪)</Form.Label>
              <Form.Control
                type="number"
                value={formData.lessonRate}
                onChange={(e) =>
                  setFormData({ ...formData, lessonRate: e.target.value })
                }
                min="0"
                step="0.01"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>ביוגרפיה</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="מורה פעיל"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal} disabled={submitting}>
              ביטול
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  {editingTeacher ? 'מעדכן...' : 'יוצר...'}
                </>
              ) : (
                editingTeacher ? 'עדכן' : 'צור'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* PIN Modal */}
      <Modal show={showPinModal} onHide={() => setShowPinModal(false)} dir="rtl">
        <Modal.Header closeButton>
          <Modal.Title>קוד PIN של המורה</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {selectedTeacher && (
            <>
              <h5>{selectedTeacher.user.firstName} {selectedTeacher.user.lastName}</h5>
              <div className="my-4">
                <h1 className="display-1 fw-bold text-primary">{teacherPin}</h1>
              </div>
              <p className="text-muted">שתף קוד זה עם המורה להתחברות</p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPinModal(false)}>
            סגור
          </Button>
        </Modal.Footer>
      </Modal>

      {/* QR Code Modal */}
      <Modal show={showQRModal} onHide={() => setShowQRModal(false)} dir="rtl">
        <Modal.Header closeButton>
          <Modal.Title>QR Code של המורה</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {selectedTeacher && qrCode && (
            <>
              <h5>{selectedTeacher.user.firstName} {selectedTeacher.user.lastName}</h5>
              <div className="my-4">
                <img src={qrCode} alt="QR Code" className="img-fluid" />
              </div>
              <p className="text-muted">סרוק את הקוד להתחברות מהירה</p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowQRModal(false)}>
            סגור
          </Button>
        </Modal.Footer>
      </Modal>
      </Container>
    </>
  );
}
