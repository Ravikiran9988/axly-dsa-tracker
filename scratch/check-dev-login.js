const fetch = require('node-fetch');

async function check() {
  const res = await fetch('http://localhost:5000/api/v1/auth/dev-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@axly.in', role: 'admin' })
  });
  const body = await res.json();
  console.log('devLogin response:', body);

  if (body.token) {
    const res2 = await fetch('http://localhost:5000/api/v1/auth/verify', {
      headers: { 'Authorization': `Bearer ${body.token}` }
    });
    const body2 = await res2.json();
    console.log('verifyAuth response:', body2);
  }
}

check();
