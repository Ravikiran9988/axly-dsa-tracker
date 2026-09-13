(async () => {
  try {
    console.log('1. Logging in as admin...');
    const loginRes = await fetch('http://127.0.0.1:5000/api/v1/auth/dev-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@axly.in', role: 'admin' })
    });
    const loginData = await loginRes.json();
    if (!loginData.token) throw new Error('Login failed');
    console.log('Login successful.');
    
    console.log('\n2. Testing AI Question Generation (Manual Endpoint)...');
    const genRes = await fetch('http://127.0.0.1:5000/api/v1/ai-questions/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      },
      body: JSON.stringify({ topic: 'Arrays', difficulty: 'easy', count: 1 })
    });
    
    const genData = await genRes.json();
    console.log('Response Status:', genRes.status);
    if (genRes.ok) {
       console.log('Generation Output Title:', genData.data?.title || (Array.isArray(genData.data) ? genData.data[0]?.title : 'Unknown'));
       console.log('✓ Question Generation via LLM succeeded.');
    } else {
       console.log('❌ Question Generation failed:', JSON.stringify(genData, null, 2));
    }
    
    console.log('\n3. Testing Question Bank Automation (Slot generation)...');
    const autoRes = await fetch('http://127.0.0.1:5000/api/v1/ai-questions/question-bank/manual', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    const autoData = await autoRes.json();
    console.log('Response Status:', autoRes.status);
    
    if (autoRes.ok && autoData.success) {
       console.log('Automation Output Message:', autoData.message);
       console.log('✓ Question Bank Automation Generation succeeded.');
    } else if (autoRes.ok && autoData.status === 'SUCCESS_NOOP') {
       console.log('Automation Output Message:', autoData.message);
       console.log('✓ Question Bank Automation NOOP (slot already filled).');
    } else {
       console.log('❌ Question Bank Automation failed:', JSON.stringify(autoData, null, 2));
    }
    
  } catch (err) {
    console.error('Error during verification:', err);
  }
})();
