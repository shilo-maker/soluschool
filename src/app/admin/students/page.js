"use client";

import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Table,
  Modal,
  Form,
  Badge,
  Alert,
  InputGroup,
} from "react-bootstrap";
import { useRouter } from "next/navigation";
import AdminNav from "@/components/AdminNav";

const INSTRUMENTS = [
  "פסנתר",
  "גיטרה",
  "בס",
  "תופים",
  "חליל",
  "סקסופון",
  "חצוצרה",
  "שירה",
  "כינור",
  "ויולה",
  "צ'לו",
  "קלרינט",
  "אקורדיון",
  "אחר",
];

const LEVELS = ["beginner", "intermediate", "advanced"];

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentPin, setStudentPin] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    instruments: [],
    notes: "",
    language: "he",
    isActive: true,
  });

  useEffect(() => {
    checkAuth();
    loadStudents();
    loadTeachers();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Unauthorized");

      const data = await res.json();
      if (data.user.role !== "admin") {
        router.push("/login");
      }
    } catch (err) {
      localStorage.removeItem("token");
      router.push("/login");
    }
  };

  const loadStudents = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/students", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to load students");

      const data = await res.json();
      setStudents(data.students || []);
    } catch (err) {
      setMessage({ type: "danger", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const loadTeachers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/teachers", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to load teachers");

      const data = await res.json();
      setTeachers(data.teachers || []);
    } catch (err) {
      console.error("Failed to load teachers:", err);
    }
  };

  const handleOpenModal = (student = null) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        email: student.user.email,
        password: "",
        firstName: student.user.firstName,
        lastName: student.user.lastName,
        phone: student.user.phone || "",
        parentName: student.parentName || "",
        parentPhone: student.parentPhone || "",
        parentEmail: student.parentEmail || "",
        instruments: student.instruments || [],
        notes: student.notes || "",
        language: student.user.language,
        isActive: student.user.isActive,
      });
    } else {
      setEditingStudent(null);
      setFormData({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        phone: "",
        parentName: "",
        parentPhone: "",
        parentEmail: "",
        instruments: [],
        notes: "",
        language: "he",
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingStudent(null);
    setShowPassword(false);
    setSubmitting(false);
  };

  const handleAddInstrument = () => {
    setFormData({
      ...formData,
      instruments: [
        ...formData.instruments,
        { instrument: "", level: "beginner", teacherId: "" },
      ],
    });
  };

  const handleRemoveInstrument = (index) => {
    setFormData({
      ...formData,
      instruments: formData.instruments.filter((_, i) => i !== index),
    });
  };

  const handleInstrumentChange = (index, field, value) => {
    const newInstruments = [...formData.instruments];
    newInstruments[index][field] = value;
    setFormData({ ...formData, instruments: newInstruments });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const url = editingStudent
        ? `/api/students/${editingStudent.id}`
        : "/api/students";
      const method = editingStudent ? "PUT" : "POST";

      const payload = {
        ...formData,
      };

      // Don't send empty password on update
      if (editingStudent && !formData.password) {
        delete payload.password;
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save student");
      }

      setMessage({
        type: "success",
        text: editingStudent
          ? "Student updated successfully"
          : `Student created successfully. PIN: ${data.pin}`,
      });

      handleCloseModal();
      loadStudents();
    } catch (err) {
      setMessage({ type: "danger", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewPin = async (student) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/students/${student.id}/get-pin`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get PIN");
      }

      setStudentPin(data.pin);
      setSelectedStudent(student);
      setShowPinModal(true);
    } catch (err) {
      setMessage({ type: "danger", text: err.message });
    }
  };

  const handleResetPin = async (student) => {
    if (!confirm("Are you sure you want to reset this student's PIN?")) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/students/${student.id}/reset-pin`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reset PIN");
      }

      setMessage({
        type: "success",
        text: `PIN reset successfully. New PIN: ${data.pin}`,
      });
    } catch (err) {
      setMessage({ type: "danger", text: err.message });
    }
  };

  const handleViewQR = async (student) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/students/${student.id}/qr`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get QR code");
      }

      setQrCode(data.qrCode);
      setSelectedStudent(student);
      setShowQRModal(true);
    } catch (err) {
      setMessage({ type: "danger", text: err.message });
    }
  };

  const handleDelete = async (studentId) => {
    if (!confirm("Are you sure you want to deactivate this student?")) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/students/${studentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete student");
      }

      setMessage({ type: "success", text: data.message });
      loadStudents();
    } catch (err) {
      setMessage({ type: "danger", text: err.message });
    }
  };

  if (loading) {
    return (
      <Container className="py-5">
        <p>Loading...</p>
      </Container>
    );
  }

  return (
    <>
      <AdminNav />
      <Container fluid>
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h2>ניהול תלמידים</h2>
                <p className="text-muted">נהל את התלמידים של בית הספר</p>
              </div>
              <Button variant="primary" onClick={() => handleOpenModal()}>
                + הוסף תלמיד חדש
              </Button>
            </div>
          </Col>
        </Row>

        {message && (
          <Alert
            variant={message.type}
            dismissible
            onClose={() => setMessage(null)}
          >
            {message.text}
          </Alert>
        )}

        <Card>
          <Card.Body>
            {students.length === 0 ? (
              <div className="text-center py-5">
                <p className="text-muted">אין תלמידים במערכת</p>
                <Button variant="primary" onClick={() => handleOpenModal()}>
                  צור תלמיד ראשון
                </Button>
              </div>
            ) : (
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>שם</th>
                    <th>אימייל</th>
                    <th>כלים</th>
                    <th>הורה</th>
                    <th>סטטוס</th>
                    <th>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td>
                        <strong>
                          {student.user.firstName} {student.user.lastName}
                        </strong>
                      </td>
                      <td className="text-muted">{student.user.email}</td>
                      <td>
                        <small className="text-muted">
                          {student.instruments
                            .map((i) => i.instrument)
                            .join(", ") || "-"}
                        </small>
                      </td>
                      <td>
                        <small className="text-muted">
                          {student.parentName || "-"}
                        </small>
                      </td>
                      <td>
                        <Badge
                          bg={student.user.isActive ? "success" : "secondary"}
                        >
                          {student.user.isActive ? "פעיל" : "לא פעיל"}
                        </Badge>
                      </td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-1 mb-1"
                          onClick={() => handleOpenModal(student)}
                        >
                          ערוך
                        </Button>
                        <Button
                          variant="outline-info"
                          size="sm"
                          className="me-1 mb-1"
                          onClick={() => handleViewPin(student)}
                        >
                          PIN
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="me-1 mb-1"
                          onClick={() => handleViewQR(student)}
                        >
                          QR
                        </Button>
                        <Button
                          variant="outline-warning"
                          size="sm"
                          className="me-1 mb-1"
                          onClick={() => handleResetPin(student)}
                        >
                          איפוס PIN
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="mb-1"
                          onClick={() => handleDelete(student.id)}
                        >
                          השבת
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>

        {/* Add/Edit Student Modal */}
        <Modal show={showModal} onHide={handleCloseModal} size="lg" dir="rtl">
          <Modal.Header closeButton>
            <Modal.Title>
              {editingStudent ? "ערוך תלמיד" : "הוסף תלמיד חדש"}
            </Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmit}>
            <Modal.Body>
              <h5 className="mb-3">פרטי התלמיד</h5>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>שם פרטי *</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>שם משפחה *</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>אימייל *</Form.Label>
                <Form.Control
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  dir="ltr"
                />
              </Form.Group>

              {!editingStudent && (
                <Form.Group className="mb-3">
                  <Form.Label>סיסמה</Form.Label>
                  <div className="position-relative">
                    <Form.Control
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="השאר ריק לסיסמה אוטומטית"
                      dir="ltr"
                      style={{ paddingRight: "45px" }}
                    />
                    <Button
                      variant="link"
                      className="position-absolute top-0 end-0 text-muted"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        border: "none",
                        background: "none",
                        padding: "0.375rem 0.75rem",
                        height: "100%",
                        zIndex: 10,
                      }}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </Button>
                  </div>
                  <Form.Text className="text-muted">
                    אם לא תזין סיסמה, המערכת תיצור אחת באופן אוטומטי
                  </Form.Text>
                </Form.Group>
              )}

              <Form.Group className="mb-3">
                <Form.Label>טלפון</Form.Label>
                <Form.Control
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  dir="ltr"
                />
              </Form.Group>

              <hr className="my-4" />
              <h5 className="mb-3">פרטי הורה/אפוטרופוס</h5>

              <Form.Group className="mb-3">
                <Form.Label>שם ההורה</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.parentName}
                  onChange={(e) =>
                    setFormData({ ...formData, parentName: e.target.value })
                  }
                />
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>טלפון הורה</Form.Label>
                    <Form.Control
                      type="tel"
                      value={formData.parentPhone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          parentPhone: e.target.value,
                        })
                      }
                      dir="ltr"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>אימייל הורה</Form.Label>
                    <Form.Control
                      type="email"
                      value={formData.parentEmail}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          parentEmail: e.target.value,
                        })
                      }
                      dir="ltr"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <hr className="my-4" />
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">כלים לומדים</h5>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={handleAddInstrument}
                >
                  + הוסף כלי
                </Button>
              </div>

              {formData.instruments.map((inst, index) => (
                <Card key={index} className="mb-3">
                  <Card.Body>
                    <Row className="g-2">
                      <Col md={12}>
                        <Form.Group className="mb-2">
                          <Form.Label>כלי *</Form.Label>
                          <Form.Select
                            value={inst.instrument}
                            onChange={(e) =>
                              handleInstrumentChange(
                                index,
                                "instrument",
                                e.target.value,
                              )
                            }
                            required
                          >
                            <option value="">בחר כלי...</option>
                            {INSTRUMENTS.map((instrument) => (
                              <option key={instrument} value={instrument}>
                                {instrument}
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                    <Row className="g-2">
                      <Col md={5}>
                        <Form.Group className="mb-2">
                          <Form.Label>רמה</Form.Label>
                          <Form.Select
                            value={inst.level}
                            onChange={(e) =>
                              handleInstrumentChange(
                                index,
                                "level",
                                e.target.value,
                              )
                            }
                          >
                            <option value="beginner">מתחיל</option>
                            <option value="intermediate">בינוני</option>
                            <option value="advanced">מתקדם</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-2">
                          <Form.Label>מורה</Form.Label>
                          <Form.Select
                            value={inst.teacherId}
                            onChange={(e) =>
                              handleInstrumentChange(
                                index,
                                "teacherId",
                                e.target.value,
                              )
                            }
                          >
                            <option value="">בחר מורה...</option>
                            {teachers
                              .filter((t) =>
                                t.instruments.includes(inst.instrument),
                              )
                              .map((teacher) => (
                                <option key={teacher.id} value={teacher.id}>
                                  {teacher.user.firstName}{" "}
                                  {teacher.user.lastName}
                                </option>
                              ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={1} className="d-flex align-items-end">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleRemoveInstrument(index)}
                          className="mb-2 w-100"
                        >
                          ×
                        </Button>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              ))}

              <Form.Group className="mb-3">
                <Form.Label>הערות</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  label="תלמיד פעיל"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={handleCloseModal}
                disabled={submitting}
              >
                ביטול
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    {editingStudent ? "מעדכן..." : "יוצר..."}
                  </>
                ) : editingStudent ? (
                  "עדכן"
                ) : (
                  "צור"
                )}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* PIN Modal */}
        <Modal
          show={showPinModal}
          onHide={() => setShowPinModal(false)}
          dir="rtl"
        >
          <Modal.Header closeButton>
            <Modal.Title>קוד PIN של התלמיד</Modal.Title>
          </Modal.Header>
          <Modal.Body className="text-center">
            {selectedStudent && (
              <>
                <h5>
                  {selectedStudent.user.firstName}{" "}
                  {selectedStudent.user.lastName}
                </h5>
                <div className="my-4">
                  <h1 className="display-1 fw-bold text-primary">
                    {studentPin}
                  </h1>
                </div>
                <p className="text-muted">שתף קוד זה עם התלמיד להתחברות</p>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPinModal(false)}>
              סגור
            </Button>
          </Modal.Footer>
        </Modal>

        {/* QR Code Modal */}
        <Modal
          show={showQRModal}
          onHide={() => setShowQRModal(false)}
          dir="rtl"
        >
          <Modal.Header closeButton>
            <Modal.Title>QR Code של התלמיד</Modal.Title>
          </Modal.Header>
          <Modal.Body className="text-center">
            {selectedStudent && qrCode && (
              <>
                <h5>
                  {selectedStudent.user.firstName}{" "}
                  {selectedStudent.user.lastName}
                </h5>
                <div className="my-4">
                  <img src={qrCode} alt="QR Code" className="img-fluid" />
                </div>
                <p className="text-muted">סרוק את הקוד להתחברות מהירה</p>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowQRModal(false)}>
              סגור
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </>
  );
}
