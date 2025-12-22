/**
 * Real-Time Scenario Testing
 * Testing what we CAN and CAN'T do with the API
 */
require('dotenv').config();

const API_KEY = process.env.GHL_API_KEY;
const LOCATION_ID = process.env.GHL_LOCATION_ID;
const BASE_URL = 'https://services.leadconnectorhq.com';

async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Version': '2021-07-28',
      'Content-Type': 'application/json'
    }
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  REAL-TIME SCENARIO TESTING');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ============================================
  // SCENARIO 1: CREATE A CONTACT
  // ============================================
  console.log('SCENARIO 1: Create a new contact');
  console.log('─────────────────────────────────────────────────────────');

  const testContact = {
    firstName: 'Test',
    lastName: 'APIContact',
    email: 'test.api@example.com',
    phone: '+13105551234',
    locationId: LOCATION_ID,
    tags: ['new lead'],  // This should trigger the "New Lead" workflow!
    source: 'API Test'
  };

  console.log('Attempting to create:', JSON.stringify(testContact, null, 2));

  const createResult = await apiCall('/contacts/', 'POST', testContact);
  if (createResult.ok) {
    console.log('✓ SUCCESS! Contact created');
    console.log('  Contact ID:', createResult.data.contact?.id);
    console.log('  Full response:', JSON.stringify(createResult.data, null, 2));
  } else {
    console.log('✗ FAILED:', createResult.status);
    console.log('  Error:', JSON.stringify(createResult.data, null, 2));
  }

  // ============================================
  // SCENARIO 2: ADD TAG TO EXISTING CONTACT
  // ============================================
  console.log('\n\nSCENARIO 2: Add a tag to a contact (trigger workflow)');
  console.log('─────────────────────────────────────────────────────────');

  // First get an existing contact
  const contactsResult = await apiCall(`/contacts/?locationId=${LOCATION_ID}&limit=1`);
  if (contactsResult.ok && contactsResult.data.contacts?.length > 0) {
    const contactId = contactsResult.data.contacts[0].id;
    console.log('Found contact:', contactId);

    // Try to add a tag
    const tagResult = await apiCall(`/contacts/${contactId}/tags`, 'POST', {
      tags: ['application started']
    });

    if (tagResult.ok) {
      console.log('✓ SUCCESS! Tag added to contact');
      console.log('  This would trigger the "Application Process Updates" workflow!');
    } else {
      console.log('✗ FAILED:', tagResult.status);
      console.log('  Error:', JSON.stringify(tagResult.data, null, 2));
    }
  }

  // ============================================
  // SCENARIO 3: CREATE A USER
  // ============================================
  console.log('\n\nSCENARIO 3: Create a new user');
  console.log('─────────────────────────────────────────────────────────');

  const testUser = {
    firstName: 'Test',
    lastName: 'User',
    email: 'testuser@lendwisemtg.com',
    password: 'TestPassword123!',
    type: 'account',
    role: 'user',
    locationIds: [LOCATION_ID]
  };

  console.log('Attempting to create user:', testUser.email);

  const userResult = await apiCall('/users/', 'POST', testUser);
  if (userResult.ok) {
    console.log('✓ SUCCESS! User created');
    console.log('  User ID:', userResult.data.id);
  } else {
    console.log('✗ FAILED:', userResult.status);
    console.log('  Error:', JSON.stringify(userResult.data, null, 2));
  }

  // ============================================
  // SCENARIO 4: CREATE OPPORTUNITY IN PIPELINE
  // ============================================
  console.log('\n\nSCENARIO 4: Create an opportunity in pipeline');
  console.log('─────────────────────────────────────────────────────────');

  // Get pipeline and stage IDs
  const pipelineResult = await apiCall(`/opportunities/pipelines?locationId=${LOCATION_ID}`);
  if (pipelineResult.ok && pipelineResult.data.pipelines?.length > 0) {
    const pipeline = pipelineResult.data.pipelines[0];
    const firstStage = pipeline.stages?.[0];

    console.log('Pipeline:', pipeline.name);
    console.log('First stage:', firstStage?.name);

    if (firstStage && contactsResult.data.contacts?.[0]) {
      const oppData = {
        pipelineId: pipeline.id,
        pipelineStageId: firstStage.id,
        locationId: LOCATION_ID,
        contactId: contactsResult.data.contacts[0].id,
        name: 'Test Opportunity',
        monetaryValue: 350000,
        status: 'open'
      };

      const oppResult = await apiCall('/opportunities/', 'POST', oppData);
      if (oppResult.ok) {
        console.log('✓ SUCCESS! Opportunity created');
        console.log('  Opportunity ID:', oppResult.data.opportunity?.id);
      } else {
        console.log('✗ FAILED:', oppResult.status);
        console.log('  Error:', JSON.stringify(oppResult.data, null, 2));
      }
    }
  }

  // ============================================
  // SCENARIO 5: SEND SMS MESSAGE
  // ============================================
  console.log('\n\nSCENARIO 5: Send SMS message');
  console.log('─────────────────────────────────────────────────────────');

  if (contactsResult.data.contacts?.[0]) {
    const smsData = {
      type: 'SMS',
      contactId: contactsResult.data.contacts[0].id,
      message: 'Test message from API - this is a test!'
    };

    console.log('Attempting to send SMS to contact:', contactsResult.data.contacts[0].id);

    const smsResult = await apiCall('/conversations/messages', 'POST', smsData);
    if (smsResult.ok) {
      console.log('✓ SUCCESS! SMS queued for sending');
      console.log('  Message ID:', smsResult.data.messageId);
    } else {
      console.log('✗ FAILED:', smsResult.status);
      console.log('  Error:', JSON.stringify(smsResult.data, null, 2));
    }
  }

  // ============================================
  // SCENARIO 6: CREATE CALENDAR APPOINTMENT
  // ============================================
  console.log('\n\nSCENARIO 6: Create calendar appointment');
  console.log('─────────────────────────────────────────────────────────');

  const calendarResult = await apiCall(`/calendars/?locationId=${LOCATION_ID}`);
  if (calendarResult.ok && calendarResult.data.calendars?.length > 0) {
    const calendar = calendarResult.data.calendars[0];
    console.log('Calendar found:', calendar.name, '- ID:', calendar.id);

    // Create appointment
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const apptData = {
      calendarId: calendar.id,
      locationId: LOCATION_ID,
      contactId: contactsResult.data.contacts?.[0]?.id,
      startTime: tomorrow.toISOString(),
      endTime: new Date(tomorrow.getTime() + 30 * 60000).toISOString(),
      title: 'Test Appointment',
      appointmentStatus: 'confirmed'
    };

    const apptResult = await apiCall('/calendars/events/appointments', 'POST', apptData);
    if (apptResult.ok) {
      console.log('✓ SUCCESS! Appointment created');
      console.log('  Appointment ID:', apptResult.data.id);
    } else {
      console.log('✗ FAILED:', apptResult.status);
      console.log('  Error:', JSON.stringify(apptResult.data, null, 2));
    }
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('  TESTING COMPLETE');
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch(console.error);
