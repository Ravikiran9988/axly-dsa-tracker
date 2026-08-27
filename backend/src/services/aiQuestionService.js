const https = require('https');

function postJson(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({ hostname:u.hostname, port:u.port || 443, path:u.pathname + u.search, method:'POST', headers:{'Content-Type':'application/json',...headers} }, res => {
      let data=''; res.on('data', c => data += c); res.on('end', () => { try { const json=JSON.parse(data); if(res.statusCode<200||res.statusCode>=300) return reject(new Error(json.error?.message || json.error || `LLM request failed (${res.statusCode})`)); resolve(json); } catch(e){ reject(new Error('Invalid LLM response')); } });
    });
    req.on('error', reject); req.setTimeout(30000,()=>{req.destroy();reject(new Error('LLM request timed out'));}); req.write(JSON.stringify(body)); req.end();
  });
}

function extractJson(content) {
  const text = typeof content === 'string' ? content : JSON.stringify(content);
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text.match(/\{[\s\S]*\}/)?.[0];
  if (!candidate) throw new Error('LLM did not return JSON');
  return JSON.parse(candidate);
}

async function generateQuestion({topic, difficulty, language='javascript', count=8}) {
  const key=process.env.LLM_API_KEY, base=(process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/,''); model=process.env.LLM_MODEL || 'gpt-4o-mini';
  if(!key) throw Object.assign(new Error('LLM is not configured. Set LLM_API_KEY, LLM_BASE_URL and LLM_MODEL.'),{statusCode:503});
  const prompt=`Create one original coding challenge for Axly DSA Tracker. Topic: ${topic}. Difficulty: ${difficulty}. Preferred language: ${language}. Generate exactly ${count} test cases, including public and hidden cases. Return ONLY valid JSON with keys title,description,constraints,input_format,output_format,examples,starter_code,solution_explanation,test_cases,time_limit_ms,memory_limit_mb. test_cases must be an array of {input,expected_output,is_hidden}. Make outputs deterministic and ensure hidden cases cover edge cases.`;
  const response=await postJson(`${base}/chat/completions`,{model,temperature:0.3,messages:[{role:'system',content:'You generate reliable programming problems. Return strict JSON only.'},{role:'user',content:prompt}]},{Authorization:`Bearer ${key}`});
  const content=response.choices?.[0]?.message?.content;
  const data=extractJson(content);
  if(!data.title || !data.description || !Array.isArray(data.test_cases) || !data.test_cases.length) throw new Error('Generated question is incomplete');
  return data;
}
module.exports={generateQuestion};
