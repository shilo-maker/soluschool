# Substitute Teacher System - Complete Documentation

## Overview
A comprehensive system to manage teacher absences and find substitute teachers when a teacher is unavailable (sick, trip, event, etc.).

## Features

### 1. **Report Teacher Absence**
- Admins or teachers can report when a teacher will be absent
- Specify date range (start and end dates)
- Add reason and notes
- System automatically identifies affected lessons

### 2. **Find Available Substitutes**
- Search for substitute teachers based on:
  - Same instrument capability
  - Availability (no conflicting lessons)
  - Experience (sorted by completed lessons)
- Shows all available teachers with their details

### 3. **Request Substitute**
- Send request to selected substitute teacher
- Substitute receives real-time notification
- Can be for one lesson or multiple lessons (seasonal)

### 4. **Substitute Response**
- Substitute teachers can:
  - View all pending requests
  - Approve or decline requests
  - Add notes/reasons for declining
- When approved:
  - Lesson is automatically reassigned to substitute
  - Original teacher receives notification
  - Student receives notification about teacher change

## User Flows

### Flow 1: Admin Reports Absence
1. Admin navigates to **Teacher Absences** page
2. Clicks "דיווח היעדרות" (Report Absence)
3. Selects teacher, date range, reason
4. Submits - system shows affected lessons
5. For each affected lesson, admin can:
   - Click "מצא תחליף" (Find Substitute)
   - View available substitutes
   - Select substitute and send request

### Flow 2: Substitute Teacher Responds
1. Substitute teacher receives notification
2. Navigates to **Substitute Requests** page
3. Views pending requests
4. For each request:
   - Reviews lesson details (date, time, student, instrument)
   - Clicks "אשר" (Approve) or "דחה" (Decline)
5. If approved:
   - Lesson is assigned to them
   - All parties are notified

### Flow 3: Student Gets Notified
1. Student receives notification about teacher change
2. Views lesson details
3. Sees new teacher for that specific lesson

## API Endpoints

### Teacher Absences
- `GET /api/teacher-absences` - List all absences
- `POST /api/teacher-absences` - Report new absence
- `GET /api/teacher-absences/[id]` - Get absence details
- `PUT /api/teacher-absences/[id]` - Update absence status
- `DELETE /api/teacher-absences/[id]` - Delete absence

### Find Substitutes
- `POST /api/teachers/find-substitutes` - Find available substitute teachers
  ```json
  {
    "instrument": "פסנתר",
    "date": "2024-01-15",
    "startTime": "14:00",
    "endTime": "15:00",
    "originalTeacherId": "teacher-id"
  }
  ```

### Substitute Requests
- `GET /api/substitute-requests` - List all requests
  - Query params: `?pending=true` for teacher's pending requests
  - Query params: `?status=approved` for filtered results
- `POST /api/substitute-requests` - Create substitute request(s)
  ```json
  {
    "absenceId": "absence-id",
    "lessonIds": ["lesson-1", "lesson-2"],
    "substituteTeacherId": "teacher-id",
    "notes": "Optional notes"
  }
  ```
- `POST /api/substitute-requests/[id]/respond` - Respond to request
  ```json
  {
    "response": "approved",  // or "declined"
    "notes": "Optional notes"
  }
  ```

## Database Schema

### TeacherAbsence
```prisma
model TeacherAbsence {
  id            String          @id @default(cuid())
  teacherId     String
  teacher       Teacher         @relation(...)
  startDate     DateTime
  endDate       DateTime
  reason        String?
  status        AbsenceStatus   @default(pending)
  reportedById  String
  reportedBy    User            @relation(...)
  notes         String?
  substituteRequests SubstituteRequest[]
}
```

### SubstituteRequest
```prisma
model SubstituteRequest {
  id                    String            @id @default(cuid())
  absenceId             String
  absence               TeacherAbsence    @relation(...)
  lessonId              String
  lesson                Lesson            @relation(...)
  originalTeacherId     String
  originalTeacher       Teacher           @relation(...)
  substituteTeacherId   String?
  substituteTeacher     Teacher?          @relation(...)
  studentId             String
  student               Student           @relation(...)
  roomId                String
  room                  Room              @relation(...)
  instrument            String
  lessonDate            DateTime
  startTime             String
  endTime               String
  status                SubstituteStatus  @default(pending)
  approvedById          String?
  approvedBy            User?             @relation(...)
  approvedAt            DateTime?
  notes                 String?
}
```

## Status Values

### AbsenceStatus
- `pending` - Just reported
- `coverage_needed` - Needs substitute
- `partially_covered` - Some lessons have substitutes
- `fully_covered` - All lessons have substitutes
- `cancelled` - Absence cancelled

### SubstituteStatus
- `pending` - Request created
- `substitute_suggested` - Substitute suggested
- `awaiting_approval` - Waiting for substitute response
- `approved` - Substitute accepted
- `declined` - Substitute declined
- `completed` - Lesson completed
- `cancelled` - Request cancelled

## Notifications

### Types Sent
1. **substitute_request** - Sent to substitute teacher when request created
2. **substitute_approved** - Sent to original teacher when substitute approves
3. **teacher_changed** - Sent to student when substitute is assigned
4. **substitute_declined** - Sent to admin/reporter when substitute declines

## UI Pages

### 1. `/teacher-absences`
- View all teacher absences
- Report new absence
- See affected lessons count
- Navigate to absence details

### 2. `/teacher-absences/[id]`
- View absence details
- See list of affected lessons
- For each lesson:
  - Find available substitutes
  - Send substitute request
  - View request status

### 3. `/substitute-requests`
- View all substitute requests (filtered by status)
- Tabs: Pending, Approved, Declined, All
- Approve or decline requests
- Add notes when declining

## Testing Checklist

- [ ] Report teacher absence
- [ ] Verify affected lessons are identified
- [ ] Find available substitutes for a lesson
- [ ] Verify conflicting teachers are excluded
- [ ] Send substitute request
- [ ] Verify notification is sent
- [ ] Substitute approves request
- [ ] Verify lesson is reassigned
- [ ] Verify all parties receive notifications
- [ ] Substitute declines request
- [ ] Verify admin receives notification
- [ ] Test with multiple lessons (seasonal absence)

## Next Steps / Enhancements

1. **Bulk Operations**: Select multiple lessons and assign same substitute
2. **Automatic Matching**: AI/algorithm to suggest best substitute automatically
3. **Substitute Preferences**: Let substitutes set preferences for instruments, students, times
4. **Compensation**: Track substitute payments separately from regular lessons
5. **Calendar Integration**: Show substitute assignments in teacher's calendar
6. **Reminder System**: Remind substitute 24 hours before lesson
7. **Rating System**: Let students/admin rate substitute teachers
8. **Recurring Absences**: Template for regular absences (e.g., every Tuesday)

## Notes

- The system uses the existing `Notification` model for real-time alerts
- Lessons are automatically reassigned when substitute approves
- Original teacher retains lesson history even after reassignment
- Substitute requests are tied to specific absences for tracking
- The `approved_by` field tracks who approved (for audit trail)
