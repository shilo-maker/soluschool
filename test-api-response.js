const fetch = require('node-fetch');

async function testAPI() {
  console.log('=== TESTING API RESPONSE ===\n');

  try {
    const response = await fetch('http://localhost:3335/api/student-check-in');
    const data = await response.json();

    console.log('API Response:');
    console.log(JSON.stringify(data, null, 2));

    if (data.students && data.students.length > 0) {
      console.log('\n=== FIRST STUDENT DATA ===');
      console.log('Student:', data.students[0].firstName, data.students[0].lastName);
      if (data.students[0].nextLesson) {
        console.log('Next Lesson:', data.students[0].nextLesson);
        console.log('Teacher:', data.students[0].nextLesson.teacher);
        console.log('Teacher Checked In:', data.students[0].nextLesson.teacherCheckedIn);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAPI();
