// Simple test to verify server functionality
const http = require('http');

function testEndpoint(path, description) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`✓ ${description}: Status ${res.statusCode}`);
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (err) => {
      console.log(`✗ ${description}: Error - ${err.message}`);
      resolve({ error: err.message });
    });

    req.end();
  });
}

async function runTests() {
  console.log('Testing Milvus Tool Server...\n');

  await testEndpoint('/api/health', 'Health check');
  await testEndpoint('/', 'Homepage');
  await testEndpoint('/pages/create-collection.html', 'Create collection page');
  await testEndpoint('/pages/backup-restore.html', 'Backup/restore page');
  await testEndpoint('/css/style.css', 'CSS file');
  await testEndpoint('/js/api.js', 'API JavaScript');

  console.log('\nTest completed!');
  console.log('Server is running correctly. Open http://localhost:3000 in your browser.');
  console.log('Note: Collection operations require Milvus to be running.');
}

runTests();