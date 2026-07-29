import React, {type ReactNode, useEffect, useState} from 'react';
import clsx from 'clsx';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {useWindowSize} from '@docusaurus/theme-common';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import {Check, Copy} from 'lucide-react';
import ContentVisibility from '@theme/ContentVisibility';
import DocBreadcrumbs from '@theme/DocBreadcrumbs';
import DocItemContent from '@theme/DocItem/Content';
import DocItemFooter from '@theme/DocItem/Footer';
import DocItemPaginator from '@theme/DocItem/Paginator';
import DocItemTOCDesktop from '@theme/DocItem/TOC/Desktop';
import DocItemTOCMobile from '@theme/DocItem/TOC/Mobile';
import DocVersionBadge from '@theme/DocVersionBadge';
import DocVersionBanner from '@theme/DocVersionBanner';
import type {Props} from '@theme/DocItem/Layout';

import styles from './styles.module.css';

type CopyState = 'idle' | 'copied' | 'error';

function useDocTOC() {
  const {frontMatter, toc} = useDoc();
  const windowSize = useWindowSize();
  const hidden = frontMatter.hide_table_of_contents;
  const canRender = !hidden && toc.length > 0;

  return {
    hidden,
    mobile: canRender ? <DocItemTOCMobile /> : undefined,
    desktop:
      canRender && (windowSize === 'desktop' || windowSize === 'ssr') ? (
        <DocItemTOCDesktop />
      ) : undefined,
  };
}

function DocToolbar() {
  const {metadata} = useDoc();
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const sourcePath = metadata.source
    .replace(/^@site\/docs\//, '')
    .replace(/\.(md|mdx)$/i, '.md');
  const rawUrl = useBaseUrl(`/raw-docs/${sourcePath}`);

  useEffect(() => {
    if (copyState === 'idle') return undefined;
    const timer = window.setTimeout(() => setCopyState('idle'), 1800);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  async function copyMarkdown() {
    try {
      const response = await fetch(rawUrl);
      if (!response.ok) throw new Error(`Markdown request failed: ${response.status}`);
      const markdown = await response.text();
      await navigator.clipboard.writeText(markdown);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  }

  const label =
    copyState === 'copied'
      ? '已复制'
      : copyState === 'error'
        ? '复制失败'
        : '复制为 Markdown';

  return (
    <div className={styles.docToolbar}>
      <DocBreadcrumbs />
      <button
        type="button"
        className={styles.copyButton}
        onClick={copyMarkdown}
        aria-label="复制页面为 Markdown">
        {copyState === 'copied' ? (
          <Check aria-hidden="true" size={16} />
        ) : (
          <Copy aria-hidden="true" size={16} />
        )}
        <span>{label}</span>
      </button>
    </div>
  );
}

export default function DocItemLayout({children}: Props): ReactNode {
  const docTOC = useDocTOC();
  const {metadata} = useDoc();

  return (
    <div className={clsx('row', styles.docLayout)}>
      <div className={clsx('col', docTOC.desktop && styles.docItemCol)}>
        <ContentVisibility metadata={metadata} />
        <DocVersionBanner />
        <div className={styles.docItemContainer}>
          <article>
            <DocToolbar />
            <DocVersionBadge />
            {docTOC.mobile}
            <DocItemContent>{children}</DocItemContent>
            <DocItemFooter />
          </article>
          <DocItemPaginator />
        </div>
      </div>
      {docTOC.desktop && (
        <aside className={clsx('col col--3', styles.tocColumn)}>{docTOC.desktop}</aside>
      )}
    </div>
  );
}
