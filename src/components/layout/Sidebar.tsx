import {
  BarChart3,
  GitBranch,
  Lightbulb,
  MessageSquareText,
  Search,
} from 'lucide-react';
import { NavSection } from '../../types/analytics';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  pendingInsightsCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: { id: NavSection; label: string; icon: typeof BarChart3 }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'acquisition', label: 'Acquisition & Funnels', icon: GitBranch },
  { id: 'sentiment', label: 'Ratings & Reviews', icon: MessageSquareText },
  { id: 'aso', label: 'ASO & Keywords', icon: Search },
  { id: 'insights', label: 'Insights & Import', icon: Lightbulb },
];

export function Sidebar({
  activeSection,
  onSelectSection,
  pendingInsightsCount,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const handleSelect = (id: NavSection) => {
    onSelectSection(id);
    onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-14 px-5 flex items-center border-b border-slate-200 shrink-0">
          <a
            href="#overview"
            onClick={(e) => {
              e.preventDefault();
              handleSelect('overview');
            }}
            className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            StatEdge
          </a>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.id === 'insights' && pendingInsightsCount > 0 && (
                  <span
                    className={`font-mono tabular-nums text-xs ${
                      active ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {pendingInsightsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 text-xs text-slate-500 space-y-1">
          <div className="font-medium text-slate-700">StatEdge Data Analytics</div>
          <div>App Store · Google Play</div>
        </div>
      </aside>
    </>
  );
}
