/**
 * GHL API Client for Lendwise Mortgage Automation
 * Uses Private Integration Token (API v2.0)
 */

require('dotenv').config();

const API_KEY = process.env.GHL_API_KEY;
const LOCATION_ID = process.env.GHL_LOCATION_ID;
const BASE_URL = process.env.GHL_API_BASE || 'https://services.leadconnectorhq.com';

class GHLClient {
  constructor() {
    this.apiKey = API_KEY;
    this.locationId = LOCATION_ID;
    this.baseUrl = BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Version': '2021-07-28',
      'Content-Type': 'application/json',
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error ${response.status}: ${error}`);
    }

    return response.json();
  }

  // ==================== TAGS ====================
  async getTags() {
    return this.request(`/locations/${this.locationId}/tags`);
  }

  async createTag(name) {
    return this.request(`/locations/${this.locationId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  }

  async deleteTag(tagId) {
    return this.request(`/locations/${this.locationId}/tags/${tagId}`, {
      method: 'DELETE'
    });
  }

  // ==================== CONTACTS ====================
  async getContacts(query = {}) {
    const params = new URLSearchParams({ locationId: this.locationId, ...query });
    return this.request(`/contacts/?${params}`);
  }

  async getContact(contactId) {
    return this.request(`/contacts/${contactId}`);
  }

  async createContact(contactData) {
    return this.request('/contacts/', {
      method: 'POST',
      body: JSON.stringify({ ...contactData, locationId: this.locationId })
    });
  }

  async updateContact(contactId, updates) {
    return this.request(`/contacts/${contactId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async addTagToContact(contactId, tagIds) {
    return this.request(`/contacts/${contactId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tags: tagIds })
    });
  }

  async removeTagFromContact(contactId, tagId) {
    return this.request(`/contacts/${contactId}/tags/${tagId}`, {
      method: 'DELETE'
    });
  }

  // ==================== WORKFLOWS ====================
  async getWorkflows() {
    return this.request(`/workflows/?locationId=${this.locationId}`);
  }

  // ==================== OPPORTUNITIES ====================
  async getOpportunities(pipelineId) {
    const params = new URLSearchParams({ locationId: this.locationId });
    if (pipelineId) params.append('pipelineId', pipelineId);
    return this.request(`/opportunities/search?${params}`, { method: 'POST', body: JSON.stringify({}) });
  }

  async createOpportunity(data) {
    return this.request('/opportunities/', {
      method: 'POST',
      body: JSON.stringify({ ...data, locationId: this.locationId })
    });
  }

  async updateOpportunityStage(opportunityId, stageId) {
    return this.request(`/opportunities/${opportunityId}`, {
      method: 'PUT',
      body: JSON.stringify({ stageId })
    });
  }

  // ==================== PIPELINES ====================
  async getPipelines() {
    return this.request(`/opportunities/pipelines?locationId=${this.locationId}`);
  }

  // ==================== CALENDARS ====================
  async getCalendars() {
    return this.request(`/calendars/?locationId=${this.locationId}`);
  }

  async getCalendarEvents(calendarId, startTime, endTime) {
    const params = new URLSearchParams({ startTime, endTime });
    return this.request(`/calendars/${calendarId}/events?${params}`);
  }

  // ==================== CONVERSATIONS ====================
  async getConversations(contactId) {
    return this.request(`/conversations/search?locationId=${this.locationId}&contactId=${contactId}`);
  }

  async sendSMS(contactId, message) {
    return this.request('/conversations/messages', {
      method: 'POST',
      body: JSON.stringify({
        type: 'SMS',
        contactId,
        message
      })
    });
  }

  async sendEmail(contactId, subject, body, html) {
    return this.request('/conversations/messages', {
      method: 'POST',
      body: JSON.stringify({
        type: 'Email',
        contactId,
        subject,
        body,
        html
      })
    });
  }

  // ==================== CUSTOM FIELDS ====================
  async getCustomFields() {
    return this.request(`/locations/${this.locationId}/customFields`);
  }

  // ==================== USERS ====================
  async getUsers() {
    return this.request(`/users/?locationId=${this.locationId}`);
  }
}

module.exports = GHLClient;

// If run directly, test the connection
if (require.main === module) {
  (async () => {
    console.log('Testing GHL API Connection...\n');

    const client = new GHLClient();

    try {
      // Test 1: Get Tags
      console.log('1. Fetching tags...');
      const tags = await client.getTags();
      console.log(`   Found ${tags.tags?.length || 0} tags`);
      if (tags.tags?.length > 0) {
        console.log('   Sample tags:', tags.tags.slice(0, 5).map(t => t.name).join(', '));
      }

      // Test 2: Get Workflows
      console.log('\n2. Fetching workflows...');
      const workflows = await client.getWorkflows();
      console.log(`   Found ${workflows.workflows?.length || 0} workflows`);
      if (workflows.workflows?.length > 0) {
        console.log('   Sample workflows:', workflows.workflows.slice(0, 5).map(w => w.name).join(', '));
      }

      // Test 3: Get Pipelines
      console.log('\n3. Fetching pipelines...');
      const pipelines = await client.getPipelines();
      console.log(`   Found ${pipelines.pipelines?.length || 0} pipelines`);
      if (pipelines.pipelines?.length > 0) {
        pipelines.pipelines.forEach(p => {
          console.log(`   - ${p.name}: ${p.stages?.length || 0} stages`);
        });
      }

      // Test 4: Get Custom Fields
      console.log('\n4. Fetching custom fields...');
      const fields = await client.getCustomFields();
      console.log(`   Found ${fields.customFields?.length || 0} custom fields`);

      // Test 5: Get Calendars
      console.log('\n5. Fetching calendars...');
      const calendars = await client.getCalendars();
      console.log(`   Found ${calendars.calendars?.length || 0} calendars`);

      console.log('\n✓ API Connection Successful!');
      console.log('  All endpoints responding correctly.\n');

    } catch (error) {
      console.error('\n✗ API Connection Failed!');
      console.error('  Error:', error.message);
      process.exit(1);
    }
  })();
}
