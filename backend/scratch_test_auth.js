const { createClient } = require('@insforge/sdk');
require('dotenv').config();

const client = createClient({
  baseUrl: process.env.INSFORGE_URL,
  anonKey: process.env.INSFORGE_ANON_KEY
});

async function run() {
  console.log('client.auth methods:', Object.keys(client.auth));
  
  // Log in to get a token
  const { data, error } = await client.auth.signInWithPassword({
    email: 'user1@trendy.com',
    password: 'user123'
  });
  
  if (error) {
    console.error('Login failed:', error);
    return;
  }
  
  console.log('Login success! data keys:', Object.keys(data));
  console.log('data:', JSON.stringify(data, null, 2));
  
  const token = data.accessToken;
  console.log('Setting access token...');
  client.setAccessToken(token);
  
  // Check getCurrentUser with no arguments
  console.log('client keys:', Object.keys(client));
  console.log('client prototype keys:', Object.keys(Object.getPrototypeOf(client)));
  console.log('client.setAccessToken:', client.setAccessToken ? client.setAccessToken.toString() : 'undefined');
  console.log('Calling client.auth.getCurrentUser()...');
  const res1 = await client.auth.getCurrentUser();
  console.log('res1:', JSON.stringify(res1, null, 2));

  // Check getCurrentUser with token argument
  console.log('Calling client.auth.getCurrentUser(token)...');
  const res2 = await client.auth.getCurrentUser(token);
  console.log('res2:', JSON.stringify(res2, null, 2));

  // Check getCurrentUser on a brand new client
  console.log('Creating a brand new client (isServerMode: true) and setting access token...');
  const newClient = createClient({
    baseUrl: process.env.INSFORGE_URL,
    anonKey: process.env.INSFORGE_ANON_KEY,
    isServerMode: true
  });
  newClient.setAccessToken(token);
  console.log('Calling newClient.auth.getCurrentUser()...');
  const res3 = await newClient.auth.getCurrentUser();
  console.log('res3:', JSON.stringify(res3, null, 2));
}

run();
