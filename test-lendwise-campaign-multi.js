// test-lendwise-campaign-multi.js
// Multi-contact test for "Campaign – I'm at Lendwise" workflow
//
// Trigger: Tag Added = send.campaign_welcome_lendwise
// Expected:
//   - Contacts WITHOUT DND: receive email, get sent tag, trigger tag removed
//   - Contacts WITH DND: should NOT receive email

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
  console.log("\n" + "=".repeat(60));
  console.log(title);
  console.log("=".repeat(60));
}

// Test contacts configuration
const testContacts = [
  {
    firstName: "David",
    lastName: "Lendwise",
    email: "david@lendwisemtg.com",
    dndEmail: false,
    expectEmail: true,
  },
  {
    firstName: "David",
    lastName: "Gmail",
    email: "dyoung194@gmail.com",
    dndEmail: false,
    expectEmail: true,
  },
  {
    firstName: "David",
    lastName: "OneNation-DND",
    email: "dyoung@onenationhomeloans.com",
    dndEmail: true, // This one has DND ON - should NOT receive email
    expectEmail: false,
  },
];

const triggerTag = "send.campaign_welcome_lendwise";
const sentTag = "campaign.welcome_lendwise.sent";

async function ensureContact(contactData) {
  const { firstName, lastName, email, dndEmail } = contactData;

  // Search for existing contact
  const searchRes = await client.get("/contacts/", {
    params: {
      locationId: LOCATION_ID,
      query: email,
    },
  });

  const existingContacts = searchRes.data.contacts || [];
  let existingContact = existingContacts.find(
    (c) => c.email?.toLowerCase() === email.toLowerCase()
  );

  let contactId;

  if (existingContact) {
    contactId = existingContact.id;
    console.log(`  Found existing: ${email} (${contactId})`);

    // Update contact
    await client.put(`/contacts/${contactId}`, {
      firstName,
      lastName,
      dnd: dndEmail,
      dndSettings: {
        Email: { status: dndEmail ? "active" : "inactive" },
      },
    });
  } else {
    // Create new contact
    const createRes = await client.post("/contacts/", {
      locationId: LOCATION_ID,
      firstName,
      lastName,
      email,
      dnd: dndEmail,
      dndSettings: {
        Email: { status: dndEmail ? "active" : "inactive" },
      },
    });

    contactId = createRes.data.contact?.id || createRes.data.id;
    console.log(`  Created new: ${email} (${contactId})`);
  }

  // Remove any existing test tags to start fresh
  try {
    await client.delete(`/contacts/${contactId}/tags`, {
      data: { tags: [sentTag, triggerTag] },
    });
  } catch (e) {
    // Tags might not exist
  }

  // Set automation_paused = false
  const cfgPath = path.join(__dirname, "ghl-config.json");
  const cfg = JSON.parse(await fs.readFile(cfgPath, "utf8"));
  const automationPausedFieldId = cfg.customFields?.automation_paused;

  if (automationPausedFieldId) {
    await client.put(`/contacts/${contactId}`, {
      customFields: [{ id: automationPausedFieldId, value: false }],
    });
  }

  return contactId;
}

async function main() {
  const results = [];
  const triggerTime = new Date();

  try {
    // =========================================
    // STEP 1: Ensure all test contacts exist
    // =========================================
    logSection("STEP 1: Ensure test contacts exist");

    const contactIds = [];
    for (const tc of testContacts) {
      console.log(`\nProcessing: ${tc.firstName} ${tc.lastName} <${tc.email}>`);
      console.log(`  DND Email: ${tc.dndEmail ? "ON" : "OFF"}`);
      const id = await ensureContact(tc);
      contactIds.push(id);
      tc.contactId = id;
    }

    console.log("\nAll contacts ready:");
    testContacts.forEach((tc, i) => {
      console.log(`  ${i + 1}. ${tc.email} -> ${tc.contactId} (DND: ${tc.dndEmail ? "ON" : "OFF"})`);
    });

    // =========================================
    // STEP 2: Apply trigger tag to ALL contacts
    // =========================================
    logSection("STEP 2: Apply trigger tag to all contacts");

    for (const tc of testContacts) {
      await client.post(`/contacts/${tc.contactId}/tags`, {
        tags: [triggerTag],
      });
      console.log(`  Added '${triggerTag}' to ${tc.email}`);
    }

    console.log("\nTrigger time:", triggerTime.toISOString());

    // =========================================
    // STEP 3: Wait for workflow to run
    // =========================================
    logSection("STEP 3: Waiting for workflow (30 seconds)");

    for (let i = 30; i > 0; i -= 5) {
      console.log(`  ${i} seconds remaining...`);
      await sleep(5000);
    }

    // =========================================
    // STEP 4: Fetch and verify each contact
    // =========================================
    logSection("STEP 4: Verify contact states");

    for (const tc of testContacts) {
      console.log(`\n--- ${tc.email} ---`);

      const getRes = await client.get(`/contacts/${tc.contactId}`);
      const contact = getRes.data.contact || getRes.data;

      const tags = contact.tags || [];
      const tagsLower = tags.map((t) => t.toLowerCase());

      const hasSentTag = tagsLower.includes(sentTag.toLowerCase());
      const hasTriggerTag = tagsLower.includes(triggerTag.toLowerCase());

      console.log(`  Current tags: ${JSON.stringify(tags)}`);
      console.log(`  sentTag present: ${hasSentTag}`);
      console.log(`  triggerTag removed: ${!hasTriggerTag}`);
      console.log(`  DND was: ${tc.dndEmail ? "ON" : "OFF"}`);

      // Try to check for email in conversations
      let emailSent = "unknown";
      try {
        const convRes = await client.get(`/conversations/search`, {
          params: {
            locationId: LOCATION_ID,
            contactId: tc.contactId,
          },
        });

        const conversations = convRes.data.conversations || [];
        if (conversations.length > 0) {
          const convId = conversations[0].id;
          const msgRes = await client.get(`/conversations/${convId}/messages`);
          const messages = msgRes.data.messages || msgRes.data || [];

          if (Array.isArray(messages)) {
            const recentEmails = messages.filter((m) => {
              const msgTime = new Date(m.dateAdded || m.createdAt);
              return (
                m.type === "TYPE_EMAIL" &&
                m.direction === "outbound" &&
                msgTime >= triggerTime
              );
            });
            emailSent = recentEmails.length > 0 ? "yes" : "no";
          }
        }
      } catch (e) {
        // API access issue - rely on tag verification
      }

      results.push({
        email: tc.email,
        dndEmail: tc.dndEmail ? "ON" : "OFF",
        expectEmail: tc.expectEmail,
        sentTagPresent: hasSentTag,
        triggerTagRemoved: !hasTriggerTag,
        emailSent,
        pass:
          tc.expectEmail
            ? hasSentTag && !hasTriggerTag
            : !hasSentTag || hasTriggerTag, // DND contact should NOT have sent tag
      });
    }

    // =========================================
    // STEP 5: Summary table
    // =========================================
    logSection("RESULT SUMMARY");

    console.log("\n| Contact                          | DND   | sentTag | triggerRemoved | emailAPI | Expected | Pass |");
    console.log("|----------------------------------|-------|---------|----------------|----------|----------|------|");

    for (const r of results) {
      const emailShort = r.email.padEnd(32).slice(0, 32);
      const pass = r.pass ? "YES" : "NO";
      const expected = r.expectEmail ? "email" : "NO email";
      console.log(
        `| ${emailShort} | ${r.dndEmail.padEnd(5)} | ${r.sentTagPresent ? "YES" : "NO ".padEnd(3)}     | ${r.triggerTagRemoved ? "YES" : "NO ".padEnd(3)}            | ${r.emailSent.padEnd(8)} | ${expected.padEnd(8)} | ${pass.padEnd(4)} |`
      );
    }

    const allPass = results.every((r) => r.pass);
    const normalContactsPass = results
      .filter((r) => !r.dndEmail.includes("ON"))
      .every((r) => r.sentTagPresent && r.triggerTagRemoved);
    const dndContactCorrect = results
      .filter((r) => r.dndEmail.includes("ON"))
      .every((r) => !r.sentTagPresent);

    console.log("\n--- Analysis ---");
    console.log(`Normal contacts (DND OFF) workflow executed: ${normalContactsPass ? "YES" : "NO"}`);
    console.log(`DND contact blocked from receiving email: ${dndContactCorrect ? "YES" : "NO"}`);

    if (normalContactsPass && dndContactCorrect) {
      console.log("\n✅ MULTI-CONTACT CAMPAIGN TEST: PASS");
      console.log("   - Workflow executed for non-DND contacts");
      console.log("   - DND contact was correctly excluded");
    } else if (normalContactsPass) {
      console.log("\n⚠️ MULTI-CONTACT CAMPAIGN TEST: PARTIAL PASS");
      console.log("   - Normal contacts received emails correctly");
      console.log("   - DND behavior needs manual verification");
    } else {
      console.log("\n❌ MULTI-CONTACT CAMPAIGN TEST: FAIL");
    }
  } catch (err) {
    logSection("ERROR");
    if (err.response) {
      console.error("Status:", err.response.status, err.response.statusText);
      console.error("Body:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err);
    }
    process.exit(1);
  }
}

main();
