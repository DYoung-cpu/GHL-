// resend-onenation.js - Turn off DND and resend to dyoung@onenationhomeloans.com
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

const contactId = 'fo4jp6Q9b1vjfKHkvgJ5'; // dyoung@onenationhomeloans.com

async function resend() {
  console.log('Resending to dyoung@onenationhomeloans.com...\n');

  // 1. Turn OFF DND
  console.log('1. Turning OFF email DND...');
  await client.put(`/contacts/${contactId}`, {
    dnd: false,
    dndSettings: {
      Email: { status: 'inactive' },
      SMS: { status: 'inactive' },
      Call: { status: 'inactive' },
    }
  });
  console.log('   DND disabled');

  // 2. Remove existing tags
  console.log('2. Removing existing tags...');
  try {
    await client.delete(`/contacts/${contactId}/tags`, {
      data: { tags: ['campaign.welcome_lendwise.sent', 'send.campaign_welcome_lendwise'] }
    });
    console.log('   Tags removed');
  } catch (e) {
    console.log('   (tags may not exist)');
  }

  // 3. Wait a moment
  await new Promise(r => setTimeout(r, 1000));

  // 4. Add trigger tag
  console.log('3. Adding trigger tag...');
  await client.post(`/contacts/${contactId}/tags`, {
    tags: ['send.campaign_welcome_lendwise']
  });
  console.log('   Trigger tag added');

  console.log('4. Waiting 25 seconds for workflow...');
  await new Promise(r => setTimeout(r, 25000));

  // 5. Check result
  console.log('5. Checking contact state...');
  const res = await client.get(`/contacts/${contactId}`);
  const contact = res.data.contact || res.data;
  const tags = contact.tags || [];

  console.log('   Current tags:', tags);
  console.log('   DND:', contact.dnd);
  console.log('   DND Settings:', JSON.stringify(contact.dndSettings));

  const hasSent = tags.some(t => t.toLowerCase() === 'campaign.welcome_lendwise.sent');
  const hasTrigger = tags.some(t => t.toLowerCase() === 'send.campaign_welcome_lendwise');

  if (hasSent && !hasTrigger) {
    console.log('\n✓ Workflow executed - check dyoung@onenationhomeloans.com inbox');
  } else {
    console.log('\n✗ Workflow may not have run');
    console.log('  sentTag present:', hasSent);
    console.log('  triggerTag still there:', hasTrigger);
  }
}

resend().catch(err => {
  console.error('Error:', err.response?.data || err.message);
});
