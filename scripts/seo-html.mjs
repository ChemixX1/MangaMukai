import config from '../server/backend-patches/seo-config.json' with { type: 'json' };

const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function seoHtml(html, env = {}) {
  const home = config.routes['/'];
  html = html.replace(/<title>.*?<\/title>/s, `<title>${escape(home.title)}</title>`)
    .replace(/(<meta (?:name|property)="(?:description|og:description)" content=")[^"]*"/g, `$1${escape(home.description)}"`)
    .replace(/(<meta property="og:title" content=")[^"]*"/g, `$1${escape(home.title)}"`);
  const tags = [];
  for (const [name, value] of [
    ['google-site-verification', env.VITE_GOOGLE_SITE_VERIFICATION],
    ['msvalidate.01', env.VITE_BING_SITE_VERIFICATION],
  ]) {
    if (value?.trim()) tags.push(`<meta name="${name}" content="${escape(value.trim())}" />`);
  }
  if (env.VITE_GITHUB_PAGES === 'true') {
    html = html.replace(/(<meta name="(?:robots|googlebot|googlebot-image)" content=")[^"]*"/g, '$1noindex,nofollow"');
  }
  return html.replace('</head>', `${tags.join('\n')}\n</head>`);
}
