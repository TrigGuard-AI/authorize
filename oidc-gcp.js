/**
 * GitHub Actions OIDC → GCP Workload Identity Federation → service account
 * OAuth access token → IAM generateIdToken for Cloud Run (audience = gateway base URL).
 */
const { ExternalAccountClient } = require("google-auth-library");

/**
 * @param {object} opts
 * @param {string} opts.workloadIdentityProvider e.g. projects/123/locations/global/workloadIdentityPools/POOL/providers/PROVIDER
 * @param {string} opts.serviceAccountEmail e.g. sa@project.iam.gserviceaccount.com
 * @param {string} opts.gatewayBaseUrl HTTPS origin only (no trailing slash), used as ID token audience
 */
async function getCloudRunIdentityTokenFromOidc(opts) {
  const { workloadIdentityProvider, serviceAccountEmail, gatewayBaseUrl } = opts;
  const requestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!requestUrl || !requestToken) {
    throw new Error(
      "GitHub OIDC env missing. Add `permissions: { id-token: write }` to the workflow job."
    );
  }

  const oidcAudience = `https://iam.googleapis.com/${workloadIdentityProvider}`;
  const join = requestUrl.includes("?") ? "&" : "?";
  const credentialSourceUrl = `${requestUrl}${join}audience=${encodeURIComponent(oidcAudience)}`;

  // Federated STS token only (no generateAccessToken impersonation). The WIF principal
  // must have roles/iam.serviceAccountTokenCreator on the target SA to call generateIdToken.
  const credentialJson = {
    type: "external_account",
    audience: `//iam.googleapis.com/${workloadIdentityProvider}`,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    credential_source: {
      url: credentialSourceUrl,
      headers: {
        Authorization: `Bearer ${requestToken}`,
      },
      format: {
        type: "json",
        subject_token_field_name: "value",
      },
    },
  };

  const client = ExternalAccountClient.fromJSON(credentialJson);
  const access = await client.getAccessToken();
  const oauthAccessToken =
    typeof access === "string" ? access : access?.token;
  if (!oauthAccessToken) {
    throw new Error("GCP: empty access token from workload identity federation");
  }

  const idUrl = `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(
    serviceAccountEmail
  )}:generateIdToken`;

  const idRes = await fetch(idUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${oauthAccessToken}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      audience: gatewayBaseUrl,
      includeEmail: true,
    }),
  });

  const idBody = await idRes.json().catch(() => ({}));
  if (!idRes.ok) {
    throw new Error(
      `GCP generateIdToken failed: HTTP ${idRes.status} ${JSON.stringify(idBody)}`
    );
  }
  if (!idBody.token) {
    throw new Error("GCP generateIdToken: missing token in response");
  }
  return idBody.token;
}

module.exports = { getCloudRunIdentityTokenFromOidc };
