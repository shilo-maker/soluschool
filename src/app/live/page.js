'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge } from 'react-bootstrap';
import io from 'socket.io-client';

export default function LivePage() {
  const [rooms, setRooms] = useState([]);
  const [currentTime, setCurrentTime] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Set initial time on mount
    setMounted(true);
    setCurrentTime(new Date());

    // Connect to Socket.io
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3334');

    // Listen for room updates
    socket.on('rooms-update', (data) => {
      setRooms(data);
    });

    // Request initial data
    socket.emit('get-rooms');

    // Update clock every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Refresh rooms every 30 seconds
    const refreshInterval = setInterval(() => {
      socket.emit('get-rooms');
    }, 30000);

    return () => {
      socket.disconnect();
      clearInterval(timer);
      clearInterval(refreshInterval);
    };
  }, []);

  const formatTime = (date) => {
    if (!date) return '--:--:--';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getRoomStatus = (room) => {
    if (!room.currentLesson) return 'Available';

    const { teacherCheckedIn, studentCheckedIn } = room.currentLesson;

    if (teacherCheckedIn && studentCheckedIn) return 'Active Lesson';
    if (teacherCheckedIn || studentCheckedIn) return 'Waiting';
    return 'Scheduled';
  };

  const getStatusColor = (room) => {
    if (!room.currentLesson) return 'rgba(148, 163, 184, 0.8)';

    const { teacherCheckedIn, studentCheckedIn } = room.currentLesson;

    if (teacherCheckedIn && studentCheckedIn) return 'rgba(34, 197, 94, 0.8)';
    if (teacherCheckedIn || studentCheckedIn) return 'rgba(251, 191, 36, 0.8)';
    return 'rgba(59, 130, 246, 0.8)';
  };

  const styles = {
    pageContainer: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden'
    },
    header: {
      textAlign: 'center',
      marginBottom: '3rem',
      animation: 'fadeIn 0.8s ease-in'
    },
    title: {
      fontSize: '3rem',
      fontWeight: '700',
      color: 'white',
      textShadow: '0 4px 20px rgba(0,0,0,0.3)',
      marginBottom: '1rem',
      letterSpacing: '-0.5px'
    },
    clock: {
      fontSize: '2.5rem',
      fontWeight: '300',
      color: 'white',
      fontFamily: 'monospace',
      textShadow: '0 2px 10px rgba(0,0,0,0.2)',
      padding: '1rem 2rem',
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      borderRadius: '20px',
      display: 'inline-block',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
    },
    glassCard: {
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      borderRadius: '20px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
      padding: '1.5rem',
      height: '100%',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    },
    glassCardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1.5rem',
      paddingBottom: '1rem',
      borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
    },
    roomName: {
      fontSize: '1.5rem',
      fontWeight: '600',
      color: 'white',
      margin: 0,
      textShadow: '0 2px 4px rgba(0,0,0,0.2)'
    },
    statusBadge: {
      padding: '0.5rem 1rem',
      borderRadius: '12px',
      fontSize: '0.85rem',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
    },
    lessonInfo: {
      color: 'white'
    },
    infoRow: {
      marginBottom: '0.75rem',
      display: 'flex',
      alignItems: 'center'
    },
    infoLabel: {
      fontWeight: '600',
      marginRight: '0.5rem',
      opacity: 0.9,
      minWidth: '90px'
    },
    infoValue: {
      opacity: 0.95,
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    checkmark: {
      fontSize: '1.2rem',
      animation: 'pulse 2s ease-in-out infinite'
    },
    emptyState: {
      textAlign: 'center',
      padding: '4rem 2rem',
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      borderRadius: '20px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
    },
    emptyStateText: {
      color: 'white',
      fontSize: '1.2rem',
      marginBottom: '1rem'
    },
    emptyStateSubtext: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: '0.95rem'
    }
  };

  return (
    <div style={styles.pageContainer}>
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .glass-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.5) !important;
        }

        .room-card {
          animation: fadeIn 0.5s ease-in;
        }
      `}</style>

      <Container fluid>
        <div style={styles.header}>
          <h1 style={styles.title}>🎵 Live Room Status</h1>
          <div style={styles.clock}>
            {mounted && currentTime ? formatTime(currentTime) : '--:--:--'}
          </div>
        </div>

        {rooms.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'float 3s ease-in-out infinite' }}>
              🎼
            </div>
            <p style={styles.emptyStateText}>Loading room data...</p>
            <p style={styles.emptyStateSubtext}>
              If no rooms appear, please create rooms and schedule lessons in the admin panel
            </p>
          </div>
        ) : (
          <Row>
            {rooms.map((room, index) => (
              <Col
                key={room.id}
                md={6}
                lg={4}
                className="mb-4 room-card"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div
                  className="glass-card"
                  style={styles.glassCard}
                >
                  <div style={styles.glassCardHeader}>
                    <h5 style={styles.roomName}>{room.name}</h5>
                    <div
                      style={{
                        ...styles.statusBadge,
                        background: getStatusColor(room)
                      }}
                    >
                      {getRoomStatus(room)}
                    </div>
                  </div>

                  <div style={styles.lessonInfo}>
                    {room.currentLesson ? (
                      <>
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>Student:</span>
                          <span style={styles.infoValue}>
                            {room.currentLesson.studentName}
                            {room.currentLesson.studentCheckedIn && (
                              <span style={{...styles.checkmark, color: '#22c55e'}}>✓</span>
                            )}
                          </span>
                        </div>

                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>Teacher:</span>
                          <span style={styles.infoValue}>
                            {room.currentLesson.teacherName}
                            {room.currentLesson.teacherCheckedIn && (
                              <span style={{...styles.checkmark, color: '#22c55e'}}>✓</span>
                            )}
                          </span>
                        </div>

                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>Instrument:</span>
                          <span style={styles.infoValue}>
                            🎸 {room.currentLesson.instrument}
                          </span>
                        </div>

                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>Time:</span>
                          <span style={styles.infoValue}>
                            🕐 {room.currentLesson.startTime} - {room.currentLesson.endTime}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', opacity: 0.7, padding: '2rem 0' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💤</div>
                        <p style={{ margin: 0 }}>No lessons scheduled</p>
                      </div>
                    )}
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        )}
      </Container>
    </div>
  );
}
