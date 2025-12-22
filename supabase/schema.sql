-- ============================================
-- LENDWISE GHL AUTOMATION - MASTER SCHEMA
-- System of Record for all automations built
-- ============================================

-- ============================================
-- CORE TABLES
-- ============================================

-- Locations (GHL sub-accounts / LOs)
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ghl_location_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    lo_name VARCHAR(255),
    lo_email VARCHAR(255),
    lo_phone VARCHAR(50),
    lo_nmls VARCHAR(50),
    api_key_encrypted TEXT,
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, onboarding
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WORKFLOW TRACKING
-- ============================================

-- Workflow Categories
CREATE TABLE workflow_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    sort_order INT DEFAULT 0
);

-- Insert default categories
INSERT INTO workflow_categories (name, description, sort_order) VALUES
('loan_status', 'Loan milestone updates from Encompass', 1),
('engagement_tracking', 'Email open/click/reply/bounce tracking', 2),
('lead_nurture', 'New lead follow-up sequences', 3),
('post_close', 'After funding nurture and referrals', 4),
('appointments', 'Booking, reminders, no-shows', 5),
('social_media', 'Social posting and engagement', 6),
('recruitment', 'LO recruitment campaigns', 7),
('product_alerts', 'Rate drops, new products, promotions', 8),
('partner_marketing', 'Realtor/referral partner campaigns', 9),
('compliance', 'Birthday, anniversary, required communications', 10);

-- Workflows Master Table
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES locations(id),
    ghl_workflow_id VARCHAR(255),
    category_id UUID REFERENCES workflow_categories(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(100), -- tag_added, appointment_booked, email_event, manual, etc.
    trigger_value VARCHAR(255), -- the specific tag name or event
    status VARCHAR(50) DEFAULT 'draft', -- draft, published, paused
    actions JSONB, -- array of actions: [{type, delay, template, etc}]
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TAGS TRACKING
-- ============================================

-- Tag Categories
CREATE TABLE tag_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

INSERT INTO tag_categories (name, description) VALUES
('loan_status', 'Loan pipeline stages'),
('engagement', 'Email engagement tracking'),
('lead_source', 'Where lead came from'),
('contact_type', 'Classification of contact'),
('automation_trigger', 'Tags that trigger workflows'),
('product_interest', 'Loan products interested in'),
('compliance', 'DNC, unsubscribed, etc.');

-- Tags Master Table
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES locations(id),
    ghl_tag_id VARCHAR(255),
    category_id UUID REFERENCES tag_categories(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    triggers_workflow BOOLEAN DEFAULT FALSE,
    workflow_id UUID REFERENCES workflows(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TEMPLATES TRACKING
-- ============================================

-- Template Types
CREATE TYPE template_type AS ENUM ('email', 'sms', 'voicemail', 'script');

-- Templates Master Table
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES locations(id),
    ghl_snippet_id VARCHAR(255),
    type template_type NOT NULL,
    category VARCHAR(100), -- loan_status, nurture, appointment, etc.
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500), -- for emails
    body TEXT,
    variables_used TEXT[], -- {{contact.first_name}}, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INTEGRATION MAPPINGS
-- ============================================

-- Encompass to GHL Status Mapping
CREATE TABLE encompass_ghl_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encompass_milestone VARCHAR(255) NOT NULL,
    encompass_field VARCHAR(255), -- the Encompass field name
    ghl_tag VARCHAR(255) NOT NULL,
    ghl_workflow_name VARCHAR(255),
    description TEXT,
    sort_order INT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert loan status mappings
INSERT INTO encompass_ghl_mapping (encompass_milestone, ghl_tag, ghl_workflow_name, sort_order) VALUES
('Application Received', 'Application Started', 'loan-status-workflow-1-application-completed', 1),
('Sent to Processing', 'In Processing', 'loan-status-workflow-2-sent-to-processing', 2),
('Submitted to Underwriting', 'In Underwriting', 'loan-status-workflow-3-submitted-to-underwriting', 3),
('Conditional Approval', 'Conditionally Approved', 'loan-status-workflow-4-conditional-approval', 4),
('Loan Approved', 'Loan Approved', 'loan-status-workflow-5-loan-approved', 5),
('Clear to Close', 'Clear to Close', 'loan-status-workflow-6-clear-to-close', 6),
('Docs Out', 'Final Docs Ready', 'loan-status-workflow-7-final-docs-ready', 7),
('Funded', 'Closed', 'loan-status-workflow-8-funded', 8);

-- ============================================
-- CUSTOM FIELDS TRACKING
-- ============================================

CREATE TABLE custom_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES locations(id),
    ghl_field_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    field_key VARCHAR(255), -- the key used in merge fields
    field_type VARCHAR(50), -- text, dropdown, date, checkbox, etc.
    options JSONB, -- for dropdowns
    default_value VARCHAR(255),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PIPELINES TRACKING
-- ============================================

CREATE TABLE pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES locations(id),
    ghl_pipeline_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    stages JSONB, -- [{name, ghl_stage_id, sort_order}]
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FEATURE ROADMAP / BUILD STATUS
-- ============================================

CREATE TYPE feature_status AS ENUM ('not_started', 'in_progress', 'completed', 'blocked');

CREATE TABLE features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status feature_status DEFAULT 'not_started',
    priority INT DEFAULT 5, -- 1 = highest
    dependencies TEXT[], -- other feature names this depends on
    notes TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert current feature status
INSERT INTO features (category, name, description, status, priority) VALUES
-- COMPLETED
('loan_status', 'Loan Status Workflows', '8 workflows for loan milestone updates', 'completed', 1),
('engagement_tracking', 'Email Engagement Tracking', '4 universal workflows for open/click/reply/bounce', 'completed', 1),
('analytics', 'Analytics Dashboard', 'Contact and campaign reporting script', 'completed', 2),
('infrastructure', 'Email Deliverability', 'mail.lendwisemtg.com subdomain setup', 'in_progress', 1),
('templates', 'Email Templates Import', '93 snippets + 17 Mission Control templates', 'completed', 2),
('contacts', 'Past Client Import', '878 contacts imported via API', 'completed', 2),

-- NOT STARTED
('social_media', 'Social Media Posting', 'Automated social posts for listings, tips, market updates', 'not_started', 3),
('social_media', 'Social Media Engagement', 'Auto-respond to comments, DMs', 'not_started', 4),
('recruitment', 'LO Recruitment Campaign', 'Nurture sequence for recruiting loan officers', 'not_started', 5),
('recruitment', 'LO Onboarding Automation', 'Automated setup for new LOs joining', 'not_started', 5),
('product_alerts', 'Rate Drop Alerts', 'Notify contacts when rates drop', 'not_started', 3),
('product_alerts', 'New Product Announcements', 'Announce new loan products', 'not_started', 4),
('product_alerts', 'HELOC Campaigns', 'Target past clients for HELOC', 'not_started', 3),
('partner_marketing', 'Realtor Partner Portal', 'Co-branded marketing for realtors', 'not_started', 4),
('partner_marketing', 'Referral Partner Nurture', 'Keep referral partners engaged', 'not_started', 4),
('compliance', 'Birthday Automation', 'Auto birthday wishes', 'not_started', 5),
('compliance', 'Home Anniversary', 'Annual home purchase anniversary', 'not_started', 5),
('lead_nurture', 'Purchase Lead Sequence', '5-step nurture for buyers', 'not_started', 2),
('lead_nurture', 'Refinance Lead Sequence', '5-step nurture for refi leads', 'not_started', 2),
('appointments', 'Appointment Reminders', 'Booking confirmations and reminders', 'not_started', 3),
('appointments', 'No-Show Follow-up', 'Re-engage missed appointments', 'not_started', 3),
('integrations', 'Encompass API Integration', 'Direct connection to Encompass', 'not_started', 1),
('integrations', 'Zapier Backup', 'Zapier as fallback for Encompass', 'not_started', 2);

-- ============================================
-- ACTIVITY LOG
-- ============================================

CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES locations(id),
    action_type VARCHAR(100) NOT NULL, -- workflow_created, template_imported, contact_synced, etc.
    entity_type VARCHAR(100), -- workflow, template, contact, etc.
    entity_id VARCHAR(255),
    entity_name VARCHAR(255),
    details JSONB,
    performed_by VARCHAR(255) DEFAULT 'claude',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONTACT SYNC (for Encompass integration)
-- ============================================

CREATE TABLE contact_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES locations(id),
    ghl_contact_id VARCHAR(255) NOT NULL,
    encompass_loan_id VARCHAR(255),
    borrower_email VARCHAR(255),
    borrower_name VARCHAR(255),
    current_loan_status VARCHAR(100),
    last_synced_at TIMESTAMPTZ,
    sync_history JSONB, -- [{status, timestamp, triggered_workflow}]
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_contact_sync_encompass ON contact_sync(encompass_loan_id);
CREATE INDEX idx_contact_sync_ghl ON contact_sync(ghl_contact_id);
CREATE INDEX idx_contact_sync_email ON contact_sync(borrower_email);

-- ============================================
-- VIEWS FOR EASY QUERYING
-- ============================================

-- View: All workflows with their triggers
CREATE VIEW v_workflows_with_triggers AS
SELECT
    w.name as workflow_name,
    w.status,
    wc.name as category,
    w.trigger_type,
    w.trigger_value as trigger_tag,
    w.description
FROM workflows w
LEFT JOIN workflow_categories wc ON w.category_id = wc.id
ORDER BY wc.sort_order, w.name;

-- View: Feature status summary
CREATE VIEW v_feature_status AS
SELECT
    category,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
    COUNT(*) FILTER (WHERE status = 'not_started') as not_started,
    COUNT(*) as total
FROM features
GROUP BY category
ORDER BY category;

-- View: What's next to build
CREATE VIEW v_next_to_build AS
SELECT category, name, description, priority
FROM features
WHERE status = 'not_started'
ORDER BY priority, category, name;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
    p_location_id UUID,
    p_action_type VARCHAR,
    p_entity_type VARCHAR,
    p_entity_id VARCHAR,
    p_entity_name VARCHAR,
    p_details JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO activity_log (location_id, action_type, entity_type, entity_id, entity_name, details)
    VALUES (p_location_id, p_action_type, p_entity_type, p_entity_id, p_entity_name, p_details)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update feature status
CREATE OR REPLACE FUNCTION update_feature_status(
    p_feature_name VARCHAR,
    p_status feature_status,
    p_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE features
    SET
        status = p_status,
        notes = COALESCE(p_notes, notes),
        completed_at = CASE WHEN p_status = 'completed' THEN NOW() ELSE completed_at END,
        updated_at = NOW()
    WHERE name = p_feature_name;
END;
$$ LANGUAGE plpgsql;
