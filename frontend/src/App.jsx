import React, { useState, useEffect } from 'react';
import { 
  Newspaper, 
  Send, 
  Users, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  X, 
  ChevronRight, 
  BookOpen, 
  Clock, 
  ExternalLink,
  Info,
  Sliders,
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
  const [pushHistory, setPushHistory] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [triggerLoading, setTriggerLoading] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('articles'); // 'articles' | 'history' | 'users'
  
  const [triggerSummary, setTriggerSummary] = useState(null);
  const [showTriggerModal, setShowTriggerModal] = useState(false);

  // Fetch categories, articles, and users on mount
  useEffect(() => {
    fetchCategories();
    fetchUsers();
    fetchArticles(selectedCategory);
    fetchPushHistory();
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

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
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

  const fetchPushHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE_URL}/push-history`);
      if (res.ok) {
        const data = await res.json();
        setPushHistory(data);
      }
    } catch (err) {
      console.error('Failed to fetch push history:', err);
    } finally {
      setLoadingHistory(false);
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

  const handleTriggerScheduler = async () => {
    setTriggerLoading(true);
    setTriggerSummary(null);
    setShowTriggerModal(true);
    try {
      const res = await fetch(`${API_BASE_URL}/trigger-scheduler`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setTriggerSummary(data);
        // Refresh articles and history
        fetchArticles(selectedCategory);
        fetchPushHistory();
      } else {
        throw new Error('Trigger API returned non-200');
      }
    } catch (err) {
      console.error('Failed to trigger scheduler:', err);
      setTriggerSummary({ error: true });
    } finally {
      setTriggerLoading(false);
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
              연합뉴스 RSS 과제 시스템
            </h1>
            <p className="text-xs text-slate-400">IT개발 경력 사전과제 통합 솔루션</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleTriggerScheduler}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium text-sm px-4 py-2 rounded-lg shadow-lg hover:from-emerald-400 hover:to-teal-500 transition-all duration-300 transform active:scale-95 shadow-emerald-500/10"
          >
            <RefreshCw className={`w-4 h-4 ${triggerLoading ? 'animate-spin' : ''}`} />
            RSS 수집 및 푸시 즉시 실행
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 bg-[#0a0f18] border-r border-slate-800 flex flex-col shrink-0">
          {/* Navigation Tabs */}
          <div className="p-4 border-b border-slate-800/60 flex flex-row lg:flex-col gap-2">
            <button
              onClick={() => setActiveTab('articles')}
              className={`flex-1 flex items-center justify-center lg:justify-start gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === 'articles'
                  ? 'bg-slate-800 text-cyan-400 border-l-2 border-cyan-400'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <Newspaper className="w-4 h-4" />
              기사 열람
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 flex items-center justify-center lg:justify-start gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === 'history'
                  ? 'bg-slate-800 text-cyan-400 border-l-2 border-cyan-400'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <Send className="w-4 h-4" />
              푸시 발송 이력
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 flex items-center justify-center lg:justify-start gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === 'users'
                  ? 'bg-slate-800 text-cyan-400 border-l-2 border-cyan-400'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              사용자 정보 (100명)
            </button>
          </div>

          {/* Category Filter - Only shows when 'articles' tab is active */}
          {activeTab === 'articles' && (
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
          )}

          {activeTab !== 'articles' && (
            <div className="hidden lg:flex flex-col gap-4 p-5 text-xs text-slate-500 border-t border-slate-800 mt-auto">
              <div className="flex items-start gap-2 bg-slate-900/40 p-3 rounded-lg border border-slate-800/40">
                <Info className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                <p>
                  푸시 시스템 작동은 SQLite 데이터베이스에 전송 로그로 고스란히 기록되며 우상단 즉시 수집 버튼으로 테스트 가능합니다.
                </p>
              </div>
            </div>
          )}
        </aside>

        {/* Content Body */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#070a10]">
          {activeTab === 'articles' && (
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
                      상단의 즉시 수집 버튼을 눌러 연합뉴스 실시간 RSS 데이터를 데이터베이스로 긁어오세요.
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
          )}

          {activeTab === 'history' && (
            <div className="flex-1 flex flex-col overflow-hidden p-6">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Send className="w-5 h-5 text-cyan-400" /> 푸시 알림 발송 이력
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  SQLite 데이터베이스에 저장된 APNs 및 FCM 가상 전송 로그입니다. (최신순 정렬)
                </p>
              </div>

              {/* History list */}
              <div className="flex-1 bg-[#0a0f18] border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
                {loadingHistory ? (
                  <div className="flex-1 flex items-center justify-center flex-col gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
                    <p className="text-sm text-slate-400">발송 로그를 로딩하는 중입니다...</p>
                  </div>
                ) : pushHistory.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-4">
                      <Send className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-300">발송 이력이 없습니다</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-sm">
                      아직 알림이 발송되지 않았습니다. 우상단의 즉시 수집 버튼을 눌러 모의 발송 프로세스를 트리거하세요.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-[#101726] border-b border-slate-800 text-slate-400 font-semibold z-10">
                        <tr>
                          <th className="px-5 py-3.5">No</th>
                          <th className="px-5 py-3.5">발송 타입</th>
                          <th className="px-5 py-3.5">디바이스 ID</th>
                          <th className="px-5 py-3.5">카테고리</th>
                          <th className="px-5 py-3.5">기사 제목</th>
                          <th className="px-5 py-3.5">전송 시간</th>
                          <th className="px-5 py-3.5">전송 결과</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-[#0a0f18]/30">
                        {pushHistory.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-slate-900/30 transition-colors">
                            <td className="px-5 py-3 text-slate-500 font-mono">
                              {pushHistory.length - idx}
                            </td>
                            <td className="px-5 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.pushType === 'APNs' 
                                  ? 'bg-blue-950/60 text-blue-400 border border-blue-500/20' 
                                  : 'bg-orange-950/60 text-orange-400 border border-orange-500/20'
                              }`}>
                                {item.pushType}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-slate-400 font-mono max-w-[150px] truncate" title={item.deviceId}>
                              {item.deviceId}
                            </td>
                            <td className="px-5 py-3">
                              <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                                {item.articleCategory}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-slate-300 font-medium max-w-[280px] truncate" title={item.articleTitle}>
                              {item.articleTitle}
                            </td>
                            <td className="px-5 py-3 text-slate-500">
                              {item.sentAt ? item.sentAt.replace('T', ' ').substring(5, 19) : ''}
                            </td>
                            <td className="px-5 py-3">
                              {item.status === 'success' ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                                  <CheckCircle className="w-3.5 h-3.5" /> 성공
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-400 font-semibold">
                                  <AlertCircle className="w-3.5 h-3.5" /> 실패
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="flex-1 flex flex-col overflow-hidden p-6">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" /> 수집된 가상 사용자 목록
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  엑셀(XLSX) 파일로부터 SQLite DB 테이블(`users`)에 초기 세딩된 100명의 가상 사용자 정보입니다.
                </p>
              </div>

              {/* Users list */}
              <div className="flex-1 bg-[#0a0f18] border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
                {users.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center flex-col gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
                    <p className="text-sm text-slate-400">사용자 목록을 불러오는 중입니다...</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-[#101726] border-b border-slate-800 text-slate-400 font-semibold z-10">
                        <tr>
                          <th className="px-5 py-3.5 w-16">No</th>
                          <th className="px-5 py-3.5">이름</th>
                          <th className="px-5 py-3.5">푸시 타입</th>
                          <th className="px-5 py-3.5">선호 카테고리</th>
                          <th className="px-5 py-3.5">방해 금지 시간대 (DND)</th>
                          <th className="px-5 py-3.5">기기 토큰 ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-[#0a0f18]/30">
                        {users.map((user) => (
                          <tr key={user.id} className="hover:bg-slate-900/30 transition-colors">
                            <td className="px-5 py-3 text-slate-500 font-mono font-bold">
                              {user.id}
                            </td>
                            <td className="px-5 py-3 text-slate-200 font-semibold">
                              {user.name}
                            </td>
                            <td className="px-5 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                user.pushType === 'APNs' 
                                  ? 'bg-blue-950/60 text-blue-400 border border-blue-500/20' 
                                  : 'bg-orange-950/60 text-orange-400 border border-orange-500/20'
                              }`}>
                                {user.pushType}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-slate-300 max-w-[200px] truncate" title={user.categories}>
                              {user.categories.split(',').map((cat) => (
                                <span key={cat} className="inline-block bg-slate-800/60 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-medium mr-1 mb-1">
                                  {cat}
                                </span>
                              ))}
                            </td>
                            <td className="px-5 py-3">
                              {user.dndTime === '-' ? (
                                <span className="text-slate-600 font-medium">미설정 (-)</span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-amber-400 font-semibold bg-amber-950/20 px-2 py-0.5 rounded-full border border-amber-500/10">
                                  <Clock className="w-3 h-3" /> {user.dndTime}
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-slate-500 font-mono max-w-[250px] truncate" title={user.deviceId}>
                              {user.deviceId}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
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

            {/* Embedded Iframe body or Fallback view */}
            <div className="flex-1 bg-white relative flex flex-col">
              <iframe
                src={selectedArticle.link}
                title={selectedArticle.title}
                className="w-full h-full border-none"
                sandbox="allow-same-origin allow-scripts allow-popups"
              />
              
              {/* Iframe Notice Overlay (Portals block iframe loading due to X-Frame-Options) */}
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

      {/* Trigger Summary Modal */}
      {showTriggerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs px-4">
          <div className="w-full max-w-md bg-[#0a0f18] border border-slate-800 rounded-2xl shadow-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
            
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" /> RSS 즉시 수집 & 푸시 시뮬레이션
            </h3>
            
            {triggerLoading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-emerald-400 animate-spin" />
                <p className="text-sm text-slate-400">실시간 RSS 파싱 및 사용자 필터링 발송 중...</p>
              </div>
            ) : triggerSummary?.error ? (
              <div className="py-6 flex flex-col items-center gap-2 text-rose-400">
                <AlertCircle className="w-12 h-12" />
                <p className="font-semibold">작업 실패</p>
                <p className="text-xs text-slate-400 text-center mt-1">
                  백엔드 서버 통신 중 오류가 발생했습니다.<br />Spring Boot 서버가 실행 중인지 확인하세요.
                </p>
                <button
                  onClick={() => setShowTriggerModal(false)}
                  className="mt-4 w-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                >
                  닫기
                </button>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <p className="text-xs text-slate-400">
                  연합뉴스 RSS 피드에서 수집 및 푸시 필터링 전송 결과를 요약합니다.
                </p>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#101726] p-3 rounded-xl border border-slate-800/40">
                    <span className="text-slate-500 block mb-1">피드 파싱 완료</span>
                    <span className="text-base font-bold text-white">{triggerSummary?.parsedCount} 건</span>
                  </div>
                  <div className="bg-[#101726] p-3 rounded-xl border border-slate-800/40">
                    <span className="text-slate-500 block mb-1">신규 저장 기사</span>
                    <span className="text-base font-bold text-cyan-400">{triggerSummary?.newSavedCount} 건</span>
                  </div>
                  <div className="bg-[#101726] p-3 rounded-xl border border-slate-800/40">
                    <span className="text-slate-500 block mb-1">푸시 알림 시도</span>
                    <span className="text-base font-bold text-emerald-400">{triggerSummary?.pushesSent} 건</span>
                  </div>
                  <div className="bg-[#101726] p-3 rounded-xl border border-slate-800/40">
                    <span className="text-slate-500 block mb-1">DND 수신 제외</span>
                    <span className="text-base font-bold text-amber-400">{triggerSummary?.pushesSkippedDnd} 건</span>
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-800/40 p-3 rounded-xl text-[10px] text-slate-400">
                  <span className="font-semibold text-slate-300 block mb-0.5">데이터베이스 관리 규칙 적용:</span>
                  누적 기사 수 1,000건 초과 시 자동으로 오래된 기사부터 자동 정리됩니다. (이번 삭제 처리: {triggerSummary?.deletedOldCount}건)
                </div>

                <button
                  onClick={() => setShowTriggerModal(false)}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-semibold py-2.5 rounded-xl transition-all duration-300 mt-2"
                >
                  확인 완료
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
