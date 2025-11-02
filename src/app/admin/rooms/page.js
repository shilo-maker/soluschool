'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal, Form, Badge, Alert } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import AdminNav from '@/components/AdminNav';

export default function RoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [message, setMessage] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    number: '',
    capacity: 2,
    equipment: '',
    isActive: true,
  });

  useEffect(() => {
    checkAuth();
    loadRooms();
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

  const loadRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/rooms', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to load rooms');

      const data = await res.json();
      setRooms(data.rooms || []);
    } catch (err) {
      setMessage({ type: 'danger', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (room = null) => {
    if (room) {
      setEditingRoom(room);
      setFormData({
        name: room.name,
        number: room.number,
        capacity: room.capacity,
        equipment: room.equipment.join(', '),
        isActive: room.isActive,
      });
    } else {
      setEditingRoom(null);
      setFormData({
        name: '',
        number: '',
        capacity: 2,
        equipment: '',
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRoom(null);
    setFormData({
      name: '',
      number: '',
      capacity: 2,
      equipment: '',
      isActive: true,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const url = editingRoom ? `/api/rooms/${editingRoom.id}` : '/api/rooms';
      const method = editingRoom ? 'PUT' : 'POST';

      const payload = {
        name: formData.name,
        number: formData.number,
        capacity: parseInt(formData.capacity),
        equipment: formData.equipment
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item),
        isActive: formData.isActive,
      };

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
        throw new Error(data.error || 'Failed to save room');
      }

      setMessage({
        type: 'success',
        text: editingRoom ? 'Room updated successfully' : 'Room created successfully',
      });

      handleCloseModal();
      loadRooms();
    } catch (err) {
      setMessage({ type: 'danger', text: err.message });
    }
  };

  const handleDelete = async (roomId) => {
    if (!confirm('Are you sure you want to delete this room?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete room');
      }

      setMessage({ type: 'success', text: data.message });
      loadRooms();
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
              <h2>ניהול חדרים</h2>
              <p className="text-muted">נהל את חדרי הלימוד של בית הספר</p>
            </div>
            <Button variant="primary" onClick={() => handleOpenModal()}>
              + הוסף חדר חדש
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
          {rooms.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted">אין חדרים במערכת</p>
              <Button variant="primary" onClick={() => handleOpenModal()}>
                צור חדר ראשון
              </Button>
            </div>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>שם החדר</th>
                  <th>מספר</th>
                  <th>קיבולת</th>
                  <th>ציוד</th>
                  <th>סטטוס</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id}>
                    <td>
                      <strong>{room.name}</strong>
                    </td>
                    <td>{room.number}</td>
                    <td>{room.capacity} איש</td>
                    <td>
                      {room.equipment.length > 0 ? (
                        <span className="text-muted small">
                          {room.equipment.join(', ')}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <Badge bg={room.isActive ? 'success' : 'secondary'}>
                        {room.isActive ? 'פעיל' : 'לא פעיל'}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={() => handleOpenModal(room)}
                      >
                        ערוך
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDelete(room.id)}
                      >
                        מחק
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Add/Edit Room Modal */}
      <Modal show={showModal} onHide={handleCloseModal} dir="rtl">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingRoom ? 'ערוך חדר' : 'הוסף חדר חדש'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>שם החדר *</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                placeholder="לדוגמה: חדר גיטרה 1"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>מספר חדר *</Form.Label>
              <Form.Control
                type="text"
                value={formData.number}
                onChange={(e) =>
                  setFormData({ ...formData, number: e.target.value })
                }
                required
                placeholder="לדוגמה: 101"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>קיבולת</Form.Label>
              <Form.Control
                type="number"
                value={formData.capacity}
                onChange={(e) =>
                  setFormData({ ...formData, capacity: e.target.value })
                }
                min="1"
                max="50"
              />
              <Form.Text className="text-muted">
                מספר האנשים שיכולים להיות בחדר
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>ציוד</Form.Label>
              <Form.Control
                type="text"
                value={formData.equipment}
                onChange={(e) =>
                  setFormData({ ...formData, equipment: e.target.value })
                }
                placeholder="לדוגמה: פסנתר, מגבר, מיקרופון"
              />
              <Form.Text className="text-muted">
                הפרד פריטים בפסיק
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="חדר פעיל"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              ביטול
            </Button>
            <Button variant="primary" type="submit">
              {editingRoom ? 'עדכן' : 'צור'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
      </Container>
    </>
  );
}
