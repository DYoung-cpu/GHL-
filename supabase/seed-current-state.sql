-- ============================================
-- SEED DATA: Current State as of Dec 21, 2025
-- ============================================

-- Insert LendWise location
INSERT INTO locations (ghl_location_id, name, lo_name, lo_email, lo_phone, lo_nmls, status)
VALUES (
    'peE6XmGYBb1xV0iNbh6C',
    'LENDWISE MORTGAGE',
    'David Young',
    'david@lendwisemtg.com',
    '310-954-7772',
    '62043',
    'active'
);

-- Get location ID for foreign keys
DO $$
DECLARE
    v_location_id UUID;
    v_loan_status_cat UUID;
    v_engagement_cat UUID;
BEGIN
    SELECT id INTO v_location_id FROM locations WHERE ghl_location_id = 'peE6XmGYBb1xV0iNbh6C';
    SELECT id INTO v_loan_status_cat FROM workflow_categories WHERE name = 'loan_status';
    SELECT id INTO v_engagement_cat FROM workflow_categories WHERE name = 'engagement_tracking';

    -- Insert Loan Status Workflows
    INSERT INTO workflows (location_id, category_id, name, trigger_type, trigger_value, status, actions) VALUES
    (v_location_id, v_loan_status_cat, 'loan-status-workflow-1-application-completed', 'tag_added', 'Application Started', 'published',
     '[{"order":1,"type":"send_email","subject":"Your Application is Complete!"},{"order":2,"type":"wait","delay":"5 min"},{"order":3,"type":"send_sms"}]'::jsonb),
    (v_location_id, v_loan_status_cat, 'loan-status-workflow-2-sent-to-processing', 'tag_added', 'In Processing', 'published',
     '[{"order":1,"type":"send_email","subject":"Loan Update: Sent to Processing"},{"order":2,"type":"wait","delay":"5 min"},{"order":3,"type":"send_sms"}]'::jsonb),
    (v_location_id, v_loan_status_cat, 'loan-status-workflow-3-submitted-to-underwriting', 'tag_added', 'In Underwriting', 'published',
     '[{"order":1,"type":"send_email","subject":"Loan Update: Submitted to Underwriting"},{"order":2,"type":"wait","delay":"5 min"},{"order":3,"type":"send_sms"}]'::jsonb),
    (v_location_id, v_loan_status_cat, 'loan-status-workflow-4-conditional-approval', 'tag_added', 'Conditionally Approved', 'published',
     '[{"order":1,"type":"send_sms"},{"order":2,"type":"wait","delay":"2 min"},{"order":3,"type":"send_email","subject":"Great News: Conditional Approval!"}]'::jsonb),
    (v_location_id, v_loan_status_cat, 'loan-status-workflow-5-loan-approved', 'tag_added', 'Loan Approved', 'published',
     '[{"order":1,"type":"send_sms"},{"order":2,"type":"wait","delay":"2 min"},{"order":3,"type":"send_email","subject":"CONGRATULATIONS! Your Loan is FULLY APPROVED!"}]'::jsonb),
    (v_location_id, v_loan_status_cat, 'loan-status-workflow-6-clear-to-close', 'tag_added', 'Clear to Close', 'published',
     '[{"order":1,"type":"send_sms"},{"order":2,"type":"wait","delay":"2 min"},{"order":3,"type":"send_email","subject":"CLEAR TO CLOSE! You'\''re Almost Home!"}]'::jsonb),
    (v_location_id, v_loan_status_cat, 'loan-status-workflow-7-final-docs-ready', 'tag_added', 'Final Docs Ready', 'published',
     '[{"order":1,"type":"send_sms"},{"order":2,"type":"wait","delay":"2 min"},{"order":3,"type":"send_email","subject":"Final Documents Ready - Closing Day Approaching!"}]'::jsonb),
    (v_location_id, v_loan_status_cat, 'loan-status-workflow-8-funded', 'tag_added', 'Closed', 'published',
     '[{"order":1,"type":"send_sms"},{"order":2,"type":"wait","delay":"1 hour"},{"order":3,"type":"send_email","subject":"CONGRATULATIONS HOMEOWNER!"},{"order":4,"type":"wait","delay":"3 days"},{"order":5,"type":"send_sms","template":"review_request"}]'::jsonb);

    -- Insert Engagement Tracking Workflows
    INSERT INTO workflows (location_id, category_id, name, trigger_type, trigger_value, status, actions) VALUES
    (v_location_id, v_engagement_cat, 'workflow-1-email-opened', 'email_event', 'opened', 'published',
     '[{"order":1,"type":"add_tag","tag":"email.engaged"},{"order":2,"type":"update_field","field":"engagement_state","value":"active"}]'::jsonb),
    (v_location_id, v_engagement_cat, 'workflow-2-link-clicked', 'email_event', 'clicked', 'published',
     '[{"order":1,"type":"add_tag","tag":"email.clicked"},{"order":2,"type":"update_field","field":"engagement_state","value":"active"}]'::jsonb),
    (v_location_id, v_engagement_cat, 'workflow-3-email-reply', 'email_event', 'replied', 'published',
     '[{"order":1,"type":"add_tag","tag":"email.replied"},{"order":2,"type":"update_field","field":"engagement_state","value":"active"}]'::jsonb),
    (v_location_id, v_engagement_cat, 'workflow-4-email-bounce', 'email_event', 'bounced', 'published',
     '[{"order":1,"type":"add_tag","tag":"email.bounced"},{"order":2,"type":"set_dnd","channel":"email","status":"on"}]'::jsonb);

    -- Insert Tags
    INSERT INTO tags (location_id, name, category_id, triggers_workflow) VALUES
    -- Loan Status Tags
    (v_location_id, 'Application Started', (SELECT id FROM tag_categories WHERE name = 'loan_status'), true),
    (v_location_id, 'In Processing', (SELECT id FROM tag_categories WHERE name = 'loan_status'), true),
    (v_location_id, 'In Underwriting', (SELECT id FROM tag_categories WHERE name = 'loan_status'), true),
    (v_location_id, 'Conditionally Approved', (SELECT id FROM tag_categories WHERE name = 'loan_status'), true),
    (v_location_id, 'Loan Approved', (SELECT id FROM tag_categories WHERE name = 'loan_status'), true),
    (v_location_id, 'Clear to Close', (SELECT id FROM tag_categories WHERE name = 'loan_status'), true),
    (v_location_id, 'Final Docs Ready', (SELECT id FROM tag_categories WHERE name = 'loan_status'), true),
    (v_location_id, 'Closed', (SELECT id FROM tag_categories WHERE name = 'loan_status'), true),
    -- Engagement Tags
    (v_location_id, 'email.engaged', (SELECT id FROM tag_categories WHERE name = 'engagement'), false),
    (v_location_id, 'email.clicked', (SELECT id FROM tag_categories WHERE name = 'engagement'), false),
    (v_location_id, 'email.replied', (SELECT id FROM tag_categories WHERE name = 'engagement'), false),
    (v_location_id, 'email.bounced', (SELECT id FROM tag_categories WHERE name = 'engagement'), false),
    -- Campaign Tags
    (v_location_id, 'campaign.welcome_lendwise.sent', (SELECT id FROM tag_categories WHERE name = 'automation_trigger'), false);

    -- Insert Custom Fields
    INSERT INTO custom_fields (location_id, ghl_field_id, name, field_key, field_type) VALUES
    (v_location_id, '1ms6w5sVytbkpa4HasaE', 'contact_type', 'contact_type', 'dropdown'),
    (v_location_id, 'I6Sd6K22kbPLym0RBMnp', 'relationshipType', 'relationship_type', 'dropdown'),
    (v_location_id, '5jPVqO7o4kfw16MGMWW5', 'loan_state', 'loan_state', 'dropdown'),
    (v_location_id, '2F8rbpc3BEK9382kQwgV', 'engagement_state', 'engagement_state', 'dropdown'),
    (v_location_id, 'L3CLTGUF5DLSK6eknwPm', 'automation_paused', 'automation_paused', 'checkbox');

    -- Insert Pipelines
    INSERT INTO pipelines (location_id, ghl_pipeline_id, name, stages) VALUES
    (v_location_id, 'ooqrlJv5GV8yfj3mwNFr', 'Contact Review',
     '[{"name":"Unclassified","ghl_stage_id":"e3be6972-a8d5-4b1c-9b6e-e48890a92491"},{"name":"Classified","ghl_stage_id":"d8a07090-109b-4aad-baf6-7f78f8293a2b"}]'::jsonb),
    (v_location_id, 'PTKY7pwZE6MUTCC6nrU7', 'Mortgage Sales Pipeline', '[]'::jsonb);

    -- Log this seed as activity
    PERFORM log_activity(v_location_id, 'seed_data', 'system', NULL, 'Initial seed', '{"date":"2025-12-21","source":"claude"}'::jsonb);

END $$;
