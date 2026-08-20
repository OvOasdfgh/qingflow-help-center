import type {FormEvent, ReactNode} from 'react';
import {useEffect, useRef, useState} from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import {
  ArrowRight,
  ChevronRight,
  FileSearch,
  LoaderCircle,
  Search,
  Sparkles,
} from 'lucide-react';

import styles from './search.module.css';

type SearchDocument = {
  doc_id?: string;
  record_type?: 'document' | 'section';
  title?: string;
  section?: string;
  breadcrumb?: string;
  keywords?: string[];
  content?: string;
  url?: string;
  version?: string;
  language?: string;
  product?: string;
  tags?: string[];
};

type SearchHit = {
  document?: SearchDocument;
  highlights?: Array<{
    snippet?: string;
  }>;
};

type SearchState = 'idle' | 'loading' | 'ready' | 'error';
type SynonymGroup = {terms: string[]};
type LocalSearchData = {documents: SearchDocument[]; synonymGroups: SynonymGroup[]};

const localDocuments: SearchDocument[] = [
  {
    title: '新手指南',
    section: '快速开始',
    content: '认识轻流，了解核心概念并开始使用产品。',
    url: '/docs/getting-started',
    tags: ['入门', '帮助中心'],
  },
  {
    title: '如何收集和流转数据',
    section: '快速开始',
    content: '使用表单和流程收集、处理并流转业务数据。',
    url: '/docs/product-guides/qingflow-introduction/collect-and-route-data',
    tags: ['表单', '流程', '数据'],
  },
  {
    title: '轻流简介',
    section: '快速开始',
    content: '了解轻流的核心功能、应用场景和账号模式。',
    url: '/docs/product-guides/qingflow-introduction',
    tags: ['轻流', '入门'],
  },
  {
    title: '流程引擎',
    section: '流程与审批',
    content: '配置申请、审批、填写和抄送节点，管理业务流程。',
    url: '/docs/product-guides/workflow-engine',
    tags: ['审批', '流程', '待办'],
  },
  {
    title: '权限管理',
    section: '管理后台',
    content: '配置工作区权限、高级权限和管理员角色。',
    url: '/docs/product-guides/admin-console/permissions',
    tags: ['权限', '管理员'],
  },
  {
    title: '更新日志',
    section: '更新动态',
    content: '查看轻流各版本的产品功能更新记录。',
    url: '/docs/release-notes',
    tags: ['更新', '版本'],
  },
  {
    title: 'OPENAPI',
    section: '开放平台',
    content: '了解轻流开放接口、鉴权方式和系统集成能力。',
    url: '/docs/product-guides/qing-code/openapi',
    tags: ['API', '开发'],
  },
  {
    title: '常见问题',
    section: 'FAQ',
    content: '查找轻流产品使用过程中常见问题的处理方法。',
    url: '/docs/faq',
    tags: ['问题', 'FAQ'],
  },
];

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/[\s\u3000]+/g, '').trim();
}

function expandQuery(query: string, synonymGroups: SynonymGroup[]): string[] {
  const variants = new Set([query]);
  const normalizedQuery = normalizeSearchText(query);

  synonymGroups.forEach(({terms}) => {
    const normalizedTerms = terms.map(normalizeSearchText);
    if (normalizedTerms.some((term) => normalizedQuery.includes(term))) {
      terms.forEach((term) => variants.add(term));
    }
  });

  return Array.from(variants);
}

function searchLocalDocuments(
  query: string,
  documents: SearchDocument[],
  synonymGroups: SynonymGroup[],
): SearchHit[] {
  const variants = expandQuery(query, synonymGroups).map(normalizeSearchText);
  const fields: Array<[keyof SearchDocument, number]> = [
    ['title', 100],
    ['section', 80],
    ['keywords', 70],
    ['tags', 50],
    ['breadcrumb', 30],
    ['content', 10],
  ];
  const bestByDocument = new Map<string, {document: SearchDocument; score: number}>();

  documents.forEach((document) => {
    let score = 0;
    fields.forEach(([field, weight]) => {
      const values = Array.isArray(document[field])
        ? (document[field] as string[])
        : [String(document[field] ?? '')];
      const value = normalizeSearchText(values.join(' '));
      variants.forEach((variant) => {
        if (!variant || !value.includes(variant)) return;
        score += weight * (variant === normalizeSearchText(query) ? 1 : 0.72);
        if (value.startsWith(variant)) score += Math.round(weight * 0.2);
      });
    });

    if (score === 0) return;
    const key = document.doc_id ?? document.url ?? document.title ?? '';
    const previous = bestByDocument.get(key);
    if (!previous || score > previous.score) {
      bestByDocument.set(key, {document, score});
    }
  });

  return Array.from(bestByDocument.values())
    .sort(
      (left, right) =>
        right.score - left.score ||
        (left.document.title ?? '').localeCompare(right.document.title ?? '', 'zh-CN') ||
        (left.document.url ?? '').localeCompare(right.document.url ?? ''),
    )
    .slice(0, 8)
    .map(({document}) => ({document}));
}

export default function SearchPage(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const searchPath = useBaseUrl('/search');
  const searchIndexPath = useBaseUrl('/search-records.json');
  const searchSynonymsPath = useBaseUrl('/search-synonyms.json');
  const localIndexPromise = useRef<Promise<LocalSearchData> | null>(null);
  const customFields = (siteConfig.customFields ?? {}) as {
    typesense?: {
      host?: string;
      searchApiKey?: string;
      collection?: string;
    };
  };
  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>('idle');
  const [results, setResults] = useState<SearchHit[]>([]);
  const [notice, setNotice] = useState('');

  const typesense = customFields.typesense ?? {};
  const canUseTypesense = Boolean(typesense.host && typesense.searchApiKey);

  function getLocalDocuments() {
    if (!localIndexPromise.current) {
      localIndexPromise.current = Promise.all([
        fetch(searchIndexPath),
        fetch(searchSynonymsPath),
      ])
        .then(async ([documentsResponse, synonymsResponse]) => {
          if (!documentsResponse.ok) {
            throw new Error(`Local search index responded with ${documentsResponse.status}`);
          }
          const documents: unknown = await documentsResponse.json();
          const synonyms: unknown = synonymsResponse.ok ? await synonymsResponse.json() : [];
          return {
            documents: Array.isArray(documents) ? (documents as SearchDocument[]) : localDocuments,
            synonymGroups: Array.isArray(synonyms) ? (synonyms as SynonymGroup[]) : [],
          };
        })
        .catch(() => ({documents: localDocuments, synonymGroups: []}));
    }

    return localIndexPromise.current;
  }

  async function runSearch(nextQuery: string) {
    const trimmedQuery = nextQuery.trim();
    if (!trimmedQuery) {
      setResults([]);
      setState('idle');
      setNotice('');
      return;
    }

    setState('loading');
    setNotice('');

    if (!canUseTypesense) {
      const documents = await getLocalDocuments();
      setResults(searchLocalDocuments(trimmedQuery, documents.documents, documents.synonymGroups));
      setState('ready');
      return;
    }

    const host = typesense.host?.replace(/\/$/, '');
    const collection = typesense.collection || 'qingflow_help_docs';
    try {
      const response = await fetch(`${host}/multi_search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-TYPESENSE-API-KEY': typesense.searchApiKey ?? '',
        },
        body: JSON.stringify({
          searches: [
            {
              collection,
              q: trimmedQuery,
              query_by: 'title,section,keywords,tags,breadcrumb,content',
              query_by_weights: '12,10,8,6,4,1',
              highlight_fields: 'title,section,keywords,content',
              prioritize_exact_match: true,
              prioritize_token_position: true,
              text_match_type: 'max_score',
              prefix: 'true,true,true,true,false,false',
              num_typos: 1,
              per_page: 8,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Search service responded with ${response.status}`);
      }

      const payload = await response.json();
      setResults(payload.results?.[0]?.hits ?? []);
      setState('ready');
    } catch {
      const documents = await getLocalDocuments();
      setResults(searchLocalDocuments(trimmedQuery, documents.documents, documents.synonymGroups));
      setState('ready');
      setNotice('在线搜索暂不可用，已显示站内索引结果。');
    }
  }

  useEffect(() => {
    const nextQuery = new URLSearchParams(window.location.search).get('q') ?? '';
    setQuery(nextQuery);
    if (nextQuery) void runSearch(nextQuery);
  }, []);

  function updateUrl(nextQuery: string) {
    const nextUrl = nextQuery.trim()
      ? `${searchPath}?q=${encodeURIComponent(nextQuery.trim())}`
      : searchPath;
    window.history.replaceState({}, '', nextUrl);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateUrl(query);
    void runSearch(query);
  }

  function handleSuggestion(nextQuery: string) {
    setQuery(nextQuery);
    updateUrl(nextQuery);
    void runSearch(nextQuery);
  }

  return (
    <Layout title="搜索帮助文档" description="搜索轻流产品帮助、操作指南和开发文档。">
      <main className={styles.searchPage}>
        <header className={styles.searchHero}>
          <div className="container">
            <div className={styles.heroInner}>
              <p className={styles.eyebrow}>
                <Sparkles aria-hidden="true" size={16} />
                站内搜索
              </p>
              <Heading as="h1">搜索帮助文档</Heading>
              <p>描述你遇到的问题，查找相关功能说明、操作步骤和最佳实践。</p>
              <form className={styles.searchForm} onSubmit={handleSubmit}>
                <Search aria-hidden="true" size={21} />
                <input
                  className={styles.searchInput}
                  type="search"
                  placeholder="例如：审批中心怎么配置"
                  aria-label="搜索帮助文档"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  autoFocus
                />
                <button
                  type="submit"
                  data-umami-event="search"
                  data-umami-event-location="search-page">
                  搜索 <ArrowRight aria-hidden="true" size={18} />
                </button>
              </form>
              <div className={styles.suggestions}>
                <span>热门搜索</span>
                {['导入 Markdown 文档', '审批中心怎么配置', '私有化部署拓扑'].map(
                  (suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleSuggestion(suggestion)}>
                      {suggestion}
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>
        </header>

        <section className={styles.resultsSection}>
          <div className="container">
            <div className={styles.resultsInner}>
              {state === 'loading' ? (
                <div className={styles.stateMessage}>
                  <LoaderCircle className={styles.spinner} aria-hidden="true" size={24} />
                  正在查找相关文档...
                </div>
              ) : null}

              {notice ? <p className={styles.notice}>{notice}</p> : null}

              {state === 'ready' ? (
                <div className={styles.resultsHeader}>
                  <Heading as="h2">搜索结果</Heading>
                  <span>{results.length} 篇相关文档</span>
                </div>
              ) : null}

              {state === 'ready' && results.length === 0 ? (
                <div className={styles.emptyState}>
                  <FileSearch aria-hidden="true" size={30} />
                  <Heading as="h2">没有找到相关内容</Heading>
                  <p>试试缩短问题，或者使用功能名称重新搜索。</p>
                  <Link to="/docs/getting-started">浏览完整文档目录</Link>
                </div>
              ) : null}

              {state === 'idle' ? (
                <div className={styles.emptyState}>
                  <Search aria-hidden="true" size={30} />
                  <Heading as="h2">从一个问题开始</Heading>
                  <p>输入产品功能、操作目标或遇到的问题。</p>
                </div>
              ) : null}

              <div className={styles.results}>
                {results.map((result, index) => {
                  const document = result.document ?? {};
                  const resultTitle =
                    document.record_type === 'section'
                      ? document.section ?? document.title
                      : document.title;
                  const snippet =
                    result.highlights?.[0]?.snippet ??
                    document.content?.slice(0, 180) ??
                    '';
                  const tags = document.tags ?? [];

                  return (
                    <article key={`${document.url ?? 'result'}-${index}`} className={styles.resultRow}>
                      <Link to={document.url ?? '/docs/getting-started'}>
                        <div className={styles.resultTopline}>
                          <span>{document.section ?? '帮助文档'}</span>
                          {document.version ? <small>{document.version}</small> : null}
                        </div>
                        <Heading as="h2">{resultTitle ?? '未命名文档'}</Heading>
                        {document.record_type === 'section' && document.title ? (
                          <p className={styles.resultBreadcrumb}>{document.title}</p>
                        ) : null}
                        <p>{snippet}</p>
                        {tags.length > 0 ? (
                          <div className={styles.tagRow}>
                            {tags.slice(0, 4).map((tag) => (
                              <span key={tag}>{tag}</span>
                            ))}
                          </div>
                        ) : null}
                        <ChevronRight className={styles.resultArrow} aria-hidden="true" size={21} />
                      </Link>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
