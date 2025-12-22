#!/usr/bin/env node
/**
 * GHL Automation - Session Snapshot
 * Run this before ending a session to capture state
 * Usage: node scripts/save-session.js "Brief description of what was done"
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://izcbxqaemlaabpmnqsmm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_PzYJhp2dizwuu6pShEhJng_z6FsVdeJ';

const description = process.argv[2] || 'Session snapshot';

function supabaseInsert(table, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);

    const options = {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(url.toString(), options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data || '{}') });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function saveSnapshot() {
  const timestamp = new Date().toISOString();
  const snapshotDir = path.join(__dirname, '..', '.claude', 'snapshots');

  // Ensure snapshots directory exists
  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }

  // Read current startup summary if exists
  const summaryPath = path.join(__dirname, '..', '.claude', 'startup-summary.json');
  let currentState = {};
  if (fs.existsSync(summaryPath)) {
    currentState = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  }

  // Create snapshot object
  const snapshot = {
    timestamp,
    description,
    state: currentState,
    session_notes: process.argv[3] || null
  };

  // Save local snapshot file
  const snapshotFile = path.join(snapshotDir, `snapshot-${timestamp.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2));
  console.log(`✓ Local snapshot saved: ${snapshotFile}`);

  // Log to Supabase activity_log
  try {
    const result = await supabaseInsert('activity_log', {
      action_type: 'session_snapshot',
      entity_type: 'session',
      entity_name: description,
      details: snapshot,
      performed_by: 'claude'
    });

    if (result.status === 201) {
      console.log('✓ Snapshot logged to Supabase');
    } else {
      console.log('⚠ Supabase log failed:', result.status);
    }
  } catch (err) {
    console.log('⚠ Could not log to Supabase:', err.message);
  }

  console.log('\nSnapshot saved. Safe to end session.');
}

saveSnapshot().catch(err => {
  console.error('Snapshot failed:', err.message);
  process.exit(1);
});
