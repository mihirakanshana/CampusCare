import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type AnalyticsDateRange = 'all' | '30d' | '7d';
export type AdminSortBy = 'newest' | 'oldest' | 'priority';

interface DashboardState {
  sidebarCollapsed: boolean;
  analyticsDateRange: AnalyticsDateRange;
  analyticsCategoryFilter: string;
  includeDemoInAnalytics: boolean;
  studentSearch: string;
  studentStatusFilter: string;
  studentCategoryFilter: string;
  adminSearch: string;
  adminCategoryFilter: string;
  adminPriorityFilter: string;
  adminStatusFilter: string;
  adminSortBy: AdminSortBy;
}

const initialState: DashboardState = {
  sidebarCollapsed: false,
  analyticsDateRange: 'all',
  analyticsCategoryFilter: 'All',
  includeDemoInAnalytics: true,
  studentSearch: '',
  studentStatusFilter: 'All',
  studentCategoryFilter: 'All',
  adminSearch: '',
  adminCategoryFilter: 'All',
  adminPriorityFilter: 'All',
  adminStatusFilter: 'All',
  adminSortBy: 'newest',
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    toggleSidebarCollapsed(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
    },
    setAnalyticsDateRange(state, action: PayloadAction<AnalyticsDateRange>) {
      state.analyticsDateRange = action.payload;
    },
    setAnalyticsCategoryFilter(state, action: PayloadAction<string>) {
      state.analyticsCategoryFilter = action.payload;
    },
    setIncludeDemoInAnalytics(state, action: PayloadAction<boolean>) {
      state.includeDemoInAnalytics = action.payload;
    },
    setStudentSearch(state, action: PayloadAction<string>) {
      state.studentSearch = action.payload;
    },
    setStudentStatusFilter(state, action: PayloadAction<string>) {
      state.studentStatusFilter = action.payload;
    },
    setStudentCategoryFilter(state, action: PayloadAction<string>) {
      state.studentCategoryFilter = action.payload;
    },
    setAdminSearch(state, action: PayloadAction<string>) {
      state.adminSearch = action.payload;
    },
    setAdminCategoryFilter(state, action: PayloadAction<string>) {
      state.adminCategoryFilter = action.payload;
    },
    setAdminPriorityFilter(state, action: PayloadAction<string>) {
      state.adminPriorityFilter = action.payload;
    },
    setAdminStatusFilter(state, action: PayloadAction<string>) {
      state.adminStatusFilter = action.payload;
    },
    setAdminSortBy(state, action: PayloadAction<AdminSortBy>) {
      state.adminSortBy = action.payload;
    },
    resetAdminFilters(state) {
      state.adminSearch = '';
      state.adminCategoryFilter = 'All';
      state.adminPriorityFilter = 'All';
      state.adminStatusFilter = 'All';
      state.adminSortBy = 'newest';
    },
  },
});

export const {
  toggleSidebarCollapsed,
  setSidebarCollapsed,
  setAnalyticsDateRange,
  setAnalyticsCategoryFilter,
  setIncludeDemoInAnalytics,
  setStudentSearch,
  setStudentStatusFilter,
  setStudentCategoryFilter,
  setAdminSearch,
  setAdminCategoryFilter,
  setAdminPriorityFilter,
  setAdminStatusFilter,
  setAdminSortBy,
  resetAdminFilters,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
