const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const API_KEY = 'pit-7427e736-d68a-41d8-9e9b-4b824b996926';
const LOCATION_ID = process.argv[2] || 'peE6XmGYBb1xV0iNbh6C';
const CONFIG_FILE = path.join(__dirname, 'ghl-config.json');

// Required schema
const CUSTOM_FIELDS = [
  {
    name: 'contact_type',
    dataType: 'TEXT',
    fieldType: 'SINGLE_OPTIONS',
    options: ['unclassified', 'contact_only', 'friend', 'past_client', 'referral_partner', 'warm_lead', 'marketing_lead'],
    placeholder: 'Select contact type'
  },
  {
    name: 'loan_state',
    dataType: 'TEXT',
    fieldType: 'SINGLE_OPTIONS',
    options: [
      'application_completed',
      'submitted_to_processing',
      'appraisal_ordered',
      'appraisal_received',
      'submitted_to_underwriting',
      'conditional_approval',
      'final_approval',
      'balancing_figures',
      'docs_sent_to_escrow',
      'scheduled_for_funding',
      'funded',
      'recorded',
      'post_close'
    ],
    placeholder: 'Select loan state'
  },
  {
    name: 'engagement_state',
    dataType: 'TEXT',
    fieldType: 'SINGLE_OPTIONS',
    options: ['none', 'introduced', 'active', 'dormant'],
    placeholder: 'Select engagement state'
  },
  {
    name: 'automation_paused',
    dataType: 'CHECKBOX',
    fieldType: 'CHECKBOX',
    options: ['Paused'],
    placeholder: ''
  }
];

const REQUIRED_TAGS = [
  'contact.unclassified',
  'contact.review_required'
];

const PIPELINE = {
  name: 'Contact Review',
  stages: ['Unclassified', 'Classified']
};

// API helper
function apiRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: endpoint,
      method: method,
      headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject({ statusCode: res.statusCode, body: json });
          }
        } catch (e) {
          reject({ statusCode: res.statusCode, body: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Load existing config
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (e) {}
  return {
    locationId: LOCATION_ID,
    customFields: {},
    tags: {},
    pipelines: {}
  };
}

// Save config
function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Get existing custom fields
async function getCustomFields() {
  const result = await apiRequest('GET', '/locations/' + LOCATION_ID + '/customFields');
  return result.customFields || [];
}

// Create custom field
async function createCustomField(field) {
  const payload = {
    name: field.name,
    dataType: field.dataType,
    model: 'contact'
  };

  // For dropdown fields only
  if (field.fieldType === 'SINGLE_OPTIONS' && field.options && field.options.length > 0) {
    payload.options = field.options;
  }

  // Placeholder only for non-checkbox
  if (field.placeholder && field.dataType !== 'CHECKBOX') {
    payload.placeholder = field.placeholder;
  }

  const result = await apiRequest('POST', '/locations/' + LOCATION_ID + '/customFields', payload);
  return result.customField || result;
}

// Get existing tags
async function getTags() {
  const result = await apiRequest('GET', '/locations/' + LOCATION_ID + '/tags');
  return result.tags || [];
}

// Create tag
async function createTag(name) {
  const result = await apiRequest('POST', '/locations/' + LOCATION_ID + '/tags', { name });
  return result.tag || result;
}

// Get existing pipelines
async function getPipelines() {
  const result = await apiRequest('GET', '/opportunities/pipelines?locationId=' + LOCATION_ID);
  return result.pipelines || [];
}

// Create pipeline
async function createPipeline(name) {
  const result = await apiRequest('POST', '/opportunities/pipelines', {
    locationId: LOCATION_ID,
    name: name,
    stages: PIPELINE.stages.map((stageName, index) => ({
      name: stageName,
      position: index
    }))
  });
  return result.pipeline || result;
}

// Main bootstrap function
async function bootstrap() {
  console.log('='.repeat(60));
  console.log('GHL BOOTSTRAP - Location: ' + LOCATION_ID);
  console.log('='.repeat(60));

  const config = loadConfig();
  config.locationId = LOCATION_ID;

  // 1. Custom Fields
  console.log('\n[1/3] CUSTOM FIELDS');
  console.log('-'.repeat(40));

  try {
    const existingFields = await getCustomFields();
    const fieldMap = {};
    existingFields.forEach(f => fieldMap[f.name.toLowerCase()] = f);

    for (const field of CUSTOM_FIELDS) {
      const existing = fieldMap[field.name.toLowerCase()];
      if (existing) {
        console.log('  ✓ ' + field.name + ' exists (ID: ' + existing.id + ')');
        config.customFields[field.name] = existing.id;
      } else {
        console.log('  + Creating ' + field.name + '...');
        const created = await createCustomField(field);
        console.log('    Created with ID: ' + created.id);
        config.customFields[field.name] = created.id;
      }
    }
  } catch (err) {
    console.log('  ERROR with custom fields:', err.body || err);
  }

  // 2. Tags
  console.log('\n[2/3] TAGS');
  console.log('-'.repeat(40));

  try {
    const existingTags = await getTags();
    const tagMap = {};
    existingTags.forEach(t => tagMap[t.name.toLowerCase()] = t);

    for (const tagName of REQUIRED_TAGS) {
      const existing = tagMap[tagName.toLowerCase()];
      if (existing) {
        console.log('  ✓ ' + tagName + ' exists (ID: ' + existing.id + ')');
        config.tags[tagName] = existing.id;
      } else {
        console.log('  + Creating ' + tagName + '...');
        const created = await createTag(tagName);
        console.log('    Created with ID: ' + created.id);
        config.tags[tagName] = created.id;
      }
    }
  } catch (err) {
    console.log('  ERROR with tags:', err.body || err);
  }

  // 3. Pipeline
  console.log('\n[3/3] PIPELINE');
  console.log('-'.repeat(40));

  try {
    const existingPipelines = await getPipelines();
    const contactReviewPipeline = existingPipelines.find(p => p.name.toLowerCase() === PIPELINE.name.toLowerCase());

    if (contactReviewPipeline) {
      console.log('  ✓ Pipeline "' + PIPELINE.name + '" exists (ID: ' + contactReviewPipeline.id + ')');
      config.pipelines.contactReview = {
        id: contactReviewPipeline.id,
        stages: {}
      };

      // Map stages
      if (contactReviewPipeline.stages) {
        contactReviewPipeline.stages.forEach(stage => {
          const key = stage.name.toLowerCase().replace(/\s+/g, '_');
          config.pipelines.contactReview.stages[key] = stage.id;
          console.log('    ✓ Stage "' + stage.name + '" (ID: ' + stage.id + ')');
        });
      }
    } else {
      console.log('  ⚠ Pipeline "' + PIPELINE.name + '" NOT FOUND');
      console.log('    → Create manually in GHL UI (API lacks permission)');
      console.log('    → Required stages: Unclassified, Classified');
    }

    // Store all existing pipelines for reference
    config.pipelines.existing = {};
    existingPipelines.forEach(p => {
      let key = p.name.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
      key = key.charAt(0).toLowerCase() + key.slice(1);
      config.pipelines.existing[key] = {
        id: p.id,
        name: p.name,
        stages: {}
      };
      if (p.stages) {
        p.stages.forEach(s => {
          config.pipelines.existing[key].stages[s.name] = s.id;
        });
      }
    });

    console.log('\n  Existing pipelines:');
    existingPipelines.forEach(p => {
      console.log('    - ' + p.name + ' (ID: ' + p.id + ')');
    });

  } catch (err) {
    console.log('  ERROR with pipeline:', err.body || err);
  }

  // Save config
  saveConfig(config);

  console.log('\n' + '='.repeat(60));
  console.log('BOOTSTRAP COMPLETE');
  console.log('='.repeat(60));
  console.log('\nConfig saved to: ' + CONFIG_FILE);
  console.log('\nStored IDs:');
  console.log(JSON.stringify(config, null, 2));
}

bootstrap().catch(err => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
