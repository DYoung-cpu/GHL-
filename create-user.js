/**
 * GHL User Creation Script
 *
 * Usage:
 *   node create-user.js "John" "Doe" "john@email.com" "+15551234567"
 *   node create-user.js --file users.csv
 *
 * Creates a user in the LENDWISE MORTGAGE sub-account with standard permissions
 */

require('dotenv').config();
const https = require('https');
const fs = require('fs');

const AGENCY_API_KEY = process.env.GHL_AGENCY_API_KEY;
const COMPANY_ID = process.env.GHL_COMPANY_ID;
const LOCATION_ID = process.env.GHL_LOCATION_ID;
const API_BASE = 'services.leadconnectorhq.com';

function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_BASE,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${AGENCY_API_KEY}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function createUser(firstName, lastName, email, phone, options = {}) {
  const userData = {
    companyId: COMPANY_ID,
    firstName: firstName,
    lastName: lastName,
    email: email,
    phone: phone,
    type: options.type || 'account',
    role: options.role || 'user',
    locationIds: options.locationIds || [LOCATION_ID],
    permissions: options.permissions || {
      campaignsEnabled: true,
      campaignsReadOnly: false,
      contactsEnabled: true,
      workflowsEnabled: true,
      workflowsReadOnly: true,
      triggersEnabled: true,
      funnelsEnabled: true,
      websitesEnabled: true,
      opportunitiesEnabled: true,
      dashboardStatsEnabled: true,
      bulkActionsEnabled: true,
      appointmentsEnabled: true,
      reviewsEnabled: true,
      onlineListingsEnabled: true,
      phoneCallEnabled: true,
      conversationsEnabled: true,
      assignedDataOnly: false,
      adwordsReportingEnabled: true,
      membershipEnabled: true,
      facebookAdsReportingEnabled: true,
      attributionsReportingEnabled: true,
      settingsEnabled: true,
      tagsEnabled: true,
      leadValueEnabled: true,
      marketingEnabled: true,
      agentReportingEnabled: true,
      botService: true,
      socialPlanner: true,
      bloggingEnabled: true,
      invoiceEnabled: true,
      affiliateManagerEnabled: true,
      contentAiEnabled: true,
      refundsEnabled: true,
      recordPaymentEnabled: true,
      cancelSubscriptionEnabled: true,
      paymentsEnabled: true,
      communitiesEnabled: true,
      exportPaymentsEnabled: true
    }
  };

  console.log(`Creating user: ${firstName} ${lastName} (${email})`);

  const result = await apiRequest('POST', '/users/', userData);

  if (result.status === 200 || result.status === 201) {
    console.log(`  SUCCESS: User created with ID: ${result.data.id || result.data.userId}`);
    return { success: true, userId: result.data.id || result.data.userId, data: result.data };
  } else {
    console.log(`  FAILED: ${result.status}`);
    console.log(`  Error: ${JSON.stringify(result.data)}`);
    return { success: false, error: result.data };
  }
}

async function createUsersFromCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  // Skip header if present
  const startIndex = lines[0].toLowerCase().includes('firstname') ? 1 : 0;

  const results = [];

  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim().replace(/"/g, ''));
    if (parts.length >= 4) {
      const [firstName, lastName, email, phone] = parts;
      const result = await createUser(firstName, lastName, email, phone);
      results.push({ ...result, user: { firstName, lastName, email, phone } });

      // Small delay between API calls
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
GHL User Creation Script
========================

Usage:
  Single user:  node create-user.js "John" "Doe" "john@email.com" "+15551234567"
  From CSV:     node create-user.js --file users.csv

CSV Format:
  FirstName,LastName,Email,Phone
  John,Doe,john@example.com,+15551234567
  Jane,Smith,jane@example.com,+15559876543

Environment Variables Required:
  GHL_AGENCY_API_KEY - Agency-level API key
  GHL_COMPANY_ID     - Company ID (${COMPANY_ID || 'NOT SET'})
  GHL_LOCATION_ID    - Location ID (${LOCATION_ID || 'NOT SET'})
`);
    return;
  }

  if (args[0] === '--file' && args[1]) {
    console.log(`\nCreating users from CSV: ${args[1]}\n`);
    const results = await createUsersFromCSV(args[1]);

    console.log('\n=== SUMMARY ===');
    const success = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`Created: ${success}`);
    console.log(`Failed: ${failed}`);

    if (failed > 0) {
      console.log('\nFailed users:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.user.email}: ${JSON.stringify(r.error)}`);
      });
    }
  } else if (args.length >= 4) {
    const [firstName, lastName, email, phone] = args;
    await createUser(firstName, lastName, email, phone);
  } else {
    console.log('Invalid arguments. Run without arguments for usage info.');
  }
}

main().catch(console.error);
