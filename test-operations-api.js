// test-operations-api.js
// Simple script to test Operations API connectivity

const OP_API_BUSTRIP_URL = 'https://boms-api.agilabuscorp.me/api/Bus-Trips-Details';

async function testOperationsAPI() {
  console.log('Testing Operations API connectivity...');
  console.log('URL:', OP_API_BUSTRIP_URL);
  
  const startTime = Date.now();
  
  try {
    // Test 1: Basic connectivity
    console.log('\n1. Testing basic connectivity...');
    const response = await fetch(`${OP_API_BUSTRIP_URL}?RequestType=revenue`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FTMS-Test/1.0',
      },
    });
    
    const responseTime = Date.now() - startTime;
    console.log(`Response status: ${response.status}`);
    console.log(`Response time: ${responseTime}ms`);
    
    if (!response.ok) {
      console.error(`HTTP Error: ${response.status} ${response.statusText}`);
      return;
    }
    
    // Test 2: Parse response
    console.log('\n2. Testing response parsing...');
    const data = await response.json();
    
    if (Array.isArray(data)) {
      console.log(`✅ Success! Received ${data.length} assignments`);
      if (data.length > 0) {
        console.log('Sample assignment:', JSON.stringify(data[0], null, 2));
      }
    } else {
      console.log('❌ Response is not an array:', typeof data);
      console.log('Response:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ Error after ${responseTime}ms:`, error.message);
    
    if (error.code === 'UND_ERR_CONNECT_TIMEOUT') {
      console.error('This is a connection timeout error. Possible causes:');
      console.error('- The API server is down or unreachable');
      console.error('- Network connectivity issues');
      console.error('- Firewall blocking the connection');
      console.error('- DNS resolution issues');
    }
  }
}

// Run the test
testOperationsAPI(); 