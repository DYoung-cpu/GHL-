// test-intake-workflow.js
// End-to-end test for "Tag Added – trigger.intake_gate" workflow

const fs = require("fs/promises");
const path = require("path");
const axios = require("axios");

const API_KEY = process.env.GHL_API_KEY;
if (!API_KEY) {
  console.error("Missing env var GHL_API_KEY");
  process.exit(1);
}

const BASE_URL = "https://services.leadconnectorhq.com";

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

async function main() {
  const cfgPath = path.join(__dirname, "ghl-config.json");
  const cfg = JSON.parse(await fs.readFile(cfgPath, "utf8"));

  const locationId = cfg.locationId;
  const pipelineId =
    cfg.contactReviewPipeline?.id || cfg.contactReviewPipelineId;
  const relationshipTypeFieldId =
    cfg.customFields?.relationshipTypeId || cfg.customFields?.contact_type;
  const triggerTagName = cfg.tags?.triggerIntakeGateName || "trigger.intake_gate";

  console.log("==============================");
  console.log("Creating test contact");
  console.log("==============================");

  const ts = Date.now();
  const email = `api-intake-test+${ts}@lendwisemtg.com`;

  // 1) Create contact WITHOUT tags
  const createRes = await client.post("/contacts/", {
    locationId,
    firstName: "Intake",
    lastName: `Test-${ts}`,
    email,
    phone: `+1310${String(ts).slice(-7)}`, // unique phone
  });

  const contact = createRes.data.contact || createRes.data;
  const contactId = contact.id;

  console.log("Created contact ID:", contactId);
  console.log("Email:", email);

  // 2) Add trigger tag in a separate call (this is what should fire the workflow)
  console.log("\n==============================");
  console.log("Adding trigger tag to contact");
  console.log("==============================");

  await client.post(`/contacts/${contactId}/tags`, {
    tags: [triggerTagName],
  });

  console.log("Added tag:", triggerTagName);

  // 3) Wait for workflow to run
  console.log("\nWaiting 12 seconds for workflow to run...");
  await sleep(12000);

  // 4) Fetch updated contact
  console.log("\n==============================");
  console.log("Fetching updated contact");
  console.log("==============================");

  const getRes = await client.get(`/contacts/${contactId}`);
  const updated = getRes.data.contact || getRes.data;

  const customFields = updated.customFields || [];
  const tags = updated.tags || [];

  console.log("customFields:", JSON.stringify(customFields, null, 2));
  console.log("tags:", JSON.stringify(tags, null, 2));

  // Find Relationship Type field
  const relationshipField =
    customFields.find((f) => f.id === relationshipTypeFieldId) ||
    customFields.find(
      (f) =>
        typeof f.name === "string" &&
        f.name.toLowerCase().includes("relationship type"),
    );

  const relationshipValue = relationshipField?.value || null;

  // Tag checks
  const tagsLower = tags.map((t) => t.toLowerCase());
  const hasUnclassifiedTag = tagsLower.includes("contact.unclassified");
  const hasReviewRequiredTag = tagsLower.includes("contact.review_required");

  // 5) Check opportunities
  console.log("\n==============================");
  console.log("Fetching opportunities for contact");
  console.log("==============================");

  const oppRes = await client.get("/opportunities/search", {
    params: {
      location_id: locationId,
      contact_id: contactId,
    },
  });

  const opportunities = oppRes.data.opportunities || [];
  console.log(
    "opportunities:",
    JSON.stringify(
      opportunities.map((o) => ({
        id: o.id,
        name: o.name,
        pipelineId: o.pipelineId,
        pipelineStageId: o.pipelineStageId,
        status: o.status,
      })),
      null,
      2,
    ),
  );

  const hasContactReviewOpp = opportunities.some(
    (o) => o.pipelineId === pipelineId,
  );

  // PASS / FAIL summary
  const pass =
    relationshipValue === "unclassified" &&
    hasUnclassifiedTag &&
    hasReviewRequiredTag &&
    hasContactReviewOpp;

  console.log("\n==============================");
  if (pass) {
    console.log("INTAKE WORKFLOW TEST: PASS");
    console.log(
      `Relationship Type='${relationshipValue}', tags OK, opportunity in Contact Review pipeline.`,
    );
  } else {
    console.log("INTAKE WORKFLOW TEST: FAIL");
    console.log("Relationship Type:", relationshipValue);
    console.log("Tags:", tags);
    console.log(
      "Opportunities (id, pipelineId, stageId, status):",
      opportunities.map((o) => ({
        id: o.id,
        pipelineId: o.pipelineId,
        pipelineStageId: o.pipelineStageId,
        status: o.status,
      })),
    );
  }
  console.log("==============================");
}

main().catch((err) => {
  console.error("\n=== ERROR ===");
  if (err.response) {
    console.error("Status:", err.response.status, err.response.statusText);
    console.error("Body:", JSON.stringify(err.response.data, null, 2));
  } else {
    console.error(err);
  }
  process.exit(1);
});
