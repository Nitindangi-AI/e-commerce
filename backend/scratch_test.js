const { createClient } = require('@insforge/sdk');
const client = createClient({
  baseUrl: 'https://r7q99f5d.us-east.insforge.app',
  anonKey: 'ik_84619633df209ae1fafdaf404bfbd91a'
});

console.log('client.database.from is:', typeof client.database.from);
try {
  const query = client.database.from('profiles').select('*');
  console.log('query is defined:', typeof query.then === 'function' ? 'Promise/QueryBuilder' : 'other');
} catch (e) {
  console.error('Error calling client.database.from:', e);
}
