import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const siteUrl =
  process.env.DOCS_URL ??
  (isGitHubPages
    ? 'https://nonepointer666.github.io'
    : 'https://help-center.qingflow.com');
const baseUrl =
  process.env.DOCS_BASE_URL ??
  (isGitHubPages ? '/qingflow-help-center/' : '/');

const config: Config = {
  title: '轻流帮助中心',
  tagline: '轻流产品使用指南、最佳实践与开发文档',
  favicon: 'img/qingflow-favicon.png',
  future: {
    v4: true,
  },
  url: siteUrl,
  baseUrl,
  trailingSlash: true,
  organizationName: 'nonepointer666',
  projectName: 'qingflow-help-center',
  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  i18n: {
    defaultLocale: 'zh-CN',
    locales: ['zh-CN'],
  },
  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: 'docs',
          sidebarPath: './sidebars.ts',
          editUrl:
            process.env.GITHUB_EDIT_URL ??
            'https://github.com/nonepointer666/qingflow-help-center/tree/main/',
          showLastUpdateTime: false,
          showLastUpdateAuthor: false,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    image: 'img/qingflow-social-card.svg',
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: '轻流帮助中心',
      logo: {
        alt: '轻流 Logo',
        src: 'img/qingflow-logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'helpCenterSidebar',
          position: 'left',
          label: '产品指南',
        },
        {to: '/docs/更新动态/更新日志', label: '更新日志', position: 'left'},
        {to: '/search', label: '搜索', position: 'right'},
        {
          href: 'https://github.com/nonepointer666/qingflow-help-center',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'light',
      links: [
        {
          title: '产品使用',
          items: [
            {
              label: '新手指南',
              to: '/docs/新手指南',
            },
            {
              label: '轻流简介',
              to: '/docs/帮助文档/轻流简介',
            },
            {label: '搜索文档', to: '/search'},
          ],
        },
        {
          title: '产品配置',
          items: [
            {
              label: '管理后台',
              to: '/docs/帮助文档/管理后台',
            },
            {
              label: '权限管理',
              to: '/docs/帮助文档/管理后台/工作区管理/权限管理',
            },
            {
              label: '搭建技巧',
              to: '/docs/搭建技巧/按场景分类/进销存-仓库/如何在出库时进行出库数量的安全校验',
            },
          ],
        },
        {
          title: '资源',
          items: [
            {
              label: 'OPENAPI',
              to: '/docs/帮助文档/轻代码/openapi',
            },
            {
              label: '解决方案',
              to: '/docs/解决方案/按场景分类/进销存-仓库/进销存方案介绍',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/nonepointer666/qingflow-help-center',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Qingflow`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.oneDark,
    },
  } satisfies Preset.ThemeConfig,
  customFields: {
    repoUrl:
      process.env.GITHUB_EDIT_URL ??
      'https://github.com/nonepointer666/qingflow-help-center/tree/main/',
    typesense: {
      host: process.env.TYPESENSE_HOST ?? '',
      searchApiKey: process.env.TYPESENSE_SEARCH_API_KEY ?? '',
      collection: process.env.TYPESENSE_COLLECTION ?? 'qingflow_help_docs',
      enableSemantic: process.env.TYPESENSE_ENABLE_SEMANTIC === 'true',
    },
  },
};

export default config;
