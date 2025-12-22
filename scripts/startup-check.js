#!/usr/bin/env node
/**
 * GHL Automation - Startup Health Check
 * Runs before Claude starts to load context and verify state
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://izcbxqaemlaabpmnqsmm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_PzYJhp2dizwuu6pShEhJng_z6FsVdeJ';

// Colors for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function header() {
  console.log('');
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║          GHL AUTOMATION - MISSION CONTROL                  ║', 'cyan');
  log('║          LendWise Mortgage CRM System                      ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('');
}

function supabaseQuery(table, select = '*', filters = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    url.searchParams.append('select', select);
    if (filters) url.searchParams.append('order', filters);

    const options = {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    };

    https.get(url.toString(), options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function checkSupabase() {
  log('📡 Connecting to Supabase...', 'dim');

  try {
    // Check features
    const features = await supabaseQuery('features', 'category,name,status,priority');
    const completed = features.filter(f => f.status === 'completed');
    const inProgress = features.filter(f => f.status === 'in_progress');
    const notStarted = features.filter(f => f.status === 'not_started');

    log('✓ Supabase connected', 'green');
    console.log('');

    // Show status summary
    log('═══ PROJECT STATUS ═══', 'bright');
    console.log('');

    log(`COMPLETED (${completed.length}):`, 'green');
    completed.forEach(f => console.log(`  ✓ ${f.name}`));

    console.log('');
    log(`IN PROGRESS (${inProgress.length}):`, 'yellow');
    inProgress.forEach(f => console.log(`  → ${f.name}`));

    console.log('');
    log(`NOT STARTED (${notStarted.length}):`, 'dim');
    // Show top 5 by priority
    const topPriority = notStarted.sort((a, b) => a.priority - b.priority).slice(0, 5);
    topPriority.forEach(f => console.log(`  ○ ${f.name} (P${f.priority})`));
    if (notStarted.length > 5) {
      console.log(`  ... and ${notStarted.length - 5} more`);
    }

    // Check workflows
    const workflows = await supabaseQuery('workflows', 'name,status,trigger_value');
    const publishedWf = workflows.filter(w => w.status === 'published');

    console.log('');
    log('═══ WORKFLOWS ═══', 'bright');
    console.log(`  Total in Supabase: ${workflows.length}`);
    console.log(`  Published: ${publishedWf.length}`);

    // Check Encompass mapping
    const mappings = await supabaseQuery('encompass_ghl_mapping', 'encompass_milestone,ghl_tag');
    console.log('');
    log('═══ ENCOMPASS INTEGRATION ═══', 'bright');
    console.log(`  Status mappings configured: ${mappings.length}`);

    return { features, workflows, mappings };

  } catch (err) {
    log('✗ Supabase connection failed: ' + err.message, 'red');
    return null;
  }
}

function checkLocalFiles() {
  log('═══ LOCAL FILES ═══', 'bright');

  const projectRoot = path.join(__dirname, '..');
  const requiredFiles = [
    { path: '.claude/project-memory.md', name: 'Project Memory' },
    { path: 'ghl-config.json', name: 'GHL Config' },
    { path: '.env', name: 'Environment Variables' },
    { path: 'analytics-dashboard.js', name: 'Analytics Dashboard' }
  ];

  let allGood = true;
  requiredFiles.forEach(file => {
    const fullPath = path.join(projectRoot, file.path);
    if (fs.existsSync(fullPath)) {
      log(`  ✓ ${file.name}`, 'green');
    } else {
      log(`  ✗ ${file.name} - MISSING`, 'red');
      allGood = false;
    }
  });

  return allGood;
}

function checkEnvVars() {
  log('═══ ENVIRONMENT ═══', 'bright');

  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    log('  ✗ .env file not found', 'red');
    return false;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const required = ['GHL_API_KEY', 'GHL_LOCATION_ID', 'SUPABASE_URL'];

  let allGood = true;
  required.forEach(key => {
    if (envContent.includes(key)) {
      log(`  ✓ ${key}`, 'green');
    } else {
      log(`  ✗ ${key} - MISSING`, 'red');
      allGood = false;
    }
  });

  return allGood;
}

function showMission() {
  console.log('');
  log('═══ MISSION ═══', 'bright');
  console.log('');
  console.log('  Client: David Young, LendWise Mortgage');
  console.log('  Platform: Go High Level (GHL)');
  console.log('  Location ID: peE6XmGYBb1xV0iNbh6C');
  console.log('');
  console.log('  OBJECTIVE: Build complete mortgage CRM automation');
  console.log('');
  console.log('  ACTIVE TASKS:');
  console.log('    → Email deliverability (waiting on Anthony for DNS)');
  console.log('    → Encompass API integration (need credentials)');
  console.log('');
  console.log('  RULES:');
  console.log('    1. IF YOU CAN DO IT, DO IT - never ask user to do automatable tasks');
  console.log('    2. Query Supabase for current state before making changes');
  console.log('    3. Update Supabase after completing features');
  console.log('    4. All workflows trigger via TAGS from Encompass');
  console.log('');
}

function writeSummaryForClaude(data) {
  // Write a summary file that Claude can quickly read
  const summaryPath = path.join(__dirname, '..', '.claude', 'startup-summary.json');

  const summary = {
    timestamp: new Date().toISOString(),
    features: {
      completed: data?.features?.filter(f => f.status === 'completed').map(f => f.name) || [],
      in_progress: data?.features?.filter(f => f.status === 'in_progress').map(f => f.name) || [],
      not_started_count: data?.features?.filter(f => f.status === 'not_started').length || 0
    },
    workflows: {
      total: data?.workflows?.length || 0,
      published: data?.workflows?.filter(w => w.status === 'published').length || 0
    },
    encompass_mappings: data?.mappings?.length || 0,
    client: {
      name: 'David Young',
      company: 'LendWise Mortgage',
      email: 'david@lendwisemtg.com'
    },
    ghl: {
      location_id: 'peE6XmGYBb1xV0iNbh6C',
      api_key: 'pit-7427e736-d68a-41d8-9e9b-4b824b996926'
    }
  };

  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  log('  ✓ Startup summary written for Claude', 'dim');
}

async function main() {
  header();

  // Run all checks
  const supabaseData = await checkSupabase();
  console.log('');

  checkLocalFiles();
  console.log('');

  checkEnvVars();

  showMission();

  if (supabaseData) {
    writeSummaryForClaude(supabaseData);
  }

  console.log('');
  log('═══════════════════════════════════════════════════════════════', 'cyan');
  log('  Starting Claude Code... Type /ghl for project context', 'cyan');
  log('═══════════════════════════════════════════════════════════════', 'cyan');
  console.log('');
}

main().catch(err => {
  log('Startup check failed: ' + err.message, 'red');
  process.exit(1);
});
