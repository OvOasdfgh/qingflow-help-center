import React, {type ReactNode} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import {PageMetadata} from '@docusaurus/theme-common';

export default function DocItemMetadata(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const {metadata, frontMatter, assets} = useDoc();
  const sourceUpdatedAt = metadata.frontMatter.source_updated_at as string | undefined;
  const canonicalPath = metadata.permalink.endsWith('/')
    ? metadata.permalink
    : `${metadata.permalink}/`;
  const canonicalUrl = new URL(canonicalPath, siteConfig.url).toString();
  const logoUrl = new URL(`${siteConfig.baseUrl}img/qingflow-logo.png`, siteConfig.url).toString();
  const article = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: metadata.title,
    description: metadata.description,
    inLanguage: 'zh-CN',
    mainEntityOfPage: canonicalUrl,
    url: canonicalUrl,
    dateModified: sourceUpdatedAt,
    publisher: {
      '@type': 'Organization',
      name: '轻流',
      logo: {'@type': 'ImageObject', url: logoUrl},
    },
  };
  return (
    <PageMetadata
      title={metadata.title}
      description={metadata.description}
      keywords={frontMatter.keywords}
      image={assets.image ?? frontMatter.image}>
      <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />
      <meta property="og:type" content="article" />
      <script type="application/ld+json">{JSON.stringify(article)}</script>
    </PageMetadata>
  );
}
