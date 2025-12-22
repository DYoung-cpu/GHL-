# LendWise GHL Automation - Supabase Schema

System of record for all GHL automations, integrations, and features.

## Setup

1. Create a new Supabase project
2. Run `schema.sql` in the SQL Editor
3. Run `seed-current-state.sql` to populate current data

## Tables Overview

### Core Tables
| Table | Purpose |
|-------|---------|
| `locations` | GHL sub-accounts (one per LO) |
| `workflows` | All automation workflows |
| `tags` | All tags and what they trigger |
| `templates` | Email/SMS templates |
| `custom_fields` | GHL custom fields |
| `pipelines` | Sales pipelines and stages |

### Integration Tables
| Table | Purpose |
|-------|---------|
| `encompass_ghl_mapping` | Maps Encompass milestones → GHL tags |
| `contact_sync` | Links Encompass loans to GHL contacts |

### Tracking Tables
| Table | Purpose |
|-------|---------|
| `features` | Roadmap of what's built vs not started |
| `activity_log` | Audit trail of all changes |

## Key Views

```sql
-- What's been built vs pending
SELECT * FROM v_feature_status;

-- What to build next (by priority)
SELECT * FROM v_next_to_build;

-- All workflows with their triggers
SELECT * FROM v_workflows_with_triggers;
```

## Encompass Integration

The `encompass_ghl_mapping` table defines how loan statuses map to GHL:

| Encompass Milestone | GHL Tag | Workflow |
|---------------------|---------|----------|
| Application Received | Application Started | loan-status-workflow-1 |
| Sent to Processing | In Processing | loan-status-workflow-2 |
| Submitted to Underwriting | In Underwriting | loan-status-workflow-3 |
| Conditional Approval | Conditionally Approved | loan-status-workflow-4 |
| Loan Approved | Loan Approved | loan-status-workflow-5 |
| Clear to Close | Clear to Close | loan-status-workflow-6 |
| Docs Out | Final Docs Ready | loan-status-workflow-7 |
| Funded | Closed | loan-status-workflow-8 |

## Feature Categories

- **loan_status** - Loan milestone updates
- **engagement_tracking** - Email open/click/reply/bounce
- **lead_nurture** - New lead sequences
- **post_close** - After funding nurture
- **appointments** - Booking and reminders
- **social_media** - Social posting/engagement
- **recruitment** - LO recruitment
- **product_alerts** - Rate drops, new products
- **partner_marketing** - Realtor campaigns
- **compliance** - Birthday, anniversary

## Updating Feature Status

```sql
-- Mark a feature as completed
SELECT update_feature_status('Social Media Posting', 'completed', 'Launched Dec 2025');

-- Mark as in progress
SELECT update_feature_status('Encompass API Integration', 'in_progress');
```

## Logging Activity

```sql
SELECT log_activity(
    'location-uuid-here',
    'workflow_created',
    'workflow',
    'ghl-workflow-id',
    'New Lead Nurture',
    '{"trigger":"tag_added","tag":"New Lead"}'::jsonb
);
```
