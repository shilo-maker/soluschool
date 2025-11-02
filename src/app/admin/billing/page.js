'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Alert, Modal } from 'react-bootstrap';
import AdminNav from '@/components/AdminNav';
import { useRouter } from 'next/navigation';

export default function AdminBillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [billings, setBillings] = useState([]);
  const [selectedBilling, setSelectedBilling] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchBillings();
    }
  }, [filterMonth, filterYear, filterStatus]);

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
      setLoading(false);
      fetchBillings();
    } catch (err) {
      console.error('Auth check error:', err);
      router.push('/login');
    }
  };

  const fetchBillings = async () => {
    try {
      let url = '/api/billings';
      const params = new URLSearchParams();

      if (filterMonth) params.append('month', filterMonth);
      if (filterYear) params.append('year', filterYear);
      if (filterStatus !== 'all') params.append('status', filterStatus);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setBillings(Array.isArray(data) ? data : []);
      } else {
        setError('Error loading billings');
      }
    } catch (err) {
      setError('Error loading billings');
      console.error('Fetch billings error:', err);
    }
  };

  const updateBillingStatus = async (billingId, newStatus) => {
    try {
      const response = await fetch(`/api/billings/${billingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchBillings();
        setShowDetailModal(false);
      } else {
        setError('Failed to update billing status');
      }
    } catch (err) {
      setError('Failed to update billing status');
      console.error('Update billing error:', err);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'ממתין', variant: 'warning' },
      approved: { label: 'אושר', variant: 'info' },
      paid: { label: 'שולם', variant: 'success' },
    };
    const statusInfo = statusMap[status] || { label: status, variant: 'secondary' };
    return <Badge bg={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const calculateTotalPending = () => {
    return billings
      .filter(b => b.status === 'pending')
      .reduce((sum, b) => sum + b.totalAmount, 0);
  };

  const calculateTotalThisMonth = () => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    return billings
      .filter(b => b.month === currentMonth && b.year === currentYear)
      .reduce((sum, b) => sum + b.totalAmount, 0);
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

  return (
    <>
      <AdminNav />
      <Container fluid dir="rtl" className="py-4">
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Row className="mb-4">
          <Col>
            <h2>ניהול חיוב מורים</h2>
            <p className="text-muted">ניהול חיוב חודשי למורים</p>
          </Col>
        </Row>

        <Row className="g-4 mb-4">
          <Col md={4}>
            <Card className="text-center">
              <Card.Body>
                <h6 className="text-muted mb-2">ממתינים לאישור</h6>
                <h3 className="mb-0">
                  {billings.filter(b => b.status === 'pending').length}
                </h3>
                <small className="text-muted">
                  ₪{calculateTotalPending().toFixed(2)}
                </small>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4}>
            <Card className="text-center">
              <Card.Body>
                <h6 className="text-muted mb-2">סה"כ החודש</h6>
                <h3 className="mb-0">₪{calculateTotalThisMonth().toFixed(2)}</h3>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4}>
            <Card className="text-center">
              <Card.Body>
                <h6 className="text-muted mb-2">סה"כ חיובים</h6>
                <h3 className="mb-0">{billings.length}</h3>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Header>
                <Row className="align-items-center">
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Month</Form.Label>
                      <Form.Select
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                      >
                        <option value="">All Months</option>
                        <option value="1">January</option>
                        <option value="2">February</option>
                        <option value="3">March</option>
                        <option value="4">April</option>
                        <option value="5">May</option>
                        <option value="6">June</option>
                        <option value="7">July</option>
                        <option value="8">August</option>
                        <option value="9">September</option>
                        <option value="10">October</option>
                        <option value="11">November</option>
                        <option value="12">December</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Year</Form.Label>
                      <Form.Select
                        value={filterYear}
                        onChange={(e) => setFilterYear(parseInt(e.target.value))}
                      >
                        <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                        <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
                        <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Status</Form.Label>
                      <Form.Select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="paid">Paid</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Header>

              <Card.Body>
                {billings.length === 0 ? (
                  <div className="text-center text-muted py-5">
                    <div style={{ fontSize: '3rem' }}>📋</div>
                    <p>No billings found</p>
                  </div>
                ) : (
                  <Table striped hover responsive>
                    <thead>
                      <tr>
                        <th>Teacher</th>
                        <th>Period</th>
                        <th>Lessons</th>
                        <th>Hours</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billings.map((billing) => (
                        <tr key={billing.id}>
                          <td>
                            {billing.teacher?.user?.firstName} {billing.teacher?.user?.lastName}
                          </td>
                          <td>
                            {new Date(billing.year, billing.month - 1).toLocaleDateString('en-US', {
                              month: 'long',
                              year: 'numeric',
                            })}
                          </td>
                          <td>{billing.totalLessons}</td>
                          <td>{billing.totalHours.toFixed(1)}</td>
                          <td>₪{billing.totalAmount.toFixed(2)}</td>
                          <td>{getStatusBadge(billing.status)}</td>
                          <td>
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() => {
                                setSelectedBilling(billing);
                                setShowDetailModal(true);
                              }}
                            >
                              View
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

        <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg" dir="rtl">
          <Modal.Header closeButton>
            <Modal.Title>Billing Details</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedBilling && (
              <>
                <Row className="mb-3">
                  <Col md={6}>
                    <strong>Teacher:</strong>
                    <div>
                      {selectedBilling.teacher?.user?.firstName} {selectedBilling.teacher?.user?.lastName}
                    </div>
                  </Col>
                  <Col md={6}>
                    <strong>Period:</strong>
                    <div>
                      {new Date(selectedBilling.year, selectedBilling.month - 1).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={4}>
                    <strong>Total Lessons:</strong>
                    <div>{selectedBilling.totalLessons}</div>
                  </Col>
                  <Col md={4}>
                    <strong>Total Hours:</strong>
                    <div>{selectedBilling.totalHours.toFixed(2)}</div>
                  </Col>
                  <Col md={4}>
                    <strong>Total Amount:</strong>
                    <div className="text-success h5">₪{selectedBilling.totalAmount.toFixed(2)}</div>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={12}>
                    <strong>Status:</strong>
                    <div className="mt-1">{getStatusBadge(selectedBilling.status)}</div>
                  </Col>
                </Row>

                {selectedBilling.status === 'pending' && (
                  <Row>
                    <Col>
                      <div className="d-flex gap-2">
                        <Button
                          variant="success"
                          onClick={() => updateBillingStatus(selectedBilling.id, 'approved')}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => setShowDetailModal(false)}
                        >
                          Reject
                        </Button>
                      </div>
                    </Col>
                  </Row>
                )}

                {selectedBilling.status === 'approved' && (
                  <Row>
                    <Col>
                      <Button
                        variant="primary"
                        onClick={() => updateBillingStatus(selectedBilling.id, 'paid')}
                      >
                        Mark as Paid
                      </Button>
                    </Col>
                  </Row>
                )}
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </>
  );
}
