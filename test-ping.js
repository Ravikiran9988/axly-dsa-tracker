const fetch = require('node-fetch');

async function check() {
  const start = Date.now();
  console.log('Fetching...');
  try {
    const res = await fetch('https://dsa-tracker-ee58e15ab674.herokuapp.com/api/v1/auth/verify', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    console.log(`Status: ${res.status}`);
    console.log(`Time: ${Date.now() - start}ms`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    console.log(`Time: ${Date.now() - start}ms`);
  }
}
check();
