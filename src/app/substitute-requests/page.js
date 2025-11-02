'use client';

import { useState, useEffect } from 'react';

export default function SubstituteRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, responded

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let url = '/api/substitute-requests';

      // Fetch pending requests for teacher
      if (filter === 'pending') {
        url += '?pending=true';
      } else if (filter !== 'all') {
        url += `?status=${filter}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setRequests(data.requests);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (requestId, response, notes = '') => {
    try {
      const res = await fetch(`/api/substitute-requests/${requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response, notes }),
      });

      const data = await res.json();

      if (data.success) {
        alert(response === 'approved' ? 'הבקשה אושרה בהצלחה!' : 'הבקשה נדחתה.');
        fetchRequests();
      } else {
        alert(`שגיאה: ${data.error}`);
      }
    } catch (error) {
      console.error('Error responding to request:', error);
      alert('שגיאה בטיפול בבקשה');
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { text: 'ממתין', className: 'badge-warning' },
      substitute_suggested: { text: 'תחליף הוצע', className: 'badge-info' },
      awaiting_approval: { text: 'ממתין לאישור שלך', className: 'badge-warning' },
      approved: { text: 'אושר', className: 'badge-success' },
      declined: { text: 'נדחה', className: 'badge-danger' },
      completed: { text: 'הושלם', className: 'badge-success' },
      cancelled: { text: 'בוטל', className: 'badge-secondary' },
    };
    const badge = statusMap[status] || { text: status, className: 'badge-secondary' };
    return <span className={`badge ${badge.className}`}>{badge.text}</span>;
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>בקשות לתחליפות</h1>
      </div>

      {/* Filter Tabs */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="btn-group" role="group">
            <button
              className={`btn ${filter === 'pending' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilter('pending')}
            >
              ממתינות לתגובה
            </button>
            <button
              className={`btn ${filter === 'approved' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilter('approved')}
            >
              אושרו
            </button>
            <button
              className={`btn ${filter === 'declined' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilter('declined')}
            >
              נדחו
            </button>
            <button
              className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilter('all')}
            >
              הכל
            </button>
          </div>
        </div>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <p className="text-muted text-center py-4">
              {filter === 'pending'
                ? 'אין בקשות ממתינות'
                : 'לא נמצאו בקשות'}
            </p>
          </div>
        </div>
      ) : (
        <div className="row">
          {requests.map((request) => (
            <div key={request.id} className="col-md-6 mb-4">
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">
                    {request.originalTeacher.user.firstName}{' '}
                    {request.originalTeacher.user.lastName}
                  </h6>
                  {getStatusBadge(request.status)}
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <p className="mb-1">
                      <strong>תאריך:</strong>{' '}
                      {new Date(request.lessonDate).toLocaleDateString('he-IL')}
                    </p>
                    <p className="mb-1">
                      <strong>שעה:</strong> {request.startTime} - {request.endTime}
                    </p>
                    <p className="mb-1">
                      <strong>כלי:</strong> {request.instrument}
                    </p>
                    <p className="mb-1">
                      <strong>תלמיד:</strong> {request.lesson.student.user.firstName}{' '}
                      {request.lesson.student.user.lastName}
                    </p>
                    <p className="mb-1">
                      <strong>חדר:</strong> {request.lesson.room.name}
                    </p>
                  </div>

                  {request.absence && (
                    <div className="mb-3">
                      <p className="small text-muted mb-1">
                        <strong>סיבת ההיעדרות:</strong> {request.absence.reason || '-'}
                      </p>
                    </div>
                  )}

                  {request.notes && (
                    <div className="mb-3">
                      <p className="small">
                        <strong>הערות:</strong> {request.notes}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {(request.status === 'awaiting_approval' || request.status === 'pending') && (
                    <div className="d-flex gap-2 mt-3">
                      <button
                        className="btn btn-success flex-fill"
                        onClick={() => {
                          if (
                            window.confirm(
                              'האם אתה בטוח שאתה מאשר להחליף את השיעור הזה?'
                            )
                          ) {
                            handleResponse(request.id, 'approved');
                          }
                        }}
                      >
                        אשר
                      </button>
                      <button
                        className="btn btn-danger flex-fill"
                        onClick={() => {
                          const notes = prompt('סיבה לדחייה (אופציונלי):');
                          handleResponse(request.id, 'declined', notes || '');
                        }}
                      >
                        דחה
                      </button>
                    </div>
                  )}

                  {request.status === 'approved' && request.approvedAt && (
                    <div className="mt-3">
                      <p className="small text-success mb-0">
                        ✓ אושר ב-{new Date(request.approvedAt).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
