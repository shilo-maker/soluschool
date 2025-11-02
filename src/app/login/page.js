'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Card, Form, Button, Alert, Nav } from 'react-bootstrap';

export default function LoginPage() {
  const router = useRouter();
  const [loginMode, setLoginMode] = useState('email'); // 'email' or 'pin'
  const [formData, setFormData] = useState({ email: '', password: '', pin: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let endpoint, payload;

      if (loginMode === 'pin') {
        endpoint = '/api/auth/login-pin';
        payload = { pin: formData.pin };
      } else {
        endpoint = '/api/auth/login';
        payload = { email: formData.email, password: formData.password };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store token
      localStorage.setItem('token', data.token);

      // Redirect based on role
      if (data.user.role === 'admin') {
        router.push('/admin');
      } else if (data.user.role === 'teacher') {
        router.push('/teacher');
      } else {
        router.push('/student');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <Card style={{ maxWidth: '400px', width: '100%' }}>
        <Card.Body className="p-4">
          <h2 className="text-center mb-4">התחברות למערכת</h2>
          <h5 className="text-center text-muted mb-4">SOLU Music School</h5>

          {error && <Alert variant="danger">{error}</Alert>}

          {/* Login Mode Tabs */}
          <Nav variant="pills" className="mb-4 justify-content-center">
            <Nav.Item>
              <Nav.Link
                active={loginMode === 'email'}
                onClick={() => {
                  setLoginMode('email');
                  setError('');
                }}
                style={{ cursor: 'pointer' }}
              >
                אימייל וסיסמה
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                active={loginMode === 'pin'}
                onClick={() => {
                  setLoginMode('pin');
                  setError('');
                }}
                style={{ cursor: 'pointer' }}
              >
                כניסה עם PIN
              </Nav.Link>
            </Nav.Item>
          </Nav>

          <Form onSubmit={handleSubmit}>
            {loginMode === 'email' ? (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>אימייל</Form.Label>
                  <Form.Control
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="admin@soluschool.com"
                    dir="ltr"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>סיסמה</Form.Label>
                  <Form.Control
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    placeholder="********"
                  />
                </Form.Group>
              </>
            ) : (
              <Form.Group className="mb-3">
                <Form.Label>PIN (4 ספרות/תווים)</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                  required
                  placeholder="הכנס PIN"
                  maxLength={4}
                  style={{ fontSize: '1.5rem', letterSpacing: '0.5rem', textAlign: 'center' }}
                  dir="ltr"
                />
                <Form.Text className="text-muted text-center d-block">
                  הכנס את ה-PIN בן 4 הספרות/תווים שלך
                </Form.Text>
              </Form.Group>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-100"
              disabled={loading}
            >
              {loading ? 'מתחבר...' : 'התחבר'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}
