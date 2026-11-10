/**
 * ULTRON UI & Notification Engine
 * Manages Toast alerts, Password visibility toggles, and Developer Demo mode
 */

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const isSuccess = type === 'success';
  toast.className = `py-2 px-3 rounded text-xs font-medium flex items-center space-x-2 transition-all transform duration-200 translate-y-1 opacity-0 pointer-events-auto shadow-md border ${
    isSuccess
      ? 'bg-slate-900 text-white border-slate-800'
      : 'bg-rose-50 text-rose-800 border-rose-300'
  }`;

  const iconSvg = isSuccess
    ? '<svg class="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>'
    : '<svg class="w-3.5 h-3.5 text-rose-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

  toast.innerHTML = `${iconSvg}<span>${message}</span>`;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-1', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-1');
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!input) return;

  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';

  if (icon) {
    if (isPassword) {
      // Eye Slash Icon (Visible state)
      icon.innerHTML = `
        <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
      `;
    } else {
      // Eye Normal Icon (Hidden state)
      icon.innerHTML = `
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      `;
    }
  }
}

// ----------------------------------------------------
// Demo Accounts Helper (Developer Mode)
// ----------------------------------------------------

function initDemoMode() {
  const stored = localStorage.getItem('app_demo_mode');
  // Default to true for developer convenience on first load
  const isDemo = stored === null ? true : stored === 'true';
  applyDemoMode(isDemo);
}

function toggleDemoMode() {
  const stored = localStorage.getItem('app_demo_mode');
  const current = stored === null ? true : stored === 'true';
  const next = !current;
  localStorage.setItem('app_demo_mode', next ? 'true' : 'false');
  applyDemoMode(next);
  showToast(
    next
      ? 'เปิดโหมดทดสอบระบบสำหรับผู้พัฒนา (DEV MODE: ON)'
      : 'เข้าสู่โหมดการทำงานจริง (DEV MODE: OFF)',
    'success'
  );
}

function applyDemoMode(enabled) {
  const panel = document.getElementById('loginDemoAccountsPanel');
  const badge = document.getElementById('demoModeBadge');
  const btn = document.getElementById('btnToggleDemoMode');

  if (panel) {
    if (enabled) {
      panel.classList.remove('hidden');
    } else {
      panel.classList.add('hidden');
    }
  }
  if (badge) {
    badge.textContent = enabled ? 'ON' : 'OFF';
    badge.className = enabled ? 'text-blue-700 font-bold font-mono' : 'text-slate-500 font-mono';
  }
  if (btn) {
    if (enabled) {
      btn.className =
        'text-xs text-blue-700 transition-colors inline-flex items-center space-x-1.5 py-1 px-3 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 shadow-2xs cursor-pointer';
    } else {
      btn.className =
        'text-xs text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center space-x-1.5 py-1 px-3 rounded border border-slate-300 bg-white shadow-2xs cursor-pointer';
    }
  }
}
