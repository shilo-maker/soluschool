'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Form, Button, Badge, Alert } from 'react-bootstrap';
import TeacherNav from '@/components/TeacherNav';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function TeacherReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lessons, setLessons] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    noShow: 0,
    cancelled: 0,
    scheduled: 0,
    inProgress: 0,
    attendanceRate: 0,
  });

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    studentId: 'all',
    status: 'all',
  });

  const [students, setStudents] = useState([]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchLessons();
    }
  }, [filters]);

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
      await fetchStudents();
      setLoading(false);
      fetchLessons();
    } catch (err) {
      console.error('Auth check error:', err);
      router.push('/login');
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students');
      if (response.ok) {
        const data = await response.json();
        setStudents(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Fetch students error:', err);
    }
  };

  const fetchLessons = async () => {
    try {
      let url = '/api/lessons?teacherId=me&';
      const params = new URLSearchParams();

      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.studentId && filters.studentId !== 'all') params.append('studentId', filters.studentId);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);

      url += params.toString();

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const lessonData = Array.isArray(data) ? data : [];
        setLessons(lessonData);
        calculateStats(lessonData);
      } else {
        setError('Error loading lessons');
      }
    } catch (err) {
      setError('Error loading lessons');
      console.error('Fetch lessons error:', err);
    }
  };

  const calculateStats = (lessonData) => {
    const total = lessonData.length;
    const completed = lessonData.filter(l => l.status === 'completed').length;
    const noShow = lessonData.filter(l => l.status === 'no_show').length;
    const cancelled = lessonData.filter(l => l.status === 'cancelled').length;
    const scheduled = lessonData.filter(l => l.status === 'scheduled').length;
    const inProgress = lessonData.filter(l => l.status === 'in_progress').length;

    const totalAttendable = completed + noShow;
    const attendanceRate = totalAttendable > 0 ? ((completed / totalAttendable) * 100).toFixed(1) : 0;

    setStats({ total, completed, noShow, cancelled, scheduled, inProgress, attendanceRate });
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');

    doc.setFontSize(18);
    doc.text('My Lessons Report', 148, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 25);

    const tableData = lessons.map(lesson => [
      new Date(lesson.date).toLocaleDateString(),
      lesson.startTime,
      `${lesson.student?.user?.firstName} ${lesson.student?.user?.lastName}`,
      lesson.instrument,
      lesson.status,
      lesson.teacherCheckIn ? new Date(lesson.teacherCheckIn).toLocaleTimeString() : '-',
      lesson.studentCheckIn ? new Date(lesson.studentCheckIn).toLocaleTimeString() : '-',
    ]);

    doc.autoTable({
      head: [['Date', 'Time', 'Student', 'Instrument', 'Status', 'T Check-in', 'S Check-in']],
      body: tableData,
      startY: 30,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save('my-lessons-report.pdf');
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
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h2>My Lessons Report</h2>
                <p className="text-muted">View and export your lessons data</p>
              </div>
              <Button variant="primary" onClick={exportToPDF} disabled={lessons.length === 0}>
                Export to PDF
              </Button>
            </div>
          </Col>
        </Row>

        <Row className="g-4 mb-4">
          <Col md={4} lg={2}>
            <Card className="text-center">
              <Card.Body>
                <h6 className="text-muted mb-2">Total</h6>
                <h3 className="mb-0">{stats.total}</h3>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4} lg={2}>
            <Card className="text-center">
              <Card.Body>
                <h6 className="text-muted mb-2">Completed</h6>
                <h3 className="mb-0 text-success">{stats.completed}</h3>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4} lg={2}>
            <Card className="text-center">
              <Card.Body>
                <h6 className="text-muted mb-2">No Show</h6>
                <h3 className="mb-0 text-warning">{stats.noShow}</h3>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4} lg={2}>
            <Card className="text-center">
              <Card.Body>
                <h6 className="text-muted mb-2">Cancelled</h6>
                <h3 className="mb-0 text-danger">{stats.cancelled}</h3>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4} lg={2}>
            <Card className="text-center">
              <Card.Body>
                <h6 className="text-muted mb-2">Scheduled</h6>
                <h3 className="mb-0 text-primary">{stats.scheduled}</h3>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4} lg={2}>
            <Card className="text-center">
              <Card.Body>
                <h6 className="text-muted mb-2">Attendance</h6>
                <h3 className="mb-0">{stats.attendanceRate}%</h3>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Header>
                <h5 className="mb-0">Filters</h5>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col md={6} lg={3}>
                    <Form.Group>
                      <Form.Label>Start Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6} lg={3}>
                    <Form.Group>
                      <Form.Label>End Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6} lg={3}>
                    <Form.Group>
                      <Form.Label>Student</Form.Label>
                      <Form.Select
                        value={filters.studentId}
                        onChange={(e) => setFilters({ ...filters, studentId: e.target.value })}
                      >
                        <option value="all">All Students</option>
                        {students.map(student => (
                          <option key={student.id} value={student.id}>
                            {student.user?.firstName} {student.user?.lastName}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={6} lg={3}>
                    <Form.Group>
                      <Form.Label>Status</Form.Label>
                      <Form.Select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      >
                        <option value="all">All Status</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="no_show">No Show</option>
                        <option value="cancelled">Cancelled</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row>
          <Col>
            <Card>
              <Card.Header>
                <h5 className="mb-0">Lessons ({lessons.length})</h5>
              </Card.Header>
              <Card.Body>
                {lessons.length === 0 ? (
                  <div className="text-center text-muted py-5">
                    <div style={{ fontSize: '3rem' }}>📊</div>
                    <p>No lessons found</p>
                  </div>
                ) : (
                  <Table striped hover responsive>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Student</th>
                        <th>Instrument</th>
                        <th>Status</th>
                        <th>Teacher Check-in</th>
                        <th>Student Check-in</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lessons.map((lesson) => (
                        <tr key={lesson.id}>
                          <td>{new Date(lesson.date).toLocaleDateString()}</td>
                          <td>{lesson.startTime}</td>
                          <td>
                            {lesson.student?.user?.firstName} {lesson.student?.user?.lastName}
                          </td>
                          <td>{lesson.instrument}</td>
                          <td>{getStatusBadge(lesson.status)}</td>
                          <td>
                            {lesson.teacherCheckIn ? (
                              <Badge bg="success">
                                {new Date(lesson.teacherCheckIn).toLocaleTimeString()}
                              </Badge>
                            ) : (
                              <Badge bg="secondary">-</Badge>
                            )}
                          </td>
                          <td>
                            {lesson.studentCheckIn ? (
                              <Badge bg="success">
                                {new Date(lesson.studentCheckIn).toLocaleTimeString()}
                              </Badge>
                            ) : (
                              <Badge bg="secondary">-</Badge>
                            )}
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
