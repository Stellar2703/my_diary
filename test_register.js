const FormData = require('form-data');
const axios = require('axios');

async function test() {
  const form = new FormData();
  form.append('name', 'Test User');
  form.append('username', 'testuser456');
  form.append('email', 'test456@example.com');
  form.append('mobileNumber', '1234567891');
  form.append('password', 'TestPass123');
  
  try {
    const res = await axios.post('http://localhost:5000/api/auth/register', form, {
      headers: form.getHeaders()
    });
    console.log('Success:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.log('Error:', JSON.stringify(err.response?.data || err.message, null, 2));
  }
}

test();
