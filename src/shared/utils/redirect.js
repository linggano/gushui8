function safeBackUrl(req, fallback = '/') {
  const referer = req.get('Referer') || req.get('referer');
  if (referer) {
    try {
      const url = new URL(referer);
      if (url.origin === req.protocol + '://' + req.get('host')) {
        return url.pathname + url.search;
      }
    } catch (_) {}
  }
  return fallback;
}

module.exports = { safeBackUrl };