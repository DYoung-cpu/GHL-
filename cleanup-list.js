/**
 * Cleanup Workflows - Delete placeholders and duplicates via browser
 * API is READ-ONLY for workflows, must use browser automation
 */

const { chromium } = require('playwright');
const fs = require('fs');

const MISSION_CONTROL_ID = 'peE6XmGYBb1xV0iNbh6C';

// Workflows to DELETE - 12 total
const WORKFLOWS_TO_DELETE = [
  // Placeholders (all 7)
  { id: 'b2edc56a-4d7a-487c-9bf3-0fe5cae6a93e', name: 'New Workflow : 1765435815211' },
  { id: '4d94cc35-8b89-4058-bc82-b80b4928dbce', name: 'New Workflow : 1765635484587' },
  { id: '29621d34-278d-4f3b-b449-5ecd9dee8fe6', name: 'New Workflow : 1765641817788' },
  { id: '5efe42b4-d4f0-4e6e-b345-89bf5618a8e4', name: 'New Workflow : 1765643036246' },
  { id: '1e052f78-d2b7-4e2a-8f35-6287aa1844e3', name: 'New Workflow : 1765643457688' },
  { id: 'a325a89f-3418-4609-8c61-ada53a3ea9cb', name: 'New Workflow : 1765643778107' },
  { id: '6419cedb-7cdf-40aa-98ad-6abf8b796d44', name: 'New Workflow : 1765643868809' },
  // Duplicates (keep first of each, delete rest)
  { id: '96b27b4c-6122-4e96-b29a-f50ed7f77857', name: 'New Lead Nurture Sequence' },
  { id: 'e56ff667-a258-4259-a0b7-91fbdf5073d7', name: 'Pre-Qualification Process Workflow' },
  { id: 'daf68373-2a3b-42ac-b38b-363429af02ab', name: 'Stale Lead Re-engagement' },
  { id: '89d65c51-c967-4f50-a301-3e71675204a4', name: 'Stale Lead Re-engagement' },
  { id: '61949451-b740-4b48-8d35-2ec2fb514541', name: 'Underwriting Status Updates' },
];

console.log('Workflows to delete: ' + WORKFLOWS_TO_DELETE.length);
WORKFLOWS_TO_DELETE.forEach(w => console.log('  - ' + w.id + ': ' + w.name));
