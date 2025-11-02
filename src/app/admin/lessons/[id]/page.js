'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge, Form, Modal } from 'react-bootstrap';
import AdminNav from '@/components/AdminNav';
import { formatDate } from '@/lib/dateUtils';
import { useRouter, useParams } from 'next/navigation';

export default function AdminLessonDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    status: '',
    teacherNotes: '',
    cancellationReason: '',
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
      const data = await response.json();
      if (data.user.role !== 'admin') {
        router.push('/');
        return;
      }
      fetchLessonData();
    } catch (err) {
      console.error('Auth check error:', err);
      router.push('/login');
    }
  };

  const fetchLessonData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/lessons/${params.id}`);

      if (response.ok) {
        const data = await response.json();
        setLesson(data);
        setFormData({
          status: data.status || '',
          teacherNotes: data.teacherNotes || '',
          cancellationReason: data.cancellationReason || '',
        });
      } else {
        setError('Error loading lesson details');
      }
    } catch (err) {
      setError('Error loading lesson details');
      console.error('Fetch lesson error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      const response = await fetch(`/api/lessons/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchLessonData();
        setEditing(false);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save changes');
      }
    } catch (err) {
      setError('Failed to save changes');
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setError('');

      const response = await fetch(`/api/lessons/${params.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/admin/lessons');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete lesson');
      }
    } catch (err) {
      setError('Failed to delete lesson');
      console.error('Delete error:', err);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      scheduled: { label: 'Scheduled', variant: 'primary' },
      in_progress: { label: 'In Progress', variant: 'info' },
      completed: { label: 'Completed', variant: 'success' },
      cancelled: { label: 'Cancelled', variant: 'danger' },
      no_show: { label: 'No Show', variant: 'warning' },
    };
    const statusInfo = statusMap[status] || { label: status, variant: 'secondary' };
    return <Badge bg={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  if (loading) {
    return (
      <>
        <AdminNav />
        <Container fluid dir="rtl">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </Container>
      </>
    );
  }

  if (!lesson) {
    return (
      <>
        <AdminNav />
        <Container fluid dir="rtl" className="py-4">
          <Alert variant="danger">Lesson not found</Alert>
          <Button variant="primary" onClick={() => router.push('/admin/lessons')}>
            Back to Lessons
          </Button>
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

        <Row className="mb-3">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h2>Lesson Details</h2>
                <p className="text-muted">View and manage lesson information</p>
              </div>
              <div className="d-flex gap-2">
                <Button variant="outline-secondary" onClick={() => router.push('/admin/lessons')}>
                  Back
                </Button>
                {!editing && (
                  <Button variant="primary" onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </Col>
        </Row>

        <Row>
          <Col lg={8}>
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">Lesson Information</h5>
              </Card.Header>
              <Card.Body>
                <Row className="mb-3">
                  <Col md={6}>
                    <strong>Date:</strong>
                    <div>{formatDate(lesson.date)}</div>
                  </Col>
                  <Col md={6}>
                    <strong>Time:</strong>
                    <div>{lesson.startTime} - {lesson.endTime}</div>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <strong>Teacher:</strong>
                    <div>
                      {lesson.teacher?.user?.firstName} {lesson.teacher?.user?.lastName}
                    </div>
                  </Col>
                  <Col md={6}>
                    <strong>Student:</strong>
                    <div>
                      {lesson.student?.user?.firstName} {lesson.student?.user?.lastName}
                    </div>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <strong>Instrument:</strong>
                    <div>{lesson.instrument}</div>
                  </Col>
                  <Col md={6}>
                    <strong>Room:</strong>
                    <div>{lesson.room?.name}</div>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <strong>Duration:</strong>
                    <div>{lesson.duration} minutes</div>
                  </Col>
                  <Col md={6}>
                    <strong>Status:</strong>
                    {editing ? (
                      <Form.Select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="no_show">No Show</option>
                        <option value="cancelled">Cancelled</option>
                      </Form.Select>
                    ) : (
                      <div className="mt-1">{getStatusBadge(lesson.status)}</div>
                    )}
                  </Col>
                </Row>

                {editing && (
                  <>
                    <Row className="mb-3">
                      <Col md={12}>
                        <Form.Group>
                          <Form.Label>Teacher Notes</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={3}
                            value={formData.teacherNotes}
                            onChange={(e) => setFormData({ ...formData, teacherNotes: e.target.value })}
                            placeholder="Notes about the lesson..."
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    {formData.status === 'cancelled' && (
                      <Row className="mb-3">
                        <Col md={12}>
                          <Form.Group>
                            <Form.Label>Cancellation Reason</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={2}
                              value={formData.cancellationReason}
                              onChange={(e) => setFormData({ ...formData, cancellationReason: e.target.value })}
                              placeholder="Reason for cancellation..."
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    )}

                    <Row>
                      <Col>
                        <div className="d-flex gap-2">
                          <Button variant="success" onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                          </Button>
                          <Button variant="secondary" onClick={() => setEditing(false)}>
                            Cancel
                          </Button>
                        </div>
                      </Col>
                    </Row>
                  </>
                )}

                {!editing && lesson.teacherNotes && (
                  <Row className="mb-3">
                    <Col md={12}>
                      <Alert variant="info">
                        <strong>Teacher Notes:</strong>
                        <div className="mt-2">{lesson.teacherNotes}</div>
                      </Alert>
                    </Col>
                  </Row>
                )}

                {!editing && lesson.status === 'cancelled' && lesson.cancellationReason && (
                  <Row>
                    <Col md={12}>
                      <Alert variant="warning">
                        <strong>Cancellation Reason:</strong>
                        <div className="mt-2">{lesson.cancellationReason}</div>
                      </Alert>
                    </Col>
                  </Row>
                )}
              </Card.Body>
            </Card>

            {!editing && (
              <Card className="mb-4">
                <Card.Header className="bg-danger text-white">
                  <h5 className="mb-0">Danger Zone</h5>
                </Card.Header>
                <Card.Body>
                  <p>Once you delete a lesson, there is no going back. Please be certain.</p>
                  <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
                    Delete Lesson
                  </Button>
                </Card.Body>
              </Card>
            )}
          </Col>

          <Col lg={4}>
            <Card className="mb-4">
              <Card.Header>
                <h6 className="mb-0">Check-in Information</h6>
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <strong>Teacher Check-in:</strong>
                  <div className="mt-1">
                    {lesson.teacherCheckIn ? (
                      <Badge bg="success">
                        {new Date(lesson.teacherCheckIn).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Badge>
                    ) : (
                      <Badge bg="secondary">Not checked in</Badge>
                    )}
                  </div>
                </div>

                <div className="mb-0">
                  <strong>Student Check-in:</strong>
                  <div className="mt-1">
                    {lesson.studentCheckIn ? (
                      <Badge bg="success">
                        {new Date(lesson.studentCheckIn).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Badge>
                    ) : (
                      <Badge bg="secondary">Not checked in</Badge>
                    )}
                  </div>
                </div>
              </Card.Body>
            </Card>

            <Card>
              <Card.Header>
                <h6 className="mb-0">Contact Information</h6>
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <strong>Teacher:</strong>
                  {lesson.teacher?.user?.phone && (
                    <div className="small">Phone: {lesson.teacher.user.phone}</div>
                  )}
                  {lesson.teacher?.user?.email && (
                    <div className="small">Email: {lesson.teacher.user.email}</div>
                  )}
                </div>

                <div className="mb-0">
                  <strong>Student:</strong>
                  {lesson.student?.user?.phone && (
                    <div className="small">Phone: {lesson.student.user.phone}</div>
                  )}
                  {lesson.student?.user?.email && (
                    <div className="small">Email: {lesson.student.user.email}</div>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Delete</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>Are you sure you want to delete this lesson? This action cannot be undone.</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Lesson'}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </>
  );
}
