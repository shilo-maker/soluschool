import prisma from './prisma';

/**
 * Create a notification for a user
 */
export async function createNotification({ userId, type, title, message, link }) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link,
      },
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

/**
 * Send lesson reminder notification
 */
export async function sendLessonReminder(lesson) {
  const lessonTime = `${lesson.startTime} - ${lesson.endTime}`;
  const teacherName = `${lesson.teacher?.user?.firstName} ${lesson.teacher?.user?.lastName}`;
  const studentName = `${lesson.student?.user?.firstName} ${lesson.student?.user?.lastName}`;

  // Notify teacher
  await createNotification({
    userId: lesson.teacher.userId,
    type: 'lesson_reminder',
    title: 'Upcoming Lesson Reminder',
    message: `You have a lesson with ${studentName} (${lesson.instrument}) today at ${lessonTime} in ${lesson.room?.name}`,
    link: `/teacher/lessons/${lesson.id}`,
  });

  // Notify student
  await createNotification({
    userId: lesson.student.userId,
    type: 'lesson_reminder',
    title: 'Lesson Reminder',
    message: `Your ${lesson.instrument} lesson with ${teacherName} is today at ${lessonTime} in ${lesson.room?.name}`,
    link: `/student/lessons/${lesson.id}`,
  });
}

/**
 * Send notification when lesson is confirmed
 */
export async function sendLessonConfirmation(lesson) {
  const lessonDate = new Date(lesson.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const teacherName = `${lesson.teacher?.user?.firstName} ${lesson.teacher?.user?.lastName}`;

  let title = '';
  let message = '';

  switch (lesson.status) {
    case 'completed':
      title = 'Lesson Completed';
      message = `Your ${lesson.instrument} lesson with ${teacherName} on ${lessonDate} has been marked as completed.`;
      if (lesson.teacherNotes) {
        message += ` Teacher notes: ${lesson.teacherNotes}`;
      }
      break;
    case 'no_show':
      title = 'Lesson Attendance Note';
      message = `Your ${lesson.instrument} lesson with ${teacherName} on ${lessonDate} was marked as no-show.`;
      break;
    case 'cancelled':
      title = 'Lesson Cancelled';
      message = `Your ${lesson.instrument} lesson with ${teacherName} on ${lessonDate} has been cancelled.`;
      if (lesson.cancellationReason) {
        message += ` Reason: ${lesson.cancellationReason}`;
      }
      break;
    default:
      return;
  }

  // Notify student
  await createNotification({
    userId: lesson.student.userId,
    type: 'lesson_confirmed',
    title,
    message,
    link: `/student/lessons/${lesson.id}`,
  });
}

/**
 * Send notification when lesson is cancelled
 */
export async function sendLessonCancellation(lesson, cancelledBy) {
  const lessonDate = new Date(lesson.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const lessonTime = `${lesson.startTime} - ${lesson.endTime}`;
  const teacherName = `${lesson.teacher?.user?.firstName} ${lesson.teacher?.user?.lastName}`;
  const studentName = `${lesson.student?.user?.firstName} ${lesson.student?.user?.lastName}`;

  const reason = lesson.cancellationReason ? ` Reason: ${lesson.cancellationReason}` : '';

  // Notify teacher if student cancelled
  if (cancelledBy !== lesson.teacher.userId) {
    await createNotification({
      userId: lesson.teacher.userId,
      type: 'lesson_cancelled',
      title: 'Lesson Cancelled',
      message: `Your lesson with ${studentName} (${lesson.instrument}) on ${lessonDate} at ${lessonTime} has been cancelled.${reason}`,
      link: `/teacher/lessons/${lesson.id}`,
    });
  }

  // Notify student if teacher or admin cancelled
  if (cancelledBy !== lesson.student.userId) {
    await createNotification({
      userId: lesson.student.userId,
      type: 'lesson_cancelled',
      title: 'Lesson Cancelled',
      message: `Your ${lesson.instrument} lesson with ${teacherName} on ${lessonDate} at ${lessonTime} has been cancelled.${reason}`,
      link: `/student/lessons/${lesson.id}`,
    });
  }
}

/**
 * Send notification when teacher adds feedback
 */
export async function sendFeedbackNotification(lesson) {
  const teacherName = `${lesson.teacher?.user?.firstName} ${lesson.teacher?.user?.lastName}`;
  const lessonDate = new Date(lesson.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  await createNotification({
    userId: lesson.student.userId,
    type: 'feedback_added',
    title: 'New Feedback from Teacher',
    message: `${teacherName} added notes to your ${lesson.instrument} lesson on ${lessonDate}`,
    link: `/student/lessons/${lesson.id}`,
  });
}
