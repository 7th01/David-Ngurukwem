import { Download, Menu, Upload } from 'lucide-react';
import { NavSection } from '../../types/analytics';

interface TopBarProps {
  activeSection: NavSection;
  sourceName: string;
  onOpenMobileNav: () => void;
  onExportCsv: () => void;
  onJumpToImport: () => void;
}

const SECTION_TITLES: Record<NavSection, string> = {
  overview: 'Executive Overview',
  acquisition: 'Acquisition & Funnels',
  sentiment: 'Ratings & Reviews',
  aso: 'ASO & Keywords',
  insights: 'Actionable Insights & Data Import',
};

export function TopBar({
  activeSection,
  sourceName,
  onOpenMobileNav,
  onExportCsv,
  onJumpToImport,
}: TopBarProps) {
  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-md"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm min-w-0 truncate">
          <span className="text-slate-500 whitespace-nowrap shrink-0">StatEdge</span>
          <span className="text-slate-300 shrink-0" aria-hidden="true">
            /
          </span>
          <span className="font-medium text-slate-900 truncate">
            {SECTION_TITLES[activeSection]}
          </span>
          <span className="hidden xl:inline text-slate-300 shrink-0" aria-hidden="true">
            ·
          </span>
          <span className="hidden xl:inline text-xs text-slate-500 truncate">
            {sourceName}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onJumpToImport}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
        >
          <Upload className="w-3.5 h-3.5" aria-hidden="true" />
          Import CSV
        </button>
        <button
          type="button"
          onClick={onExportCsv}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          Export Report
        </button>
      </div>
    </header>
  );
}
