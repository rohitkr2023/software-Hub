const http = require('http');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('Starting full integration testing sequence...\n');

const baseUrl = 'http://localhost:3000';
const dbPath = path.join(__dirname, './database/database.sqlite');

// Helper to query sqlite directly for verification
function queryDb(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) return reject(err);
    });
    db.get(sql, params, (err, row) => {
      db.close();
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// HTTP request helper returning body & headers
function getUrl(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`${baseUrl}${urlPath}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', err => reject(err));
  });
}

async function runTests() {
  try {
    let passed = 0;
    let total = 0;

    // Test 1: Homepage loading and card check
    total++;
    console.log('Test 1: Querying index homepage...');
    const home = await getUrl('/');
    if (home.status === 200 && home.body.includes('WinRAR') && home.body.includes('Google Chrome') && home.body.includes('Visual Studio Code')) {
      passed++;
      console.log('✔ Pass: Index page loaded successfully and contains seeded items.\n');
    } else {
      console.error('✘ Fail: Index page validation failed.\n');
    }

    // Test 2: Search engine validation
    total++;
    console.log('Test 2: Querying search results for "Code"...');
    const search = await getUrl('/search?q=Code');
    if (search.status === 200 && search.body.includes('Visual Studio Code') && !search.body.includes('Mozilla Firefox')) {
      passed++;
      console.log('✔ Pass: Search returns relevant results only.\n');
    } else {
      console.error('✘ Fail: Search engine returned invalid results.\n');
    }

    // Test 3: Detail view and view counter check
    total++;
    console.log('Test 3: Checking details view & view count increment...');
    // Get view count before
    const softwareBefore = await queryDb('SELECT view_count FROM software WHERE slug = "visual-studio-code"');
    const beforeCount = softwareBefore.view_count;

    const detail = await getUrl('/software/visual-studio-code');
    const softwareAfter = await queryDb('SELECT view_count FROM software WHERE slug = "visual-studio-code"');
    const afterCount = softwareAfter.view_count;

    if (detail.status === 200 && detail.body.includes('Visual Studio Code') && afterCount === beforeCount + 1) {
      passed++;
      console.log(`✔ Pass: Details page active, view counter successfully incremented (${beforeCount} -> ${afterCount}).\n`);
    } else {
      console.error(`✘ Fail: Detail view check failed. Views: Before=${beforeCount}, After=${afterCount}.\n`);
    }

    // Test 4: Download loader page
    total++;
    console.log('Test 4: Checking download loading screen...');
    const downloadPage = await getUrl('/download/visual-studio-code');
    if (downloadPage.status === 200 && downloadPage.body.includes('Preparing your download') && downloadPage.body.includes('countdown')) {
      passed++;
      console.log('✔ Pass: Simulated download screen renders with countdown logic.\n');
    } else {
      console.error('✘ Fail: Download loading screen validation failed.\n');
    }

    // Test 5: Direct file streaming & download counter increment
    total++;
    console.log('Test 5: Validating direct download stream & analytics logging...');
    const statsBefore = await queryDb('SELECT download_count FROM software WHERE slug = "visual-studio-code"');
    const beforeDl = statsBefore.download_count;

    const fileStream = await getUrl('/download/visual-studio-code/file');
    const statsAfter = await queryDb('SELECT download_count FROM software WHERE slug = "visual-studio-code"');
    const afterDl = statsAfter.download_count;

    const logRow = await queryDb('SELECT COUNT(*) as count FROM download_logs WHERE software_id = (SELECT id FROM software WHERE slug = "visual-studio-code")');
    const logsCount = logRow.count;

    const hasAttachmentHeader = fileStream.headers['content-disposition'] && fileStream.headers['content-disposition'].includes('attachment');

    if (fileStream.status === 200 && hasAttachmentHeader && fileStream.body.includes('VSCodeUserSetup-x64.zip') && afterDl === beforeDl + 1 && logsCount > 0) {
      passed++;
      console.log(`✔ Pass: File stream sent as attachment, and download count updated successfully (${beforeDl} -> ${afterDl}). Log record created.\n`);
    } else {
      console.error(`✘ Fail: File download streaming verification failed. Content-Disposition: ${fileStream.headers['content-disposition']}, Downloads: Before=${beforeDl}, After=${afterDl}.\n`);
    }

    console.log(`====================================================`);
    console.log(`INTEGRATION TESTS SUMMARY: Passed ${passed}/${total} checks.`);
    console.log(`====================================================`);
    if (passed === total) {
      console.log('All functions verified working perfectly!');
      process.exit(0);
    } else {
      process.exit(1);
    }

  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
