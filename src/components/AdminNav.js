'use client';

import { useState, useEffect } from 'react';
import { Container, Nav, Navbar, NavDropdown } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import NotificationCenter from './NotificationCenter';

export default function AdminNav() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Unauthorized');

      const data = await res.json();

      if (data.user.role !== 'admin') {
        router.push('/login');
        return;
      }

      setUser(data.user);
    } catch (err) {
      localStorage.removeItem('token');
      router.push('/login');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  return (
    <>
      <style jsx global>{`
        .modern-navbar {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          padding: 0.75rem 0 !important;
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          position: relative !important;
          z-index: 1050 !important;
        }

        .modern-navbar .navbar-brand {
          font-weight: 700;
          font-size: 1.5rem;
          color: white !important;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
        }

        .modern-navbar .navbar-brand:hover {
          transform: scale(1.05);
          text-shadow: 0 4px 20px rgba(255, 255, 255, 0.3);
        }

        .modern-navbar .nav-link {
          color: rgba(255, 255, 255, 0.9) !important;
          font-weight: 500;
          padding: 0.5rem 1rem !important;
          margin: 0 0.25rem;
          border-radius: 12px;
          transition: all 0.3s ease;
          position: relative;
        }

        .modern-navbar .nav-link:hover {
          background: rgba(255, 255, 255, 0.2);
          color: white !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .modern-navbar .dropdown-toggle {
          color: rgba(255, 255, 255, 0.9) !important;
          font-weight: 500;
          padding: 0.5rem 1rem !important;
          margin: 0 0.25rem;
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .modern-navbar .dropdown-toggle:hover {
          background: rgba(255, 255, 255, 0.2);
          color: white !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .modern-navbar .dropdown-toggle::after {
          margin-left: 0.5rem;
        }

        .modern-navbar .nav-item.dropdown {
          position: relative !important;
          z-index: 1060 !important;
        }

        .modern-navbar .dropdown-menu {
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(118, 75, 162, 0.2);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          padding: 0.5rem;
          margin-top: 0.5rem !important;
          z-index: 10000 !important;
          position: absolute !important;
        }

        .modern-navbar .dropdown-menu.show {
          z-index: 10000 !important;
        }

        .modern-navbar .dropdown-item {
          border-radius: 8px;
          padding: 0.6rem 1rem;
          margin: 0.15rem 0;
          transition: all 0.2s ease;
          font-weight: 500;
          color: #4a5568;
        }

        .modern-navbar .dropdown-item:hover {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          transform: translateX(4px);
        }

        .modern-navbar .dropdown-divider {
          margin: 0.5rem 0;
          border-color: rgba(118, 75, 162, 0.2);
        }

        .modern-navbar .navbar-toggler {
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 8px;
        }

        .modern-navbar .navbar-toggler:focus {
          box-shadow: 0 0 0 0.25rem rgba(255, 255, 255, 0.25);
        }

        .modern-navbar .navbar-toggler-icon {
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'%3e%3cpath stroke='rgba%28255, 255, 255, 1%29' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e");
        }

        @media (max-width: 991px) {
          .modern-navbar .nav-link,
          .modern-navbar .dropdown-toggle {
            margin: 0.25rem 0;
          }
        }
      `}</style>

      <Navbar expand="lg" className="modern-navbar mb-4">
        <Container fluid>
          <Navbar.Brand href="/admin">🎵 SOLU Music School</Navbar.Brand>
          <Navbar.Toggle />
          <Navbar.Collapse>
            <Nav className="me-auto">
              <Nav.Link href="/admin">🏠 לוח בקרה</Nav.Link>

              <NavDropdown title="👥 אנשים" id="people-dropdown">
                <NavDropdown.Item href="/admin/students">תלמידים</NavDropdown.Item>
                <NavDropdown.Item href="/admin/teachers">מורים</NavDropdown.Item>
              </NavDropdown>

              <NavDropdown title="📅 לוח זמנים" id="schedule-dropdown">
                <NavDropdown.Item href="/admin/calendar">יומן</NavDropdown.Item>
                <NavDropdown.Item href="/admin/lessons">שיעורים</NavDropdown.Item>
                <NavDropdown.Item href="/admin/schedules">חלונות זמן</NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item href="/teacher-absences">היעדרויות מורים</NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item href="/admin/rooms">חדרים</NavDropdown.Item>
              </NavDropdown>

              <NavDropdown title="💰 כספים" id="finance-dropdown">
                <NavDropdown.Item href="/admin/financial">לוח פיננסי</NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item href="/admin/payments">תשלומים</NavDropdown.Item>
                <NavDropdown.Item href="/admin/billing">חיוב מורים</NavDropdown.Item>
              </NavDropdown>

              <NavDropdown title="📊 כלים" id="tools-dropdown">
                <NavDropdown.Item href="/admin/reports">דוחות</NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item href="/live" target="_blank">🎵 תצוגה חיה</NavDropdown.Item>
                <NavDropdown.Item href="/checkin" target="_blank">✓ צ׳ק-אין</NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item href="/admin/settings">⚙️ הגדרות</NavDropdown.Item>
              </NavDropdown>
            </Nav>
            <Nav>
              <NotificationCenter />
              {user && (
                <NavDropdown title={user.firstName + ' ' + user.lastName} align="end">
                  <NavDropdown.Item href="/admin/profile">פרופיל</NavDropdown.Item>
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={handleLogout}>התנתק</NavDropdown.Item>
                </NavDropdown>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </>
  );
}
