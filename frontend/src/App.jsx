import React, { useState, useEffect } from 'react';
import { 
  Newspaper, 
  Search, 
  X, 
  ChevronRight, 
  BookOpen, 
  Clock, 
  ExternalLink,
  Info,
  Filter
} from 'lucide-react';

const API_BASE_URL = 
  window.location.port === '5173' || window.location.port === '3000' 
    ? 'http://localhost:8080/api' 
    : '/api';

function App() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [articles, setArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch categories and articles on mount
  useEffect(() => {
    fetchCategories();
    fetchArticles(selectedCategory);
  }, []);

  // Fetch articles when category changes
  useEffect(() => {
    fetchArticles(selectedCategory);
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/categories`);
      if (res.ok) {
        const data = await res.json();
        setCategories(['전체', ...data]);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchArticles = async (category) => {
    setLoadingArticles(true);
    try {
      const url = category === '전체' 
        ? `${API_BASE_URL}/articles` 
        : `${API_BASE_URL}/articles?category=${encodeURIComponent(category)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setArticles(data);
      }
    } catch (err) {
      console.error('Failed to fetch articles:', err);
    } finally {
      setLoadingArticles(false);
    }
  };

  const handleArticleClick = async (article) => {
    setSelectedArticle(article);
    
    // If article is unread, trigger read API
    if (!article.read) {
      try {
        const res = await fetch(`${API_BASE_URL}/articles/${article.articleId}/read`, {
          method: 'POST'
        });
        if (res.ok) {
          // Update local articles state
          setArticles(prev => 
            prev.map(a => a.articleId === article.articleId ? { ...a, read: true } : a)
          );
        }
      } catch (err) {
        console.error('Failed to mark article as read:', err);
      }
    }
  };

  // Filter articles by search term
  const filteredArticles = articles.filter(article => 
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (article.dcCreator && article.dcCreator.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#080b11] text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0c121e]/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Newspaper className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              연합뉴스 RSS 기사 열람 시스템
            </h1>
            <p className="text-xs text-slate-400">IT개발 경력 사전과제 - [과제 1]</p>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 bg-[#0a0f18] border-r border-slate-800 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-800/60 flex flex-col gap-2">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold bg-slate-800 text-cyan-400 border-l-2 border-cyan-400">
              <Newspaper className="w-4 h-4" />
              기사 열람
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2 px-2">
              <Filter className="w-3 h-3" /> 카테고리 필터
            </h2>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all duration-200 flex items-center justify-between ${
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-cyan-950 to-blue-950/60 text-cyan-300 font-semibold border border-cyan-500/30'
                    : 'text-slate-400 hover:bg-slate-900/60 hover:text-white'
                }`}
              >
                <span>{cat}</span>
                {selectedCategory === cat && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-md shadow-cyan-400/50" />
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* Content Body */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#070a10]">
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search bar */}
            <div className="p-4 bg-[#0a0f18]/60 border-b border-slate-800/60 flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="기사 제목 또는 작성자 검색..."
                  className="w-full bg-[#101726] border border-slate-800 focus:border-cyan-500/60 focus:outline-none rounded-xl py-2 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 transition-all duration-200"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-700/50"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="text-xs text-slate-400 ml-auto">
                조회된 기사: <span className="font-semibold text-cyan-400">{filteredArticles.length}</span>건
              </div>
            </div>

            {/* Articles list */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingArticles ? (
                <div className="h-full flex items-center justify-center flex-col gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
                  <p className="text-sm text-slate-400">뉴스 기사를 가져오는 중입니다...</p>
                </div>
              ) : filteredArticles.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-4">
                    <Newspaper className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-300">표시할 기사가 없습니다</h3>
                  <p className="text-sm text-slate-500 mt-1 max-w-sm">
                    현재 저장된 기사가 없습니다. 데이터베이스에 기사를 추가해 주세요.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filteredArticles.map((article) => (
                    <div
                      key={article.articleId}
                      onClick={() => handleArticleClick(article)}
                      className={`group relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                        article.read
                          ? 'bg-[#0b101b]/40 border-slate-900/60 opacity-65 hover:opacity-90 hover:border-slate-800'
                          : 'bg-gradient-to-b from-[#111727] to-[#0c1220] border-slate-800 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5'
                      }`}
                    >
                      <div>
                        {/* Card Header Info */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800/80 text-cyan-400 uppercase">
                            {article.category}
                          </span>
                          
                          {!article.read ? (
                            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              읽지 않음
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-medium">
                              읽음
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className={`text-sm font-semibold line-clamp-2 mb-3 transition-colors ${
                          article.read ? 'text-slate-400' : 'text-slate-200 group-hover:text-cyan-400'
                        }`}>
                          {article.title}
                        </h3>
                      </div>

                      {/* Card Footer Info */}
                      <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <span className="truncate max-w-[100px]">{article.dcCreator || '연합뉴스'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {article.pubDate ? article.pubDate.substring(5, 16) : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Article Detail Drawer Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          {/* Backdrop Click */}
          <div className="absolute inset-0" onClick={() => setSelectedArticle(null)} />
          
          {/* Drawer Panel */}
          <div className="relative w-full max-w-4xl h-full bg-[#0a0f18] border-l border-slate-800 shadow-2xl flex flex-col animate-slide-in">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#0e1423]/50">
              <div className="flex flex-col gap-1 max-w-[85%]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-cyan-400 uppercase">
                    {selectedArticle.category}
                  </span>
                  <span className="text-xs text-slate-400">|</span>
                  <span className="text-xs text-slate-400 font-mono">ID: {selectedArticle.articleId}</span>
                </div>
                <h2 className="text-base font-bold text-white line-clamp-1 mt-1" title={selectedArticle.title}>
                  {selectedArticle.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Embedded Iframe body */}
            <div className="flex-1 bg-white relative flex flex-col">
              <iframe
                src={selectedArticle.link}
                title={selectedArticle.title}
                className="w-full h-full border-none"
                sandbox="allow-same-origin allow-scripts allow-popups"
              />
              
              {/* Iframe Notice Overlay */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#090d16]/95 border border-slate-800 p-4 rounded-xl shadow-xl flex items-center gap-4 text-xs text-slate-300 max-w-md">
                <Info className="w-6 h-6 text-cyan-500 shrink-0" />
                <div>
                  <p className="font-semibold text-white">포털 사이트 프레임 제한 안내</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    연합뉴스 및 일부 외부 사이트는 브라우저 보안 규정(X-Frame-Options)에 의해 인앱 뷰어 로딩이 차단될 수 있습니다. 화면이 보이지 않는 경우 아래 버튼을 사용해 새 창으로 기사를 확인하세요.
                  </p>
                </div>
                <a
                  href={selectedArticle.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-3 py-2 rounded-lg shrink-0 flex items-center gap-1 transition-all duration-200"
                >
                  새 창 열기 <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Info footer */}
            <div className="p-4 bg-[#0a0f18] border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
              <span>작성자: {selectedArticle.dcCreator || '연합뉴스'}</span>
              <span>수집 발행시각: {selectedArticle.pubDate}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
