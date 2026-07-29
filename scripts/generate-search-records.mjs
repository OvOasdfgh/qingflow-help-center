import {mkdir, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';

const cwd = process.cwd();
const docsRoot = path.join(cwd, 'docs');
const outputDir = path.join(cwd, '.tmp');
const outputFile = path.join(outputDir, 'search-records.json');
const publicOutputFile = path.join(cwd, 'static', 'search-records.json');
const rawDocsDir = path.join(cwd, 'static', 'raw-docs');
const llmsOutputFile = path.join(cwd, 'static', 'llms.txt');

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
    return slugSection;
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
    return `/docs${attributes.slug}`;
  }

  const withoutExtension = relativePath.replace(/\.(md|mdx)$/i, '');
  return `/docs/${withoutExtension.replaceAll(path.sep, '/')}`;
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
    '## 文档',
    '',
    ...records.map(
      (record) =>
        `- [${record.title}](${siteUrl}${record.url}): ${record.content.slice(0, 180)}`,
    ),
    '',
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
  ]);

  console.log(
    `Generated ${records.length} search records, Markdown sources, and llms.txt`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
