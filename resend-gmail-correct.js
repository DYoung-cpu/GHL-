// resend-gmail-correct.js - Send to dyoung1946@gmail.com
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

const contactId = 'OVpdTuyLzhRmkgoLUSX5'; // dyoung1946@gmail.com

async function sendToExisting() {
  console.log('Sending to dyoung1946@gmail.com...\n');

  // 1. Check current state and ensure DND off
  console.log('1. Checking contact and disabling DND...');
  const check = await client.get(`/contacts/${contactId}`);
  const c = check.data.contact || check.data;
  console.log('   Email:', c.email);
  console.log('   Current DND:', c.dnd);

  await client.put(`/contacts/${contactId}`, {
    dnd: false,
    dndSettings: {
      Email: { status: 'inactive' }
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
    console.log('   (ok)');
  }

  await new Promise(r => setTimeout(r, 1000));

  // 3. Add trigger tag
  console.log('3. Adding trigger tag...');
  await client.post(`/contacts/${contactId}/tags`, {
    tags: ['send.campaign_welcome_lendwise']
  });
  console.log('   Trigger tag added');

  console.log('4. Waiting 25 seconds...');
  await new Promise(r => setTimeout(r, 25000));

  // 5. Verify
  console.log('5. Checking result...');
  const res = await client.get(`/contacts/${contactId}`);
  const updated = res.data.contact || res.data;
  console.log('   Tags:', updated.tags);

  const hasSent = (updated.tags || []).some(t => t.toLowerCase() === 'campaign.welcome_lendwise.sent');
  const hasTrigger = (updated.tags || []).some(t => t.toLowerCase() === 'send.campaign_welcome_lendwise');

  if (hasSent && !hasTrigger) {
    console.log('\n✓ Workflow executed - check dyoung1946@gmail.com inbox/spam');
  } else {
    console.log('\n✗ Check workflow - sentTag:', hasSent, 'triggerTag:', hasTrigger);
  }
}

sendToExisting().catch(e => console.error(e.response?.data || e.message));
