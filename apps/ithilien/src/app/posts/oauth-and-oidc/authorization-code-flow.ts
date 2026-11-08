/**
 * The authorization code flow with PKCE, as the article's stepper shows it.
 * Values are illustrative; the shape follows RFC 6749 §4.1, RFC 7636 and
 * OpenID Connect Core 1.0 §3.1. Jamie: edit freely as the article takes shape.
 */
import type { FlowStep } from "@/components/article/flow-stepper";

export const authorizationCodeFlow: FlowStep[] = [
  {
    from: "User",
    to: "App",
    title: "Clicks “Sign in”",
    explanation:
      "The user wants the app to act for them. The app never sees their password: it sends them to the authorization server instead.",
  },
  {
    from: "App",
    title: "Makes a verifier, a challenge and a state",
    message: [
      { text: "code_verifier  = random 43–128 chars   (kept secret)" },
      { text: "code_challenge = BASE64URL(SHA256(code_verifier))" },
      { text: "state          = random, stored in the session" },
      { text: "nonce          = random, stored in the session", only: "oidc" },
    ],
    explanation:
      "PKCE ties the code that comes back to this app instance. state ties the response to this browser session and stops cross-site request forgery.",
  },
  {
    from: "App",
    to: "Auth server",
    title: "Redirects the browser to /authorize",
    message: [
      { text: "GET /authorize?response_type=code" },
      { text: "  &client_id=my-app" },
      { text: "  &redirect_uri=https://app.example/callback" },
      { text: "  &scope=read:calendar", only: "oauth" },
      { text: "  &scope=openid profile read:calendar", only: "oidc" },
      { text: "  &state=af0ifjsldkj" },
      { text: "  &nonce=n-0S6_WzA2Mj", only: "oidc" },
      { text: "  &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM" },
      { text: "  &code_challenge_method=S256" },
    ],
    explanation:
      "This is a front-channel request: it travels through the browser, so anything in it can be seen and tampered with. Asking for the openid scope is what turns an OAuth request into an OpenID Connect one.",
  },
  {
    from: "User",
    to: "Auth server",
    title: "Signs in and consents",
    explanation:
      "Authentication happens here, on the authorization server's own page. The user approves the scopes the app asked for.",
  },
  {
    from: "Auth server",
    to: "App",
    title: "Redirects back with a code",
    message: [
      { text: "HTTP/1.1 302 Found" },
      { text: "Location: https://app.example/callback" },
      { text: "  ?code=SplxlOBeZQQYbYS6WxSbIA" },
      { text: "  &state=af0ifjsldkj" },
    ],
    explanation:
      "The code is short-lived and single-use. On its own it is worthless: only someone holding the code_verifier can redeem it.",
  },
  {
    from: "App",
    title: "Checks state",
    explanation:
      "If state does not match what the app stored, the response did not start in this session, and the app stops.",
  },
  {
    from: "App",
    to: "Auth server",
    title: "Exchanges the code at /token",
    message: [
      { text: "POST /token" },
      { text: "Content-Type: application/x-www-form-urlencoded" },
      { text: "" },
      { text: "grant_type=authorization_code" },
      { text: "&code=SplxlOBeZQQYbYS6WxSbIA" },
      { text: "&redirect_uri=https://app.example/callback" },
      { text: "&client_id=my-app" },
      { text: "&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk" },
    ],
    explanation:
      "This is a back-channel request, straight from the app to the server. The server hashes code_verifier and checks it matches the code_challenge it saw earlier. A confidential client also authenticates itself here.",
  },
  {
    from: "Auth server",
    to: "App",
    title: "Returns tokens",
    message: [
      { text: "{" },
      { text: '  "access_token": "eyJhbGciOi…",' },
      { text: '  "token_type": "Bearer",' },
      { text: '  "expires_in": 3600,' },
      { text: '  "refresh_token": "8xLOxBtZp8",' },
      { text: '  "id_token": "eyJhbGciOi…"', only: "oidc" },
      { text: "}" },
    ],
    explanation:
      "The access token is for the API; the app should treat it as opaque. In OpenID Connect the ID token comes back too, and that one is for the app.",
  },
  {
    from: "App",
    title: "Validates the ID token",
    oidc: true,
    message: [
      { text: "signature  checked with the server's published keys (JWKS)" },
      { text: "iss        is the expected issuer" },
      { text: "aud        contains my-app" },
      { text: "exp        is in the future" },
      { text: "nonce      matches the one stored in the session" },
    ],
    explanation:
      "The ID token is a signed JWT that says who the user is and how they signed in. This step is the identity layer OpenID Connect adds: plain OAuth tells the app it may call the API, not who the user is.",
  },
  {
    from: "App",
    to: "API",
    title: "Calls the API with the access token",
    message: [
      { text: "GET /calendar/events" },
      { text: "Authorization: Bearer eyJhbGciOi…" },
    ],
    explanation:
      "The API checks the token's signature or introspects it, then checks that its audience and scopes allow this request.",
  },
];
