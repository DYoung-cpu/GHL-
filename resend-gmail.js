// resend-gmail.js - Resend welcome email to dyoung194@gmail.com
const axios = require('axios');

const client = axios.create({
  baseURL: 'https://services.leadconnectorhq.com',
  headers: {
    Authorization: 'Bearer ' + process.env.GHL_API_KEY,
    Version: '2021-07-28',
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

const contactId = 'aROFDQYx9Ys43KC0gedP'; // dyoung194@gmail.com

async function resend() {
  console.log('Resending to dyoung194@gmail.com...\n');

  // 1. Remove sent tag to allow re-send
  console.log('1. Removing existing tags...');
  try {
    await client.delete(`/contacts/${contactId}/tags`, {
      data: { tags: ['campaign.welcome_lendwise.sent', 'send.campaign_welcome_lendwise'] }
    });
    console.log('   Tags removed');
  } catch (e) {
    console.log('   (tags may not exist)');
  }

  // 2. Wait a moment
  await new Promise(r => setTimeout(r, 1000));

  // 3. Add trigger tag
  console.log('2. Adding trigger tag...');
  await client.post(`/contacts/${contactId}/tags`, {
    tags: ['send.campaign_welcome_lendwise']
  });
  console.log('   Trigger tag added');

  console.log('3. Waiting 25 seconds for workflow...');
  await new Promise(r => setTimeout(r, 25000));

  // 4. Check result
  console.log('4. Checking contact state...');
  const res = await client.get(`/contacts/${contactId}`);
  const contact = res.data.contact || res.data;
  const tags = contact.tags || [];

  console.log('   Current tags:', tags);

  const hasSent = tags.some(t => t.toLowerCase() === 'campaign.welcome_lendwise.sent');
  const hasTrigger = tags.some(t => t.toLowerCase() === 'send.campaign_welcome_lendwise');

  if (hasSent && !hasTrigger) {
    console.log('\n✓ Workflow executed - check Gmail inbox/spam for email');
  } else {
    console.log('\n✗ Workflow may not have run');
    console.log('  sentTag present:', hasSent);
    console.log('  triggerTag still there:', hasTrigger);
  }
}

resend().catch(err => {
  console.error('Error:', err.response?.data || err.message);
});
