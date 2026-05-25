/* eslint-disable react/prop-types */
import { ExternalLink, Info, X } from 'lucide-react';

function ArticleDrawer({ article, onClose, formatPubDate }) {
  if (!article) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-4xl h-full bg-[#0a0f18] border-l border-slate-800 shadow-2xl flex flex-col animate-slide-in">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#0e1423]/50">
          <div className="flex flex-col gap-1 max-w-[85%]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-cyan-400 uppercase">
                {article.category}
              </span>
              <span className="text-xs text-slate-400">|</span>
              <span className="text-xs text-slate-400 font-mono">ID: {article.articleId}</span>
            </div>
            <h2 className="text-base font-bold text-white line-clamp-1 mt-1" title={article.title}>
              {article.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="h-12 px-4 bg-[#101726] border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0 text-xs text-slate-400">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="truncate">인앱 보기 화면입니다. 표시되지 않으면 원문 보기로 확인하세요.</span>
          </div>
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-3 py-2 rounded-lg shrink-0 flex items-center gap-1.5 text-xs transition-all duration-200"
          >
            원문 보기 <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="flex-1 bg-white relative flex flex-col">
          <iframe
            src={article.link}
            title={article.title}
            className="w-full h-full border-none"
            sandbox="allow-same-origin allow-scripts allow-popups"
          />
        </div>

        <div className="p-4 bg-[#0a0f18] border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <span>작성자: {article.dcCreator || '연합뉴스'}</span>
          <span>수집 발행시각: {formatPubDate(article.pubDate)}</span>
        </div>
      </div>
    </div>
  );
}

export default ArticleDrawer;
