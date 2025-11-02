'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Alert, Badge, InputGroup } from 'react-bootstrap';
import AdminNav from '@/components/AdminNav';
import { formatDate, convertDDMMYYYYtoISO, convertISOtoDDMMYYYY } from '@/lib/dateUtils';

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'מתוכנן', variant: 'primary' },
  { value: 'in_progress', label: 'בתהליך', variant: 'info' },
  { value: 'completed', label: 'הושלם', variant: 'success' },
  { value: 'cancelled', label: 'בוטל', variant: 'danger' },
  { value: 'no_show', label: 'לא הגיע', variant: 'warning' },
];

export default function LessonsPage() {
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showBulkCancelModal, setShowBulkCancelModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Filter states
  const [filterStudent, setFilterStudent] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Generate lessons states
  const [generateStartDate, setGenerateStartDate] = useState('');
  const [generateEndDate, setGenerateEndDate] = useState('');

  // Bulk cancel states
  const [bulkCancelStartDate, setBulkCancelStartDate] = useState('');
  const [bulkCancelEndDate, setBulkCancelEndDate] = useState('');
  const [bulkCancelTeacherId, setBulkCancelTeacherId] = useState('');
  const [bulkCancelStudentId, setBulkCancelStudentId] = useState('');
  const [bulkCancelRoomId, setBulkCancelRoomId] = useState('');
  const [bulkCancelReason, setBulkCancelReason] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    studentId: '',
    teacherId: '',
    roomId: '',
    instrument: '',
    date: '',
    startTime: '',
    endTime: '',
    duration: 35,
    status: 'scheduled',
    teacherNotes: '',
  });

  useEffect(() => {
    fetchData();
  }, [filterStudent, filterTeacher, filterRoom, filterStatus, filterDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStudent) params.append('studentId', filterStudent);
      if (filterTeacher) params.append('teacherId', filterTeacher);
      if (filterRoom) params.append('roomId', filterRoom);
      if (filterStatus) params.append('status', filterStatus);
      if (filterDate) params.append('date', filterDate);

      const [lessonsRes, studentsRes, teachersRes, roomsRes] = await Promise.all([
        fetch(`/api/lessons?${params.toString()}`),
        fetch('/api/students'),
        fetch('/api/teachers'),
        fetch('/api/rooms?active=true'),
      ]);

      if (lessonsRes.ok) {
        const lessonsData = await lessonsRes.json();
        setLessons(Array.isArray(lessonsData) ? lessonsData : []);
      }
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        setStudents(Array.isArray(studentsData.students) ? studentsData.students : []);
      }
      if (teachersRes.ok) {
        const teachersData = await teachersRes.json();
        setTeachers(Array.isArray(teachersData.teachers) ? teachersData.teachers : []);
      }
      if (roomsRes.ok) {
        const roomsData = await roomsRes.json();
        setRooms(Array.isArray(roomsData.rooms) ? roomsData.rooms : []);
      }
    } catch (err) {
      setError('שגיאה בטעינת נתונים');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateEndTime = (startTime, duration) => {
    if (!startTime || !duration) return '';
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + parseInt(duration);
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  };

  const handleShowModal = (lesson = null) => {
    if (lesson) {
      setEditingLesson(lesson);
      const endTime = calculateEndTime(lesson.startTime, lesson.duration);
      setFormData({
        studentId: lesson.studentId,
        teacherId: lesson.teacherId,
        roomId: lesson.roomId,
        instrument: lesson.instrument,
        date: new Date(lesson.date).toISOString().split('T')[0],
        startTime: lesson.startTime,
        endTime: endTime,
        duration: lesson.duration,
        status: lesson.status,
        teacherNotes: lesson.teacherNotes || '',
      });
    } else {
      setEditingLesson(null);
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        studentId: '',
        teacherId: '',
        roomId: '',
        instrument: '',
        date: today,
        startTime: '',
        endTime: '',
        duration: 35,
        status: 'scheduled',
        teacherNotes: '',
      });
    }
    setShowModal(true);
    setError('');
  };

  const handleStartTimeChange = (startTime) => {
    const endTime = calculateEndTime(startTime, formData.duration);
    setFormData({ ...formData, startTime, endTime });
  };

  const handleDurationChange = (duration) => {
    const endTime = calculateEndTime(formData.startTime, duration);
    setFormData({ ...formData, duration: parseInt(duration), endTime });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingLesson(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const url = editingLesson
        ? `/api/lessons/${editingLesson.id}`
        : '/api/lessons';
      const method = editingLesson ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        handleCloseModal();
        fetchData();
      } else {
        setError(data.message || data.error || 'שגיאה בשמירת השיעור');
      }
    } catch (err) {
      setError('שגיאה בשמירת השיעור');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('האם למחוק שיעור זה?')) return;

    try {
      const response = await fetch(`/api/lessons/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchData();
      } else {
        const data = await response.json();
        setError(data.error || 'שגיאה במחיקת השיעור');
      }
    } catch (err) {
      setError('שגיאה במחיקת השיעור');
      console.error(err);
    }
  };

  const handleGenerateLessons = async () => {
    if (!generateStartDate || !generateEndDate) {
      setError('נא למלא תאריך התחלה וסיום');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/lessons/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: generateStartDate,
          endDate: generateEndDate,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowGenerateModal(false);
        fetchData();
        alert(`נוצרו ${data.createdCount} שיעורים, ${data.skippedCount} דילגו`);
      } else {
        setError(data.error || 'שגיאה ביצירת שיעורים');
      }
    } catch (err) {
      setError('שגיאה ביצירת שיעורים');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleBulkCancel = async () => {
    if (!bulkCancelStartDate || !bulkCancelEndDate) {
      setError('יש להזין טווח תאריכים');
      return;
    }

    const confirmMessage = `האם אתה בטוח שברצונך לבטל את כל השיעורים בטווח התאריכים שנבחר?
${bulkCancelTeacherId ? 'מורה: ' + teachers.find(t => t.id === bulkCancelTeacherId)?.user.firstName + ' ' + teachers.find(t => t.id === bulkCancelTeacherId)?.user.lastName : ''}
${bulkCancelStudentId ? 'תלמיד: ' + students.find(s => s.id === bulkCancelStudentId)?.user.firstName + ' ' + students.find(s => s.id === bulkCancelStudentId)?.user.lastName : ''}`;

    if (!confirm(confirmMessage)) return;

    setCancelling(true);
    setError('');

    try {
      const response = await fetch('/api/lessons/bulk-cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: bulkCancelStartDate,
          endDate: bulkCancelEndDate,
          teacherId: bulkCancelTeacherId || undefined,
          studentId: bulkCancelStudentId || undefined,
          roomId: bulkCancelRoomId || undefined,
          cancellationReason: bulkCancelReason,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowBulkCancelModal(false);
        fetchData();
        setSuccess(data.message);
        setTimeout(() => setSuccess(''), 5000);
        // Reset form
        setBulkCancelStartDate('');
        setBulkCancelEndDate('');
        setBulkCancelTeacherId('');
        setBulkCancelStudentId('');
        setBulkCancelRoomId('');
        setBulkCancelReason('');
      } else {
        setError(data.error || 'שגיאה בביטול שיעורים');
      }
    } catch (err) {
      setError('שגיאה בביטול שיעורים');
      console.error(err);
    } finally {
      setCancelling(false);
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

  const getStudentInstruments = (studentId) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return [];
    try {
      const instruments = JSON.parse(JSON.stringify(student.instruments));
      return Array.isArray(instruments) ? instruments : [];
    } catch {
      return [];
    }
  };

  return (
    <>
      <AdminNav />
      <Container fluid dir="rtl" className="py-4">
        {/* Header */}
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h2>ניהול שיעורים</h2>
                <p className="text-muted">נהל שיעורים בודדים והפק שיעורים ממערכת השעות</p>
              </div>
              <div className="d-flex gap-2">
                <Button variant="danger" onClick={() => setShowBulkCancelModal(true)}>
                  🗑️ ביטול שיעורים
                </Button>
                <Button variant="success" onClick={() => setShowGenerateModal(true)}>
                  ⚡ הפק שיעורים ממערכת
                </Button>
                <Button variant="primary" onClick={() => handleShowModal()}>
                  + הוסף שיעור חדש
                </Button>
              </div>
            </div>
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
              <Col md={2}>
                <Form.Label>סנן לפי תלמיד</Form.Label>
                <Form.Select
                  value={filterStudent}
                  onChange={(e) => setFilterStudent(e.target.value)}
                >
                  <option value="">כל התלמידים</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.user.firstName} {student.user.lastName}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={2}>
                <Form.Label>סנן לפי מורה</Form.Label>
                <Form.Select
                  value={filterTeacher}
                  onChange={(e) => setFilterTeacher(e.target.value)}
                >
                  <option value="">כל המורים</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.user.firstName} {teacher.user.lastName}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={2}>
                <Form.Label>סנן לפי חדר</Form.Label>
                <Form.Select
                  value={filterRoom}
                  onChange={(e) => setFilterRoom(e.target.value)}
                >
                  <option value="">כל החדרים</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={2}>
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
              <Col md={2}>
                <Form.Label>סנן לפי תאריך</Form.Label>
                <Form.Control
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </Col>
              <Col md={2} className="d-flex align-items-end">
                <Button
                  variant="secondary"
                  className="w-100"
                  onClick={() => {
                    setFilterStudent('');
                    setFilterTeacher('');
                    setFilterRoom('');
                    setFilterStatus('');
                    setFilterDate('');
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
                <Button variant="primary" onClick={() => handleShowModal()}>
                  צור שיעור ראשון
                </Button>
              </div>
            ) : (
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>תאריך</th>
                    <th>שעה</th>
                    <th>תלמיד</th>
                    <th>מורה</th>
                    <th>כלי</th>
                    <th>חדר</th>
                    <th>סטטוס</th>
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
                        {lesson.student.user.firstName} {lesson.student.user.lastName}
                      </td>
                      <td>
                        {lesson.teacher.user.firstName} {lesson.teacher.user.lastName}
                      </td>
                      <td>{lesson.instrument}</td>
                      <td>{lesson.room.name}</td>
                      <td>{getStatusBadge(lesson.status)}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleShowModal(lesson)}
                          >
                            ערוך
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(lesson.id)}
                          >
                            מחק
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

        {/* Add/Edit Lesson Modal */}
        <Modal show={showModal} onHide={handleCloseModal} size="lg" dir="rtl">
          <Modal.Header closeButton>
            <Modal.Title>
              {editingLesson ? 'ערוך שיעור' : 'הוסף שיעור חדש'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={handleSubmit}>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>תלמיד *</Form.Label>
                    <Form.Select
                      required
                      value={formData.studentId}
                      onChange={(e) => {
                        setFormData({ ...formData, studentId: e.target.value, instrument: '' });
                      }}
                    >
                      <option value="">בחר תלמיד</option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.user.firstName} {student.user.lastName}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>כלי *</Form.Label>
                    <Form.Select
                      required
                      value={formData.instrument}
                      onChange={(e) => setFormData({ ...formData, instrument: e.target.value })}
                      disabled={!formData.studentId}
                    >
                      <option value="">בחר כלי</option>
                      {formData.studentId &&
                        getStudentInstruments(formData.studentId).map((inst, idx) => (
                          <option key={idx} value={inst.instrument}>
                            {inst.instrument}
                          </option>
                        ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>מורה *</Form.Label>
                    <Form.Select
                      required
                      value={formData.teacherId}
                      onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                    >
                      <option value="">בחר מורה</option>
                      {teachers
                        .filter((t) => !formData.instrument || t.instruments.includes(formData.instrument))
                        .map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.user.firstName} {teacher.user.lastName}
                          </option>
                        ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>חדר *</Form.Label>
                    <Form.Select
                      required
                      value={formData.roomId}
                      onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                    >
                      <option value="">בחר חדר</option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label>תאריך *</Form.Label>
                    <Form.Control
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label>שעת התחלה *</Form.Label>
                    <Form.Control
                      type="time"
                      required
                      value={formData.startTime}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                    />
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label>משך (דקות) *</Form.Label>
                    <Form.Control
                      type="number"
                      required
                      min="15"
                      max="120"
                      value={formData.duration}
                      onChange={(e) => handleDurationChange(e.target.value)}
                    />
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label>שעת סיום (אוטומטי)</Form.Label>
                    <Form.Control
                      type="time"
                      value={formData.endTime}
                      readOnly
                      disabled
                      style={{ backgroundColor: '#e9ecef' }}
                    />
                    <Form.Text className="text-muted">מחושב אוטומטית</Form.Text>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>סטטוס</Form.Label>
                    <Form.Select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={12}>
                  <Form.Group>
                    <Form.Label>הערות מורה</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={formData.teacherNotes}
                      onChange={(e) => setFormData({ ...formData, teacherNotes: e.target.value })}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <div className="d-flex justify-content-end gap-2 mt-4">
                <Button variant="secondary" onClick={handleCloseModal} disabled={submitting}>
                  ביטול
                </Button>
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      {editingLesson ? 'מעדכן...' : 'יוצר...'}
                    </>
                  ) : (
                    editingLesson ? 'עדכן' : 'צור'
                  )}
                </Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>

        {/* Generate Lessons Modal */}
        <Modal show={showGenerateModal} onHide={() => setShowGenerateModal(false)} dir="rtl">
          <Modal.Header closeButton>
            <Modal.Title>הפקת שיעורים ממערכת השעות</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            <Alert variant="info">
              <strong>שים לב:</strong> מערכת זו תיצור שיעורים בודדים עבור כל מערכת שעות קבועה
              בטווח התאריכים שנבחר. מקסימום 90 יום.
            </Alert>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>תאריך התחלה *</Form.Label>
                <Form.Control
                  type="date"
                  value={generateStartDate}
                  onChange={(e) => setGenerateStartDate(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>תאריך סיום *</Form.Label>
                <Form.Control
                  type="date"
                  value={generateEndDate}
                  onChange={(e) => setGenerateEndDate(e.target.value)}
                />
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowGenerateModal(false)} disabled={generating}>
              ביטול
            </Button>
            <Button variant="success" onClick={handleGenerateLessons} disabled={generating}>
              {generating ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  מפיק...
                </>
              ) : (
                'הפק שיעורים'
              )}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Bulk Cancel Modal */}
        <Modal show={showBulkCancelModal} onHide={() => setShowBulkCancelModal(false)} size="lg" dir="rtl">
          <Modal.Header closeButton>
            <Modal.Title>ביטול שיעורים</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            <Alert variant="warning">
              <strong>אזהרה:</strong> פעולה זו תבטל את כל השיעורים שמתאימים לקריטריונים שנבחרו.
              ניתן לבחור מורה או תלמיד ספציפיים, או לבטל את כל השיעורים בטווח התאריכים.
            </Alert>
            <Form>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>תאריך התחלה *</Form.Label>
                    <Form.Control
                      type="date"
                      value={bulkCancelStartDate}
                      onChange={(e) => setBulkCancelStartDate(e.target.value)}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>תאריך סיום *</Form.Label>
                    <Form.Control
                      type="date"
                      value={bulkCancelEndDate}
                      onChange={(e) => setBulkCancelEndDate(e.target.value)}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>מורה (אופציונלי)</Form.Label>
                    <Form.Select
                      value={bulkCancelTeacherId}
                      onChange={(e) => setBulkCancelTeacherId(e.target.value)}
                    >
                      <option value="">כל המורים</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.user.firstName} {teacher.user.lastName}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>תלמיד (אופציונלי)</Form.Label>
                    <Form.Select
                      value={bulkCancelStudentId}
                      onChange={(e) => setBulkCancelStudentId(e.target.value)}
                    >
                      <option value="">כל התלמידים</option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.user.firstName} {student.user.lastName}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>חדר (אופציונלי)</Form.Label>
                    <Form.Select
                      value={bulkCancelRoomId}
                      onChange={(e) => setBulkCancelRoomId(e.target.value)}
                    >
                      <option value="">כל החדרים</option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>סיבת ביטול</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={bulkCancelReason}
                  onChange={(e) => setBulkCancelReason(e.target.value)}
                  placeholder="למשל: חופשת חורף, חג, מחלה..."
                />
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowBulkCancelModal(false)} disabled={cancelling}>
              סגור
            </Button>
            <Button variant="danger" onClick={handleBulkCancel} disabled={cancelling}>
              {cancelling ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  מבטל...
                </>
              ) : (
                'בטל שיעורים'
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </>
  );
}
