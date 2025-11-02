'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Alert, Modal, Form, Badge } from 'react-bootstrap';
import AdminNav from '@/components/AdminNav';
import { useRouter } from 'next/navigation';

export default function SubsidizersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [subsidizers, setSubsidizers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentSubsidizer, setCurrentSubsidizer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
    isActive: true,
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
      fetchSubsidizers();
    } catch (err) {
      console.error('Auth check error:', err);
      router.push('/login');
    }
  };

  const fetchSubsidizers = async () => {
    try {
      const response = await fetch('/api/subsidizers');
      if (response.ok) {
        const data = await response.json();
        setSubsidizers(data);
      } else {
        setError('שגיאה בטעינת רשימת מסבסדים');
      }
    } catch (err) {
      setError('שגיאה בטעינת רשימת מסבסדים');
      console.error('Fetch subsidizers error:', err);
    }
  };

  const handleOpenModal = (subsidizer = null) => {
    if (subsidizer) {
      setEditMode(true);
      setCurrentSubsidizer(subsidizer);
      setFormData({
        name: subsidizer.name,
        email: subsidizer.email || '',
        phone: subsidizer.phone || '',
        notes: subsidizer.notes || '',
        isActive: subsidizer.isActive,
      });
    } else {
      setEditMode(false);
      setCurrentSubsidizer(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        notes: '',
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditMode(false);
    setCurrentSubsidizer(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      notes: '',
      isActive: true,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = editMode ? `/api/subsidizers/${currentSubsidizer.id}` : '/api/subsidizers';
      const method = editMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess(editMode ? 'מסבסד עודכן בהצלחה' : 'מסבסד נוסף בהצלחה');
        handleCloseModal();
        fetchSubsidizers();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'שגיאה בשמירת מסבסד');
      }
    } catch (err) {
      setError('שגיאה בשמירת מסבסד');
      console.error('Submit subsidizer error:', err);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את ${name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/subsidizers/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('מסבסד נמחק בהצלחה');
        fetchSubsidizers();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'שגיאה במחיקת מסבסד');
      }
    } catch (err) {
      setError('שגיאה במחיקת מסבסד');
      console.error('Delete subsidizer error:', err);
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
            <div className="d-flex justify-content-between align-items-center">
              <h2>ניהול מסבסדים</h2>
              <Button variant="success" onClick={() => handleOpenModal()}>
                ➕ הוסף מסבסד חדש
              </Button>
            </div>
          </Col>
        </Row>

        <Row>
          <Col>
            <Card>
              <Card.Body>
                {subsidizers.length === 0 ? (
                  <div className="text-center text-muted py-5">
                    <div style={{ fontSize: '3rem' }}>📋</div>
                    <p>אין מסבסדים במערכת</p>
                    <Button variant="primary" onClick={() => handleOpenModal()}>
                      הוסף מסבסד ראשון
                    </Button>
                  </div>
                ) : (
                  <Table striped hover responsive>
                    <thead>
                      <tr>
                        <th>שם</th>
                        <th>אימייל</th>
                        <th>טלפון</th>
                        <th>תלמידים</th>
                        <th>סטטוס</th>
                        <th>הערות</th>
                        <th>פעולות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subsidizers.map((subsidizer) => (
                        <tr key={subsidizer.id}>
                          <td>
                            <strong>{subsidizer.name}</strong>
                          </td>
                          <td>{subsidizer.email || '-'}</td>
                          <td>{subsidizer.phone || '-'}</td>
                          <td>
                            <Badge bg="info">{subsidizer.studentCount} תלמידים</Badge>
                          </td>
                          <td>
                            {subsidizer.isActive ? (
                              <Badge bg="success">פעיל</Badge>
                            ) : (
                              <Badge bg="secondary">לא פעיל</Badge>
                            )}
                          </td>
                          <td>
                            {subsidizer.notes ? (
                              <small className="text-muted">{subsidizer.notes}</small>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td>
                            <Button
                              size="sm"
                              variant="primary"
                              className="me-2"
                              onClick={() => router.push(`/admin/subsidizers/${subsidizer.id}/report`)}
                            >
                              📊 דוח
                            </Button>
                            <Button
                              size="sm"
                              variant="warning"
                              className="me-2"
                              onClick={() => handleOpenModal(subsidizer)}
                            >
                              ✏️ ערוך
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleDelete(subsidizer.id, subsidizer.name)}
                              disabled={subsidizer.studentCount > 0}
                            >
                              🗑️ מחק
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Add/Edit Modal */}
        <Modal show={showModal} onHide={handleCloseModal} dir="rtl">
          <Modal.Header closeButton>
            <Modal.Title>{editMode ? 'ערוך מסבסד' : 'הוסף מסבסד חדש'}</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmit}>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label>שם *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="שם המסבסד"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>אימייל</Form.Label>
                <Form.Control
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>טלפון</Form.Label>
                <Form.Control
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="050-1234567"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>הערות</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="הערות נוספות"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  label="פעיל"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleCloseModal}>
                ביטול
              </Button>
              <Button variant="success" type="submit">
                {editMode ? 'עדכן' : 'הוסף'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </Container>
    </>
  );
}
