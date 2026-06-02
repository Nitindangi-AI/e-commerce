import { createClient } from '@insforge/sdk';

const VITE_INSFORGE_URL = 'https://r7q99f5d.us-east.insforge.app';
const VITE_INSFORGE_ANON_KEY = 'ik_84619633df209ae1fafdaf404bfbd91a';

const client = createClient({
  baseUrl: VITE_INSFORGE_URL,
  anonKey: VITE_INSFORGE_ANON_KEY,
});

const usersToUpdate = [
  { email: 'admin@trendy.com', phone: '+91 99999 00000' },
  { email: 'seller1@trendy.com', phone: '+91 98765 00001' },
  { email: 'seller2@trendy.com', phone: '+91 98765 00002' },
  { email: 'user1@trendy.com', phone: '+91 98765 00003' },
  { email: 'user2@trendy.com', phone: '+91 98765 00004' }
];

async function update() {
  console.log("🔄 Updating avatar_url to store email in profiles for existing users...");
  
  for (const u of usersToUpdate) {
    console.log(`Setting avatar_url = '${u.email}' for phone = '${u.phone}'...`);
    try {
      const { data, error } = await client.database
        .from('profiles')
        .update({ avatar_url: u.email })
        .eq('phone', u.phone)
        .select();

      if (error) {
        console.error(`❌ Failed to update ${u.email}:`, error.message);
      } else {
        console.log(`✅ Successfully updated ${u.email}!`, data);
      }
    } catch (err) {
      console.error(`💥 Error for ${u.email}:`, err);
    }
  }
  
  console.log("🎉 All profiles updated successfully!");
}

update();
