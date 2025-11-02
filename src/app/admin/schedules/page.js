'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Alert, Badge } from 'react-bootstrap';
import AdminNav from '@/components/AdminNav';
import { formatDate, convertDDMMYYYYtoISO, convertISOtoDDMMYYYY } from '@/lib/dateUtils';

const daysOfWeek = [
  { value: 0, label: 'ראשון' },
  { value: 1, label: 'שני' },
  { value: 2, label: 'שלישי' },
  { value: 3, label: 'רביעי' },
  { value: 4, label: 'חמישי' },
  { value: 5, label: 'שישי' },
  { value: 6, label: 'שבת' },
];

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Filter states
  const [filterStudent, setFilterStudent] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [filterDay, setFilterDay] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    studentId: '',
    teacherId: '',
    roomId: '',
    instrument: '',
    dayOfWeek: '',
    startTime: '',
    endTime: '',
    duration: 35,
    effectiveFrom: '',
    effectiveUntil: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, [filterStudent, filterTeacher, filterRoom, filterDay]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStudent) params.append('studentId', filterStudent);
      if (filterTeacher) params.append('teacherId', filterTeacher);
      if (filterRoom) params.append('roomId', filterRoom);
      if (filterDay !== '') params.append('dayOfWeek', filterDay);
      params.append('isActive', 'true');

      const [schedulesRes, studentsRes, teachersRes, roomsRes] = await Promise.all([
        fetch(`/api/schedules?${params.toString()}`),
        fetch('/api/students'),
        fetch('/api/teachers'),
        fetch('/api/rooms?active=true'),
      ]);

      if (schedulesRes.ok) {
        const schedulesData = await schedulesRes.json();
        setSchedules(Array.isArray(schedulesData) ? schedulesData : []);
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

  const handleShowModal = (schedule = null) => {
    if (schedule) {
      setEditingSchedule(schedule);
      const endTime = calculateEndTime(schedule.startTime, schedule.duration);
      setFormData({
        studentId: schedule.studentId,
        teacherId: schedule.teacherId,
        roomId: schedule.roomId,
        instrument: schedule.instrument,
        dayOfWeek: schedule.dayOfWeek.toString(),
        startTime: schedule.startTime,
        endTime: endTime,
        duration: schedule.duration,
        effectiveFrom: schedule.effectiveFrom ? new Date(schedule.effectiveFrom).toISOString().split('T')[0] : '',
        effectiveUntil: schedule.effectiveUntil ? new Date(schedule.effectiveUntil).toISOString().split('T')[0] : '',
        notes: schedule.notes || '',
      });
    } else {
      setEditingSchedule(null);
      setFormData({
        studentId: '',
        teacherId: '',
        roomId: '',
        instrument: '',
        dayOfWeek: '',
        startTime: '',
        endTime: '',
        duration: 35,
        effectiveFrom: new Date().toISOString().split('T')[0],
        effectiveUntil: '',
        notes: '',
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
    setEditingSchedule(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const url = editingSchedule
        ? `/api/schedules/${editingSchedule.id}`
        : '/api/schedules';
      const method = editingSchedule ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        handleCloseModal();
        fetchData();

        // Show success message with lesson generation info
        if (data.lessonsGenerated && !editingSchedule) {
          setSuccess(
            `המערכת נוצרה בהצלחה! ${data.lessonsGenerated.message}`
          );
          // Clear success message after 5 seconds
          setTimeout(() => setSuccess(''), 5000);
        } else {
          setSuccess('המערכת עודכנה בהצלחה');
          setTimeout(() => setSuccess(''), 3000);
        }
      } else {
        setError(data.message || data.error || 'שגיאה בשמירת המערכת');
      }
    } catch (err) {
      setError('שגיאה בשמירת המערכת');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('האם למחוק מערכת זו?')) return;

    try {
      const response = await fetch(`/api/schedules/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchData();
      } else {
        const data = await response.json();
        setError(data.error || 'שגיאה במחיקת המערכת');
      }
    } catch (err) {
      setError('שגיאה במחיקת המערכת');
      console.error(err);
    }
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

  const getDayLabel = (dayNum) => {
    const day = daysOfWeek.find((d) => d.value === dayNum);
    return day ? day.label : '';
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
              <h2>מערכת שעות</h2>
              <p className="text-muted">ניהול מערכת שעות קבועה לתלמידים</p>
            </div>
            <Button variant="primary" onClick={() => handleShowModal()}>
              + הוסף מערכת חדשה
            </Button>
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
            <Col md={3}>
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
            <Col md={3}>
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
            <Col md={3}>
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
            <Col md={3}>
              <Form.Label>סנן לפי יום</Form.Label>
              <Form.Select
                value={filterDay}
                onChange={(e) => setFilterDay(e.target.value)}
              >
                <option value="">כל הימים</option>
                {daysOfWeek.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Schedules Table */}
      <Card>
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">טוען...</span>
              </div>
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <p>לא נמצאו מערכות</p>
            </div>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>יום</th>
                  <th>שעה</th>
                  <th>תלמיד</th>
                  <th>מורה</th>
                  <th>כלי</th>
                  <th>חדר</th>
                  <th>משך (דק׳)</th>
                  <th>מתאריך</th>
                  <th>עד תאריך</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule) => (
                  <tr key={schedule.id}>
                    <td>
                      <Badge bg="primary">{getDayLabel(schedule.dayOfWeek)}</Badge>
                    </td>
                    <td>
                      {schedule.startTime} - {schedule.endTime}
                    </td>
                    <td>
                      {schedule.student.user.firstName} {schedule.student.user.lastName}
                    </td>
                    <td>
                      {schedule.teacher.user.firstName} {schedule.teacher.user.lastName}
                    </td>
                    <td>{schedule.instrument}</td>
                    <td>{schedule.room.name}</td>
                    <td>{schedule.duration}</td>
                    <td>{formatDate(schedule.effectiveFrom)}</td>
                    <td>
                      {schedule.effectiveUntil
                        ? formatDate(schedule.effectiveUntil)
                        : '-'}
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleShowModal(schedule)}
                        >
                          ערוך
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDelete(schedule.id)}
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

      {/* Add/Edit Schedule Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg" dir="rtl">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingSchedule ? 'ערוך מערכת' : 'הוסף מערכת חדשה'}
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
                  <Form.Label>יום *</Form.Label>
                  <Form.Select
                    required
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                  >
                    <option value="">בחר יום</option>
                    {daysOfWeek.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </Form.Select>
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

              <Col md={4}>
                <Form.Group>
                  <Form.Label>תאריך התחלה *</Form.Label>
                  <Form.Control
                    type="date"
                    required
                    value={formData.effectiveFrom}
                    onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                  />
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group>
                  <Form.Label>תאריך סיום</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.effectiveUntil}
                    onChange={(e) => setFormData({ ...formData, effectiveUntil: e.target.value })}
                  />
                  <Form.Text className="text-muted">אופציונלי - השאר ריק אם אין תאריך סיום</Form.Text>
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label>הערות</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                    {editingSchedule ? 'מעדכן...' : 'יוצר...'}
                  </>
                ) : (
                  editingSchedule ? 'עדכן' : 'צור'
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
      </Container>
    </>
  );
}
