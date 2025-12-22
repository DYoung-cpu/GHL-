/**
 * Check workflow status and triggers
 */
require('dotenv').config();
const GHLClient = require('./ghl-api');

(async () => {
  const client = new GHLClient();

  console.log('=== GHL Workflow Status ===\n');

  // Get workflows
  const { workflows } = await client.getWorkflows();

  console.log(`Total Workflows: ${workflows.length}\n`);

  workflows.forEach((wf, i) => {
    console.log(`${i + 1}. ${wf.name}`);
    console.log(`   ID: ${wf.id}`);
    console.log(`   Status: ${wf.status || 'unknown'}`);
    console.log(`   Version: ${wf.version || 'N/A'}`);
    console.log('');
  });

  // Get tags
  console.log('\n=== GHL Tags ===\n');
  const { tags } = await client.getTags();

  // Group by type
  const automationTags = tags.filter(t =>
    ['New Lead', 'Pre-Qual Started', 'Pre-Qual Complete', 'Application Started',
     'In Underwriting', 'Conditionally Approved', 'Clear to Close', 'Closing Scheduled',
     'Closed', 'Realtor Referral', 'Appointment Scheduled', 'Do Not Contact',
     'Long-Term Nurture', 'Documents Received', 'Past Client', 'Cold Lead'].some(
      name => t.name.toLowerCase() === name.toLowerCase()
    )
  );

  console.log(`Automation Trigger Tags (${automationTags.length}):`);
  automationTags.forEach(t => console.log(`  - ${t.name} (${t.id})`));

  console.log(`\nOther Tags (${tags.length - automationTags.length}):`);
  tags.filter(t => !automationTags.includes(t)).forEach(t => console.log(`  - ${t.name}`));

})();
