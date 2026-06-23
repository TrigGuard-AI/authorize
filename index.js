/**
 * TrigGuard Authorization — GitHub Action
 * Calls authorityUrl/execute, verifies receipt locally, fails workflow if invalid or not PERMIT.
 */
const core = require("@actions/core");
const { verifyReceiptWithAuthority } = require("./verify");
const { getCloudRunIdentityTokenFromOidc } = require("./oidc-gcp");

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

    const workloadIdentityProvider = (
      core.getInput("workload_identity_provider") || ""
    ).trim();
    const serviceAccountEmail = (
      core.getInput("service_account") || ""
    ).trim();
    const authTokenLegacy =
      core.getInput("authToken") || process.env.TRIGGUARD_TOKEN || "";

    let authToken = authTokenLegacy;

    if (workloadIdentityProvider && serviceAccountEmail) {
      core.info("TrigGuard: using GitHub OIDC → GCP identity token for Cloud Run");
      authToken = await getCloudRunIdentityTokenFromOidc({
        workloadIdentityProvider,
        serviceAccountEmail,
        gatewayBaseUrl: authorityUrl,
      });
    } else if (!authToken) {
      core.setFailed(
        "TrigGuard: set workload_identity_provider + service_account (OIDC), or provide authToken / TRIGGUARD_CLOUD_TOKEN"
      );
      return;
    }

    const repository = (core.getInput("repository") || "").trim();
    const branch = (core.getInput("branch") || "").trim();
    const executionMode = (core.getInput("execution_mode") || "enforce").trim().toLowerCase();
    const bodyObj = { surface, actorId };
    if (executionMode === "observe" || executionMode === "report") {
      bodyObj.executionMode = "observe";
    }
    if (repository || branch) {
      bodyObj.context = {};
      if (repository) bodyObj.context.repository = repository;
      if (branch) bodyObj.context.branch = branch;
    }
    const body = JSON.stringify(bodyObj);
    const headers = { "Content-Type": "application/json" };
    headers.Authorization = `Bearer ${authToken}`;

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

    const observe =
      data.execution_mode === "observe" ||
      data.executionMode === "observe" ||
      executionMode === "observe" ||
      executionMode === "report";
    const wouldDecision =
      data.would_decision ||
      data.wouldDecision ||
      data.receipt?.would_decision ||
      data.receipt?.wouldDecision ||
      data.receipt?.decision;
    const effectiveDecision = data.decision || data.receipt?.decision;

    if (observe) {
      core.info(`TrigGuard observe mode: policy would ${wouldDecision}; workflow continues (decision=${effectiveDecision})`);
      if (wouldDecision !== "PERMIT" && wouldDecision !== "permit") {
        core.warning(`TrigGuard observe: would have blocked with ${wouldDecision}`);
      }
    } else {
      const decision = data.receipt.decision;
      if (decision !== "PERMIT" && decision !== "permit") {
        core.setFailed(`TrigGuard denied execution: ${decision}`);
        return;
      }
    }

    core.setOutput("decision", effectiveDecision);
    core.setOutput("would-decision", wouldDecision);
    core.setOutput("would_decision", wouldDecision);
    const execId =
      data.execution_id ||
      data.executionId ||
      data.receipt?.executionId ||
      "";
    core.setOutput("execution-id", execId);
    core.setOutput("execution_id", execId);
    const executionToken =
      data.execution_token ||
      data.executionToken ||
      "";
    if (executionToken) {
      core.setOutput("execution-token", executionToken);
      core.setOutput("execution_token", executionToken);
    }
    core.setOutput("receipt", JSON.stringify(data.receipt));
    core.info("TrigGuard authorization successful");
  } catch (err) {
    core.setFailed(err.message);
  }
}

run();
