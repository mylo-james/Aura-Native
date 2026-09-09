# Portfolio integration contract

Aura is a standalone web application that can also appear in a phone-width iframe. The current preview is private Tailscale access. The proposed public parent is `https://mjames.dev` and the proposed child is `https://aura.mjames.dev`; neither public deployment nor DNS is established by this repository.

The eventual host needs TLS termination, a long-running Python process and a single persistent SQLite volume. A static-only host cannot run the full demo. Serve the client and API at the same child origin, set `AURA_EXTERNAL_ORIGIN` to that exact origin, and explicitly allow the exact parent using `AURA_FRAME_ANCESTORS`. Exclude loopback test origins from public configuration.

Example markup once the actual origins are provisioned and verified:

```html
<a href="https://aura.mjames.dev/"> Open Aura directly </a>
<iframe
  title="Aura interactive mood journal demo"
  src="https://aura.mjames.dev/"
  style="width:100%;max-width:430px;height:844px;border:0"></iframe>
```

The permanent link opens Aura as a top-level page in the current tab. The child fallback uses `target="_top"` to leave its iframe. Neither path depends on popup permission.

Keep the standalone link visible before the frame loads. SameSite=Lax cookies work across the proposed same-site HTTPS subdomains, subject to browser policy. If embedded cookies are unavailable, the app offers a standalone path after the failed round-trip. It does not loop creating sessions. The parent and child exchange no messages or journal data, so there is no postMessage handshake to configure.

`npm run test:embed` runs an isolated local harness on 3112 against a fresh backend. It checks two loopback ports for same-site use and localhost versus 127.0.0.1 for cross-site cookie restrictions. This proves the fallback mechanics, not the final public host or physical Safari behavior.

Before public release, provision the approved host/domains, verify durable storage, cleanup, restart, TLS and real parent/child origins, then test the actual published portfolio entry. Keep the demo's temporary-data notice and fictional fixture labels. Public operation, native builds and account/sharing design remain separate delivery steps.
