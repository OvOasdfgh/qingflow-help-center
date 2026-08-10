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
  scripts: [
    {
      src: 'https://umami.qingflow.com/script.js',
      defer: true,
      'data-website-id': '252d3c97-a671-4a72-b28b-02421e2066c8',
    },
  ],
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
  plugins: [
    './plugins/legacy-url-redirects.mjs',
    './plugins/build-metadata.mjs',
  ],
  themeConfig: {
    image: 'img/qingflow-social-card.svg',
    metadata: [
      {
        name: 'google-site-verification',
        content: 'ITJmMPZJtrluqQhfEXCRtKwgBgRA_b0hiDR7xnuamlY',
      },
      {
        name: 'msvalidate.01',
        content: '19CBD6BE79CA5FADB70D1A935227F690',
      },
      {
        name: 'baidu-site-verification',
        content: 'codeva-9OBWaap2uX',
      },
      {
        name: '360-site-verification',
        content: '9b50ee3cb9cf6b1d1c4c94cf83110809',
      },
    ],
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
        {to: '/docs/release-notes', label: '更新日志', position: 'left'},
        {
          href: 'https://qingflow.com/?utm_source=helpcenter',
          label: '官网',
          position: 'right',
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'navbar__external-action navbar__external-action--website',
          'data-umami-event': 'navbar-website',
        },
        {
          href: 'https://qingflow.com/passport/login?utm_source=helpcenter',
          label: '免费试用',
          position: 'right',
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'navbar__external-action navbar__external-action--trial',
          'data-umami-event': 'navbar-free-trial',
        },
        {
          to: '/search',
          label: '搜索',
          position: 'right',
          'data-umami-event': 'search',
          'data-umami-event-location': 'navbar',
        },
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
              to: '/docs/getting-started',
            },
            {
              label: '轻流简介',
              to: '/docs/product-guides/qingflow-introduction',
            },
            {
              label: '搜索文档',
              to: '/search',
              'data-umami-event': 'search',
              'data-umami-event-location': 'footer',
            },
          ],
        },
        {
          title: '产品配置',
          items: [
            {
              label: '管理后台',
              to: '/docs/product-guides/admin-console',
            },
            {
              label: '权限管理',
              to: '/docs/product-guides/admin-console/permissions',
            },
            {
              label: '搭建技巧',
              to: '/docs/building-guides/inventory-outbound-validation',
            },
          ],
        },
        {
          title: '资源',
          items: [
            {
              label: 'OPENAPI',
              to: '/docs/product-guides/qing-code/openapi',
            },
            {
              label: '解决方案',
              to: '/docs/solutions/inventory-management',
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
