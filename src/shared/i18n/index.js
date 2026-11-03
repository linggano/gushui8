export function localeMiddleware(req, res, next) {
  const supported = ['zh-CN', 'en-US'];
  let lang = req.query.lang || req.session?.lang || req.headers['accept-language']?.split(',')[0];
  if (!supported.includes(lang)) lang = 'zh-CN';
  req.setLocale(lang);
  if (req.query.lang) req.session.lang = lang;
  res.locals.locale = lang;
  res.locale = lang;
  next();
}
