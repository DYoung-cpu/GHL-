// test-welcome-campaign.js
// End-to-end test for "Campaign – Welcome to Lendwise" workflow
//
// Trigger: Tag Added = send.campaign_welcome_lendwise
// Expected actions:
//   - Send welcome email
//   - Add tag: campaign.welcome_lendwise.sent
//   - Remove tag: send.campaign_welcome_lendwise

const fs = require("fs/promises");
const path = require("path");
const axios = require("axios");

const API_KEY = process.env.GHL_API_KEY;
if (!API_KEY) {
  console.error("Missing env var GHL_API_KEY");
  process.exit(1);
}

const BASE_URL = "https://services.leadconnectorhq.com";
const LOCATION_ID = "peE6XmGYBb1xV0iNbh6C";

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
  },
  timeout: 20000,
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logSection(title) {
  console.log("\n" + "=".repeat(50));
  console.log(title);
  console.log("=".repeat(50));
}

async function main() {
  const cfgPath = path.join(__dirname, "ghl-config.json");
  const cfg = JSON.parse(await fs.readFile(cfgPath, "utf8"));

  const testContact = {
    firstName: "David",
    lastName: "Young",
    email: "david@lendwisemtg.com",
  };

  const triggerTag = "send.campaign_welcome_lendwise";
  const sentTag = "campaign.welcome_lendwise.sent";

  const results = {
    contactId: null,
    workflowTriggeredByTag: triggerTag,
    sentTagPresent: false,
    triggerTagRemoved: false,
    emailFound: false,
    emailSubject: null,
    mergeFieldsLookCorrect: false,
    notes: "",
  };

  const triggerTime = new Date();

  try {
    // =========================================
    // STEP 1: Ensure test contact exists
    // =========================================
    logSection("STEP 1: Ensure test contact exists");

    // Search for existing contact by email
    console.log("Searching for contact:", testContact.email);

    const searchRes = await client.get("/contacts/", {
      params: {
        locationId: LOCATION_ID,
        query: testContact.email,
      },
    });

    const existingContacts = searchRes.data.contacts || [];
    let contactId = null;
    let existingContact = existingContacts.find(
      (c) => c.email?.toLowerCase() === testContact.email.toLowerCase()
    );

    if (existingContact) {
      contactId = existingContact.id;
      console.log("Found existing contact ID:", contactId);

      // Update contact to ensure correct state
      console.log("Updating contact to ensure correct state...");

      // Get the custom field IDs
      const automationPausedFieldId = cfg.customFields?.automation_paused;
      const contactTypeFieldId =
        cfg.customFields?.relationshipTypeId || cfg.customFields?.contact_type;

      const customFields = [];
      if (automationPausedFieldId) {
        customFields.push({ id: automationPausedFieldId, value: false });
      }
      if (contactTypeFieldId) {
        customFields.push({ id: contactTypeFieldId, value: "past_client" });
      }

      await client.put(`/contacts/${contactId}`, {
        firstName: testContact.firstName,
        lastName: testContact.lastName,
        customFields: customFields,
      });

      console.log("Contact updated with automation_paused=false, contact_type=past_client");

      // Remove any existing sent tag and trigger tag to start fresh
      try {
        await client.delete(`/contacts/${contactId}/tags`, {
          data: { tags: [sentTag, triggerTag] },
        });
        console.log("Removed existing test tags to start fresh");
      } catch (e) {
        // Tags might not exist, that's fine
      }
    } else {
      // Create new contact
      console.log("Contact not found, creating new contact...");

      const automationPausedFieldId = cfg.customFields?.automation_paused;
      const contactTypeFieldId =
        cfg.customFields?.relationshipTypeId || cfg.customFields?.contact_type;

      const customFields = [];
      if (automationPausedFieldId) {
        customFields.push({ id: automationPausedFieldId, value: false });
      }
      if (contactTypeFieldId) {
        customFields.push({ id: contactTypeFieldId, value: "past_client" });
      }

      const createRes = await client.post("/contacts/", {
        locationId: LOCATION_ID,
        firstName: testContact.firstName,
        lastName: testContact.lastName,
        email: testContact.email,
        customFields: customFields,
      });

      contactId = createRes.data.contact?.id || createRes.data.id;
      console.log("Created new contact ID:", contactId);
    }

    results.contactId = contactId;

    // =========================================
    // STEP 2: Apply trigger tag
    // =========================================
    logSection("STEP 2: Apply trigger tag");

    console.log("Adding tag:", triggerTag);

    await client.post(`/contacts/${contactId}/tags`, {
      tags: [triggerTag],
    });

    console.log("✓ Tag added successfully");
    console.log("Trigger time:", triggerTime.toISOString());

    // =========================================
    // STEP 3: Wait for workflow to run
    // =========================================
    logSection("STEP 3: Waiting for workflow");

    console.log("Waiting 20 seconds for workflow to execute...");
    await sleep(20000);

    // =========================================
    // STEP 4: Verify contact state
    // =========================================
    logSection("STEP 4: Verify contact state");

    const getRes = await client.get(`/contacts/${contactId}`);
    const updatedContact = getRes.data.contact || getRes.data;

    const tags = updatedContact.tags || [];
    const customFields = updatedContact.customFields || [];

    console.log("Current tags:", JSON.stringify(tags, null, 2));
    console.log("Current customFields:", JSON.stringify(customFields, null, 2));

    // Check tags (they come as lowercase strings from GHL)
    const tagsLower = tags.map((t) => t.toLowerCase());
    results.sentTagPresent = tagsLower.includes(sentTag.toLowerCase());
    results.triggerTagRemoved = !tagsLower.includes(triggerTag.toLowerCase());

    console.log("\nTag checks:");
    console.log("  sentTagPresent (campaign.welcome_lendwise.sent):", results.sentTagPresent);
    console.log("  triggerTagRemoved (send.campaign_welcome_lendwise removed):", results.triggerTagRemoved);

    // Check custom fields
    const automationPausedFieldId = cfg.customFields?.automation_paused;
    const contactTypeFieldId =
      cfg.customFields?.relationshipTypeId || cfg.customFields?.contact_type;

    const automationPausedField = customFields.find(
      (f) => f.id === automationPausedFieldId
    );
    const contactTypeField = customFields.find(
      (f) => f.id === contactTypeFieldId
    );

    console.log("\nCustom field checks:");
    console.log("  automation_paused:", automationPausedField?.value);
    console.log("  contact_type:", contactTypeField?.value);

    // =========================================
    // STEP 5: Verify email was sent
    // =========================================
    logSection("STEP 5: Verify email was sent");

    // Try to get conversations/messages for this contact
    let emailFound = false;
    let emailDetails = null;

    try {
      // Get conversations for this contact
      const convRes = await client.get(`/conversations/search`, {
        params: {
          locationId: LOCATION_ID,
          contactId: contactId,
        },
      });

      const conversations = convRes.data.conversations || [];
      console.log("Found", conversations.length, "conversation(s)");

      if (conversations.length > 0) {
        // Get messages from the most recent conversation
        const convId = conversations[0].id;
        console.log("Fetching messages from conversation:", convId);

        const msgRes = await client.get(`/conversations/${convId}/messages`);
        const messages = msgRes.data.messages || [];

        console.log("Found", messages.length, "message(s)");

        // Find emails sent after trigger time
        const recentEmails = messages.filter((m) => {
          const msgTime = new Date(m.dateAdded || m.createdAt);
          return (
            m.type === "TYPE_EMAIL" &&
            m.direction === "outbound" &&
            msgTime >= triggerTime
          );
        });

        console.log("Recent outbound emails since trigger:", recentEmails.length);

        if (recentEmails.length > 0) {
          const email = recentEmails[0];
          emailFound = true;
          emailDetails = {
            messageId: email.id,
            subject: email.subject || "(no subject)",
            bodySnippet: (email.body || "").substring(0, 200),
            timestamp: email.dateAdded || email.createdAt,
          };

          // Check if merge fields look correct
          const body = email.body || "";
          const hasDavid = body.includes("David");
          const hasNoMergeVars = !body.includes("{{");

          results.mergeFieldsLookCorrect = hasDavid && hasNoMergeVars;
        }
      }
    } catch (e) {
      console.log("Error fetching conversations:", e.response?.data || e.message);

      // Try alternative: check email history via messages endpoint
      try {
        const msgRes = await client.get(`/contacts/${contactId}/messages`);
        const messages = msgRes.data.messages || msgRes.data || [];
        console.log("Alt: Found", messages.length, "message(s) via contacts API");

        if (Array.isArray(messages) && messages.length > 0) {
          const recentEmails = messages.filter((m) => {
            const msgTime = new Date(m.dateAdded || m.createdAt || m.timestamp);
            return (
              (m.type === "TYPE_EMAIL" || m.messageType === "Email") &&
              (m.direction === "outbound" || m.direction === 1) &&
              msgTime >= triggerTime
            );
          });

          if (recentEmails.length > 0) {
            const email = recentEmails[0];
            emailFound = true;
            emailDetails = {
              messageId: email.id,
              subject: email.subject || "(no subject)",
              bodySnippet: (email.body || email.message || "").substring(0, 200),
              timestamp: email.dateAdded || email.createdAt || email.timestamp,
            };

            const body = email.body || email.message || "";
            const hasDavid = body.includes("David");
            const hasNoMergeVars = !body.includes("{{");
            results.mergeFieldsLookCorrect = hasDavid && hasNoMergeVars;
          }
        }
      } catch (e2) {
        console.log("Alt email check also failed:", e2.response?.data || e2.message);
      }
    }

    results.emailFound = emailFound;

    if (emailDetails) {
      results.emailSubject = emailDetails.subject;
      console.log("\nEmail details:");
      console.log("  messageId:", emailDetails.messageId);
      console.log("  subject:", emailDetails.subject);
      console.log("  timestamp:", emailDetails.timestamp);
      console.log("  bodySnippet:", emailDetails.bodySnippet);
      console.log("  mergeFieldsLookCorrect:", results.mergeFieldsLookCorrect);
    } else {
      console.log("\nNo email found in conversations.");
      results.notes += "Email not found in conversations API. ";
    }

    // =========================================
    // STEP 6: Result summary
    // =========================================
    logSection("RESULT SUMMARY");

    // Determine overall pass/fail
    const workflowRan = results.sentTagPresent && results.triggerTagRemoved;

    if (!workflowRan) {
      results.notes += "Workflow may not have executed (check tag results). ";
    }
    if (!results.emailFound) {
      results.notes +=
        "Could not verify email via API (may need to check GHL UI). ";
    }

    console.log(JSON.stringify(results, null, 2));

    if (workflowRan && results.emailFound && results.mergeFieldsLookCorrect) {
      console.log("\n✅ WELCOME CAMPAIGN TEST: PASS");
    } else if (workflowRan) {
      console.log("\n⚠️ WELCOME CAMPAIGN TEST: PARTIAL PASS");
      console.log("   Workflow executed (tags updated) but email verification incomplete.");
    } else {
      console.log("\n❌ WELCOME CAMPAIGN TEST: FAIL");
    }
  } catch (err) {
    logSection("ERROR");
    if (err.response) {
      console.error("Status:", err.response.status, err.response.statusText);
      console.error("Body:", JSON.stringify(err.response.data, null, 2));
      results.notes += `API Error: ${err.response.status} - ${JSON.stringify(err.response.data)}`;
    } else {
      console.error(err);
      results.notes += `Error: ${err.message}`;
    }

    console.log("\nPartial results:");
    console.log(JSON.stringify(results, null, 2));
    process.exit(1);
  }
}

main();
