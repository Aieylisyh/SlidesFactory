/**
 * Public, non-secret remote navigator endpoints.
 *
 * Production endpoints for the SFK static site and shared WSS host.
 * HTTPS pages use these values. Local HTTP pages retain the existing LAN
 * fallback unless a runtime `ws` or `remote` parameter explicitly overrides it.
 */
window.DeckRemoteConfig = Object.assign({
    wsUrl: 'wss://ws.sska.site/deck-remote',
    remoteUrl: 'https://sska.site/sfkdoc/remoteNavigator/remote.html?v=20260715'
}, window.DeckRemoteConfig || {});
