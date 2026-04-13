const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function testUpload() {
  try {
    const fd = new FormData();
    fd.append('eventName', 'Test Image Event');
    fd.append('eventCategory', '69ccc8d41bbdd30a3c62fbf4'); // Assuming this ID exists based on user prompt
    fd.append('eventDescription', 'Test');
    fd.append('location', 'Test');
    fd.append('capacity', 100);
    fd.append('date', '2027-10-22');
    fd.append('ask', 100);
    fd.append('ticketPrice', 100);
    fd.append('marketingBudget', 100);
    fd.append('isIndoor', 'false');
    
    fd.append('thumbnail', fs.createReadStream('./test_image.png'));

    const loginRes = await axios.post('http://localhost:8080/api/auth/login', {
      email: 'rishabh@gmail.com',
      password: '123'
    });
    
    const token = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'][0].split(';')[0].split('=')[1] : null;

    const res = await axios.post('http://localhost:8080/api/organizer/events', fd, {
      headers: {
        ...fd.getHeaders(),
        Authorization: `Bearer ${loginRes.data.data.accessToken}`, // Just in case, though cookies should be used
        Cookie: loginRes.headers['set-cookie']
      }
    });

    console.log('Success!', res.data.data.thumbnail);
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

testUpload();
