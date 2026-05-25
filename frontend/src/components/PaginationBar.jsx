/* eslint-disable react/prop-types */
const getVisiblePages = (currentPage, totalPages) => {
  const visibleCount = Math.min(5, totalPages);
  let startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, startPage + visibleCount - 1);
  startPage = Math.max(1, endPage - visibleCount + 1);

  return Array.from({ length: endPage - startPage + 1 }, (_, idx) => startPage + idx);
};

function PaginationBar({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  disabled = false,
  pageSizeOptions = [5, 10, 20, 50],
}) {
  if (totalPages <= 0) return null;

  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-[#0a0f18]/60 border border-slate-800/80 rounded-2xl text-xs text-slate-400 shrink-0">
      <div className="flex items-center gap-2">
        <span>페이지당 표시:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          disabled={disabled}
          className="bg-[#101726] border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500/60 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option}개씩
            </option>
          ))}
        </select>
        <span className="text-slate-600">|</span>
        <span>
          전체 <span className="font-semibold text-cyan-400">{totalItems}</span>건
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(1)}
          disabled={isFirstPage || disabled}
          className="px-2.5 py-1.5 rounded-lg bg-[#101726] hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 border border-slate-800 transition-colors"
        >
          처음
        </button>

        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={isFirstPage || disabled}
          className="px-2.5 py-1.5 rounded-lg bg-[#101726] hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 border border-slate-800 transition-colors"
        >
          이전
        </button>

        {getVisiblePages(currentPage, totalPages).map((pageNum) => (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            disabled={disabled}
            className={`w-8 h-8 rounded-lg font-semibold border transition-all disabled:cursor-not-allowed ${
              currentPage === pageNum
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                : 'bg-[#101726] hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-white disabled:opacity-50'
            }`}
          >
            {pageNum}
          </button>
        ))}

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={isLastPage || disabled}
          className="px-2.5 py-1.5 rounded-lg bg-[#101726] hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 border border-slate-800 transition-colors"
        >
          다음
        </button>

        <button
          onClick={() => onPageChange(totalPages)}
          disabled={isLastPage || disabled}
          className="px-2.5 py-1.5 rounded-lg bg-[#101726] hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 border border-slate-800 transition-colors"
        >
          끝
        </button>
      </div>
    </div>
  );
}

export default PaginationBar;
