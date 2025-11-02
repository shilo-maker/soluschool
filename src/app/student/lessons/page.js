'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Alert, Button, Form } from 'react-bootstrap';
import StudentNav from '@/components/StudentNav';
import { formatDate } from '@/lib/dateUtils';
import { useRouter } from 'next/navigation';

export default function StudentLessonsPage() {
  const router = useRouter();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('upcoming'); // upcoming, past, all

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchLessons();
    }
  }, [filter]);

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
      fetchLessons();
    } catch (err) {
      console.error('Auth check error:', err);
      router.push('/login');
    }
  };

  const fetchLessons = async () => {
    try {
      setLoading(true);

      let url = '/api/lessons?';
      const today = new Date().toISOString().split('T')[0];

      if (filter === 'upcoming') {
        url += `startDate=${today}`;
      } else if (filter === 'past') {
        url += `endDate=${today}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        let filteredData = Array.isArray(data) ? data : [];

        if (filter === 'past') {
          filteredData = filteredData.filter(lesson => new Date(lesson.date) < new Date(today));
        }

        setLessons(filteredData);
      } else {
        setError('שגיאה בטעינת השיעורים');
      }
    } catch (err) {
      setError('שגיאה בטעינת השיעורים');
      console.error('Fetch lessons error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      scheduled: { label: 'מתוכנן', variant: 'primary' },
      in_progress: { label: 'בתהליך', variant: 'info' },
      completed: { label: 'הושלם', variant: 'success' },
      cancelled: { label: 'בוטל', variant: 'danger' },
      no_show: { label: 'לא הגיע', variant: 'warning' },
    };
    const statusInfo = statusMap[status] || { label: status, variant: 'secondary' };
    return <Badge bg={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

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
            <h2>השיעורים שלי</h2>
            <p className="text-muted">כל השיעורים שלך - עבר, הווה ועתיד</p>
          </Col>
        </Row>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Filters */}
        <Row className="mb-3">
          <Col md={6}>
            <Form.Select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="upcoming">שיעורים קרובים</option>
              <option value="past">שיעורים שעברו</option>
              <option value="all">כל השיעורים</option>
            </Form.Select>
          </Col>
        </Row>

        {/* Lessons Table */}
        <Row>
          <Col>
            <Card>
              <Card.Body>
                {lessons.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <p>אין שיעורים להצגה</p>
                  </div>
                ) : (
                  <Table responsive hover>
                    <thead>
                      <tr>
                        <th>תאריך</th>
                        <th>שעה</th>
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
                            <strong>{lesson.startTime}</strong> - {lesson.endTime}
                          </td>
                          <td>
                            {lesson.teacher?.user?.firstName} {lesson.teacher?.user?.lastName}
                          </td>
                          <td>
                            <Badge bg="secondary">{lesson.instrument}</Badge>
                          </td>
                          <td>{lesson.room?.name}</td>
                          <td>{getStatusBadge(lesson.status)}</td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => router.push(`/student/lessons/${lesson.id}`)}
                            >
                              פרטים
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
      </Container>
    </>
  );
}
