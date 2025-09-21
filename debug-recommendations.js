// Debug script to test recommendations API
// Run this with: node debug-recommendations.js

const API_BASE = process.env.API_URL || 'http://localhost:8080';

async function testRecommendationsAPI() {
  console.log('🔍 Testing Recommendations API...');
  console.log('API Base URL:', API_BASE);
  
  // You need to replace this token with a real one from your browser
  const token = 'YOUR_JWT_TOKEN_HERE';
  
  try {
    console.log('\n1. Testing backend connectivity...');
    const healthResponse = await fetch(`${API_BASE}/health`);
    console.log('Health check:', healthResponse.status, await healthResponse.text());
    
    console.log('\n2. Testing authentication...');
    const meResponse = await fetch(`${API_BASE}/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Auth check:', meResponse.status);
    if (!meResponse.ok) {
      console.log('Auth error:', await meResponse.text());
      return;
    }
    const user = await meResponse.json();
    console.log('User:', user);
    
    console.log('\n3. Testing user profile...');
    const profileResponse = await fetch(`${API_BASE}/me/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Profile check:', profileResponse.status);
    if (!profileResponse.ok) {
      console.log('Profile error:', await profileResponse.text());
    } else {
      const profile = await profileResponse.json();
      console.log('Profile:', profile);
    }
    
    console.log('\n4. Testing recommendations...');
    const recResponse = await fetch(`${API_BASE}/recommendations`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Recommendations status:', recResponse.status);
    const recText = await recResponse.text();
    console.log('Recommendations response:', recText);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testRecommendationsAPI();
