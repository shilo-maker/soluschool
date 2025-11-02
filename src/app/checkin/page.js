'use client';

import { useState } from 'react';
import { Container, Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';

export default function CheckinPage() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handlePinChange = (e) => {
    const value = e.target.value.toUpperCase().slice(0, 4);
    setPin(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pin.length !== 4) {
      setMessage({ type: 'danger', text: 'אנא הזן קוד בן 4 תווים' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Check-in failed');
      }

      setMessage({
        type: 'success',
        text: `שלום ${data.user.firstName}! נרשמת בהצלחה. ${data.message || ''}`
      });

      // Clear PIN after 2 seconds
      setTimeout(() => {
        setPin('');
        setMessage(null);
      }, 3000);

    } catch (err) {
      setMessage({ type: 'danger', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <Card style={{ maxWidth: '500px', width: '100%' }}>
        <Card.Body className="p-5">
          <h2 className="text-center mb-2">נוכחות</h2>
          <h5 className="text-center text-muted mb-4">SOLU Music School</h5>

          {message && (
            <Alert variant={message.type} className="text-center">
              {message.text}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-4">
              <Form.Label className="text-center w-100 h5">הזן קוד PIN</Form.Label>
              <Form.Control
                type="text"
                value={pin}
                onChange={handlePinChange}
                placeholder="----"
                className="text-center"
                style={{ fontSize: '2rem', letterSpacing: '1rem', fontWeight: 'bold' }}
                maxLength={4}
                autoComplete="off"
                autoFocus
              />
              <Form.Text className="text-center d-block mt-2">
                קוד בן 4 תווים (אותיות/מספרים)
              </Form.Text>
            </Form.Group>

            <Button
              type="submit"
              variant="primary"
              className="w-100"
              size="lg"
              disabled={loading || pin.length !== 4}
            >
              {loading ? 'מתחבר...' : 'כניסה'}
            </Button>
          </Form>

          <hr className="my-4" />

          <Row>
            <Col className="text-center">
              <small className="text-muted">
                <div className="mb-2">📱 סרוק QR Code</div>
                <div>או הזן PIN שקיבלת</div>
              </small>
            </Col>
          </Row>

          <div className="text-center mt-3">
            <a href="/login" className="text-decoration-none">
              <small>כניסת מנהלים →</small>
            </a>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}
