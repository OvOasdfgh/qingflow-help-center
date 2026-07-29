import {readFileSync} from 'node:fs';
import {readdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

const commitEnvironmentVariables = [
  'BUILD_COMMIT',
  'GITHUB_SHA',
  'GIT_COMMIT',
  'CI_COMMIT_SHA',
];

function readPackedRef(gitDirectory, reference) {
  try {
    const packedRefs = readFileSync(path.join(gitDirectory, 'packed-refs'), 'utf8');
    const line = packedRefs
      .split('\n')
      .find((entry) => entry.endsWith(` ${reference}`));
    return line?.split(' ')[0];
  } catch {
    return undefined;
  }
}

function readCommitFromGitDirectory() {
  const gitDirectory = path.join(process.cwd(), '.git');

  try {
    const head = readFileSync(path.join(gitDirectory, 'HEAD'), 'utf8').trim();
    if (/^[0-9a-f]{40}$/i.test(head)) {
      return head;
    }

    const reference = head.match(/^ref:\s+(.+)$/)?.[1];
    if (!reference) {
      return undefined;
    }

    try {
      return readFileSync(path.join(gitDirectory, reference), 'utf8').trim();
    } catch {
      return readPackedRef(gitDirectory, reference);
    }
  } catch {
    return undefined;
  }
}

function resolveBuildCommit() {
  const environmentCommit = commitEnvironmentVariables
    .map((name) => process.env[name]?.trim())
    .find((value) => value && /^[0-9a-f]{7,40}$/i.test(value));

  return environmentCommit ?? readCommitFromGitDirectory() ?? 'unknown';
}

async function findHtmlFiles(directory) {
  const entries = await readdir(directory, {withFileTypes: true});
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return findHtmlFiles(entryPath);
      }
      return entry.isFile() && entry.name.endsWith('.html') ? [entryPath] : [];
    }),
  );
  return files.flat();
}

export default function buildMetadataPlugin() {
  const commit = resolveBuildCommit();
  const buildTime = new Date().toISOString();

  return {
    name: 'qingflow-build-metadata',
    async postBuild({outDir}) {
      const htmlFiles = await findHtmlFiles(outDir);
      const bodyTag = `<body data-build-commit="${commit}" data-build-time="${buildTime}"`;

      await Promise.all(
        htmlFiles.map(async (filePath) => {
          const html = await readFile(filePath, 'utf8');
          const output = html.replace(/<body(?=[\s>])/, bodyTag);
          if (output === html) {
            throw new Error(`Unable to add build metadata to ${filePath}`);
          }
          await writeFile(filePath, output);
        }),
      );

      console.log(
        `Stamped ${htmlFiles.length} HTML files with commit ${commit} at ${buildTime}`,
      );
    },
  };
}
