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
  title?: string;
  section?: string;
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

const localDocuments: SearchDocument[] = [
  {
    title: '新手指南',
    section: '快速开始',
    content: '认识轻流，了解核心概念并开始使用产品。',
    url: '/docs/新手指南',
    tags: ['入门', '帮助中心'],
  },
  {
    title: '如何收集和流转数据',
    section: '快速开始',
    content: '使用表单和流程收集、处理并流转业务数据。',
    url: '/docs/帮助文档/轻流简介/快速入门/核心功能速览/如何收集和流转数据',
    tags: ['表单', '流程', '数据'],
  },
  {
    title: '轻流简介',
    section: '快速开始',
    content: '了解轻流的核心功能、应用场景和账号模式。',
    url: '/docs/帮助文档/轻流简介',
    tags: ['轻流', '入门'],
  },
  {
    title: '流程引擎',
    section: '流程与审批',
    content: '配置申请、审批、填写和抄送节点，管理业务流程。',
    url: '/docs/帮助文档/流程引擎',
    tags: ['审批', '流程', '待办'],
  },
  {
    title: '权限管理',
    section: '管理后台',
    content: '配置工作区权限、高级权限和管理员角色。',
    url: '/docs/帮助文档/管理后台/工作区管理/权限管理',
    tags: ['权限', '管理员'],
  },
  {
    title: '更新日志',
    section: '更新动态',
    content: '查看轻流各版本的产品功能更新记录。',
    url: '/docs/更新动态/更新日志',
    tags: ['更新', '版本'],
  },
  {
    title: 'OPENAPI',
    section: '开放平台',
    content: '了解轻流开放接口、鉴权方式和系统集成能力。',
    url: '/docs/帮助文档/轻代码/openapi',
    tags: ['API', '开发'],
  },
  {
    title: '常见问题',
    section: 'FAQ',
    content: '查找轻流产品使用过程中常见问题的处理方法。',
    url: '/docs/常见问题-faq/一句话qa',
    tags: ['问题', 'FAQ'],
  },
];

function searchLocalDocuments(query: string, documents: SearchDocument[]): SearchHit[] {
  const normalizedQuery = query.toLowerCase().replace(/\s+/g, '');
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);

  return documents
    .map((document) => {
      const corpus = [
        document.title,
        document.section,
        document.content,
        ...(document.tags ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const compactCorpus = corpus.replace(/\s+/g, '');
      let score = compactCorpus.includes(normalizedQuery) ? 20 : 0;

      words.forEach((word) => {
        if (corpus.includes(word)) score += 5;
      });

      if (normalizedQuery.length > 2) {
        for (let index = 0; index < normalizedQuery.length - 1; index += 1) {
          if (compactCorpus.includes(normalizedQuery.slice(index, index + 2))) {
            score += 1;
          }
        }
      }

      return {document, score};
    })
    .filter((item) => item.score >= 2)
    .sort((left, right) => right.score - left.score)
    .slice(0, 8)
    .map(({document}) => ({document}));
}

export default function SearchPage(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const searchPath = useBaseUrl('/search');
  const searchIndexPath = useBaseUrl('/search-records.json');
  const localIndexPromise = useRef<Promise<SearchDocument[]> | null>(null);
  const customFields = (siteConfig.customFields ?? {}) as {
    typesense?: {
      host?: string;
      searchApiKey?: string;
      collection?: string;
      enableSemantic?: boolean;
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
      localIndexPromise.current = fetch(searchIndexPath)
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`Local search index responded with ${response.status}`);
          }

          const documents: unknown = await response.json();
          return Array.isArray(documents) ? (documents as SearchDocument[]) : localDocuments;
        })
        .catch(() => localDocuments);
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
      setResults(searchLocalDocuments(trimmedQuery, documents));
      setState('ready');
      return;
    }

    const host = typesense.host?.replace(/\/$/, '');
    const collection = typesense.collection || 'qingflow_help_docs';
    const queryBy = typesense.enableSemantic
      ? 'title,section,content,tags,embedding'
      : 'title,section,content,tags';

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
              query_by: queryBy,
              highlight_fields: 'title,section,content',
              prefix: 'true,true,false,false',
              num_typos: 2,
              per_page: 8,
              ...(typesense.enableSemantic
                ? {vector_query: 'embedding:([], alpha: 0.65)'}
                : {}),
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
      setResults(searchLocalDocuments(trimmedQuery, documents));
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
                <button type="submit">
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
                  <Link to="/docs/新手指南">浏览完整文档目录</Link>
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
                  const snippet =
                    result.highlights?.[0]?.snippet ??
                    document.content?.slice(0, 180) ??
                    '';
                  const tags = document.tags ?? [];

                  return (
                    <article key={`${document.url ?? 'result'}-${index}`} className={styles.resultRow}>
                      <Link to={document.url ?? '/docs/新手指南'}>
                        <div className={styles.resultTopline}>
                          <span>{document.section ?? '帮助文档'}</span>
                          {document.version ? <small>{document.version}</small> : null}
                        </div>
                        <Heading as="h2">{document.title ?? '未命名文档'}</Heading>
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
