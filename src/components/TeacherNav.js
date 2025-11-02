'use client';

import { Navbar, Container, Nav, NavDropdown } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import NotificationCenter from './NotificationCenter';

export default function TeacherNav() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <Navbar bg="primary" variant="dark" expand="lg" className="mb-4" dir="rtl">
      <Container fluid>
        <Navbar.Brand href="/teacher">🎵 מערכת סולו - מורה</Navbar.Brand>
        <Navbar.Toggle aria-controls="teacher-navbar" />
        <Navbar.Collapse id="teacher-navbar">
          <Nav className="me-auto">
            <Nav.Link href="/teacher">🏠 דף הבית</Nav.Link>
            <Nav.Link href="/teacher/calendar">📅 לוח שנה</Nav.Link>
            <Nav.Link href="/teacher/lessons">📚 השיעורים שלי</Nav.Link>
            <Nav.Link href="/teacher/schedule">מערכת שעות</Nav.Link>
            <Nav.Link href="/teacher-absences">🏖️ היעדרויות</Nav.Link>
            <Nav.Link href="/teacher/reports">📊 דוחות</Nav.Link>
          </Nav>
          <Nav>
            <NotificationCenter />
            <NavDropdown
              title={user ? `${user.firstName} ${user.lastName}` : 'משתמש'}
              id="user-dropdown"
              align="end"
            >
              <NavDropdown.Item href="/teacher/profile">👤 הפרופיל שלי</NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={handleLogout}>🚪 התנתק</NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
