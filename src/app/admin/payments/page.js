'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Alert, Modal } from 'react-bootstrap';
import AdminNav from '@/components/AdminNav';
import { useRouter } from 'next/navigation';

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const [filters, setFilters] = useState({
    studentId: 'all',
    status: 'all',
    paymentMethod: 'all',
    startDate: '',
    endDate: '',
  });

  const [formData, setFormData] = useState({
    studentId: '',
    amount: '',
    currency: 'ILS',
    paymentMethod: 'cash',
    paymentDate: new Date().toISOString().split('T')[0],
    periodStart: '',
    periodEnd: '',
    status: 'completed',
    invoiceNumber: '',
    referenceNumber: '',
    lessonsCount: '',
    pricePerLesson: '',
    notes: '',
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchPayments();
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
      if (data.user.role !== 'admin') {
        router.push('/');
        return;
      }
      await fetchStudents();
      setLoading(false);
      fetchPayments();
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

  const fetchPayments = async () => {
    try {
      let url = '/api/payments?';
      const params = new URLSearchParams();

      if (filters.studentId !== 'all') params.append('studentId', filters.studentId);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.paymentMethod !== 'all') params.append('paymentMethod', filters.paymentMethod);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      url += params.toString();

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setPayments(Array.isArray(data) ? data : []);
      } else {
        setError('Error loading payments');
      }
    } catch (err) {
      setError('Error loading payments');
      console.error('Fetch payments error:', err);
    }
  };

  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess('Payment created successfully');
        setShowAddModal(false);
        fetchPayments();
        resetForm();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create payment');
      }
    } catch (err) {
      setError('Failed to create payment');
      console.error('Create payment error:', err);
    }
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/payments/${selectedPayment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess('Payment updated successfully');
        setShowEditModal(false);
        fetchPayments();
        resetForm();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update payment');
      }
    } catch (err) {
      setError('Failed to update payment');
      console.error('Update payment error:', err);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/payments/${selectedPayment.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Payment deleted successfully');
        setShowDeleteModal(false);
        fetchPayments();
      } else {
        setError('Failed to delete payment');
      }
    } catch (err) {
      setError('Failed to delete payment');
      console.error('Delete payment error:', err);
    }
  };

  const openEditModal = (payment) => {
    setSelectedPayment(payment);
    setFormData({
      studentId: payment.studentId,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      paymentDate: new Date(payment.paymentDate).toISOString().split('T')[0],
      periodStart: payment.periodStart ? new Date(payment.periodStart).toISOString().split('T')[0] : '',
      periodEnd: payment.periodEnd ? new Date(payment.periodEnd).toISOString().split('T')[0] : '',
      status: payment.status,
      invoiceNumber: payment.invoiceNumber || '',
      referenceNumber: payment.referenceNumber || '',
      lessonsCount: payment.lessonsCount || '',
      pricePerLesson: payment.pricePerLesson || '',
      notes: payment.notes || '',
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      studentId: '',
      amount: '',
      currency: 'ILS',
      paymentMethod: 'cash',
      paymentDate: new Date().toISOString().split('T')[0],
      periodStart: '',
      periodEnd: '',
      status: 'completed',
      invoiceNumber: '',
      referenceNumber: '',
      lessonsCount: '',
      pricePerLesson: '',
      notes: '',
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'ממתין', variant: 'warning' },
      completed: { label: 'שולם', variant: 'success' },
      failed: { label: 'נכשל', variant: 'danger' },
      refunded: { label: 'הוחזר', variant: 'info' },
    };
    const statusInfo = statusMap[status] || { label: status, variant: 'secondary' };
    return <Badge bg={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getPaymentMethodLabel = (method) => {
    const methodMap = {
      cash: 'מזומן',
      credit_card: 'כרטיס אשראי',
      bank_transfer: 'העברה בנקאית',
      check: 'צ\'ק',
      other: 'אחר',
    };
    return methodMap[method] || method;
  };

  const getCurrencySymbol = (currency) => {
    const symbols = { ILS: '₪', USD: '$', EUR: '€' };
    return symbols[currency] || currency;
  };

  const calculateStats = () => {
    const total = payments.reduce((sum, p) => sum + p.amount, 0);
    const completed = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
    const pending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
    const thisMonth = payments.filter(p => {
      const paymentDate = new Date(p.paymentDate);
      const now = new Date();
      return paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear();
    }).reduce((sum, p) => sum + p.amount, 0);

    return { total, completed, pending, thisMonth, count: payments.length };
  };

  const stats = calculateStats();

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
              <div>
                <h2>ניהול תשלומים</h2>
                <p className="text-muted">ניהול תשלומי תלמידים</p>
              </div>
              <Button variant="primary" onClick={() => setShowAddModal(true)}>
                + הוסף תשלום
              </Button>
            </div>
          </Col>
        </Row>

        <Row className="g-4 mb-4">
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h6 className="text-muted mb-2">סה"כ תשלומים</h6>
                <h3 className="mb-0">₪{stats.total.toFixed(2)}</h3>
                <small className="text-muted">{stats.count} תשלומים</small>
              </Card.Body>
            </Card>
          </Col>

          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h6 className="text-muted mb-2">שולמו</h6>
                <h3 className="mb-0 text-success">₪{stats.completed.toFixed(2)}</h3>
              </Card.Body>
            </Card>
          </Col>

          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h6 className="text-muted mb-2">ממתינים</h6>
                <h3 className="mb-0 text-warning">₪{stats.pending.toFixed(2)}</h3>
              </Card.Body>
            </Card>
          </Col>

          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h6 className="text-muted mb-2">החודש</h6>
                <h3 className="mb-0">₪{stats.thisMonth.toFixed(2)}</h3>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Header>
                <h5 className="mb-0">מסננים</h5>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>תלמיד</Form.Label>
                      <Form.Select
                        value={filters.studentId}
                        onChange={(e) => setFilters({ ...filters, studentId: e.target.value })}
                      >
                        <option value="all">כל התלמידים</option>
                        {students.map(student => (
                          <option key={student.id} value={student.id}>
                            {student.user?.firstName} {student.user?.lastName}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={2}>
                    <Form.Group>
                      <Form.Label>סטטוס</Form.Label>
                      <Form.Select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      >
                        <option value="all">הכל</option>
                        <option value="completed">שולם</option>
                        <option value="pending">ממתין</option>
                        <option value="failed">נכשל</option>
                        <option value="refunded">הוחזר</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={2}>
                    <Form.Group>
                      <Form.Label>אמצעי תשלום</Form.Label>
                      <Form.Select
                        value={filters.paymentMethod}
                        onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                      >
                        <option value="all">הכל</option>
                        <option value="cash">מזומן</option>
                        <option value="credit_card">כרטיס אשראי</option>
                        <option value="bank_transfer">העברה בנקאית</option>
                        <option value="check">צ'ק</option>
                        <option value="other">אחר</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={2}>
                    <Form.Group>
                      <Form.Label>מתאריך</Form.Label>
                      <Form.Control
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={2}>
                    <Form.Group>
                      <Form.Label>עד תאריך</Form.Label>
                      <Form.Control
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={1} className="d-flex align-items-end">
                    <Button
                      variant="outline-secondary"
                      onClick={() => setFilters({
                        studentId: 'all',
                        status: 'all',
                        paymentMethod: 'all',
                        startDate: '',
                        endDate: '',
                      })}
                    >
                      נקה
                    </Button>
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
                <h5 className="mb-0">תשלומים ({payments.length})</h5>
              </Card.Header>
              <Card.Body>
                {payments.length === 0 ? (
                  <div className="text-center text-muted py-5">
                    <div style={{ fontSize: '3rem' }}>💰</div>
                    <p>לא נמצאו תשלומים</p>
                  </div>
                ) : (
                  <Table striped hover responsive>
                    <thead>
                      <tr>
                        <th>תאריך</th>
                        <th>תלמיד</th>
                        <th>סכום</th>
                        <th>אמצעי תשלום</th>
                        <th>מס' חשבונית</th>
                        <th>סטטוס</th>
                        <th>פעולות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id}>
                          <td>{new Date(payment.paymentDate).toLocaleDateString('he-IL')}</td>
                          <td>
                            {payment.student?.user?.firstName} {payment.student?.user?.lastName}
                          </td>
                          <td>
                            {getCurrencySymbol(payment.currency)}{payment.amount.toFixed(2)}
                          </td>
                          <td>{getPaymentMethodLabel(payment.paymentMethod)}</td>
                          <td>{payment.invoiceNumber || '-'}</td>
                          <td>{getStatusBadge(payment.status)}</td>
                          <td>
                            <Button
                              size="sm"
                              variant="outline-primary"
                              className="me-2"
                              onClick={() => openEditModal(payment)}
                            >
                              ערוך
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => {
                                setSelectedPayment(payment);
                                setShowDeleteModal(true);
                              }}
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
          </Col>
        </Row>

        {/* Add Payment Modal */}
        <Modal show={showAddModal} onHide={() => setShowAddModal(false)} size="lg" dir="rtl">
          <Modal.Header closeButton>
            <Modal.Title>הוסף תשלום חדש</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmitAdd}>
            <Modal.Body>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>תלמיד *</Form.Label>
                    <Form.Select
                      value={formData.studentId}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      required
                    >
                      <option value="">בחר תלמיד</option>
                      {students.map(student => (
                        <option key={student.id} value={student.id}>
                          {student.user?.firstName} {student.user?.lastName}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={3}>
                  <Form.Group>
                    <Form.Label>סכום *</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>

                <Col md={3}>
                  <Form.Group>
                    <Form.Label>מטבע</Form.Label>
                    <Form.Select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    >
                      <option value="ILS">₪ שקל</option>
                      <option value="USD">$ דולר</option>
                      <option value="EUR">€ יורו</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>אמצעי תשלום</Form.Label>
                    <Form.Select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    >
                      <option value="cash">מזומן</option>
                      <option value="credit_card">כרטיס אשראי</option>
                      <option value="bank_transfer">העברה בנקאית</option>
                      <option value="check">צ'ק</option>
                      <option value="other">אחר</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>תאריך תשלום *</Form.Label>
                    <Form.Control
                      type="date"
                      value={formData.paymentDate}
                      onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>תחילת תקופה</Form.Label>
                    <Form.Control
                      type="date"
                      value={formData.periodStart}
                      onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>סוף תקופה</Form.Label>
                    <Form.Control
                      type="date"
                      value={formData.periodEnd}
                      onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>מס' חשבונית</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.invoiceNumber}
                      onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>מס' אסמכתא</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.referenceNumber}
                      onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    />
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label>מספר שיעורים</Form.Label>
                    <Form.Control
                      type="number"
                      value={formData.lessonsCount}
                      onChange={(e) => setFormData({ ...formData, lessonsCount: e.target.value })}
                    />
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label>מחיר לשיעור</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      value={formData.pricePerLesson}
                      onChange={(e) => setFormData({ ...formData, pricePerLesson: e.target.value })}
                    />
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label>סטטוס</Form.Label>
                    <Form.Select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="completed">שולם</option>
                      <option value="pending">ממתין</option>
                      <option value="failed">נכשל</option>
                      <option value="refunded">הוחזר</option>
                    </Form.Select>
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
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                ביטול
              </Button>
              <Button variant="primary" type="submit">
                צור תשלום
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* Edit Payment Modal */}
        <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg" dir="rtl">
          <Modal.Header closeButton>
            <Modal.Title>ערוך תשלום</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmitEdit}>
            <Modal.Body>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>תלמיד *</Form.Label>
                    <Form.Select
                      value={formData.studentId}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      required
                    >
                      <option value="">בחר תלמיד</option>
                      {students.map(student => (
                        <option key={student.id} value={student.id}>
                          {student.user?.firstName} {student.user?.lastName}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={3}>
                  <Form.Group>
                    <Form.Label>סכום *</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>

                <Col md={3}>
                  <Form.Group>
                    <Form.Label>מטבע</Form.Label>
                    <Form.Select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    >
                      <option value="ILS">₪ שקל</option>
                      <option value="USD">$ דולר</option>
                      <option value="EUR">€ יורו</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>אמצעי תשלום</Form.Label>
                    <Form.Select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    >
                      <option value="cash">מזומן</option>
                      <option value="credit_card">כרטיס אשראי</option>
                      <option value="bank_transfer">העברה בנקאית</option>
                      <option value="check">צ'ק</option>
                      <option value="other">אחר</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>תאריך תשלום *</Form.Label>
                    <Form.Control
                      type="date"
                      value={formData.paymentDate}
                      onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>תחילת תקופה</Form.Label>
                    <Form.Control
                      type="date"
                      value={formData.periodStart}
                      onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>סוף תקופה</Form.Label>
                    <Form.Control
                      type="date"
                      value={formData.periodEnd}
                      onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>מס' חשבונית</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.invoiceNumber}
                      onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>מס' אסמכתא</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.referenceNumber}
                      onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    />
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label>מספר שיעורים</Form.Label>
                    <Form.Control
                      type="number"
                      value={formData.lessonsCount}
                      onChange={(e) => setFormData({ ...formData, lessonsCount: e.target.value })}
                    />
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label>מחיר לשיעור</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      value={formData.pricePerLesson}
                      onChange={(e) => setFormData({ ...formData, pricePerLesson: e.target.value })}
                    />
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label>סטטוס</Form.Label>
                    <Form.Select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="completed">שולם</option>
                      <option value="pending">ממתין</option>
                      <option value="failed">נכשל</option>
                      <option value="refunded">הוחזר</option>
                    </Form.Select>
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
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                ביטול
              </Button>
              <Button variant="primary" type="submit">
                שמור שינויים
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} dir="rtl">
          <Modal.Header closeButton>
            <Modal.Title>אישור מחיקה</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            האם אתה בטוח שברצונך למחוק את התשלום הזה? פעולה זו לא ניתנת לביטול.
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              ביטול
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              מחק
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </>
  );
}
