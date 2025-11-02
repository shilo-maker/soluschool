'use client';

import { useState, useEffect, useRef } from 'react';
import { Dropdown, Badge } from 'react-bootstrap';
import { io } from 'socket.io-client';

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Fetch user ID
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          setUserId(userData.id);
        }
      } catch (err) {
        console.error('Fetch user error:', err);
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Initialize Socket.io connection
    socketRef.current = io({
      path: '/socket.io',
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('NotificationCenter connected to socket');
      // Join user-specific notification room
      socket.emit('join-notifications', userId);
      // Request initial notifications
      socket.emit('get-notifications', userId);
    });

    // Listen for notification updates
    socket.on('notifications-update', (data) => {
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [userId]);

  const markAsRead = async (notificationId) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      });
      // Request updated notifications via socket
      if (socketRef.current && userId) {
        socketRef.current.emit('get-notifications', userId);
      }
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  };

  return (
    <Dropdown align="end">
      <Dropdown.Toggle variant="link" id="notification-dropdown" style={{ position: 'relative', color: 'white', textDecoration: 'none' }}>
        <span style={{ fontSize: '1.5rem' }}>🔔</span>
        {unreadCount > 0 && (
          <Badge
            bg="danger"
            pill
            style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              fontSize: '0.7rem'
            }}
          >
            {unreadCount}
          </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu style={{ minWidth: '300px', maxHeight: '400px', overflowY: 'auto' }}>
        <Dropdown.Header>Notifications</Dropdown.Header>
        {notifications.length === 0 ? (
          <Dropdown.Item disabled>No notifications</Dropdown.Item>
        ) : (
          notifications.map((notification) => (
            <Dropdown.Item
              key={notification.id}
              onClick={() => markAsRead(notification.id)}
              style={{
                backgroundColor: notification.read ? 'transparent' : '#f0f9ff',
                borderBottom: '1px solid #e2e8f0',
                whiteSpace: 'normal'
              }}
            >
              <div>
                <strong>{notification.title}</strong>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                  {notification.message}
                </p>
                <small style={{ color: '#94a3b8' }}>
                  {new Date(notification.createdAt).toLocaleString()}
                </small>
              </div>
            </Dropdown.Item>
          ))
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
}
