const http = require('http');

console.log('Starting AI Assistant integration checks...\n');

const baseUrl = 'http://localhost:3000';

// HTTP POST request helper for JSON endpoints
function postJson(urlPath, payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    });

    req.on('error', err => reject(err));
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  try {
    let passed = 0;
    let total = 0;

    // Test 1: Ask for file zip / decompression tools
    total++;
    console.log('Test 1: Asking AI for "unzip file"...');
    const resZip = await postJson('/api/assistant/chat', { message: 'I need to unzip a file, what software should I use?' });
    
    if (resZip.status === 200 && resZip.body.reply && (resZip.body.reply.includes('WinRAR') || resZip.body.reply.includes('7-Zip'))) {
      passed++;
      console.log('✔ Pass: AI correctly suggested compression utilities:\n' + resZip.body.reply + '\n');
    } else {
      console.error('✘ Fail: AI response was incorrect. Response:', resZip.status, resZip.body);
    }

    // Test 2: Ask for web browsing software
    total++;
    console.log('Test 2: Asking AI for "web browser"...');
    const resWeb = await postJson('/api/assistant/chat', { message: 'Can you recommend a fast web browser?' });
    
    if (resWeb.status === 200 && resWeb.body.reply && (resWeb.body.reply.includes('Google Chrome') || resWeb.body.reply.includes('Mozilla Firefox'))) {
      passed++;
      console.log('✔ Pass: AI correctly suggested web browsers:\n' + resWeb.body.reply + '\n');
    } else {
      console.error('✘ Fail: AI response was incorrect. Response:', resWeb.status, resWeb.body);
    }

    console.log(`====================================================`);
    console.log(`AI ASSISTANT TEST SUMMARY: Passed ${passed}/${total} checks.`);
    console.log(`====================================================`);
    if (passed === total) {
      console.log('AI Assistant operates perfectly!');
      process.exit(0);
    } else {
      process.exit(1);
    }

  } catch (err) {
    console.error('Test execution error:', err.message);
    console.log('Please ensure the application server is running on port 3000 before running tests.');
    process.exit(1);
  }
}

runTests();
