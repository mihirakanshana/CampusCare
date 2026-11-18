import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { AppNotification, UserProfile } from '../types/campuscare';
import { NotificationBell } from './NotificationBell';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '../contexts/AuthContext';
import { useAppDispatch, useAppSelector } from '../store/store';
import { toggleSidebarCollapsed } from '../store/dashboardSlice';

export interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  end?: boolean;
}

export function DashboardShell({
  title,
  breadcrumb,
  navItems,
  notifications,
  profile,
  headerAction,
  children,
}: {
  title: string;
  breadcrumb: string;
  navItems: NavItem[];
  notifications: AppNotification[];
  profile: UserProfile;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  const collapsed = useAppSelector((s) => s.dashboard.sidebarCollapsed);
  const dispatch = useAppDispatch();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const renderSidebarLinks = (isMobile = false) => (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={() => isMobile && setMobileOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 whitespace-nowrap ${
              isActive
                ? 'bg-[#059669] text-white shadow-[0_8px_18px_-8px_rgba(5,150,105,0.65)]'
                : 'text-[#334155] hover:text-[#064E3B] hover:bg-emerald-950/[0.05]'
            }`
          }
          title={collapsed && !isMobile ? item.label : undefined}
        >
          <span className="shrink-0">{item.icon}</span>
          {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen uf-ambient-canvas flex text-[#0F172A]">
      {/* Desktop Frosted Glass Sidebar */}
      <aside
        className={`hidden lg:flex flex-col glass-sidebar shrink-0 transition-[width] duration-200 ease-out sticky top-0 h-screen z-30 ${
          collapsed ? 'w-[78px]' : 'w-[260px]'
        }`}
      >
        <div className="h-16 px-4 flex items-center justify-between border-b border-emerald-950/10 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 text-left min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#059669] rounded-lg"
          >
            <BrandLogo size="md" />
            {!collapsed && (
              <span className="font-display font-bold text-base tracking-tight text-[#064E3B] whitespace-nowrap truncate">
                UniFix
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => dispatch(toggleSidebarCollapsed())}
            className="p-1.5 rounded-lg text-[#52635D] hover:text-[#064E3B] hover:bg-emerald-950/[0.06] transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {renderSidebarLinks(false)}

        <div className="p-3 border-t border-emerald-950/10 shrink-0">
          {!collapsed && (
            <div className="px-3 py-2.5 mb-2 rounded-xl bg-emerald-950/[0.04]">
              <p className="text-xs font-semibold text-[#0F172A] truncate">
                {profile.fullName}
              </p>
              <p className="text-[11px] text-[#52635D] truncate">
                {profile.role === 'admin'
                  ? 'Campus Administrator'
                  : profile.studentId || profile.email}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#334155] hover:text-rose-700 hover:bg-rose-50/80 transition-colors whitespace-nowrap"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Glass Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden bg-[#064E3B]/25 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          >
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-72 h-full bg-white/95 backdrop-blur-2xl border-r border-emerald-950/10 text-[#0F172A] flex flex-col shadow-2xl"
            >
              <div className="h-16 px-4 flex items-center justify-between border-b border-emerald-950/10">
                <div className="flex items-center gap-2.5">
                  <BrandLogo size="md" />
                  <span className="font-display font-bold text-base text-[#064E3B]">
                    UniFix
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="p-2 text-[#52635D] hover:text-[#064E3B] rounded-lg"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {renderSidebarLinks(true)}
              <div className="p-3 border-t border-emerald-950/10">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#334155] hover:text-rose-700 hover:bg-rose-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 glass-header px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-emerald-950/10 bg-white/70 text-[#064E3B] hover:bg-white transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <p className="text-xs text-[#52635D] truncate">{breadcrumb}</p>
              <h1 className="text-base sm:text-lg font-bold text-[#064E3B] font-display truncate">
                {title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {headerAction}
            <NotificationBell notifications={notifications} role={profile.role} />
            <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-emerald-950/10">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#064E3B] to-[#059669] text-white text-xs font-semibold flex items-center justify-center uppercase shadow-xs">
                {profile.fullName.slice(0, 2)}
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-[#0F172A] leading-tight max-w-[130px] truncate">
                  {profile.fullName}
                </p>
                <p className="text-[11px] text-[#52635D] capitalize leading-tight">
                  {profile.role}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
