// analytics-dashboard.js
// Comprehensive analytics dashboard for LendWise GHL
// Reports on campaigns, engagement, contacts, and pipeline
//
// IMPORTANT: This is the canonical analytics script.
// When onboarding new LOs, copy this file and update LOCATION_ID.

const axios = require('axios');
const fs = require('fs/promises');
const path = require('path');

const API_KEY = process.env.GHL_API_KEY;
if (!API_KEY) {
  console.error('Missing env var GHL_API_KEY');
  process.exit(1);
}

// ============================================
// LOCATION CONFIG - UPDATE FOR EACH NEW LO
// ============================================
const LOCATION_ID = 'peE6XmGYBb1xV0iNbh6C';
// ============================================

const client = axios.create({
  baseURL: 'https://services.leadconnectorhq.com',
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    Version: '2021-07-28',
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Tag definitions for tracking
const ENGAGEMENT_TAGS = {
  sent: 'campaign.welcome_lendwise.sent',
  engaged: 'email.engaged',
  clicked: 'email.clicked',
  replied: 'email.replied',
  bounced: 'email.bounced',
  unclassified: 'contact.unclassified',
  reviewRequired: 'contact.review_required',
};

/**
 * Fetch ALL contacts from location using page-based pagination
 * GHL supports: ?page=1, ?page=2, etc.
 */
async function fetchAllContacts() {
  const allContacts = new Map(); // Use Map to dedupe by ID
  let page = 1;
  const limit = 100;
  let totalExpected = null;

  process.stdout.write('Fetching all contacts');

  while (page <= 100) { // Safety: max 100 pages = 10,000 contacts
    try {
      const params = { locationId: LOCATION_ID, limit, page };
      const res = await client.get('/contacts/', { params });
      const contacts = res.data.contacts || [];
      const meta = res.data.meta || {};

      // Store total from first request
      if (totalExpected === null && meta.total) {
        totalExpected = meta.total;
      }

      if (contacts.length === 0) {
        break;
      }

      // Add contacts to map (dedupes by ID)
      for (const c of contacts) {
        allContacts.set(c.id, c);
      }

      process.stdout.write('.');

      // If we got fewer than limit, we're done
      if (contacts.length < limit) {
        break;
      }

      // If we've got all expected contacts, we're done
      if (totalExpected && allContacts.size >= totalExpected) {
        break;
      }

      page++;
    } catch (err) {
      console.error('\nPagination error:', err.response?.data?.message || err.message);
      break;
    }
  }

  const contactArray = Array.from(allContacts.values());
  const totalStr = totalExpected ? `/${totalExpected}` : '';
  console.log(` ${contactArray.length}${totalStr} contacts loaded\n`);
  return contactArray;
}

/**
 * Fetch opportunities for a pipeline
 */
async function fetchOpportunities(pipelineId) {
  if (!pipelineId) return [];

  try {
    const res = await client.get('/opportunities/search', {
      params: {
        location_id: LOCATION_ID,
        pipeline_id: pipelineId,
      },
    });
    return res.data.opportunities || [];
  } catch (e) {
    console.log('Could not fetch opportunities:', e.response?.data?.message || e.message);
    return [];
  }
}

/**
 * Count contacts with a specific tag (case-insensitive)
 */
function contactsWithTag(contacts, tagName) {
  return contacts.filter(c => {
    const tags = (c.tags || []).map(t => t.toLowerCase());
    return tags.includes(tagName.toLowerCase());
  });
}

/**
 * Get custom field value from contact
 */
function getFieldValue(contact, fieldId) {
  const fields = contact.customFields || [];
  const field = fields.find(f => f.id === fieldId);
  return field?.value || null;
}

/**
 * Count contacts by custom field value
 */
function countByField(contacts, fieldId) {
  const counts = {};
  for (const c of contacts) {
    const value = getFieldValue(c, fieldId) || 'not_set';
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

/**
 * Print section header
 */
function printSection(title) {
  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('='.repeat(60));
}

/**
 * Print bar chart
 */
function printBar(label, count, total, width = 30) {
  const pct = total > 0 ? (count / total * 100).toFixed(1) : 0;
  const filled = Math.round((count / Math.max(total, 1)) * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  console.log(`  ${label.padEnd(22)} ${bar} ${count.toString().padStart(5)} (${pct}%)`);
}

/**
 * Main analytics function
 */
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║          LENDWISE GHL ANALYTICS DASHBOARD                ║');
  console.log(`║          Location: ${LOCATION_ID}                  ║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\nGenerated: ${new Date().toISOString()}\n`);

  // Load config for field IDs
  const cfgPath = path.join(__dirname, 'ghl-config.json');
  let cfg = {};
  try {
    cfg = JSON.parse(await fs.readFile(cfgPath, 'utf8'));
  } catch (e) {
    console.log('Warning: Could not load ghl-config.json, some metrics may be unavailable\n');
  }

  const contactTypeFieldId = cfg.customFields?.relationshipTypeId || cfg.customFields?.contact_type;
  const engagementStateFieldId = cfg.customFields?.engagement_state;
  const contactReviewPipelineId = cfg.contactReviewPipelineId || cfg.pipelines?.contactReview?.id;

  // Fetch all contacts
  const contacts = await fetchAllContacts();
  const totalContacts = contacts.length;

  // =========================================
  // SECTION 1: CAMPAIGN PERFORMANCE
  // =========================================
  printSection('CAMPAIGN: "I\'m at Lendwise" Welcome Email');

  // Get campaign recipients (contacts with sent tag)
  const campaignRecipients = contactsWithTag(contacts, ENGAGEMENT_TAGS.sent);
  const sent = campaignRecipients.length;

  // Count engagement ONLY among campaign recipients
  const recipientsEngaged = campaignRecipients.filter(c => {
    const tags = (c.tags || []).map(t => t.toLowerCase());
    return tags.includes(ENGAGEMENT_TAGS.engaged.toLowerCase());
  });

  const recipientsClicked = campaignRecipients.filter(c => {
    const tags = (c.tags || []).map(t => t.toLowerCase());
    return tags.includes(ENGAGEMENT_TAGS.clicked.toLowerCase());
  });

  const recipientsReplied = campaignRecipients.filter(c => {
    const tags = (c.tags || []).map(t => t.toLowerCase());
    return tags.includes(ENGAGEMENT_TAGS.replied.toLowerCase());
  });

  console.log(`\n  Campaign Funnel (of ${sent} recipients):\n`);
  printBar('Sent', sent, sent);
  printBar('Opened (engaged)', recipientsEngaged.length, sent);
  printBar('Clicked', recipientsClicked.length, sent);
  printBar('Replied', recipientsReplied.length, sent);

  // Show individual recipients (up to 10)
  if (campaignRecipients.length > 0) {
    console.log('\n  Recipients (showing up to 10):');
    const showRecipients = campaignRecipients.slice(0, 10);
    for (const c of showRecipients) {
      const tags = (c.tags || []).map(t => t.toLowerCase());
      const status = [];
      if (tags.includes(ENGAGEMENT_TAGS.engaged.toLowerCase())) status.push('opened');
      if (tags.includes(ENGAGEMENT_TAGS.clicked.toLowerCase())) status.push('clicked');
      if (tags.includes(ENGAGEMENT_TAGS.replied.toLowerCase())) status.push('replied');
      const email = c.email || '(no email)';
      console.log(`    ${email.padEnd(35)} ${status.length > 0 ? status.join(', ') : 'sent only'}`);
    }
    if (campaignRecipients.length > 10) {
      console.log(`    ... and ${campaignRecipients.length - 10} more`);
    }
  }

  // =========================================
  // SECTION 2: OVERALL ENGAGEMENT
  // =========================================
  printSection('OVERALL EMAIL ENGAGEMENT (all contacts)');

  const allEngaged = contactsWithTag(contacts, ENGAGEMENT_TAGS.engaged).length;
  const allClicked = contactsWithTag(contacts, ENGAGEMENT_TAGS.clicked).length;
  const allReplied = contactsWithTag(contacts, ENGAGEMENT_TAGS.replied).length;
  const allBounced = contactsWithTag(contacts, ENGAGEMENT_TAGS.bounced).length;

  console.log(`\n  Engagement Tags Across All ${totalContacts} Contacts:\n`);
  printBar('Ever opened email', allEngaged, totalContacts);
  printBar('Ever clicked link', allClicked, totalContacts);
  printBar('Ever replied', allReplied, totalContacts);
  printBar('Bounced (bad email)', allBounced, totalContacts);

  // =========================================
  // SECTION 3: EMAIL HEALTH
  // =========================================
  printSection('EMAIL HEALTH');

  const hasEmail = contacts.filter(c => c.email).length;
  const noEmail = totalContacts - hasEmail;

  console.log(`\n  Total contacts:       ${totalContacts}`);
  console.log(`  With email address:   ${hasEmail}`);
  console.log(`  Without email:        ${noEmail}`);
  console.log(`  Bounced (DND set):    ${allBounced}`);
  console.log(`  Healthy emails:       ${hasEmail - allBounced}`);

  if (allBounced > 0) {
    console.log(`\n  ⚠️  ${allBounced} contacts have bounced - they won't receive future emails`);
  }

  // =========================================
  // SECTION 4: CONTACT CLASSIFICATION
  // =========================================
  printSection('CONTACT CLASSIFICATION');

  if (contactTypeFieldId) {
    const byType = countByField(contacts, contactTypeFieldId);
    console.log('\n  By Relationship Type:\n');

    const sortedTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]);
    for (const [type, count] of sortedTypes) {
      printBar(type, count, totalContacts);
    }
  } else {
    console.log('\n  (Relationship Type field not configured)');
  }

  // Attention needed
  const unclassified = contactsWithTag(contacts, ENGAGEMENT_TAGS.unclassified).length;
  const reviewRequired = contactsWithTag(contacts, ENGAGEMENT_TAGS.reviewRequired).length;

  if (unclassified > 0 || reviewRequired > 0) {
    console.log('\n  ⚠️  Attention Required:');
    console.log(`      Unclassified contacts:  ${unclassified}`);
    console.log(`      Review required:        ${reviewRequired}`);
  }

  // =========================================
  // SECTION 5: ENGAGEMENT STATE
  // =========================================
  printSection('ENGAGEMENT STATE');

  if (engagementStateFieldId) {
    const byEngagement = countByField(contacts, engagementStateFieldId);
    console.log('\n  By Engagement State:\n');

    const sortedEngagement = Object.entries(byEngagement).sort((a, b) => b[1] - a[1]);
    for (const [state, count] of sortedEngagement) {
      printBar(state, count, totalContacts);
    }
  } else {
    console.log('\n  (engagement_state field not configured)');
  }

  // =========================================
  // SECTION 6: PIPELINE STATUS
  // =========================================
  printSection('PIPELINE: Contact Review');

  if (contactReviewPipelineId) {
    const opportunities = await fetchOpportunities(contactReviewPipelineId);
    console.log(`\n  Total opportunities: ${opportunities.length}\n`);

    if (opportunities.length > 0) {
      // Count by stage
      const byStage = {};
      for (const opp of opportunities) {
        const stageName = opp.pipelineStageName || opp.pipelineStageId || 'Unknown';
        byStage[stageName] = (byStage[stageName] || 0) + 1;
      }

      console.log('  By Stage:\n');
      for (const [stage, count] of Object.entries(byStage)) {
        // Try to show friendly name
        let displayName = stage;
        if (stage.includes('-')) {
          // It's a UUID, try to map it
          if (cfg.pipelines?.contactReview?.stages) {
            for (const [name, id] of Object.entries(cfg.pipelines.contactReview.stages)) {
              if (id === stage) {
                displayName = name;
                break;
              }
            }
          }
        }
        printBar(displayName, count, opportunities.length);
      }

      // Find stale opportunities
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const stale = opportunities.filter(o => {
        const created = new Date(o.createdAt || o.dateAdded);
        const stageLower = (o.pipelineStageName || '').toLowerCase();
        return stageLower.includes('unclassified') && created < threeDaysAgo;
      });

      if (stale.length > 0) {
        console.log(`\n  ⚠️  ${stale.length} opportunities stuck in Unclassified > 3 days`);
      }
    }
  } else {
    console.log('\n  (Contact Review pipeline not configured)');
  }

  // =========================================
  // SECTION 7: SUMMARY
  // =========================================
  printSection('SUMMARY');

  const openRate = sent > 0 ? (recipientsEngaged.length / sent * 100).toFixed(1) : 0;
  const clickRate = sent > 0 ? (recipientsClicked.length / sent * 100).toFixed(1) : 0;
  const replyRate = sent > 0 ? (recipientsReplied.length / sent * 100).toFixed(1) : 0;

  console.log('\n  Key Metrics:\n');
  console.log(`    Total contacts:              ${totalContacts}`);
  console.log(`    Welcome campaign sent:       ${sent}`);
  console.log(`    Campaign open rate:          ${openRate}%`);
  console.log(`    Campaign click rate:         ${clickRate}%`);
  console.log(`    Campaign reply rate:         ${replyRate}%`);
  console.log(`    Contacts needing review:     ${reviewRequired}`);
  console.log(`    Bad emails (bounced):        ${allBounced}`);

  // Health score (simple heuristic)
  let healthScore = 100;
  if (allBounced > totalContacts * 0.1) healthScore -= 20; // >10% bounce is bad
  if (reviewRequired > 50) healthScore -= 10;
  if (sent > 0 && recipientsEngaged.length / sent < 0.2) healthScore -= 15; // <20% open rate

  console.log(`\n    Overall Health Score:        ${healthScore}/100`);

  console.log('\n' + '='.repeat(60));
  console.log('END OF REPORT');
  console.log('='.repeat(60) + '\n');
}

main().catch(err => {
  console.error('Error:', err.response?.data || err.message);
  process.exit(1);
});
