import {mkdir, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';

const cwd = process.cwd();
const docsRoot = path.join(cwd, 'docs');
const outputDir = path.join(cwd, '.tmp');
const outputFile = path.join(outputDir, 'search-records.json');
const publicOutputFile = path.join(cwd, 'static', 'search-records.json');
const rawDocsDir = path.join(cwd, 'static', 'raw-docs');
const llmsOutputFile = path.join(cwd, 'static', 'llms.txt');
const llmsFullOutputFile = path.join(cwd, 'static', 'llms-full.txt');

const sectionByRoute = new Map([
  ['getting-started', '新手指南'],
  ['release-notes', '更新动态'],
  ['product-guides', '帮助文档'],
  ['solutions', '解决方案'],
  ['building-guides', '搭建技巧'],
  ['faq', '常见问题-faq'],
  ['video-guides', '视频中心'],
  ['contact', '联系我们'],
]);

const llmsSections = [
  {
    section: '新手指南',
    title: '新手指南',
    path: '/docs/getting-started/',
    description: '认识轻流核心概念并开始搭建第一个应用。',
  },
  {
    section: '帮助文档',
    title: '产品帮助文档',
    path: '/docs/product-guides/qingflow-introduction/',
    description: '查阅表单、流程、权限、数据和开放平台等产品能力。',
  },
  {
    section: '搭建技巧',
    title: '搭建技巧',
    path: '/docs/building-guides/inventory-outbound-validation/',
    description: '按功能和业务场景查找系统搭建方法。',
  },
  {
    section: '常见问题-faq',
    title: '常见问题',
    path: '/docs/faq/',
    description: '快速定位产品使用中的高频问题。',
  },
  {
    section: '解决方案',
    title: '解决方案',
    path: '/docs/solutions/inventory-management/',
    description: '浏览按行业和场景整理的无代码解决方案。',
  },
  {
    section: '更新动态',
    title: '更新动态',
    path: '/docs/release-notes/',
    description: '了解产品更新日志和重要公告。',
  },
  {
    section: '视频中心',
    title: '视频中心',
    path: '/docs/video-guides/',
    description: '通过视频教程学习轻流产品。',
  },
  {
    section: '联系我们',
    title: '联系我们',
    path: '/docs/contact/',
    description: '获取轻流服务与支持联系方式。',
  },
];

async function getMarkdownFiles(dir) {
  const entries = await readdir(dir, {withFileTypes: true});
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return getMarkdownFiles(fullPath);
      }
      if (entry.isFile() && /\.(md|mdx)$/i.test(entry.name)) {
        return [fullPath];
      }
      return [];
    }),
  );

  return nested.flat();
}

function parseFrontMatter(source) {
  if (!source.startsWith('---\n')) {
    return {attributes: {}, body: source};
  }

  const end = source.indexOf('\n---\n', 4);
  if (end === -1) {
    return {attributes: {}, body: source};
  }

  const rawFrontMatter = source.slice(4, end).trim();
  const body = source.slice(end + 5).trim();
  const attributes = {};

  for (const line of rawFrontMatter.split('\n')) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
    attributes[key] = value;
  }

  return {attributes, body};
}

function extractTitle(body, frontMatterTitle) {
  if (frontMatterTitle) {
    return frontMatterTitle;
  }

  const firstHeading = body.match(/^#\s+(.+)$/m);
  return firstHeading?.[1]?.trim() ?? 'Untitled';
}

function extractSection(relativePath, attributes) {
  const slugSection = attributes.slug?.split('/').filter(Boolean)[0];
  if (slugSection) {
    return sectionByRoute.get(slugSection) ?? slugSection;
  }

  const parts = relativePath.split(path.sep);
  return parts.length > 1 ? parts[0] : 'general';
}

function normalizeContent(body) {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]+\]\([^)]+\)/g, ' ')
    .replace(/[#>*_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanMarkdown(body) {
  return body
    .replace(/\n---\s*\n+\[查看语雀原文\]\([^)]+\)\s*$/s, '')
    .replace(/\n+请暂时访问语雀原文[^\n]*\s*$/s, '')
    .trim();
}

function inferTags(relativePath, attributes, title) {
  const slugTags = (attributes.slug ?? '')
    .split('/')
    .filter((part) => part && part !== title)
    .slice(0, 4);
  const fallbackTags = relativePath
    .replace(/\.(md|mdx)$/i, '')
    .split(path.sep)
    .filter((part) => part && part !== 'migrated');
  const tags = new Set(slugTags.length > 0 ? slugTags : fallbackTags);
  return Array.from(tags);
}

function buildUrl(relativePath, attributes) {
  if (attributes.slug) {
    return withTrailingSlash(`/docs${attributes.slug}`);
  }

  const withoutExtension = relativePath.replace(/\.(md|mdx)$/i, '');
  return withTrailingSlash(`/docs/${withoutExtension.replaceAll(path.sep, '/')}`);
}

function withTrailingSlash(url) {
  return url.endsWith('/') ? url : `${url}/`;
}

async function main() {
  const markdownFiles = await getMarkdownFiles(docsRoot);
  const records = [];
  const rawWrites = [];

  await rm(rawDocsDir, {recursive: true, force: true});

  for (const filePath of markdownFiles) {
    const relativePath = path.relative(docsRoot, filePath);
    const source = await readFile(filePath, 'utf8');
    const {attributes, body} = parseFrontMatter(source);
    const cleanBody = cleanMarkdown(body);
    const title = extractTitle(cleanBody, attributes.title);
    const content = normalizeContent(cleanBody);
    const rawRelativePath = relativePath.replace(/\.(md|mdx)$/i, '.md');
    const rawOutputPath = path.join(rawDocsDir, rawRelativePath);
    const rawUrl = `/raw-docs/${rawRelativePath.replaceAll(path.sep, '/')}`;
    const rawMarkdown = /^#\s+.+$/m.test(cleanBody)
      ? `${cleanBody}\n`
      : `# ${title}\n\n${cleanBody}\n`;

    rawWrites.push(
      mkdir(path.dirname(rawOutputPath), {recursive: true}).then(() =>
        writeFile(rawOutputPath, rawMarkdown),
      ),
    );

    records.push({
      id: relativePath.replaceAll(path.sep, '-').replace(/\.(md|mdx)$/i, ''),
      title,
      section: extractSection(relativePath, attributes),
      content,
      url: buildUrl(relativePath, attributes),
      product: 'qingflow',
      version: 'current',
      language: 'zh-CN',
      tags: inferTags(relativePath, attributes, title),
      raw_url: rawUrl,
      updated_at: new Date().toISOString(),
      updated_at_ts: Date.now(),
    });
  }

  const serializedRecords = JSON.stringify(records, null, 2);
  const siteUrl = (process.env.DOCS_URL ?? 'https://help-center.qingflow.com').replace(
    /\/$/,
    '',
  );
  const llmsText = [
    '# 轻流帮助中心',
    '',
    '> 轻流产品使用指南、最佳实践、更新日志与开放平台文档。',
    '',
    '## 主要入口',
    '',
    ...llmsSections.map(
      (section) =>
        `- [${section.title}](${siteUrl}${section.path}): ${section.description}`,
    ),
    '',
    '## AI 资源',
    '',
    `- [完整文档索引](${siteUrl}/llms-full.txt): 包含全部 ${records.length} 篇文档的链接与摘要。`,
    `- [站点地图](${siteUrl}/sitemap.xml): 包含所有可抓取页面。`,
    '',
  ].join('\n');
  const llmsFullText = [
    '# 轻流帮助中心完整文档索引',
    '',
    `> 共 ${records.length} 篇文档。精简入口请访问 ${siteUrl}/llms.txt。`,
    '',
    ...llmsSections.flatMap((section) => [
      `## ${section.title}`,
      '',
      ...records
        .filter((record) => record.section === section.section)
        .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
        .map(
          (record) =>
            `- [${record.title}](${siteUrl}${record.url}): ${record.content.slice(0, 180)}`,
        ),
      '',
    ]),
  ].join('\n');

  await Promise.all([
    mkdir(outputDir, {recursive: true}),
    mkdir(path.dirname(publicOutputFile), {recursive: true}),
  ]);
  await Promise.all([
    ...rawWrites,
    writeFile(outputFile, serializedRecords),
    writeFile(publicOutputFile, serializedRecords),
    writeFile(llmsOutputFile, llmsText),
    writeFile(llmsFullOutputFile, llmsFullText),
  ]);

  console.log(
    `Generated ${records.length} search records, Markdown sources, llms.txt, and llms-full.txt`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
