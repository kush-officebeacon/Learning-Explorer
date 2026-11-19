export const API_GROUPS = [
  {
    name: "Auth",
    prefix: "/api/v1/auth",
    items: ["Login, refresh, current caller. JWT plus a Redis session."],
  },
  {
    name: "Admin · tenants and brands",
    prefix: "/api/v1/admin/tenants",
    items: ["Create the company and its sub-tenants. Settings JSON lives here."],
  },
  {
    name: "Admin · connectors",
    prefix: "/api/v1/admin/tenants/{id}/connectors",
    items: ["Seal Outlook, S3, VLM or Gemini, and NetSuite credentials onto a row."],
  },
  {
    name: "Admin · people",
    prefix: "/api/v1/admin/users  ·  /admin/roles",
    items: ["Users, roles, permission bundles. Revoke one device or every session. Suspend."],
  },
  {
    name: "Connectors (self-service)",
    prefix: "/api/v1/connectors",
    items: ["OAuth handshake for a mailbox, and a manual fetch when you do not want to wait for the cron."],
  },
  {
    name: "Workflows",
    prefix: "/api/v1/workflows",
    items: [
      "List and open a run.",
      "Retry the step that failed.",
      "Rerun from a chosen worker.",
      "Reprocess the same email from the start.",
      "Cancel.",
    ],
  },
  {
    name: "Reviews",
    prefix: "/api/v1/reviews",
    items: ["Queue, detail, assign, escalate, decide (approve or reject), retry the failed step."],
  },
  {
    name: "Portal",
    prefix: "/api/v1/portal",
    items: ["The customer's own orders, matched by email. Permission order.read_own."],
  },
  {
    name: "Also mounted",
    prefix: "/metrics  ·  /email-forwards  ·  /feedback  ·  /retention-policy",
    items: ["Ops numbers from the views. Forward log. Review feedback. How long files are kept."],
  },
  {
    name: "Outside v1",
    prefix: "/health  ·  /docs  ·  /admin",
    items: ["Liveness. OpenAPI. SQLAdmin over every table — staff only, off in production, and it bypasses the service layer."],
  },
];
