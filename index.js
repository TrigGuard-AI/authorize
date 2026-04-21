/**
 * TrigGuard Authorization — GitHub Action
 * Calls authorityUrl/execute, verifies receipt locally, fails workflow if invalid or not PERMIT.
 */
const core = require("@actions/core");
const { verifyReceiptWithAuthority } = require("./verify");

async function run() {
  try {
    const surface = core.getInput("surface", { required: true });
    const actorId =
      core.getInput("actor_id") ||
      core.getInput("actorId") ||
      "github-actions";
    const authorityUrl = (
      core.getInput("gateway_url") ||
      core.getInput("endpoint") ||
      core.getInput("authorityUrl") ||
      ""
    ).replace(/\/$/, "");
    if (!authorityUrl) {
      core.setFailed("TrigGuard: provide 'gateway_url', 'endpoint', or 'authorityUrl'");
      return;
    }
    const authToken = core.getInput("authToken") || process.env.TRIGGUARD_TOKEN || "";

    const body = JSON.stringify({ surface, actorId });
    const headers = { "Content-Type": "application/json" };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;

    const response = await fetch(`${authorityUrl}/execute`, {
      method: "POST",
      headers,
      body,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      core.setFailed(`TrigGuard request failed: HTTP ${response.status} ${data.error || ""}`);
      return;
    }

    if (!data.receipt) {
      core.setFailed("TrigGuard response missing receipt");
      return;
    }

    const valid = await verifyReceiptWithAuthority(data.receipt, authorityUrl, authToken);
    if (!valid) {
      core.setFailed("Invalid TrigGuard receipt (signature verification failed)");
      return;
    }

    const decision = data.receipt.decision;
    if (decision !== "PERMIT" && decision !== "permit") {
      core.setFailed(`TrigGuard denied execution: ${decision}`);
      return;
    }

    core.setOutput("decision", decision);
    const execId =
      data.execution_id ||
      data.executionId ||
      data.receipt?.executionId ||
      "";
    core.setOutput("execution-id", execId);
    core.setOutput("receipt", JSON.stringify(data.receipt));
    core.info("TrigGuard authorization successful");
  } catch (err) {
    core.setFailed(err.message);
  }
}

run();
