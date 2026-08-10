import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

const redirectsFile = path.join(process.cwd(), 'data', 'legacy-url-redirects.json');

function withBaseUrl(baseUrl, route) {
  if (baseUrl === '/') {
    return route;
  }
  return `${baseUrl.replace(/\/$/, '')}${route}`;
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export default function legacyUrlRedirectsPlugin(context) {
  const {baseUrl, url} = context.siteConfig;

  return {
    name: 'qingflow-legacy-url-redirects',
    async postBuild({outDir, routesPaths}) {
      const redirects = JSON.parse(await readFile(redirectsFile, 'utf8'));
      const currentRoutes = new Set(routesPaths.map((route) => route.replace(/\/$/, '')));

      await Promise.all(
        redirects.map(async ({from, to}) => {
          const oldRoute = `/docs${from}`;
          const newRoute = `/docs${to}/`.replace(/\/{2,}/g, '/');
          if (currentRoutes.has(oldRoute.replace(/\/$/, ''))) {
            throw new Error(`Legacy redirect conflicts with a current route: ${oldRoute}`);
          }

          const target = withBaseUrl(baseUrl, newRoute);
          const canonicalUrl = `${url.replace(/\/$/, '')}${target}`;
          const outputPath = path.join(
            outDir,
            ...oldRoute.split('/').filter(Boolean),
            'index.html',
          );
          const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="robots" content="noindex,follow">
  <meta http-equiv="refresh" content="0;url=${escapeHtml(target)}">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <title>页面已迁移 | 轻流帮助中心</title>
</head>
<body>
  <p>页面已迁移，正在跳转到<a href="${escapeHtml(target)}">新地址</a>。</p>
  <script>location.replace(new URL(${JSON.stringify(target)} + location.search + location.hash, location.origin).href);</script>
</body>
</html>
`;
          await mkdir(path.dirname(outputPath), {recursive: true});
          await writeFile(outputPath, html);
        }),
      );

      console.log(`Generated ${redirects.length} legacy document redirects`);
    },
  };
}
