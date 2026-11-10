/**
 * ULTRON Core System - Enterprise Application Controller
 * Main Application Bootstrapper & Component Orchestrator
 */

const api = new ApiClient({
  baseUrl:
    typeof window !== 'undefined' && window.location.hostname
      ? `${window.location.protocol}//${window.location.hostname}:3000`
      : 'http://localhost:3000',
});

// Global Application Configuration & Asset Registry
const APP_CONFIG = {
  logoPath: '/assets/logo/logo.jpg',
  companyName: 'PYLON PUBLIC COMPANY LIMITED',
};
window.APP_CONFIG = APP_CONFIG;

// Global Application State
let currentUser = null;
let activeMenu = 'home';
let activeMasterTable = 'company';
let masterTableRawData = [];

/**
 * Micro Component Loader:
 * Fetches HTML partials from /views/ and injects them into DOM targets
 */
async function loadComponent(targetSelector, viewUrl) {
  const el = document.querySelector(targetSelector);
  if (!el) return;
  try {
    const res = await fetch(viewUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status} loading ${viewUrl}`);
    el.innerHTML = await res.text();
  } catch (err) {
    console.error(`Failed to load component ${viewUrl} into ${targetSelector}:`, err);
  }
}

/**
 * Loads all decoupled HTML components on startup
 */
async function loadAllComponents() {
  await Promise.all([
    loadComponent('#viewLogin', '/views/auth-login.html'),
    loadComponent('#sidebarNav', '/views/sidebar.html'),
    loadComponent('#sectionHome', '/views/view-home.html'),
    loadComponent('#sectionMasterData', '/views/view-master-data.html'),
    loadComponent('#modalMasterForm', '/views/modal-master-form.html'),
    loadComponent('#modalCompanyPrintPreview', '/views/modal-company-print.html'),
  ]);
}

// App Startup Sequence
document.addEventListener('DOMContentLoaded', async () => {
  await loadAllComponents();
  initDemoMode();
  await initCorporateBranding();
  await loadDynamicDemoAccounts();
  await refreshAuthStatus();
});
