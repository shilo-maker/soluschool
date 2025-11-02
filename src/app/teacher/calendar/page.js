'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Badge, Modal, Button } from 'react-bootstrap';
import TeacherNav from '@/components/TeacherNav';
import { useRouter } from 'next/navigation';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

export default function TeacherCalendarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lessons, setLessons] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState('week');

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
      fetchLessons();
    } catch (err) {
      console.error('Auth check error:', err);
      router.push('/login');
    }
  };

  const fetchLessons = async () => {
    try {
      setLoading(true);

      const startDate = moment().startOf('month').subtract(1, 'week').format('YYYY-MM-DD');
      const endDate = moment().endOf('month').add(1, 'week').format('YYYY-MM-DD');

      const response = await fetch(`/api/lessons?teacherId=me&startDate=${startDate}&endDate=${endDate}`);
      if (response.ok) {
        const data = await response.json();
        setLessons(Array.isArray(data) ? data : []);
        convertLessonsToEvents(Array.isArray(data) ? data : []);
      } else {
        setError('Error loading lessons');
      }
    } catch (err) {
      setError('Error loading lessons');
      console.error('Fetch lessons error:', err);
    } finally {
      setLoading(false);
    }
  };

  const convertLessonsToEvents = (lessonsData) => {
    const calendarEvents = lessonsData.map((lesson) => {
      const lessonDate = new Date(lesson.date);
      const [startHour, startMinute] = lesson.startTime.split(':').map(Number);
      const [endHour, endMinute] = lesson.endTime.split(':').map(Number);

      const start = new Date(lessonDate);
      start.setHours(startHour, startMinute, 0, 0);

      const end = new Date(lessonDate);
      end.setHours(endHour, endMinute, 0, 0);

      let backgroundColor = '#3174ad';
      if (lesson.status === 'completed') backgroundColor = '#28a745';
      else if (lesson.status === 'cancelled') backgroundColor = '#dc3545';
      else if (lesson.status === 'no_show') backgroundColor = '#ffc107';
      else if (lesson.status === 'in_progress') backgroundColor = '#17a2b8';

      return {
        id: lesson.id,
        title: `${lesson.student?.user?.firstName} ${lesson.student?.user?.lastName} - ${lesson.instrument}`,
        start,
        end,
        resource: lesson,
        style: {
          backgroundColor,
        },
      };
    });

    setEvents(calendarEvents);
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event.resource);
    setShowModal(true);
  };

  const handleNavigate = (date) => {
    const startDate = moment(date).startOf('month').subtract(1, 'week').format('YYYY-MM-DD');
    const endDate = moment(date).endOf('month').add(1, 'week').format('YYYY-MM-DD');

    fetch(`/api/lessons?teacherId=me&startDate=${startDate}&endDate=${endDate}`)
      .then(res => res.json())
      .then(data => {
        setLessons(Array.isArray(data) ? data : []);
        convertLessonsToEvents(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error('Navigation fetch error:', err));
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

  const eventStyleGetter = (event) => {
    return {
      style: event.style,
    };
  };

  const handleViewChange = (newView) => {
    setView(newView);
  };

  const CustomEvent = ({ event }) => {
    return (
      <div style={{
        height: '100%',
        width: '100%',
        overflow: 'visible',
        padding: '2px 3px',
        fontSize: '11px',
        lineHeight: '1.1',
        whiteSpace: 'normal',
        wordWrap: 'break-word',
        display: 'block'
      }}>
        {event.title}
      </div>
    );
  };

  if (loading) {
    return (
      <>
        <TeacherNav />
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

  return (
    <>
      <TeacherNav />
      <Container fluid dir="rtl" className="py-4">
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Row className="mb-4">
          <Col>
            <h2>My Calendar</h2>
            <p className="text-muted">Visual overview of your lessons</p>
          </Col>
        </Row>

        <Row className="mb-3">
          <Col>
            <Card>
              <Card.Body>
                <div className="d-flex gap-3 flex-wrap">
                  <div><Badge bg="primary">Scheduled</Badge></div>
                  <div><Badge bg="info">In Progress</Badge></div>
                  <div><Badge bg="success">Completed</Badge></div>
                  <div><Badge bg="warning">No Show</Badge></div>
                  <div><Badge bg="danger">Cancelled</Badge></div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row>
          <Col>
            <Card>
              <Card.Body style={{ height: '700px' }}>
                <Calendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  onSelectEvent={handleSelectEvent}
                  onNavigate={handleNavigate}
                  onView={handleViewChange}
                  view={view}
                  eventPropGetter={eventStyleGetter}
                  views={['month', 'week', 'day']}
                  step={30}
                  timeslots={2}
                  min={new Date(2024, 0, 1, 8, 0, 0)}
                  max={new Date(2024, 0, 1, 22, 0, 0)}
                  components={{
                    event: CustomEvent
                  }}
                />
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" dir="rtl">
          <Modal.Header closeButton>
            <Modal.Title>Lesson Details</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedEvent && (
              <>
                <Row className="mb-3">
                  <Col md={6}>
                    <strong>Date:</strong>
                    <div>{moment(selectedEvent.date).format('DD/MM/YYYY')}</div>
                  </Col>
                  <Col md={6}>
                    <strong>Time:</strong>
                    <div>{selectedEvent.startTime} - {selectedEvent.endTime}</div>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <strong>Student:</strong>
                    <div>
                      {selectedEvent.student?.user?.firstName} {selectedEvent.student?.user?.lastName}
                    </div>
                  </Col>
                  <Col md={6}>
                    <strong>Instrument:</strong>
                    <div>{selectedEvent.instrument}</div>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <strong>Room:</strong>
                    <div>{selectedEvent.room?.name}</div>
                  </Col>
                  <Col md={6}>
                    <strong>Status:</strong>
                    <div className="mt-1">{getStatusBadge(selectedEvent.status)}</div>
                  </Col>
                </Row>

                {selectedEvent.teacherNotes && (
                  <Row className="mb-3">
                    <Col md={12}>
                      <Alert variant="info">
                        <strong>Notes:</strong>
                        <div className="mt-2">{selectedEvent.teacherNotes}</div>
                      </Alert>
                    </Col>
                  </Row>
                )}

                {selectedEvent.teacherCheckIn && (
                  <Row className="mb-3">
                    <Col md={12}>
                      <Badge bg="success">
                        Checked in at {new Date(selectedEvent.teacherCheckIn).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Badge>
                    </Col>
                  </Row>
                )}
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Close
            </Button>
            {selectedEvent && (
              <Button
                variant="primary"
                onClick={() => {
                  setShowModal(false);
                  router.push(`/teacher/lessons/${selectedEvent.id}`);
                }}
              >
                View Details
              </Button>
            )}
          </Modal.Footer>
        </Modal>
      </Container>
    </>
  );
}
