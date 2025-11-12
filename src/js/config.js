/**
 * MERACHI - Configuração da Aplicação
 * Arquivo centralizado de configurações
 */

// Obter configurações do ambiente ou usar valores padrão
const getEnvVar = (key, defaultValue) => {
  return import.meta.env[key] || defaultValue;
};

// Configuração principal
export const CONFIG = {
  // URL base do N8N
  N8N_BASE_URL: getEnvVar('VITE_N8N_BASE_URL', 'https://n8n-x8go8cgk0g0c0wc4004wosoc.themodernservers.com'),

  // Endpoints da API
  ENDPOINTS: {
    EVENTS: getEnvVar('VITE_ENDPOINT_EVENTS', '/webhook/dashboard-events'),
    TASKS: getEnvVar('VITE_ENDPOINT_TASKS', '/webhook/clickup-tasks'),
    UNIFIED: getEnvVar('VITE_ENDPOINT_UNIFIED', '/webhook/dashboard-unified'),
    CREATE_TASK: getEnvVar('VITE_ENDPOINT_CREATE_TASK', '/webhook/dashboard-create-task'),
    CREATE_EVENT: getEnvVar('VITE_ENDPOINT_CREATE_EVENT', '/webhook/dashboard-create-event'),
    CREATE_BULK_TASKS: getEnvVar('VITE_ENDPOINT_CREATE_BULK_TASKS', '/webhook/dashboard-bulk-tasks'),
    UPDATE_TASK_STATUS: getEnvVar('VITE_ENDPOINT_UPDATE_TASK_STATUS', '/webhook/dashboard-update-task-status'),
    PROJECT_VIEW: getEnvVar('VITE_ENDPOINT_PROJECT_VIEW', '/webhook/dashboard-project-view'),
    FILES: getEnvVar('VITE_ENDPOINT_FILES', '/webhook/dashboard-files'),
    COPY_GENERATOR: getEnvVar('VITE_ENDPOINT_COPY_GENERATOR', '/webhook/dashboard-copy-generator'),
    PERFORMANCE_METRICS: getEnvVar('VITE_ENDPOINT_PERFORMANCE_METRICS', '/webhook/dashboard-performance-metrics'),
    EXPORT_PDF: getEnvVar('VITE_ENDPOINT_EXPORT_PDF', '/webhook/dashboard-export-pdf'),
    EXPORT_CSV: getEnvVar('VITE_ENDPOINT_EXPORT_CSV', '/webhook/dashboard-export-csv'),
    NOTIFICATIONS: getEnvVar('VITE_ENDPOINT_NOTIFICATIONS', '/webhook/dashboard-notifications')
  },

  // Intervalo de sincronização automática (em milissegundos)
  AUTO_SYNC: parseInt(getEnvVar('VITE_AUTO_SYNC_INTERVAL', '300000')), // 5 minutos

  // Informações da aplicação
  APP: {
    NAME: getEnvVar('VITE_APP_NAME', 'MERACHI'),
    VERSION: getEnvVar('VITE_APP_VERSION', '1.0.0'),
    ENVIRONMENT: getEnvVar('VITE_APP_ENVIRONMENT', 'production')
  },

  // Feature flags
  FEATURES: {
    OFFLINE_MODE: getEnvVar('VITE_FEATURE_OFFLINE_MODE', 'true') === 'true',
    PUSH_NOTIFICATIONS: getEnvVar('VITE_FEATURE_PUSH_NOTIFICATIONS', 'true') === 'true',
    BACKGROUND_SYNC: getEnvVar('VITE_FEATURE_BACKGROUND_SYNC', 'true') === 'true'
  }
};

// Temas disponíveis
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark'
};

// Status das tarefas
export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Prioridades
export const PRIORITIES = {
  URGENT: 'urgent',
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low'
};

// Períodos de visualização
export const PERIODS = {
  DAY: 'dia',
  WEEK: 'semana',
  MONTH: 'mes',
  YEAR: 'ano'
};

// Views disponíveis
export const VIEWS = {
  DASHBOARD: 'dashboard',
  CALENDAR: 'calendario',
  SPRINT: 'sprint',
  FILES: 'arquivos',
  COPY: 'copy',
  ANALYTICS: 'analytics'
};

// Configurações de notificação
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Timeout padrão para requisições (em milissegundos)
export const REQUEST_TIMEOUT = 30000; // 30 segundos

// Configurações de cache
export const CACHE_CONFIG = {
  MAX_AGE: 300000, // 5 minutos
  MAX_ENTRIES: 100
};

// Validações
export const VALIDATION = {
  MIN_TASK_TITLE_LENGTH: 3,
  MAX_TASK_TITLE_LENGTH: 200,
  MIN_EVENT_TITLE_LENGTH: 3,
  MAX_EVENT_TITLE_LENGTH: 200
};

// Log de configuração (apenas em desenvolvimento)
if (CONFIG.APP.ENVIRONMENT === 'development') {
  console.log('⚙️ Configuração carregada:', CONFIG);
}

export default CONFIG;
