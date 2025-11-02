'use client';

import { useState, useEffect } from 'react';
import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import NotificationCenter from './NotificationCenter';

export default function StudentNav() {
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
    <Navbar bg="primary" variant="dark" expand="lg" className="mb-0" dir="rtl">
      <Container fluid>
        <Navbar.Brand href="/student">🎵 מערכת ניהול בית הספר למוזיקה</Navbar.Brand>
        <Navbar.Toggle aria-controls="student-navbar" />
        <Navbar.Collapse id="student-navbar">
          <Nav className="me-auto">
            <Nav.Link href="/student">לוח בקרה</Nav.Link>
            <Nav.Link href="/student/calendar">📅 לוח שנה</Nav.Link>
            <Nav.Link href="/student/lessons">השיעורים שלי</Nav.Link>
            <Nav.Link href="/student/schedule">מערכת שעות</Nav.Link>
            <Nav.Link href="/student/profile">הפרופיל שלי</Nav.Link>
          </Nav>
          <Nav>
            <NotificationCenter />
            <NavDropdown
              title={user ? `${user.firstName} ${user.lastName}` : 'טוען...'}
              id="user-dropdown"
              align="end"
            >
              <NavDropdown.Item href="/student/profile">הגדרות</NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={handleLogout}>התנתק</NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
