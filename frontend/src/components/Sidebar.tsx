import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Image as ImageIcon,
  Files,
  Clock,
  FolderGit2,
  Sparkles,
  Bot,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Smart Search', path: '/search', icon: Search },
  { name: 'Visual Memory', path: '/visual', icon: ImageIcon },
  { name: 'My Files', path: '/files', icon: Files },
  { name: 'My Timeline', path: '/timeline', icon: Clock },
  { name: 'Projects', path: '/projects', icon: FolderGit2 },
  { name: 'Reconstruction', path: '/reconstruction', icon: Sparkles, badge: 'Flagship' },
  { name: 'AI Assistant', path: '/assistant', icon: Bot },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`h-screen sticky top-0 flex flex-col border-r transition-all duration-300 z-30 select-none
        ${collapsed ? 'w-20' : 'w-64'}
        bg-porcelain-100/90 dark:bg-onyx-300/90 backdrop-blur-xl border-alabaster dark:border-white/10`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-alabaster dark:border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="text-xl font-bold tracking-tight text-onyx dark:text-white flex items-center gap-1.5">
              SearchMyWorld<span className="text-xs text-slate-500 font-serif italic">✦</span>
            </span>
          </div>
        )}
        {collapsed && (
          <div className="w-full flex justify-center">
            <span className="text-xl font-bold text-onyx dark:text-white">S✦</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-onyx dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group relative
                ${
                  isActive
                    ? 'bg-onyx text-white dark:bg-white dark:text-onyx shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 hover:text-onyx dark:hover:text-white'
                }`
              }
            >
              <Icon size={19} className="flex-shrink-0" />
              {!collapsed && (
                <div className="flex items-center justify-between w-full overflow-hidden">
                  <span className="truncate">{item.name}</span>
                  {item.badge && (
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-pastel-lilac text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 ml-2">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
              {collapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1 bg-onyx text-white text-xs rounded-md shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  {item.name}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Local-First Trust Indicator */}
      <div className="p-4 border-t border-alabaster dark:border-white/10">
        <div
          className={`flex items-center gap-2.5 p-2.5 rounded-xl bg-porcelain-200 dark:bg-white/5 border border-alabaster dark:border-white/10 text-xs text-slate-500 dark:text-slate-400
          ${collapsed ? 'justify-center' : ''}`}
        >
          <ShieldCheck size={16} className="text-emerald-600 flex-shrink-0" />
          {!collapsed && (
            <div className="truncate">
              <p className="font-semibold text-slate-700 dark:text-slate-200">100% Local AI</p>
              <p className="text-[11px] truncate">No cloud leaks • Private</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
