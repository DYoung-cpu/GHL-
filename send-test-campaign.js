// send-test-campaign.js
// Send welcome campaign to all 3 test emails

const axios = require('axios');

const API_KEY = process.env.GHL_API_KEY;
const LOCATION_ID = 'peE6XmGYBb1xV0iNbh6C';

const client = axios.create({
  baseURL: 'https://services.leadconnectorhq.com',
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    Version: '2021-07-28',
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

const TEST_CONTACTS = [
  { email: 'dyoung@onenationhomeloans.com', id: 'fo4jp6Q9b1vjfKHkvgJ5' },
  { email: 'dyoung1946@gmail.com', id: 'OVpdTuyLzhRmkgoLUSX5' },
  { email: 'david@lendwisemtg.com', id: 'CqINVMQDLENPB9TBVXn3' },
];

const TRIGGER_TAG = 'send.campaign_welcome_lendwise';
const SENT_TAG = 'campaign.welcome_lendwise.sent';

async function main() {
  console.log('Sending welcome campaign to all test contacts...\n');

  for (const contact of TEST_CONTACTS) {
    console.log(`--- ${contact.email} ---`);

    // 1. Remove existing tags to allow re-send
    try {
      await client.delete(`/contacts/${contact.id}/tags`, {
        data: { tags: [SENT_TAG, TRIGGER_TAG] }
      });
      console.log('  Removed existing tags');
    } catch (e) {
      console.log('  (no tags to remove)');
    }

    // 2. Ensure DND is off
    await client.put(`/contacts/${contact.id}`, {
      dnd: false,
      dndSettings: {
        Email: { status: 'inactive' }
      }
    });
    console.log('  DND disabled');

    // 3. Add trigger tag
    await client.post(`/contacts/${contact.id}/tags`, {
      tags: [TRIGGER_TAG]
    });
    console.log('  Trigger tag added');
  }

  console.log('\nWaiting 30 seconds for workflows to execute...');
  await new Promise(r => setTimeout(r, 30000));

  // Check results
  console.log('\n--- RESULTS ---\n');

  for (const contact of TEST_CONTACTS) {
    const res = await client.get(`/contacts/${contact.id}`);
    const c = res.data.contact || res.data;
    const tags = c.tags || [];

    const hasSent = tags.some(t => t.toLowerCase() === SENT_TAG.toLowerCase());
    const hasTrigger = tags.some(t => t.toLowerCase() === TRIGGER_TAG.toLowerCase());

    const status = hasSent && !hasTrigger ? '✓ SENT' : '✗ FAILED';
    console.log(`${contact.email}: ${status}`);
    console.log(`  Tags: ${tags.join(', ')}`);
  }

  console.log('\n✓ Check your inboxes! Open, click links, and reply to test engagement tracking.');
}

main().catch(err => {
  console.error('Error:', err.response?.data || err.message);
});
