'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Alert, Modal, Button } from 'react-bootstrap';
import StudentNav from '@/components/StudentNav';
import { useRouter } from 'next/navigation';

const DAYS_OF_WEEK = [
  { value: 0, label: 'ראשון', short: 'א' },
  { value: 1, label: 'שני', short: 'ב' },
  { value: 2, label: 'שלישי', short: 'ג' },
  { value: 3, label: 'רביעי', short: 'ד' },
  { value: 4, label: 'חמישי', short: 'ה' },
  { value: 5, label: 'שישי', short: 'ו' },
  { value: 6, label: 'שבת', short: 'ש' },
];

const TIME_SLOTS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00',
];

export default function StudentSchedulePage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [showModal, setShowModal] = useState(false);

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
      if (data.user.role !== 'student') {
        router.push('/');
        return;
      }
      fetchSchedules();
    } catch (err) {
      console.error('Auth check error:', err);
      router.push('/login');
    }
  };

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/schedules');
      if (response.ok) {
        const data = await response.json();
        setSchedules(Array.isArray(data) ? data : []);
      } else {
        setError('שגיאה בטעינת מערכת השעות');
      }
    } catch (err) {
      setError('שגיאה בטעינת מערכת השעות');
      console.error('Fetch schedules error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group schedules by day and time - only show in the FIRST overlapping slot
  const getScheduleForDayAndTime = (day, time) => {
    return schedules.filter(schedule => {
      if (schedule.dayOfWeek !== day) return false;
      if (!schedule.isActive) return false;

      // Find the first time slot that this schedule overlaps with
      const firstOverlappingSlot = TIME_SLOTS.find(slot => {
        const timeIndex = TIME_SLOTS.indexOf(slot);
        const nextTime = timeIndex < TIME_SLOTS.length - 1 ? TIME_SLOTS[timeIndex + 1] : '23:59';
        return schedule.startTime < nextTime && schedule.endTime > slot;
      });

      // Only show in the first overlapping slot
      return firstOverlappingSlot === time;
    });
  };

  // Calculate height for a schedule based on its duration
  const getScheduleHeight = (schedule) => {
    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
    const [endHour, endMin] = schedule.endTime.split(':').map(Number);
    const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);

    // Each 30-minute slot is about 60px high
    const pixelsPerMinute = 60 / 30;
    return durationMinutes * pixelsPerMinute;
  };

  // Calculate top offset within the cell for a schedule
  const getScheduleTopOffset = (schedule, slotTime) => {
    const [slotHour, slotMin] = slotTime.split(':').map(Number);
    const [schedHour, schedMin] = schedule.startTime.split(':').map(Number);

    const slotMinutes = slotHour * 60 + slotMin;
    const schedMinutes = schedHour * 60 + schedMin;
    const offsetMinutes = schedMinutes - slotMinutes;

    // Each 30-minute slot is about 60px high
    const pixelsPerMinute = 60 / 30;
    return offsetMinutes * pixelsPerMinute;
  };

  // Get the earliest and latest times from schedules
  const getTimeRange = () => {
    if (schedules.length === 0) return { start: '08:00', end: '21:00' };

    const times = schedules.map(s => [s.startTime, s.endTime]).flat();
    const earliest = times.reduce((min, time) => time < min ? time : min, '23:59');
    const latest = times.reduce((max, time) => time > max ? time : max, '00:00');

    // Find the range in TIME_SLOTS
    const startIdx = TIME_SLOTS.findIndex(t => t >= earliest);
    const endIdx = TIME_SLOTS.findIndex(t => t >= latest);

    return {
      start: TIME_SLOTS[Math.max(0, startIdx - 1)],
      end: TIME_SLOTS[Math.min(TIME_SLOTS.length - 1, endIdx + 1)],
    };
  };

  const timeRange = getTimeRange();
  const visibleTimeSlots = TIME_SLOTS.filter(t => t >= timeRange.start && t <= timeRange.end);

  if (loading) {
    return (
      <>
        <StudentNav />
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
      <StudentNav />
      <Container fluid dir="rtl" className="py-4">
        {/* Header */}
        <Row className="mb-4">
          <Col>
            <h2>מערכת השעות שלי</h2>
            <p className="text-muted">לוח השיעורים הקבועים שלך</p>
          </Col>
        </Row>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {schedules.length === 0 ? (
          <Alert variant="info">
            <strong>אין לך שיעורים קבועים במערכת.</strong>
            <br />
            פנה למנהל או למורה לפרטים נוספים.
          </Alert>
        ) : (
          <Card>
            <Card.Body className="p-0">
              <div style={{ overflowX: 'auto' }}>
                <Table bordered hover className="mb-0" style={{ minWidth: '800px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '80px', position: 'sticky', right: 0, backgroundColor: '#fff', zIndex: 10 }}>
                        שעה
                      </th>
                      {DAYS_OF_WEEK.map((day) => (
                        <th key={day.value} className="text-center">
                          <div>{day.label}</div>
                          <Badge bg="secondary" className="mt-1">{day.short}</Badge>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTimeSlots.map((time) => (
                      <tr key={time}>
                        <td style={{ position: 'sticky', right: 0, backgroundColor: '#f8f9fa', fontWeight: 'bold', zIndex: 5 }}>
                          {time}
                        </td>
                        {DAYS_OF_WEEK.map((day) => {
                          const daySchedules = getScheduleForDayAndTime(day.value, time);

                          return (
                            <td key={day.value} style={{ position: 'relative', height: '60px', padding: 0 }}>
                              {daySchedules.length === 0 ? (
                                <div className="text-center text-muted" style={{ lineHeight: '60px' }}>-</div>
                              ) : (
                                daySchedules.map((schedule) => {
                                  const height = getScheduleHeight(schedule);
                                  const topOffset = getScheduleTopOffset(schedule, time);

                                  return (
                                    <Card
                                      key={schedule.id}
                                      onClick={() => {
                                        setSelectedSchedule(schedule);
                                        setShowModal(true);
                                      }}
                                      style={{
                                        position: 'absolute',
                                        top: `${topOffset}px`,
                                        left: '2px',
                                        right: '2px',
                                        height: `${height}px`,
                                        backgroundColor: '#e3f2fd',
                                        border: '1px solid #2196f3',
                                        zIndex: 5,
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      <Card.Body className="p-2 d-flex align-items-center">
                                        <div className="small text-truncate">
                                          <strong>
                                            {schedule.teacher?.user?.firstName} {schedule.teacher?.user?.lastName}
                                          </strong>
                                        </div>
                                      </Card.Body>
                                    </Card>
                                  );
                                })
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        )}

        {/* Summary */}
        {schedules.length > 0 && (
          <Row className="mt-4">
            <Col md={6}>
              <Card>
                <Card.Header>
                  <h5 className="mb-0">סיכום</h5>
                </Card.Header>
                <Card.Body>
                  <div className="mb-2">
                    <strong>סה"כ שיעורים קבועים:</strong> {schedules.filter(s => s.isActive).length}
                  </div>
                  <div className="mb-2">
                    <strong>מורים:</strong>{' '}
                    {new Set(schedules.map(s => `${s.teacher?.user?.firstName} ${s.teacher?.user?.lastName}`)).size}
                  </div>
                  <div className="mb-2">
                    <strong>כלים שאני לומד:</strong>{' '}
                    {[...new Set(schedules.map(s => s.instrument))].join(', ')}
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card>
                <Card.Header>
                  <h5 className="mb-0">מידע נוסף</h5>
                </Card.Header>
                <Card.Body>
                  <Alert variant="info" className="mb-0">
                    <strong>💡 טיפ:</strong> לוח זה מציג את השיעורים הקבועים שלך.
                    <br />
                    שיעורים חד-פעמיים וביטולים ניתן לראות ב
                    <a href="/student/lessons" className="alert-link"> דף השיעורים</a>.
                  </Alert>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {/* Schedule Details Modal */}
        <Modal show={showModal} onHide={() => setShowModal(false)} dir="rtl">
          <Modal.Header closeButton>
            <Modal.Title>פרטי שיעור קבוע</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedSchedule && (
              <>
                <div className="mb-3">
                  <strong>מורה:</strong>
                  <div className="mt-1">
                    {selectedSchedule.teacher?.user?.firstName} {selectedSchedule.teacher?.user?.lastName}
                  </div>
                </div>

                <div className="mb-3">
                  <strong>יום:</strong>
                  <div className="mt-1">
                    {DAYS_OF_WEEK.find(d => d.value === selectedSchedule.dayOfWeek)?.label}
                  </div>
                </div>

                <div className="mb-3">
                  <strong>שעה:</strong>
                  <div className="mt-1">
                    {selectedSchedule.startTime} - {selectedSchedule.endTime}
                  </div>
                </div>

                <div className="mb-3">
                  <strong>משך:</strong>
                  <div className="mt-1">
                    {selectedSchedule.duration} דקות
                  </div>
                </div>

                <div className="mb-3">
                  <strong>כלי נגינה:</strong>
                  <div className="mt-1">
                    <Badge bg="secondary">{selectedSchedule.instrument}</Badge>
                  </div>
                </div>

                <div className="mb-3">
                  <strong>חדר:</strong>
                  <div className="mt-1">
                    <Badge bg="info">{selectedSchedule.room?.name}</Badge>
                  </div>
                </div>

                <div className="mb-3">
                  <strong>תקף מתאריך:</strong>
                  <div className="mt-1">
                    {new Date(selectedSchedule.effectiveFrom).toLocaleDateString('he-IL')}
                  </div>
                </div>

                {selectedSchedule.effectiveUntil && (
                  <div className="mb-3">
                    <strong>תקף עד תאריך:</strong>
                    <div className="mt-1">
                      {new Date(selectedSchedule.effectiveUntil).toLocaleDateString('he-IL')}
                    </div>
                  </div>
                )}

                {selectedSchedule.notes && (
                  <div className="mb-3">
                    <strong>הערות:</strong>
                    <div className="mt-1">
                      {selectedSchedule.notes}
                    </div>
                  </div>
                )}

                <div className="mb-0">
                  <strong>סטטוס:</strong>
                  <div className="mt-1">
                    <Badge bg={selectedSchedule.isActive ? 'success' : 'secondary'}>
                      {selectedSchedule.isActive ? 'פעיל' : 'לא פעיל'}
                    </Badge>
                  </div>
                </div>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              סגור
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </>
  );
}
