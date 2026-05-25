/* eslint-disable react/prop-types */
import { Clock } from 'lucide-react';

function ArticleCard({ article, onClick, formatPubDate }) {
  return (
    <div
      onClick={() => onClick(article)}
      className={`group relative flex flex-row items-center gap-4 p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
        article.read
          ? 'bg-[#0b101b]/40 border-slate-900/60 opacity-65 hover:opacity-90 hover:border-slate-800'
          : 'bg-gradient-to-b from-[#111727] to-[#0c1220] border-slate-800 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5'
      }`}
    >
      {article.imageUrl && (
        <div className="w-20 h-20 md:w-28 md:h-20 rounded-lg overflow-hidden border border-slate-800 shrink-0 bg-slate-950/40">
          <img
            src={article.imageUrl}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800/80 text-cyan-400 uppercase">
              {article.category}
            </span>

            {!article.read ? (
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                읽지 않음
              </span>
            ) : (
              <span className="text-[10px] text-slate-500 font-medium">읽음</span>
            )}
          </div>

          <h3
            className={`text-sm md:text-base font-semibold line-clamp-1 mb-1 transition-colors ${
              article.read ? 'text-slate-400' : 'text-slate-200 group-hover:text-cyan-400'
            }`}
            title={article.title}
          >
            {article.title}
          </h3>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
          <span className="truncate max-w-[100px]">{article.dcCreator || '연합뉴스'}</span>
          <span className="w-1 h-1 rounded-full bg-slate-800" />
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{formatPubDate(article.pubDate)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArticleCard;
