import { useState, useEffect } from 'react';
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
  Clock,
  Info,
  Filter
} from 'lucide-react';
import ArticleCard from './components/ArticleCard';
import ArticleDrawer from './components/ArticleDrawer';
import PaginationBar from './components/PaginationBar';

const API_BASE_URL = 
  window.location.port === '5173' || window.location.port === '3000' 
    ? 'http://localhost:8080/api' 
    : '/api';

const formatPubDate = (pubDateStr) => {
  if (!pubDateStr) return '';
  try {
    const date = new Date(pubDateStr);
    if (isNaN(date.getTime())) {
      return pubDateStr;
    }
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  } catch {
    return pubDateStr;
  }
};

const FAIL_REASON_MAP = {
  // APNs 실패 사유 번역
  'BadDeviceToken': '잘못된 기기 토큰',
  'Unregistered': '등록 해제된 기기',
  'DeviceTokenNotForTopic': '앱 토픽 불일치',
  'ExpiredProviderToken': '제공자 인증 토큰 만료',
  
  // FCM 실패 사유 번역
  'InvalidRegistration': '잘못된 기기 등록 ID',
  'Unavailable': 'FCM 서비스 일시적 사용 불가',
  'InternalServerError': 'FCM 내부 서버 오류',
  'DeviceMessageRateLimitExceeded': '기기당 발송 제한 초과',
  
  // 공통 오류 번역
  'UnknownException': '알 수 없는 예외 발생',
  'Unknown': '알 수 없는 오류'
};

function App() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [articles, setArticles] = useState([]);
  const [articleTotalPages, setArticleTotalPages] = useState(0);
  const [articleTotalElements, setArticleTotalElements] = useState(0);
  const [pushHistory, setPushHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(0);
  const [historyTotalElements, setHistoryTotalElements] = useState(0);
  const [historyPageSize, setHistoryPageSize] = useState(20);
  const [users, setUsers] = useState([]);
  const [currentView, setCurrentView] = useState('categories'); // 과제 1: 카테고리 선택 화면 또는 기사 목록 화면
  const [selectedArticle, setSelectedArticle] = useState(null);
  
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState('');
  const [articlesError, setArticlesError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [usersError, setUsersError] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('articles'); // 공통: 기사 열람, 푸시 이력, 사용자 정보 탭
  
  const [triggerSummary, setTriggerSummary] = useState(null);
  const [showTriggerModal, setShowTriggerModal] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [usersCurrentPage, setUsersCurrentPage] = useState(1);
  const [usersPageSize, setUsersPageSize] = useState(10);

  // 과제 1: 카테고리나 검색어가 바뀌면 기사 목록을 첫 페이지로 되돌립니다.
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchTerm]);

  // 과제 1: 기사 열람 탭으로 돌아오면 카테고리 선택 화면부터 보여줍니다.
  useEffect(() => {
    if (activeTab === 'articles') {
      setCurrentView('categories');
    }
  }, [activeTab]);

  const getCategoryTheme = (cat) => {
    switch (cat) {
      case '전체':
        return {
          gradient: 'from-slate-900/80 to-[#0e1626]/80 border-slate-800 hover:border-cyan-500/40 hover:shadow-cyan-500/5',
          textColor: 'text-cyan-400',
          desc: '정치, 경제, 사회 등 모든 카테고리의 종합 뉴스 기사를 시간순으로 열람합니다.'
        };
      case '정치':
        return {
          gradient: 'from-[#0b1b36]/80 to-[#0d1424]/80 border-blue-900/40 hover:border-blue-500/40 hover:shadow-blue-500/5',
          textColor: 'text-blue-400',
          desc: '국내외 주요 정계 현안, 국회 입법 동향 및 정부 관련 보도를 탐색합니다.'
        };
      case '북한':
        return {
          gradient: 'from-[#360b13]/80 to-[#1c0d10]/80 border-rose-900/40 hover:border-rose-500/40 hover:shadow-rose-500/5',
          textColor: 'text-rose-400',
          desc: '남북 관계 현황, 한반도 정세 분석 및 북한 내부 소식을 실시간 파악합니다.'
        };
      case '경제':
        return {
          gradient: 'from-[#0b361c]/80 to-[#0d2115]/80 border-emerald-900/40 hover:border-emerald-500/40 hover:shadow-emerald-500/5',
          textColor: 'text-emerald-400',
          desc: '거시 경제 지표, 금융 시장 트렌드, 기업 재무 및 경제 정책 정보를 확인합니다.'
        };
      case '산업':
        return {
          gradient: 'from-[#36210b]/80 to-[#21170d]/80 border-amber-900/40 hover:border-amber-500/40 hover:shadow-amber-500/5',
          textColor: 'text-amber-400',
          desc: 'IT, 과학 기술, 신산업 분야 동향, 제조 및 대기업 동정을 파악합니다.'
        };
      case '사회':
        return {
          gradient: 'from-[#0b2b36]/80 to-[#0d1e24]/80 border-cyan-900/40 hover:border-cyan-500/40 hover:shadow-cyan-500/5',
          textColor: 'text-cyan-400',
          desc: '전국 법조계 소식, 교육 환경, 보건 안전 및 일상 사회적 제반 뉴스를 모아봅니다.'
        };
      default:
        return {
          gradient: 'from-slate-800 to-slate-950 border-slate-700',
          textColor: 'text-slate-400',
          desc: '카테고리 뉴스'
        };
    }
  };

  // 공통: 최초 진입 시 카테고리와 사용자 정보를 조회합니다.
  useEffect(() => {
    fetchCategories();
    fetchUsers();
    fetchPushHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 과제 1: 카테고리, 검색어, 페이지 조건이 바뀌면 기사 목록을 다시 조회합니다.
  useEffect(() => {
    fetchArticles(selectedCategory, currentPage - 1, pageSize, searchTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, currentPage, pageSize, searchTerm]);

  const fetchCategories = async () => {
    setCategoriesError('');
    try {
      const res = await fetch(`${API_BASE_URL}/categories`);
      if (!res.ok) {
        throw new Error(`Category API failed with ${res.status}`);
      }
      
      const data = await res.json();
      setCategories(['전체', ...data]);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setCategoriesError('카테고리 목록을 불러오지 못했습니다. 서버 상태를 확인한 뒤 다시 시도하세요.');
    }
  };

  const fetchUsers = async () => {
    setUsersError('');
    try {
      const res = await fetch(`${API_BASE_URL}/users`);
      if (!res.ok) {
        throw new Error(`Users API failed with ${res.status}`);
      }
      
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setUsersError('사용자 목록을 불러오지 못했습니다. 서버 상태를 확인한 뒤 다시 시도하세요.');
    }
  };

  const fetchArticles = async (category, page = 0, size = pageSize, keyword = searchTerm) => {
    setLoadingArticles(true);
    setArticlesError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: String(size),
      });

      if (category && category !== '전체') {
        params.set('category', category);
      }

      if (keyword.trim()) {
        params.set('search', keyword.trim());
      }

      const res = await fetch(`${API_BASE_URL}/articles?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setArticles(data.content || []);
        setArticleTotalPages(data.totalPages || 0);
        setArticleTotalElements(data.totalElements || 0);
      } else {
        throw new Error(`Article API failed with ${res.status}`);
      }
    } catch (err) {
      console.error('Failed to fetch articles:', err);
      setArticles([]);
      setArticleTotalPages(0);
      setArticleTotalElements(0);
      setArticlesError('기사 목록을 불러오지 못했습니다. 서버 연결 또는 API 응답을 확인한 뒤 다시 시도하세요.');
    } finally {
      setLoadingArticles(false);
    }
  };

  const fetchPushHistory = async (page = 0, size = historyPageSize) => {
    setLoadingHistory(true);
    setHistoryError('');
    try {
      const res = await fetch(`${API_BASE_URL}/push-history?page=${page}&size=${size}`);
      if (!res.ok) {
        throw new Error(`Push history API failed with ${res.status}`);
      }

      const data = await res.json();
      setPushHistory(data.content || []);
      setHistoryTotalPages(data.totalPages || 0);
      setHistoryTotalElements(data.totalElements || 0);
      setHistoryPage(page);
    } catch (err) {
      console.error('Failed to fetch push history:', err);
      setHistoryError('푸시 발송 이력을 불러오지 못했습니다. 서버 상태를 확인한 뒤 다시 시도하세요.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleArticleClick = async (article) => {
    setSelectedArticle(article);
    
    // 과제 1: 읽지 않은 기사를 열람하면 읽음 처리 API를 호출합니다.
    if (!article.read) {
      try {
        const res = await fetch(`${API_BASE_URL}/articles/${article.articleId}/read`, {
          method: 'POST'
        });
        if (res.ok) {
          // 과제 1: API 성공 후 목록의 읽음 상태를 즉시 갱신합니다.
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
        // 공통: RSS 수집 후 기사 목록과 푸시 이력을 다시 조회합니다.
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

  const totalArticles = articleTotalElements;
  const totalPages = articleTotalPages;
  const paginatedArticles = articles;
  const totalUsers = users.length;
  const usersTotalPages = Math.ceil(totalUsers / usersPageSize);
  const usersStartIndex = (usersCurrentPage - 1) * usersPageSize;
  const paginatedUsers = users.slice(usersStartIndex, usersStartIndex + usersPageSize);

  return (
    <div className="h-screen overflow-hidden bg-[#080b11] text-slate-100 flex flex-col font-sans">
      {/* 공통: 상단 헤더 */}
      <header className="shrink-0 z-30 bg-[#0c121e]/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between">
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

      {/* 공통: 좌측 사이드바와 본문 영역 */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* 공통: 사이드바 */}
        <aside className="w-full lg:w-64 max-h-full bg-[#0a0f18] border-r border-slate-800 flex flex-col shrink-0 overflow-hidden">
          {/* 공통: 과제별 화면 전환 탭 */}
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

          {/* 과제 1: 기사 목록 화면에서만 노출되는 카테고리 필터 */}
          {activeTab === 'articles' && currentView === 'list' && (
            <div className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2 px-2">
                <Filter className="w-3 h-3" /> 카테고리 필터
              </h2>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setCurrentPage(1);
                    setSelectedCategory(cat);
                  }}
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

        {/* 공통: 선택된 탭의 본문 영역 */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#070a10]">
          {activeTab === 'articles' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {currentView === 'categories' ? (
                /* 과제 1: 카테고리 선택 화면 */
                <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center max-w-5xl mx-auto w-full">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-extrabold text-white bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
                      관심 카테고리를 선택하세요
                    </h2>
                    <p className="text-sm text-slate-400">
                      연합뉴스에서 제공하는 실시간 분야별 뉴스 속보 기사를 열람할 수 있습니다.
                    </p>
                  </div>

                  {categoriesError && (
                    <div className="w-full max-w-xl mb-6 rounded-2xl border border-rose-500/20 bg-rose-950/20 p-4 text-center">
                      <h3 className="text-sm font-semibold text-rose-300">카테고리 API 오류</h3>
                      <p className="text-xs text-slate-400 mt-1">{categoriesError}</p>
                      <button
                        onClick={fetchCategories}
                        className="mt-3 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
                      >
                        다시 시도
                      </button>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                    {['전체', '정치', '북한', '경제', '산업', '사회'].map(cat => {
                      const theme = getCategoryTheme(cat);
                      return (
                        <div
                          key={cat}
                          onClick={() => {
                            setCurrentPage(1);
                            setSelectedCategory(cat);
                            setCurrentView('list');
                          }}
                          className={`group p-6 rounded-2xl border bg-gradient-to-b ${theme.gradient} cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between h-40`}
                        >
                          <div className="flex justify-between items-start">
                            <span className={`text-base font-bold ${theme.textColor} group-hover:text-white transition-colors`}>
                              {cat}
                            </span>
                            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                              {theme.desc}
                            </p>
                            <div className="w-full h-1 bg-slate-800/40 rounded-full mt-4 overflow-hidden">
                              <div className="w-0 h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all group-hover:w-full duration-500" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* 과제 1: 기사 목록 화면 */
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* 과제 1: 검색창과 카테고리 목록 복귀 버튼 */}
                  <div className="p-4 bg-[#0a0f18]/60 border-b border-slate-800/60 flex items-center gap-3">
                    <button
                      onClick={() => setCurrentView('categories')}
                      className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-cyan-300 transition-all px-3 py-2 rounded-xl bg-[#101726] border border-slate-800 hover:border-slate-700/80 active:scale-95 shrink-0"
                    >
                      <ChevronRight className="w-3.5 h-3.5 rotate-180" /> 카테고리 목록
                    </button>
                    <div className="h-6 w-[1px] bg-slate-800 mr-1" />

                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                        placeholder={`${selectedCategory} 기사 제목 또는 작성자 검색...`}
                        className="w-full bg-[#101726] border border-slate-800 focus:border-cyan-500/60 focus:outline-none rounded-xl py-2 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 transition-all duration-200"
                      />
                      {searchTerm && (
                        <button 
                          onClick={() => {
                            setSearchTerm('');
                            setCurrentPage(1);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-700/50"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 ml-auto">
                      선택 분야: <span className="font-bold text-cyan-400">{selectedCategory}</span> | 조회: <span className="font-semibold text-cyan-400">{totalArticles}</span>건
                    </div>
                  </div>

                  {/* 과제 1: 기사 목록 */}
                  <div className="flex-1 overflow-y-auto p-6">
                    {loadingArticles ? (
                      <div className="h-full flex items-center justify-center flex-col gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
                        <p className="text-sm text-slate-400">뉴스 기사를 가져오는 중입니다...</p>
                      </div>
                    ) : articlesError ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8">
                        <div className="w-16 h-16 rounded-full bg-rose-950/30 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
                          <AlertCircle className="w-8 h-8" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-200">기사 목록을 불러오지 못했습니다</h3>
                        <p className="text-sm text-slate-500 mt-1 max-w-sm">{articlesError}</p>
                        <button
                          onClick={() => fetchArticles(selectedCategory, currentPage - 1, pageSize, searchTerm)}
                          className="mt-4 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors"
                        >
                          다시 시도
                        </button>
                      </div>
                    ) : paginatedArticles.length === 0 ? (
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
                      <div className="flex flex-col gap-6">
                        {/* 과제 1: 행 형태의 기사 카드 목록 */}
                        <div className="flex flex-col gap-4">
                          {paginatedArticles.map((article) => (
                            <ArticleCard
                              key={article.articleId}
                              article={article}
                              onClick={handleArticleClick}
                              formatPubDate={formatPubDate}
                            />
                          ))}
                        </div>

                        <PaginationBar
                          currentPage={currentPage}
                          totalPages={totalPages}
                          totalItems={totalArticles}
                          pageSize={pageSize}
                          onPageChange={setCurrentPage}
                          onPageSizeChange={(size) => {
                            setPageSize(size);
                            setCurrentPage(1);
                          }}
                          disabled={loadingArticles}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
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

              {/* 과제 2: 푸시 발송 이력 목록 */}
              {loadingHistory ? (
                <div className="flex-1 bg-[#0a0f18] border border-slate-800 rounded-2xl flex items-center justify-center flex-col gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
                  <p className="text-sm text-slate-400">발송 로그를 로딩하는 중입니다...</p>
                </div>
              ) : historyError ? (
                <div className="flex-1 bg-[#0a0f18] border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-full bg-rose-950/30 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-200">발송 이력을 불러오지 못했습니다</h3>
                  <p className="text-sm text-slate-500 mt-1 max-w-sm">{historyError}</p>
                  <button
                    onClick={() => fetchPushHistory(historyPage, historyPageSize)}
                    className="mt-4 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors"
                  >
                    다시 시도
                  </button>
                </div>
              ) : pushHistory.length === 0 ? (
                <div className="flex-1 bg-[#0a0f18] border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-4">
                    <Send className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-300">발송 이력이 없습니다</h3>
                  <p className="text-sm text-slate-500 mt-1 max-w-sm">
                    아직 알림이 발송되지 않았습니다. 우상단의 즉시 수집 버튼을 눌러 모의 발송 프로세스를 트리거하세요.
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                  <div className="flex-1 bg-[#0a0f18] border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
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
                                {historyTotalElements - (historyPage * historyPageSize) - idx}
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
                                ) : !(item.isCompleted !== undefined ? item.isCompleted : item.completed) ? (
                                  <div className="flex flex-col">
                                    <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                                      <RefreshCw className="w-3 h-3 animate-spin text-amber-400" /> 재시도 중 ({item.retryCount + 1}/3)
                                    </span>
                                    {/* 과제 2: 푸시 실패 시 상세 실패 사유를 한국어로 번역하여 하단에 작게 표시합니다 */}
                                    {item.failReason && (
                                      <span className="text-[10px] text-amber-500/80 font-medium mt-0.5 pl-[16px]" title={item.failReason}>
                                        {FAIL_REASON_MAP[item.failReason] || item.failReason}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex flex-col">
                                    <span className="inline-flex items-center gap-1 text-rose-400 font-semibold">
                                      <AlertCircle className="w-3.5 h-3.5" /> 실패
                                    </span>
                                    {/* 과제 2: 푸시 실패 시 상세 실패 사유를 한국어로 번역하여 하단에 작게 표시합니다 */}
                                    {item.failReason && (
                                      <span className="text-[10px] text-rose-500/80 font-medium mt-0.5 pl-[18px]" title={item.failReason}>
                                        {FAIL_REASON_MAP[item.failReason] || item.failReason}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>

                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <PaginationBar
                    currentPage={historyPage + 1}
                    totalPages={historyTotalPages}
                    totalItems={historyTotalElements}
                    pageSize={historyPageSize}
                    onPageChange={(page) => fetchPushHistory(page - 1)}
                    onPageSizeChange={(size) => {
                      setHistoryPageSize(size);
                      fetchPushHistory(0, size);
                    }}
                    disabled={loadingHistory}
                  />
                </div>
              )}
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

              {/* 과제 2: 사용자 정보 목록 */}
              {usersError ? (
                <div className="flex-1 bg-[#0a0f18] border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-full bg-rose-950/30 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-200">사용자 목록을 불러오지 못했습니다</h3>
                  <p className="text-sm text-slate-500 mt-1 max-w-sm">{usersError}</p>
                  <button
                    onClick={fetchUsers}
                    className="mt-4 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors"
                  >
                    다시 시도
                  </button>
                </div>
              ) : users.length === 0 ? (
                <div className="flex-1 bg-[#0a0f18] border border-slate-800 rounded-2xl flex items-center justify-center flex-col gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
                  <p className="text-sm text-slate-400">사용자 목록을 불러오는 중입니다...</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                  <div className="flex-1 bg-[#0a0f18] border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
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
                          {paginatedUsers.map((user) => (
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
                  </div>

                  <PaginationBar
                    currentPage={usersCurrentPage}
                    totalPages={usersTotalPages}
                    totalItems={totalUsers}
                    pageSize={usersPageSize}
                    onPageChange={setUsersCurrentPage}
                    onPageSizeChange={(size) => {
                      setUsersPageSize(size);
                      setUsersCurrentPage(1);
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <ArticleDrawer
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
        formatPubDate={formatPubDate}
      />

      {/* 공통: RSS 수집 및 푸시 실행 결과 모달 */}
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
