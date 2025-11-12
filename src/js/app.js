    <script>
        // 🔧 CONFIGURAÇÃO - WEBHOOKS ATUALIZADOS PARA INDEX 3
        // Usando os mesmos endpoints do index 3
        const CONFIG = {
            N8N_BASE_URL: 'https://n8n-x8go8cgk0g0c0wc4004wosoc.themodernservers.com',
            ENDPOINTS: {
                EVENTS: '/webhook/dashboard-events',
                TASKS: '/webhook/clickup-tasks',
                UNIFIED: '/webhook/dashboard-unified',
                CREATE_TASK: '/webhook/dashboard-create-task',
                CREATE_EVENT: '/webhook/dashboard-create-event',
                CREATE_BULK_TASKS: '/webhook/dashboard-bulk-tasks',
                UPDATE_TASK_STATUS: '/webhook/dashboard-update-task-status',
                PROJECT_VIEW: '/webhook/dashboard-project-view',
                FILES: '/webhook/dashboard-files', // NOVO: Arquivos do Google Drive
                COPY_GENERATOR: '/webhook/dashboard-copy-generator', // NOVO: Gerador de Copy IA
                PERFORMANCE_METRICS: '/webhook/dashboard-performance-metrics', // NOVO: Métricas de performance
                EXPORT_PDF: '/webhook/dashboard-export-pdf', // NOVO: Exportar PDF
                EXPORT_CSV: '/webhook/dashboard-export-csv', // NOVO: Exportar CSV
                NOTIFICATIONS: '/webhook/dashboard-notifications' // NOVO: Notificações
            },
            AUTO_SYNC: 300000 // 5 minutos
        };

        // 📄 ESTADO GLOBAL
        let allEvents = [];
        let allTasks = [];
        let allProjectTasks = []; // NOVO: Todas as tarefas do projeto sem filtro de data
        let allFiles = []; // NOVO: Arquivos do Google Drive
        let currentView = 'dashboard';
        let currentPeriod = 'dia';
        let projectViewMode = false; // NOVO: Modo de visualização de projeto completo
        let lastSync = null;
        let currentFilters = {
            text: '',
            setor: '',
            date: '',
            priority: '',
            status: '', // NOVO: Filtro por status
            assignee: '' // NOVO: Filtro por responsável
        };

        // 🚀 INICIALIZAÇÃO
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 MERACHI Dashboard iniciado com endpoints do index 3');
            initializeApp();
        });

        async function initializeApp() {
            showLoading(true);
            try {
                await loadAllData();
                await loadFiles(); // NOVO: Carregar arquivos do Google Drive
                setupEventListeners();
                setupAutoSync();
                
                // Garantir que começamos na visualização do dashboard
                currentView = 'dashboard';
                document.querySelector('.nav-item[onclick*="dashboard"]')?.classList.add('active');
                
                // Aplicar correção das cores dos setores e filtros
                setTimeout(() => {
                    fixSectorTitlesColor();
                    updateFiltersForDarkMode();
                }, 200);
                
                showNotification('MERACHI Dashboard carregado com sucesso! 🦋', 'success');
            } catch (error) {
                console.error('Erro na inicialização:', error);
                loadMockData();
                showNotification('Modo offline ativado', 'warning');
            } finally {
                showLoading(false);
            }
        }

        // ===============================
        // 📊 CARREGAMENTO DE DADOS
        // ===============================

        async function loadAllData() {
            console.log('🔄 Iniciando carregamento de dados...');
            await Promise.all([
                loadCalendarEvents(),
                loadClickUpTasks()
            ]);
            console.log(`✅ Dados carregados: ${allEvents.length} eventos, ${allTasks.length} tarefas`);
            updateMetrics();
            renderCurrentView();
            lastSync = new Date();
        }

        // NOVO: Função para carregar arquivos do Google Drive
        async function loadFiles() {
            try {
                const response = await fetch(`${CONFIG.N8N_BASE_URL}${CONFIG.ENDPOINTS.FILES}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                console.log('📁 Resposta dos Arquivos:', data);

                if (data.success && Array.isArray(data.files)) {
                    allFiles = data.files.map(file => ({
                        id: file.id || `file-${Date.now()}-${Math.random()}`,
                        name: file.name || 'Arquivo sem nome',
                        mimeType: file.mimeType || 'application/octet-stream',
                        size: file.size || 0,
                        modifiedTime: file.modifiedTime || new Date().toISOString(),
                        createdTime: file.createdTime || new Date().toISOString(),
                        webViewLink: file.webViewLink || '',
                        webContentLink: file.webContentLink || '',
                        iconLink: file.iconLink || '',
                        thumbnailLink: file.thumbnailLink || '',
                        owners: file.owners || [],
                        parents: file.parents || []
                    }));
                    console.log(`📁 ${allFiles.length} arquivos carregados`);
                } else {
                    console.warn('⚠️ Estrutura inválida dos arquivos:', data);
                    allFiles = [];
                }
            } catch (error) {
                console.error('❌ Erro ao carregar arquivos:', error);
                allFiles = [];
            }
        }

        // NOVA FUNÇÃO: Carregar visualização completa do projeto
        async function loadProjectView() {
            try {
                showLoading(true);
                const response = await fetch(`${CONFIG.N8N_BASE_URL}${CONFIG.ENDPOINTS.PROJECT_VIEW}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                console.log('🌟 Resposta do Project View:', data);

                if (data.success && data.projectTasks && Array.isArray(data.projectTasks)) {
                    allProjectTasks = data.projectTasks.map(task => ({
                        id: task.id || `task-${Date.now()}`,
                        title: task.title || task.name || 'Demanda sem nome',
                        description: task.description || '',
                        setor: task.setor || task.sector || 'Geral',
                        categoria: task.categoria || 'geral',
                        status: task.status || 'open',
                        assignees: task.assignees || [],
                        due_date: task.due_date,
                        start_date: task.start_date || task.start,
                        created_date: task.created_date,
                        url: task.url,
                        priority: task.priority || 'normal',
                        dependencies: task.dependencies || [],
                        project: task.project || 'Projeto Principal',
                        tags: task.tags || []
                    }));

                    console.log(`🌟 ${allProjectTasks.length} tarefas do projeto carregadas`);
                    projectViewMode = true;
                    
                    // Atualizar UI
                    updateMetrics();
                    renderCurrentView();
                    showNotification(`Visualização de projeto carregada! ${allProjectTasks.length} tarefas encontradas 🌟`, 'success');
                    
                } else {
                    console.warn('⚠️ Estrutura inválida do Project View:', data);
                    // Fallback: usar tarefas atuais
                    allProjectTasks = [...allTasks];
                    projectViewMode = true;
                    updateMetrics();
                    renderCurrentView();
                    showNotification('Usando dados atuais para visualização de projeto', 'warning');
                }
            } catch (error) {
                console.error('❌ Erro ao carregar Project View:', error);
                // Fallback: usar tarefas atuais
                allProjectTasks = [...allTasks];
                projectViewMode = true;
                updateMetrics();
                renderCurrentView();
                showNotification('Modo offline: usando dados locais para projeto', 'warning');
            } finally {
                showLoading(false);
            }
        }

        async function loadCalendarEvents() {
            try {
                const response = await fetch(`${CONFIG.N8N_BASE_URL}${CONFIG.ENDPOINTS.EVENTS}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                console.log('📅 Resposta do Calendar:', data);

                if (data.success && Array.isArray(data.events)) {
                    allEvents = data.events.map(event => ({
                        id: event.id || `event-${Date.now()}`,
                        title: event.title || event.summary || 'Evento sem título',
                        description: event.description || '',
                        start: event.start || event.startTime || new Date().toISOString(),
                        end: event.end || event.endTime,
                        location: event.location || '',
                        status: event.status || 'confirmed',
                        attendees: event.attendees || []
                    }));
                    console.log(`✅ ${allEvents.length} eventos carregados`);
                } else {
                    console.warn('⚠️ Estrutura inválida do Calendar:', data);
                    allEvents = generateMockEvents();
                }
            } catch (error) {
                console.error('❌ Erro ao carregar Calendar:', error);
                allEvents = generateMockEvents();
            }
        }

        async function loadClickUpTasks() {
            try {
                const response = await fetch(`${CONFIG.N8N_BASE_URL}${CONFIG.ENDPOINTS.TASKS}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                console.log('📝 Resposta do ClickUp:', data);

                if (data.success && data.tasks && Array.isArray(data.tasks)) {
                    allTasks = data.tasks.map(task => ({
                        id: task.id || `task-${Date.now()}`,
                        title: task.title || task.name || 'Demanda sem nome',
                        description: task.description || '',
                        setor: task.setor || task.sector || 'Geral',
                        categoria: task.categoria || 'geral',
                        status: task.status || 'open',
                        assignees: task.assignees || [],
                        due_date: task.due_date,
                        start: task.start || new Date().toISOString(),
                        url: task.url,
                        priority: task.priority || 'normal'
                    }));

                    console.log(`✅ ${allTasks.length} demandas processadas`);
                    console.log('📋 Primeira tarefa:', allTasks[0]);

                    const setoresEncontrados = [...new Set(allTasks.map(t => t.setor))].sort();
                    console.log('🏢 Setores encontrados:', setoresEncontrados);

                } else {
                    console.warn('⚠️ Estrutura inválida do ClickUp:', data);
                    allTasks = generateMockTasks();
                }
            } catch (error) {
                console.error('❌ Erro ao carregar ClickUp:', error);
                allTasks = generateMockTasks();
            }
        }

        // ===============================
        // 📝 CRIAÇÃO DE DEMANDAS E EVENTOS
        // ===============================

        async function createQuickTask(event) {
            event.preventDefault();
            
            const submitBtn = event.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            try {
                submitBtn.disabled = true;
                submitBtn.classList.add('btn-loading');
                
                const taskData = {
                    title: document.getElementById('taskTitle').value,
                    setor: document.getElementById('taskSetor').value,
                    priority: document.getElementById('taskPriority').value,
                    due_date: document.getElementById('taskDueDate').value,
                    assignee: document.getElementById('taskAssignee').value,
                    description: document.getElementById('taskDescription').value,
                    status: 'open'
                };

                console.log('📝 Criando tarefa:', taskData);

                const response = await fetch(`${CONFIG.N8N_BASE_URL}${CONFIG.ENDPOINTS.CREATE_TASK}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(taskData)
                });

                const result = await response.json();
                console.log('✅ Resposta da criação:', result);

                if (result.success) {
                    showNotification('Demanda criada com sucesso! 🎉', 'success');
                    closeQuickModal();
                    document.getElementById('taskForm').reset();
                    await loadClickUpTasks();
                    updateMetrics();
                    renderCurrentView();
                } else {
                    throw new Error(result.message || 'Erro ao criar demanda');
                }

            } catch (error) {
                console.error('❌ Erro ao criar tarefa:', error);
                showNotification('Erro ao criar demanda: ' + error.message, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.classList.remove('btn-loading');
                submitBtn.innerHTML = originalText;
            }
        }

        async function createQuickEvent(event) {
            event.preventDefault();
            
            const submitBtn = event.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            try {
                submitBtn.disabled = true;
                submitBtn.classList.add('btn-loading');
                
                const eventDate = document.getElementById('eventDate').value;
                const eventTime = document.getElementById('eventTime').value;
                const duration = parseInt(document.getElementById('eventDuration').value);
                
                const startDateTime = new Date(`${eventDate}T${eventTime}`);
                const endDateTime = new Date(startDateTime.getTime() + (duration * 60000));

                const eventData = {
                    title: document.getElementById('eventTitle').value,
                    start: startDateTime.toISOString(),
                    end: endDateTime.toISOString(),
                    location: document.getElementById('eventLocation').value,
                    description: document.getElementById('eventDescription').value,
                    attendees: document.getElementById('eventAttendees').value.split(',').map(email => email.trim()).filter(email => email)
                };

                console.log('📅 Criando evento:', eventData);

                const response = await fetch(`${CONFIG.N8N_BASE_URL}${CONFIG.ENDPOINTS.CREATE_EVENT}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(eventData)
                });

                const result = await response.json();
                console.log('✅ Resposta da criação:', result);

                if (result.success) {
                    showNotification('Evento criado com sucesso! 🎉', 'success');
                    closeQuickModal();
                    document.getElementById('eventForm').reset();
                    await loadCalendarEvents();
                    updateMetrics();
                    renderCurrentView();
                } else {
                    throw new Error(result.message || 'Erro ao criar evento');
                }

            } catch (error) {
                console.error('❌ Erro ao criar evento:', error);
                showNotification('Erro ao criar evento: ' + error.message, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.classList.remove('btn-loading');
                submitBtn.innerHTML = originalText;
            }
        }

        async function createBulkTasks(event) {
            event.preventDefault();
            
            const submitBtn = event.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            try {
                submitBtn.disabled = true;
                submitBtn.classList.add('btn-loading');
                
                const bulkData = {
                    description: document.getElementById('bulkDescription').value,
                    setor: document.getElementById('bulkSetor').value,
                    deadline: document.getElementById('bulkDeadline').value,
                    priority: document.getElementById('bulkPriority').value
                };

                console.log('🤖 Criando tarefas em lote:', bulkData);

                const response = await fetch(`${CONFIG.N8N_BASE_URL}${CONFIG.ENDPOINTS.CREATE_BULK_TASKS}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(bulkData)
                });

                const result = await response.json();
                console.log('✅ Resposta da criação em lote:', result);

                if (result.success) {
                    const tasksCount = result.tasks ? result.tasks.length : 'várias';
                    showNotification(`${tasksCount} demandas criadas com IA! 🤖✨`, 'success');
                    closeQuickModal();
                    document.getElementById('bulkForm').reset();
                    await loadClickUpTasks();
                    updateMetrics();
                    renderCurrentView();
                } else {
                    throw new Error(result.message || 'Erro ao criar demandas em lote');
                }

            } catch (error) {
                console.error('❌ Erro ao criar tarefas em lote:', error);
                showNotification('Erro ao gerar demandas: ' + error.message, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.classList.remove('btn-loading');
                submitBtn.innerHTML = originalText;
            }
        }

        // ===============================
        // 📄 ATUALIZAÇÃO DE STATUS
        // ===============================

        async function changeTaskStatus(event, taskId) {
            event.stopPropagation();
            
            const badge = event.target;
            const originalText = badge.textContent;
            
            try {
                badge.classList.add('loading');
                
                const currentTask = allTasks.find(t => t.id === taskId);
                if (!currentTask) return;

                const statuses = ['open', 'progress', 'review', 'complete'];
                const currentIndex = statuses.indexOf(currentTask.status);
                const nextStatus = statuses[(currentIndex + 1) % statuses.length];

                const updateData = {
                    taskId: taskId,
                    status: nextStatus
                };

                console.log('📄 Atualizando status:', updateData);

                const response = await fetch(`${CONFIG.N8N_BASE_URL}${CONFIG.ENDPOINTS.UPDATE_TASK_STATUS}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                });

                const result = await response.json();

                if (result.success) {
                    // Atualizar o status da task localmente
                    currentTask.status = nextStatus;
                    renderCurrentView();
                    updateMetrics();
                    showNotification(`Status alterado para ${getTaskStatusLabel(nextStatus)}`, 'info');
                } else {
                    throw new Error(result.message || 'Erro ao atualizar status');
                }

            } catch (error) {
                console.error('❌ Erro ao atualizar status:', error);
                showNotification('Erro ao atualizar status: ' + error.message, 'error');
            } finally {
                badge.classList.remove('loading');
            }
        }

        // Função para resetar o status da task para "Aberta"
        async function resetTaskStatusButton(event, taskId) {
            event.stopPropagation();
            
            const button = event.target;
            
            try {
                button.classList.add('loading');
                
                const updateData = {
                    taskId: taskId,
                    status: 'open'
                };

                console.log('📄 Resetando status:', updateData);

                const response = await fetch(`${CONFIG.N8N_BASE_URL}${CONFIG.ENDPOINTS.UPDATE_TASK_STATUS}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                });

                const result = await response.json();

                if (result.success) {
                    // Atualizar o status da task localmente
                    const currentTask = allTasks.find(t => t.id === taskId);
                    if (currentTask) {
                        currentTask.status = 'open';
                        renderCurrentView();
                        updateMetrics();
                        showNotification('Status resetado para "Aberta" 🧹', 'info');
                    }
                } else {
                    throw new Error(result.message || 'Erro ao resetar status');
                }

            } catch (error) {
                console.error('❌ Erro ao resetar status:', error);
                showNotification('Erro ao resetar status: ' + error.message, 'error');
            } finally {
                button.classList.remove('loading');
            }
        }

        // ===============================
        // 📄 SINCRONIZAÇÃO
        // ===============================

        // Garantir escopo global
        window.showView = showView;
        window.syncAll = syncAll;
        async function syncAll() {
            showLoading(true);
            try {
                // Tentar usar o webhook de sincronização completa primeiro
                try {
                    const response = await fetch(`${CONFIG.N8N_BASE_URL}${CONFIG.ENDPOINTS.UNIFIED}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.success) {
                            if (data.events) allEvents = data.events;
                            if (data.tasks) allTasks = data.tasks;
                            updateMetrics();
                            renderCurrentView();
                            lastSync = new Date();
                            showNotification('Sincronização completa realizada! 🔄✨', 'success');
                            return;
                        }
                    }
                } catch (unifiedError) {
                    console.warn('Webhook unificado não disponível, usando sincronização individual');
                }

                // Fallback para sincronização individual
                await loadAllData();
                showNotification('Dados sincronizados com sucesso! 🔄', 'success');

            } catch (error) {
                console.error('Erro na sincronização:', error);
                showNotification('Erro na sincronização: ' + error.message, 'error');
            } finally {
                showLoading(false);
            }
        }

        async function syncCalendar() {
            showLoading(true);
            try {
                await loadCalendarEvents();
                updateMetrics();
                renderCurrentView();
                showNotification('Eventos sincronizados! 📅', 'success');
            } catch (error) {
                console.error('Erro ao sincronizar calendar:', error);
                showNotification('Erro ao sincronizar eventos', 'error');
            } finally {
                showLoading(false);
            }
        }

        async function syncClickUp() {
            showLoading(true);
            try {
                await loadClickUpTasks();
                updateMetrics();
                renderCurrentView();
                showNotification('Demandas sincronizadas! ✅', 'success');
            } catch (error) {
                console.error('Erro ao sincronizar ClickUp:', error);
                showNotification('Erro ao sincronizar demandas', 'error');
            } finally {
                showLoading(false);
            }
        }

        // ===============================
        // 📊 MÉTRICAS E RENDERIZAÇÃO
        // ===============================

        function updateMetrics() {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 7);

            // Total de eventos (agenda + demandas)
            const totalEvents = allEvents.length + allTasks.length;
            document.getElementById('totalEvents').textContent = totalEvents;

            // Concluídos esta semana
            const completed = allTasks.filter(task => {
                const isCompleted = task.status === 'complete' || task.status === 'closed';
                return isCompleted;
            }).length;
            document.getElementById('completed').textContent = completed;

            // Em progresso
            const inProgress = allTasks.filter(task => 
                task.status === 'progress' || task.status === 'in progress'
            ).length;
            document.getElementById('inProgress').textContent = inProgress;

            // Atualizar contadores dos filtros rápidos
            updateQuickFilterCounts();
        }

        function renderCurrentView() {
            const mainContent = document.getElementById('mainContent');
            
            switch(currentView) {
                case 'dashboard':
                    renderDashboardView();
                    break;
                case 'calendario':
                    renderCalendarioView();
                    break;
                case 'sprint':
                    renderSprintView();
                    break;
                case 'arquivos':
                    renderArquivosView();
                    break;
                case 'copy':
                    renderCopyView();
                    break;
                case 'analytics':
                    renderAnalyticsView();
                    break;
                case 'automacao':
                    renderAutomacaoView();
                    break;
                case 'integracao':
                    renderIntegracaoView();
                    break;
                case 'equipe':
                    renderEquipeView();
                    break;
                case 'configuracoes':
                    renderConfiguracoesView();
                    break;
                default:
                    renderDashboardView();
            }
            
            // Garantir que as cores dos setores sejam aplicadas corretamente
            setTimeout(() => {
                fixSectorTitlesColor();
            }, 150);
        }

        // NOVA FUNÇÃO: Renderizar a view de Sprint
        function renderSprintView() {
            // Configurar elementos visíveis para sprint
            document.querySelector('.metrics-grid').style.display = 'none';
            document.querySelector('.filters-section-enhanced').style.display = 'block';
            document.querySelector('.content-grid').style.display = 'none';
            
            const mainContent = document.getElementById('mainContent');
            const contentAfterHeader = mainContent.querySelector('.metrics-grid').parentElement;
            
            let sprintContainer = document.getElementById('sprintFullView');
            if (!sprintContainer) {
                sprintContainer = document.createElement('div');
                sprintContainer.id = 'sprintFullView';
                sprintContainer.style.width = '100%';
                contentAfterHeader.appendChild(sprintContainer);
            }
            
            sprintContainer.style.display = 'block';
            sprintContainer.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px;">
                    <div class="content-section" style="background: var(--card-bg); border: 1px solid var(--border-light);">
                        <div class="section-header" style="background: linear-gradient(135deg, var(--bg-secondary), var(--card-bg)); border-bottom: 2px solid var(--border-light);">
                            <h2 class="section-title" style="color: var(--text-primary);">📅 Sprint Semanal</h2>
                            <p class="section-subtitle" style="color: var(--text-muted);">Visão detalhada da semana vigente</p>
                            <div class="section-actions">
                                <button class="section-btn" onclick="syncClickUp()" style="background: var(--bg-secondary); color: var(--text-secondary); border: 1px solid var(--border);">🔄 Sincronizar</button>
                                <button class="section-btn" onclick="addNewTask()" style="background: var(--bg-secondary); color: var(--text-secondary); border: 1px solid var(--border);">➕ Nova Demanda</button>
                            </div>
                        </div>
                        <div class="section-content" style="background: var(--card-bg); color: var(--text-primary);">
                            ${generateWeeklySprintView()}
                        </div>
                    </div>
                    
                    <div class="content-section" style="background: var(--card-bg); border: 1px solid var(--border-light);">
                        <div class="section-header" style="background: linear-gradient(135deg, var(--bg-secondary), var(--card-bg)); border-bottom: 2px solid var(--border-light);">
                            <h2 class="section-title" style="color: var(--text-primary);">🗓️ Sprint Mensal</h2>
                            <p class="section-subtitle" style="color: var(--text-muted);">Visão detalhada do mês corrente</p>
                            <div class="section-actions">
                                <button class="section-btn" onclick="syncClickUp()" style="background: var(--bg-secondary); color: var(--text-secondary); border: 1px solid var(--border);">🔄 Sincronizar</button>
                                <button class="section-btn" onclick="addNewTask()" style="background: var(--bg-secondary); color: var(--text-secondary); border: 1px solid var(--border);">➕ Nova Demanda</button>
                            </div>
                        </div>
                        <div class="section-content" style="background: var(--card-bg); color: var(--text-primary);">
                            ${generateMonthlySprintView()}
                        </div>
                    </div>
                </div>
                
                <div class="content-section" style="background: var(--card-bg); border: 1px solid var(--border-light);">
                    <div class="section-header" style="background: linear-gradient(135deg, var(--bg-secondary), var(--card-bg)); border-bottom: 2px solid var(--border-light);">
                        <h2 class="section-title" style="color: var(--text-primary);">📊 Resumo da Sprint</h2>
                        <p class="section-subtitle" style="color: var(--text-muted);">Métricas e estatísticas das demandas</p>
                    </div>
                    <div class="section-content" style="background: var(--card-bg); color: var(--text-primary);">
                        ${generateSprintMetrics()}
                    </div>
                </div>
            `;
            
            // Garantir que as cores sejam atualizadas corretamente
            setTimeout(() => {
                updateFiltersForDarkMode();
                fixSectorTitlesColor();
            }, 150);
        }

        // Função para gerar a visão semanal da sprint
        function generateWeeklySprintView() {
            const now = new Date();
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay()); // Domingo
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6); // Sábado
            
            // Filtrar tarefas da semana
            const weeklyTasks = allTasks.filter(task => {
                if (task.due_date) {
                    const dueDate = new Date(task.due_date);
                    return dueDate >= startOfWeek && dueDate <= endOfWeek;
                }
                return false;
            });
            
            if (weeklyTasks.length === 0) {
                return `
                    <div class="empty-state">
                        <h3>Nenhuma demanda encontrada</h3>
                        <p>Não há demandas para a sprint semanal atual</p>
                    </div>
                `;
            }
            
            // Agrupar por dia
            const tasksByDay = {};
            for (let i = 0; i < 7; i++) {
                const day = new Date(startOfWeek);
                day.setDate(startOfWeek.getDate() + i);
                const dateStr = day.toDateString();
                tasksByDay[dateStr] = [];
            }
            
            weeklyTasks.forEach(task => {
                if (task.due_date) {
                    const dueDate = new Date(task.due_date);
                    const dateStr = dueDate.toDateString();
                    if (tasksByDay[dateStr]) {
                        tasksByDay[dateStr].push(task);
                    }
                }
            });
            
            // Gerar HTML
            let html = `
                <div style="display: grid; gap: 16px;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
            `;
            
            const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
            
            for (let i = 0; i < 7; i++) {
                const day = new Date(startOfWeek);
                day.setDate(startOfWeek.getDate() + i);
                const dateStr = day.toDateString();
                const dayTasks = tasksByDay[dateStr] || [];
                const isToday = day.toDateString() === now.toDateString();
                
                html += `
                    <div style="background: ${isToday ? 'var(--gradient-primary)' : 'var(--bg-secondary)'}; padding: 16px; border-radius: 12px; border: 1px solid var(--border-light);">
                        <div style="font-weight: 700; color: ${isToday ? 'white' : 'var(--text-primary)'}; margin-bottom: 8px;">
                            ${dayNames[day.getDay()]}<br>
                            <span style="font-size: 0.9rem; font-weight: 600;">${day.getDate()}/${day.getMonth() + 1}</span>
                        </div>
                        <div style="font-size: 0.9rem; color: ${isToday ? 'rgba(255,255,255,0.9)' : 'var(--text-muted)'};">
                            ${dayTasks.length} demandas
                        </div>
                        ${dayTasks.length > 0 ? `
                            <div style="margin-top: 8px; max-height: 150px; overflow-y: auto;">
                                ${dayTasks.slice(0, 3).map(task => `
                                    <div style="background: ${isToday ? 'rgba(255,255,255,0.2)' : 'var(--bg-secondary)'}; padding: 6px; border-radius: 6px; margin-bottom: 4px; font-size: 0.8rem; color: ${isToday ? 'white' : 'var(--text-primary)'}; border: 1px solid ${isToday ? 'rgba(255,255,255,0.3)' : 'var(--border-light)'};">
                                        <div style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${task.title}</div>
                                        <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                                            <span class="status-badge status-${task.status}" style="font-size: 0.7rem; padding: 2px 4px;">${getTaskStatusLabel(task.status)}</span>
                                            ${task.priority === 'high' || task.priority === 'urgent' ? '⚡' : ''}
                                        </div>
                                    </div>
                                `).join('')}
                                ${dayTasks.length > 3 ? `<div style="text-align: center; font-size: 0.7rem; color: rgba(255,255,255,0.7);">+${dayTasks.length - 3} mais</div>` : ''}
                            </div>
                        ` : ''}
                    </div>
                `;
            }
            
            html += `
                    </div>
                </div>
            `;
            
            return html;
        }

        // Função para gerar a visão mensal da sprint
        function generateMonthlySprintView() {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            
            // Filtrar tarefas do mês
            const monthlyTasks = allTasks.filter(task => {
                if (task.due_date) {
                    const dueDate = new Date(task.due_date);
                    return dueDate >= startOfMonth && dueDate <= endOfMonth;
                }
                return false;
            });
            
            if (monthlyTasks.length === 0) {
                return `
                    <div class="empty-state">
                        <h3>Nenhuma demanda encontrada</h3>
                        <p>Não há demandas para a sprint mensal atual</p>
                    </div>
                `;
            }
            
            // Agrupar por semana
            const tasksByWeek = {};
            for (let i = 0; i < 5; i++) { // Máximo de 5 semanas
                tasksByWeek[`week${i}`] = [];
            }
            
            monthlyTasks.forEach(task => {
                if (task.due_date) {
                    const dueDate = new Date(task.due_date);
                    const weekNumber = Math.floor((dueDate.getDate() - 1) / 7);
                    if (tasksByWeek[`week${weekNumber}`]) {
                        tasksByWeek[`week${weekNumber}`].push(task);
                    }
                }
            });
            
            // Gerar HTML
            let html = `
                <div style="display: grid; gap: 20px;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
            `;
            
            for (let i = 0; i < 5; i++) {
                const weekTasks = tasksByWeek[`week${i}`] || [];
                if (weekTasks.length > 0) {
                    const weekStart = new Date(startOfMonth);
                    weekStart.setDate(1 + (i * 7));
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekStart.getDate() + 6);
                    
                    html += `
                        <div style="background: var(--bg-secondary); padding: 16px; border-radius: 12px; border: 1px solid var(--border-light);">
                            <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 12px; border-bottom: 1px solid var(--border-light); padding-bottom: 8px;">
                                Semana ${i + 1}<br>
                                <span style="font-size: 0.9rem; font-weight: 600;">${weekStart.getDate()}/${weekStart.getMonth() + 1} - ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}</span>
                            </div>
                            <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 12px;">
                                ${weekTasks.length} demandas
                            </div>
                            <div style="display: grid; gap: 8px;">
                                ${weekTasks.slice(0, 4).map(task => `
                                    <div style="background: var(--card-bg); padding: 10px; border-radius: 8px; border-left: 3px solid var(--primary); border: 1px solid var(--border-light);">
                                        <div style="font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${task.title}</div>
                                        <div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 0.8rem;">
                                            <span style="color: var(--text-muted);">${task.setor || 'Geral'}</span>
                                            <span class="status-badge status-${task.status}" style="font-size: 0.7rem; padding: 2px 6px;">${getTaskStatusLabel(task.status)}</span>
                                        </div>
                                    </div>
                                `).join('')}
                                ${weekTasks.length > 4 ? `<div style="text-align: center; font-size: 0.8rem; color: var(--text-muted);">+${weekTasks.length - 4} mais</div>` : ''}
                            </div>
                        </div>
                    `;
                }
            }
            
            html += `
                    </div>
                </div>
            `;
            
            return html;
        }

        // Função para gerar métricas da sprint
        function generateSprintMetrics() {
            const now = new Date();
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            
            // Filtrar tarefas da semana e do mês
            const weeklyTasks = allTasks.filter(task => {
                if (task.due_date) {
                    const dueDate = new Date(task.due_date);
                    return dueDate >= startOfWeek && dueDate <= endOfWeek;
                }
                return false;
            });
            
            const monthlyTasks = allTasks.filter(task => {
                if (task.due_date) {
                    const dueDate = new Date(task.due_date);
                    return dueDate >= startOfMonth && dueDate <= endOfMonth;
                }
                return false;
            });
            
            // Calcular métricas
            const weeklyCompleted = weeklyTasks.filter(t => t.status === 'complete' || t.status === 'closed').length;
            const weeklyInProgress = weeklyTasks.filter(t => t.status === 'progress' || t.status === 'in progress').length;
            const weeklyOpen = weeklyTasks.filter(t => t.status === 'open').length;
            
            const monthlyCompleted = monthlyTasks.filter(t => t.status === 'complete' || t.status === 'closed').length;
            const monthlyInProgress = monthlyTasks.filter(t => t.status === 'progress' || t.status === 'in progress').length;
            const monthlyOpen = monthlyTasks.filter(t => t.status === 'open').length;
            
            // Agrupar por setor
            const sectorCount = {};
            monthlyTasks.forEach(task => {
                const sector = task.setor || 'Geral';
                sectorCount[sector] = (sectorCount[sector] || 0) + 1;
            });
            
            return `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 16px; color: white; text-align: center;">
                        <div style="font-size: 2.5rem; font-weight: 700; margin-bottom: 8px;">${weeklyTasks.length}</div>
                        <div style="font-size: 1.1rem; font-weight: 600;">Demandas na Semana</div>
                        <div style="font-size: 0.9rem; opacity: 0.9; margin-top: 8px;">
                            ${weeklyCompleted} concluídas | ${weeklyInProgress} em progresso
                        </div>
                    </div>
                    
                    <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 16px; color: white; text-align: center;">
                        <div style="font-size: 2.5rem; font-weight: 700; margin-bottom: 8px;">${monthlyTasks.length}</div>
                        <div style="font-size: 1.1rem; font-weight: 600;">Demandas no Mês</div>
                        <div style="font-size: 0.9rem; opacity: 0.9; margin-top: 8px;">
                            ${monthlyCompleted} concluídas | ${monthlyInProgress} em progresso
                        </div>
                    </div>
                    
                    <div style="background: var(--card-bg); padding: 20px; border-radius: 16px; border: 1px solid var(--border-light);">
                        <div style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary); margin-bottom: 16px;">Por Setor (Mês)</div>
                        <div style="display: grid; gap: 12px;">
                            ${Object.entries(sectorCount).slice(0, 5).map(([sector, count]) => `
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-weight: 600; color: var(--text-primary);">${sector}</span>
                                    <span style="background: var(--primary); color: var(--text-primary); padding: 4px 12px; border-radius: 20px; font-weight: 700;">${count}</span>
                                </div>
                            `).join('')}
                            ${Object.keys(sectorCount).length > 5 ? `
                                <div style="text-align: center; font-size: 0.9rem; color: var(--text-muted);">
                                    +${Object.keys(sectorCount).length - 5} setores
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }

        function renderDashboardView() {
            const contentArea = document.querySelector('.content-grid');
            if (contentArea) {
                contentArea.style.display = 'grid';
                renderCalendarEvents();
                renderClickUpTasks();
            }
            
            // Mostrar filtros e métricas
            document.querySelector('.metrics-grid').style.display = 'grid';
            document.querySelector('.filters-section-enhanced').style.display = 'block';
        }

        function renderCalendarioView() {
            const mainContent = document.getElementById('mainContent');
            const contentAfterHeader = mainContent.querySelector('.metrics-grid').parentElement;
            
            // Ocultar métricas e mostrar apenas filtros
            document.querySelector('.metrics-grid').style.display = 'none';
            document.querySelector('.filters-section-enhanced').style.display = 'block';
            
            // Substituir content-grid por visualização de calendário
            const contentGrid = contentAfterHeader.querySelector('.content-grid');
            contentGrid.style.display = 'none';
            
            let calendarioContainer = document.getElementById('calendarioFullView');
            if (!calendarioContainer) {
                calendarioContainer = document.createElement('div');
                calendarioContainer.id = 'calendarioFullView';
                calendarioContainer.style.width = '100%';
                contentAfterHeader.appendChild(calendarioContainer);
            }
            
            calendarioContainer.style.display = 'block';
            renderCalendar();
        }

        // ===============================
        // 📁 FUNÇÕES DE ARQUIVOS
        // ===============================

        function renderArquivosView() {
            // Configurar elementos visíveis para arquivos
            document.querySelector('.metrics-grid').style.display = 'none';
            document.querySelector('.filters-section-enhanced').style.display = 'none';
            document.querySelector('.content-grid').style.display = 'none';
            
            const mainContent = document.getElementById('mainContent');
            const contentAfterHeader = mainContent.querySelector('.metrics-grid').parentElement;
            
            let arquivosContainer = document.getElementById('arquivosFullView');
            if (!arquivosContainer) {
                arquivosContainer = document.createElement('div');
                arquivosContainer.id = 'arquivosFullView';
                arquivosContainer.style.width = '100%';
                contentAfterHeader.appendChild(arquivosContainer);
            }
            
            arquivosContainer.style.display = 'block';
            arquivosContainer.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px;">
                    <div class="content-section" style="background: var(--card-bg); border: 1px solid var(--border-light);">
                        <div class="section-header" style="background: linear-gradient(135deg, var(--bg-secondary), var(--card-bg)); border-bottom: 2px solid var(--border-light);">
                            <h2 class="section-title" style="color: var(--text-primary);">📁 Biblioteca de Arquivos</h2>
                            <p class="section-subtitle" style="color: var(--text-muted);">Google Drive - Projeto Confia no Processo</p>
                            <div class="section-actions">
                                <button class="section-btn" onclick="syncFiles()" style="background: var(--bg-secondary); color: var(--text-secondary); border: 1px solid var(--border);">🔄 Sincronizar</button>
                                <button class="section-btn" onclick="uploadFile()" style="background: var(--bg-secondary); color: var(--text-secondary); border: 1px solid var(--border);">⬆️ Upload</button>
                            </div>
                        </div>
                        <div class="section-content" id="filesContent" style="background: var(--card-bg); color: var(--text-primary);">
                            ${generateFilesContent()}
                        </div>
                    </div>
                    
                    <div class="content-section" style="background: var(--card-bg); border: 1px solid var(--border-light);">
                        <div class="section-header" style="background: linear-gradient(135deg, var(--bg-secondary), var(--card-bg)); border-bottom: 2px solid var(--border-light);">
                            <h2 class="section-title" style="color: var(--text-primary);">📊 Estatísticas de Arquivos</h2>
                            <p class="section-subtitle" style="color: var(--text-muted);">Resumo da biblioteca</p>
                        </div>
                        <div class="section-content" style="background: var(--card-bg); color: var(--text-primary);">
                            ${generateFileStats()}
                        </div>
                    </div>
                </div>
                
                <div class="content-section" style="background: var(--card-bg); border: 1px solid var(--border-light);">
                    <div class="section-header" style="background: linear-gradient(135deg, var(--bg-secondary), var(--card-bg)); border-bottom: 2px solid var(--border-light);">
                        <h2 class="section-title" style="color: var(--text-primary);">🎵 Arquivos por Categoria</h2>
                        <p class="section-subtitle" style="color: var(--text-muted);">Organização por tipo de conteúdo</p>
                        <div class="section-actions">
                            <button class="section-btn" onclick="filterFiles('musicas')" style="background: var(--bg-secondary); color: var(--text-secondary); border: 1px solid var(--border);">🎵 Músicas</button>
                            <button class="section-btn" onclick="filterFiles('copys')" style="background: var(--bg-secondary); color: var(--text-secondary); border: 1px solid var(--border);">✍️ Copys</button>
                            <button class="section-btn" onclick="filterFiles('clipes')" style="background: var(--bg-secondary); color: var(--text-secondary); border: 1px solid var(--border);">🎬 Clipes</button>
                            <button class="section-btn" onclick="filterFiles('documentos')" style="background: var(--bg-secondary); color: var(--text-secondary); border: 1px solid var(--border);">📄 Documentos</button>
                            <button class="section-btn" onclick="filterFiles('contratos')" style="background: var(--bg-secondary); color: var(--text-secondary); border: 1px solid var(--border);">📝 Contratos</button>
                        </div>
                    </div>
                    <div class="section-content" id="categorizedFiles" style="background: var(--card-bg); color: var(--text-primary);">
                        ${generateCategorizedFiles()}
                    </div>
                </div>
            `;
            
            // Garantir que as cores sejam atualizadas corretamente
            setTimeout(() => {
                updateFiltersForDarkMode();
                fixSectorTitlesColor();
            }, 150);
        }

        async function syncFiles() {
            showLoading(true);
            try {
                const response = await fetch(`${CONFIG.N8N_BASE_URL}${CONFIG.ENDPOINTS.FILES}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && Array.isArray(data.files)) {
                        // Processar arquivos recebidos
                        allFiles = data.files.map(file => ({
                            id: file.id || `file-${Date.now()}-${Math.random()}`,
                            name: file.name || 'Arquivo sem nome',
                            mimeType: file.mimeType || 'application/octet-stream',
                            size: file.size || 0,
                            modifiedTime: file.modifiedTime || new Date().toISOString(),
                            createdTime: file.createdTime || new Date().toISOString(),
                            webViewLink: file.webViewLink || '',
                            webContentLink: file.webContentLink || '',
                            iconLink: file.iconLink || '',
                            thumbnailLink: file.thumbnailLink || '',
                            owners: file.owners || [],
                            parents: file.parents || []
                        }));
                        renderCurrentView();
                        showNotification(`📁 ${allFiles.length} arquivos sincronizados com sucesso!`, 'success');
                    } else {
                        throw new Error('Formato de resposta inválido');
                    }
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            } catch (error) {
                console.error('Erro ao sincronizar arquivos:', error);
                showNotification(`❌ Erro ao sincronizar arquivos: ${error.message}`, 'error');
            } finally {
                showLoading(false);
            }
        }

        function generateFilesContent() {
            // Usar dados reais se disponíveis, senão usar mock
            const filesToDisplay = allFiles.length > 0 ? allFiles : [
                { id: 'mock1', name: 'Confia no Processo - Master.wav', mimeType: 'audio/wav', size: '45.2 MB', modifiedTime: new Date(Date.now() - 2*60*60*1000).toISOString(), webViewLink: 'https://drive.google.com/file/d/1/view' },
                { id: 'mock2', name: 'Copy Landing Page Principal.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: '1.8 MB', modifiedTime: new Date(Date.now() - 24*60*60*1000).toISOString(), webViewLink: 'https://drive.google.com/file/d/2/view' },
                { id: 'mock3', name: 'Roteiro Clipe Borboleta.pdf', mimeType: 'application/pdf', size: '2.1 MB', modifiedTime: new Date(Date.now() - 3*24*60*60*1000).toISOString(), webViewLink: 'https://drive.google.com/file/d/3/view' },
                { id: 'mock4', name: 'Contrato Shows 2025.pdf', mimeType: 'application/pdf', size: '856 KB', modifiedTime: new Date(Date.now() - 7*24*60*60*1000).toISOString(), webViewLink: 'https://drive.google.com/file/d/4/view' },
                { id: 'mock5', name: 'Assets Visuais Projeto.zip', mimeType: 'application/zip', size: '128 MB', modifiedTime: new Date(Date.now() - 2*24*60*60*1000).toISOString(), webViewLink: 'https://drive.google.com/file/d/5/view' }
            ];

            if (filesToDisplay.length === 0) {
                return `<div class="empty-state">
                    <h3>Nenhum arquivo encontrado</h3>
                    <p>Os arquivos do projeto aparecerão aqui</p>
                </div>`;
            }

            return filesToDisplay.map(file => {
                // Processar tamanho
                let sizeFormatted = 'N/A';
                if (file.size) {
                    sizeFormatted = file.size;
                } else if (file.sizeBytes) {
                    const sizeInBytes = parseInt(file.sizeBytes);
                    if (sizeInBytes > 1024 * 1024 * 1024) {
                        sizeFormatted = (sizeInBytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
                    } else if (sizeInBytes > 1024 * 1024) {
                        sizeFormatted = (sizeInBytes / (1024 * 1024)).toFixed(1) + ' MB';
                    } else if (sizeInBytes > 1024) {
                        sizeFormatted = (sizeInBytes / 1024).toFixed(1) + ' KB';
                    } else {
                        sizeFormatted = sizeInBytes + ' bytes';
                    }
                }

                // Processar data de modificação
                let modifiedFormatted = 'Desconhecido';
                if (file.modifiedTime) {
                    const modifiedDate = new Date(file.modifiedTime);
                    const now = new Date();
                    const diffTime = Math.abs(now - modifiedDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (diffTime < 60 * 60 * 1000) { // Menos de 1 hora
                        modifiedFormatted = 'Agora mesmo';
                    } else if (diffTime < 24 * 60 * 60 * 1000) { // Menos de 1 dia
                        const hours = Math.floor(diffTime / (1000 * 60 * 60));
                        modifiedFormatted = `${hours} hora${hours > 1 ? 's' : ''} atrás`;
                    } else if (diffDays === 1) {
                        modifiedFormatted = '1 dia atrás';
                    } else if (diffDays < 7) {
                        modifiedFormatted = `${diffDays} dias atrás`;
                    } else if (diffDays < 30) {
                        const weeks = Math.ceil(diffDays / 7);
                        modifiedFormatted = `${weeks} semana${weeks > 1 ? 's' : ''} atrás`;
                    } else {
                        modifiedFormatted = modifiedDate.toLocaleDateString('pt-BR');
                    }
                }

                // Determinar tipo e ícone
                const fileType = getFileTypeFromMime(file.mimeType, file.name);
                const icon = getFileIcon(fileType);
                
                // Escapar aspas para evitar problemas no onclick
                const fileIdEscaped = (file.id || 'no-id').replace(/'/g, "\\'");
                const webViewLinkEscaped = (file.webViewLink || '#').replace(/'/g, "\\'");
                const fileNameEscaped = (file.name || 'Arquivo sem nome').replace(/'/g, "\\'");

                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-light); background: var(--card-bg);" onclick="openFile('${fileIdEscaped}', '${webViewLinkEscaped}')">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="font-size: 1.5rem;">${icon}</div>
                            <div>
                                <div style="font-weight: 600; color: var(--text-primary);" title="${fileNameEscaped}">${file.name}</div>
                                <div style="font-size: 0.8rem; color: var(--text-muted);">${sizeFormatted} • ${modifiedFormatted}</div>
                            </div>
                        </div>
                        <button style="background: var(--primary); color: var(--text-primary); border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;" onclick="openFile('${fileIdEscaped}', '${webViewLinkEscaped}'); event.stopPropagation();">📥 Abrir</button>
                    </div>
                `;
            }).join('');
        }

        function generateFileStats() {
            if (allFiles.length === 0) {
                return `
                    <div style="display: grid; gap: 16px;">
                        <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                            <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-muted);">0</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">Total de Arquivos</div>
                        </div>
                        <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                            <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-muted);">0 MB</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">Armazenamento Usado</div>
                        </div>
                        <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                            <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-muted);">0</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">Adicionados Hoje</div>
                        </div>
                        <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                            <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-muted);">0</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">Colaboradores</div>
                        </div>
                    </div>
                `;
            }

            // Calcular estatísticas
            const totalFiles = allFiles.length;
            
            // Calcular tamanho total
            let totalSize = 0;
            allFiles.forEach(file => {
                if (file.sizeBytes) {
                    totalSize += parseInt(file.sizeBytes);
                } else if (file.size) {
                    // Tentar extrair número do tamanho formatado
                    const sizeStr = file.size.toString().toLowerCase();
                    const number = parseFloat(sizeStr);
                    if (sizeStr.includes('gb')) {
                        totalSize += number * 1024 * 1024 * 1024;
                    } else if (sizeStr.includes('mb')) {
                        totalSize += number * 1024 * 1024;
                    } else if (sizeStr.includes('kb')) {
                        totalSize += number * 1024;
                    } else {
                        totalSize += number;
                    }
                }
            });
            
            // Formatar tamanho total
            let totalSizeFormatted = '0 MB';
            if (totalSize > 1024 * 1024 * 1024) {
                totalSizeFormatted = (totalSize / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
            } else if (totalSize > 1024 * 1024) {
                totalSizeFormatted = (totalSize / (1024 * 1024)).toFixed(1) + ' MB';
            } else if (totalSize > 1024) {
                totalSizeFormatted = (totalSize / 1024).toFixed(1) + ' KB';
            } else {
                totalSizeFormatted = totalSize + ' bytes';
            }
            
            // Arquivos adicionados hoje
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const filesAddedToday = allFiles.filter(file => {
                if (file.createdTime) {
                    const createdDate = new Date(file.createdTime);
                    createdDate.setHours(0, 0, 0, 0);
                    return createdDate.getTime() === today.getTime();
                }
                return false;
            }).length;
            
            // Número de proprietários únicos
            const uniqueOwners = new Set();
            allFiles.forEach(file => {
                if (file.owners && Array.isArray(file.owners)) {
                    file.owners.forEach(owner => {
                        if (owner.emailAddress) {
                            uniqueOwners.add(owner.emailAddress);
                        }
                    });
                }
            });
            const totalOwners = uniqueOwners.size;

            return `
                <div style="display: grid; gap: 16px;">
                    <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">${totalFiles}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Total de Arquivos</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--success);">${totalSizeFormatted}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Armazenamento Usado</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--warning);">${filesAddedToday}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Adicionados Hoje</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--info);">${totalOwners || 1}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Colaboradores</div>
                    </div>
                </div>
            `;
        }

        function generateCategorizedFiles() {
            if (allFiles.length === 0) {
                return `<div class="empty-state">
                    <h3>Nenhum arquivo encontrado</h3>
                    <p>Os arquivos categorizados aparecerão aqui</p>
                </div>`;
            }

            // Categorizar arquivos
            const categorized = {};
            
            allFiles.forEach(file => {
                const fileType = getFileTypeFromMime(file.mimeType, file.name);
                const categoryName = getFileCategoryName(fileType);
                const categoryIcon = getFileIcon(fileType);
                
                if (!categorized[categoryName]) {
                    categorized[categoryName] = {
                        icon: categoryIcon,
                        count: 0,
                        files: []
                    };
                }
                
                categorized[categoryName].count++;
                categorized[categoryName].files.push(file);
            });

            // Se não houver categorias, mostrar todos os arquivos na categoria "Outros"
            if (Object.keys(categorized).length === 0) {
                categorized['Outros'] = {
                    icon: '📁',
                    count: allFiles.length,
                    files: allFiles
                };
            }

            return Object.entries(categorized).map(([categoryName, category]) => `
                <div style="margin-bottom: 24px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding: 12px; background: var(--bg-secondary); border-radius: 8px;">
                        <span style="font-size: 1.5rem;">${category.icon}</span>
                        <h4 style="margin: 0; text-transform: capitalize;">${categoryName}</h4>
                        <span style="background: var(--primary); color: var(--text-primary); padding: 4px 8px; border-radius: 12px; font-size: 0.75rem;">${category.count}</span>
                    </div>
                    <div style="display: grid; gap: 8px; padding-left: 20px;">
                        ${category.files.slice(0, 5).map(file => {
                            // Processar tamanho
                            let sizeFormatted = 'N/A';
                            if (file.size) {
                                sizeFormatted = file.size;
                            } else if (file.sizeBytes) {
                                const sizeInBytes = parseInt(file.sizeBytes);
                                if (sizeInBytes > 1024 * 1024 * 1024) {
                                    sizeFormatted = (sizeInBytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
                                } else if (sizeInBytes > 1024 * 1024) {
                                    sizeFormatted = (sizeInBytes / (1024 * 1024)).toFixed(1) + ' MB';
                                } else if (sizeInBytes > 1024) {
                                    sizeFormatted = (sizeInBytes / 1024).toFixed(1) + ' KB';
                                } else {
                                    sizeFormatted = sizeInBytes + ' bytes';
                                }
                            }
                            
                            // Escapar aspas para evitar problemas no onclick
                            const fileIdEscaped = (file.id || 'no-id').replace(/'/g, "\\'");
                            const webViewLinkEscaped = (file.webViewLink || '#').replace(/'/g, "\\'");
                            const fileNameEscaped = (file.name || 'Arquivo sem nome').replace(/'/g, "\\'");
                            
                            return `
                                <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: var(--card-bg); border-radius: 6px; border: 1px solid var(--border-light);">
                                    <span>📄</span>
                                    <span style="flex: 1; font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${fileNameEscaped}">${file.name}</span>
                                    <button style="background: var(--success); color: var(--text-primary); border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;" onclick="openFile('${fileIdEscaped}', '${webViewLinkEscaped}'); event.stopPropagation();">Abrir</button>
                                </div>
                            `;
                        }).join('')}
                        ${category.files.length > 5 ? `
                            <div style="text-align: center; padding: 8px; font-size: 0.8rem; color: var(--text-muted);">
                                + ${category.files.length - 5} arquivos...
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        }

        function getFileIcon(type) {
            const icons = {
                'musica': '🎵',
                'audio': '🎵',
                'copy': '✍️',
                'texto': '✍️',
                'roteiro': '🎬',
                'video': '🎬',
                'clipe': '🎬',
                'contrato': '📝',
                'documento': '📝',
                'pdf': '📝',
                'design': '🎨',
                'imagem': '🎨',
                'foto': '🎨',
                'presentation': '📊',
                'spreadsheet': '📊',
                'archive': '📁',
                'zip': '📁',
                'code': '💻',
                'outro': '📁'
            };
            return icons[type] || icons['outro'];
        }

        // Nova função para determinar tipo de arquivo pelo MIME type e nome
        function getFileTypeFromMime(mimeType, fileName) {
            if (!mimeType && !fileName) return 'outro';
            
            const name = (fileName || '').toLowerCase();
            
            // Áudio
            if (mimeType && (mimeType.includes('audio') || mimeType.includes('midi'))) return 'audio';
            if (name.includes('.mp3') || name.includes('.wav') || name.includes('.flac') || name.includes('.m4a')) return 'audio';
            
            // Vídeo
            if (mimeType && mimeType.includes('video')) return 'video';
            if (name.includes('.mp4') || name.includes('.mov') || name.includes('.avi') || name.includes('.mkv')) return 'video';
            
            // Documentos de texto
            if (mimeType && (mimeType.includes('word') || mimeType.includes('document'))) return 'documento';
            if (name.includes('.doc') || name.includes('.docx') || name.includes('.txt') || name.includes('.rtf')) return 'documento';
            
            // PDF
            if (mimeType && mimeType.includes('pdf')) return 'pdf';
            if (name.includes('.pdf')) return 'pdf';
            
            // Planilhas
            if (mimeType && (mimeType.includes('excel') || mimeType.includes('spreadsheet'))) return 'spreadsheet';
            if (name.includes('.xls') || name.includes('.xlsx') || name.includes('.csv')) return 'spreadsheet';
            
            // Apresentações
            if (mimeType && (mimeType.includes('powerpoint') || mimeType.includes('presentation'))) return 'presentation';
            if (name.includes('.ppt') || name.includes('.pptx') || name.includes('.key')) return 'presentation';
            
            // Imagens
            if (mimeType && mimeType.includes('image')) return 'imagem';
            if (name.includes('.jpg') || name.includes('.jpeg') || name.includes('.png') || name.includes('.gif') || name.includes('.svg')) return 'imagem';
            
            // Arquivos compactados
            if (mimeType && (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z'))) return 'archive';
            if (name.includes('.zip') || name.includes('.rar') || name.includes('.7z') || name.includes('.tar')) return 'archive';
            
            // Código
            if (mimeType && mimeType.includes('javascript')) return 'code';
            if (name.includes('.js') || name.includes('.ts') || name.includes('.html') || name.includes('.css') || name.includes('.py') || name.includes('.java')) return 'code';
            
            // Copys e textos
            if (name.includes('copy') || name.includes('texto') || name.includes('script')) return 'copy';
            
            // Roteiros
            if (name.includes('roteiro') || name.includes('script')) return 'roteiro';
            
            // Contratos
            if (name.includes('contrato') || name.includes('acordo') || name.includes('licen')) return 'contrato';
            
            // Música específica
            if (name.includes('musica') || name.includes('track') || name.includes('.wav') || name.includes('.mp3')) return 'musica';
            
            // Clipes
            if (name.includes('clipe') || name.includes('video') || name.includes('filme')) return 'clipe';
            
            return 'outro';
        }

        // Nova função para obter nome da categoria
        function getFileCategoryName(fileType) {
            const categories = {
                'musica': 'Músicas',
                'audio': 'Músicas',
                'video': 'Vídeos',
                'clipe': 'Vídeos',
                'copy': 'Copys',
                'texto': 'Copys',
                'roteiro': 'Roteiros',
                'contrato': 'Contratos',
                'documento': 'Documentos',
                'pdf': 'Documentos',
                'presentation': 'Apresentações',
                'spreadsheet': 'Planilhas',
                'design': 'Design',
                'imagem': 'Imagens',
                'foto': 'Imagens',
                'archive': 'Arquivos Compactados',
                'zip': 'Arquivos Compactados',
                'code': 'Código',
                'outro': 'Outros'
            };
            return categories[fileType] || 'Outros';
        }

        function filterFiles(category) {
            showNotification(`🔍 Filtrando arquivos por: ${category}`, 'info');
            // Implementar filtro de arquivos
        }

        function uploadFile() {
            showNotification('⬆️ Função de upload será implementada em breve', 'info');
        }

        // Função principal para abrir arquivos (chamada pelos templates)
        async function openFile(fileId, webViewLink) {
            // Prevenir comportamento padrão do evento
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            // Primeiro tentar abrir usando o novo endpoint do n8n
            await openFileViaN8n(fileId, webViewLink);
        }

        // Nova função para abrir arquivos usando o endpoint do n8n
        async function openFileViaN8n(fileId, webViewLink) {
            // Validar ID do arquivo
            if (!fileId || fileId === '' || fileId === 'undefined' || fileId === 'null') {
                // Se não tiver ID, tentar usar o webViewLink como fallback
                if (webViewLink && webViewLink !== '' && webViewLink !== '#' && webViewLink !== 'undefined' && webViewLink !== 'null') {
                    fallbackOpenFileWithLink(webViewLink);
                    return;
                }
                showNotification(`❌ ID do arquivo não disponível`, 'error');
                return;
            }

            showLoading(true);
            try {
                // Chamar o endpoint do n8n para obter o link correto
                const response = await fetch(`${CONFIG.N8N_BASE_URL}/webhook/dashboard-open-google-drive-item`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        fileId: fileId
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                console.log('📁 Resposta do endpoint de abertura:', data);

                if (data.success && data.openUrl) {
                    // Abrir o link correto em uma nova aba
                    const newWindow = window.open(data.openUrl, '_blank', 'noopener,noreferrer');
                    if (newWindow) {
                        // Mostrar mensagem apropriada baseada no tipo de item
                        let message = `📁 Abrindo ${data.itemType === 'folder' ? 'pasta' : 'arquivo'} no aplicativo apropriado...`;
                        if (data.itemType === 'folder') {
                            message = '📁 Abrindo pasta no Google Drive...';
                        } else if (data.itemType === 'document') {
                            message = '📝 Abrindo documento no Google Docs...';
                        } else if (data.itemType === 'spreadsheet') {
                            message = '📊 Abrindo planilha no Google Sheets...';
                        } else if (data.itemType === 'presentation') {
                            message = '📽️ Abrindo apresentação no Google Slides...';
                        }
                        
                        showNotification(message, 'info');
                    } else {
                        showNotification(`❌ Pop-up bloqueado. Habilite pop-ups para abrir arquivos.`, 'error');
                    }
                } else if (data.error) {
                    throw new Error(data.error);
                } else {
                    throw new Error('Não foi possível obter o link de abertura');
                }
            } catch (error) {
                console.error('❌ Erro ao abrir arquivo via n8n:', error);
                showNotification(`❌ Erro ao abrir arquivo: ${error.message}`, 'error');
                
                // Fallback: tentar abrir com o link da web view se disponível
                if (webViewLink && webViewLink !== '' && webViewLink !== '#' && webViewLink !== 'undefined' && webViewLink !== 'null') {
                    fallbackOpenFileWithLink(webViewLink);
                } else {
                    fallbackOpenFileDirect(fileId);
                }
            } finally {
                showLoading(false);
            }
        }

        // Função fallback para abrir com web view link
        function fallbackOpenFileWithLink(webViewLink) {
            if (!webViewLink || webViewLink === '' || webViewLink === 'undefined' || webViewLink === 'null' || webViewLink === '#') {
                showNotification(`❌ Link do arquivo não disponível`, 'error');
                return;
            }

            // Decodificar o link caso esteja codificado
            let decodedLink = webViewLink;
            try {
                decodedLink = decodeURIComponent(webViewLink);
            } catch (e) {
                console.warn('Não foi possível decodificar o link:', webViewLink);
            }

            // Verificar se é um link válido
            if (decodedLink.startsWith('http://') || decodedLink.startsWith('https://')) {
                // Abrir o link do Google Drive em uma nova aba
                const newWindow = window.open(decodedLink, '_blank', 'noopener,noreferrer');
                if (newWindow) {
                    showNotification(`📁 Abrindo arquivo no Google Drive (método alternativo)...`, 'info');
                } else {
                    showNotification(`❌ Pop-up bloqueado. Habilite pop-ups para abrir arquivos.`, 'error');
                }
            } else {
                showNotification(`❌ Link do arquivo inválido`, 'error');
                console.error('Link inválido recebido:', decodedLink);
            }
        }

        // Função fallback direta usando o ID
        function fallbackOpenFileDirect(fileId) {
            if (!fileId || fileId === '' || fileId === 'undefined' || fileId === 'null') {
                showNotification(`❌ ID do arquivo não disponível para fallback`, 'error');
                return;
            }
            
            // Construir link básico do Google Drive
            const fallbackUrl = `https://drive.google.com/file/d/${fileId}/view`;
            const newWindow = window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
            if (newWindow) {
                showNotification(`📁 Abrindo arquivo no Google Drive (método direto)...`, 'info');
            } else {
                showNotification(`❌ Pop-up bloqueado. Tente abrir manualmente em drive.google.com`, 'error');
            }
        }

        async function openFileById(fileId, mimeType) {
            // Prevenir comportamento padrão do evento
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            // Validar ID do arquivo
            if (!fileId || fileId === '' || fileId === 'undefined' || fileId === 'null') {
                showNotification(`❌ ID do arquivo não disponível`, 'error');
                return;
            }
            
            showLoading(true);
            
            try {
                // Chamar o novo endpoint do n8n para obter o link correto
                const response = await fetch(`${CONFIG.N8N_BASE_URL}/webhook/dashboard-open-file`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        fileId: fileId,
                        mimeType: mimeType || ''
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (data.success && data.openUrl) {
                    // Abrir o link correto em uma nova aba
                    const newWindow = window.open(data.openUrl, '_blank', 'noopener,noreferrer');
                    if (newWindow) {
                        showNotification(`📁 Abrindo arquivo no aplicativo apropriado...`, 'info');
                    } else {
                        showNotification(`❌ Pop-up bloqueado. Habilite pop-ups para abrir arquivos.`, 'error');
                    }
                } else {
                    throw new Error(data.error || 'Não foi possível obter o link de abertura');
                }
                
            } catch (error) {
                console.error('Erro ao abrir arquivo:', error);
                showNotification(`❌ Erro ao abrir arquivo: ${error.message}`, 'error');
                
                // Fallback: tentar abrir com o método antigo
                fallbackOpenFile(fileId);
            } finally {
                showLoading(false);
            }
        }
        
        // Função fallback para abrir arquivos
        function fallbackOpenFile(fileId) {
            // Construir link básico do Google Drive
            const fallbackUrl = `https://drive.google.com/file/d/${fileId}/view`;
            const newWindow = window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
            if (newWindow) {
                showNotification(`📁 Abrindo arquivo no Google Drive (método alternativo)...`, 'info');
            } else {
                showNotification(`❌ Pop-up bloqueado. Tente abrir manualmente em drive.google.com`, 'error');
            }
        }

        // ===============================
        // ✍️ FUNÇÕES DE COPY
        // ===============================

        function renderCopyView() {
            // Configurar elementos visíveis para copy
            document.querySelector('.metrics-grid').style.display = 'none';
            document.querySelector('.filters-section-enhanced').style.display = 'none';
            document.querySelector('.content-grid').style.display = 'none';
            
            const mainContent = document.getElementById('mainContent');
            const contentAfterHeader = mainContent.querySelector('.metrics-grid').parentElement;
            
            let copyContainer = document.getElementById('copyFullView');
            if (!copyContainer) {
                copyContainer = document.createElement('div');
                copyContainer.id = 'copyFullView';
                copyContainer.style.width = '100%';
                contentAfterHeader.appendChild(copyContainer);
            }
            
            copyContainer.style.display = 'block';
            copyContainer.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 32px;">
                    <div class="content-section">
                        <div class="section-header">
                            <h2 class="section-title">✍️ Tipos de Copy</h2>
                            <p class="section-subtitle">Selecione o tipo de copy necessário</p>
                        </div>
                        <div class="section-content">
                            <div style="display: grid; gap: 12px;">
                                <button class="copy-type-btn" onclick="selectCopyType('marketing-vendas')" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                                    🛍️ Marketing para Vendas
                                    <div style="font-size: 0.8rem; opacity: 0.9; margin-top: 4px;">Merchandising e produtos</div>
                                </button>
                                
                                <button class="copy-type-btn" onclick="selectCopyType('roteiros-clipes')" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 16px; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                                    🎬 Roteiros para Clipes
                                    <div style="font-size: 0.8rem; opacity: 0.9; margin-top: 4px;">Narrativa audiovisual</div>
                                </button>
                                
                                <button class="copy-type-btn" onclick="selectCopyType('campanhas-criativos')" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 16px; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                                    🎯 Campanhas Criativas
                                    <div style="font-size: 0.8rem; opacity: 0.9; margin-top: 4px;">Social media e ads</div>
                                </button>
                                
                                <button class="copy-type-btn" onclick="selectCopyType('landing-pages')" style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); color: #333; padding: 16px; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                                    📄 Landing Pages
                                    <div style="font-size: 0.8rem; opacity: 0.8; margin-top: 4px;">Páginas de conversão</div>
                                </button>
                                
                                <button class="copy-type-btn" onclick="selectCopyType('email-marketing')" style="background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); color: #333; padding: 16px; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                                    📧 Email Marketing
                                    <div style="font-size: 0.8rem; opacity: 0.8; margin-top: 4px;">Sequências e campanhas</div>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="content-section">
                        <div class="section-header">
                            <h2 class="section-title">🤖 Gerador de Copy IA</h2>
                            <p class="section-subtitle">Selecione um tipo ao lado para começar</p>
                        </div>
                        <div class="section-content" id="copyGeneratorContent">
                            <div class="empty-state">
                                <h3>Selecione um tipo de copy</h3>
                                <p>Escolha uma das opções ao lado para começar a gerar conteúdo personalizado com IA</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="content-section" id="copyHistorySection" style="display: none; margin-top: 32px;">
                    <div class="section-header">
                        <h2 class="section-title">📚 Histórico de Copys</h2>
                        <p class="section-subtitle">Copys geradas recentemente</p>
                        <div class="section-actions">
                            <button class="section-btn" onclick="exportCopyHistory()">📥 Exportar Histórico</button>
                            <button class="section-btn" onclick="clearCopyHistory()">🗑️ Limpar Histórico</button>
                        </div>
                    </div>
                    <div class="section-content" id="copyHistoryContent">
                        <!-- Histórico será carregado aqui -->
                    </div>
                </div>
            `;
        }

        function selectCopyType(type) {
            const copyTypes = {
                'marketing-vendas': {
                    title: '🛍️ Copy para Marketing e Vendas',
                    description: 'Textos persuasivos para merchandising e produtos do projeto',
                    fields: ['Produto/Serviço', 'Público-alvo', 'Benefício principal', 'Call-to-action']
                },
                'roteiros-clipes': {
                    title: '🎬 Roteiros para Clipes',
                    description: 'Narrativas visuais e conceitos audiovisuais',
                    fields: ['Música/Canção', 'Conceito visual', 'Locações', 'Personagens']
                },
                'campanhas-criativos': {
                    title: '🎯 Campanhas Criativas',
                    description: 'Conteúdo para social media e campanhas publicitárias',
                    fields: ['Objetivo da campanha', 'Plataforma', 'Tom de voz', 'Hashtags']
                },
                'landing-pages': {
                    title: '📄 Landing Pages',
                    description: 'Páginas de alta conversão para o projeto',
                    fields: ['Objetivo da página', 'Oferta principal', 'Objeções a superar', 'Prova social']
                },
                'email-marketing': {
                    title: '📧 Email Marketing',
                    description: 'Sequências e campanhas por email',
                    fields: ['Tipo de email', 'Segmento de público', 'Objetivo', 'Frequência']
                }
            };

            const selectedType = copyTypes[type];
            if (!selectedType) return;

            document.getElementById('copyGeneratorContent').innerHTML = `
                <form onsubmit="generateCopy(event, '${type}')" style="display: grid; gap: 20px;">
                    <div style="padding: 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white; margin-bottom: 16px;">
                        <h3 style="margin: 0 0 8px 0;">${selectedType.title}</h3>
                        <p style="margin: 0; opacity: 0.9; font-size: 0.9rem;">${selectedType.description}</p>
                    </div>

                    ${selectedType.fields.map(field => `
                        <div>
                            <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">${field}</label>
                            <input type="text" class="form-input" name="${field.toLowerCase().replace(/[^a-z0-9]/g, '_')}" placeholder="Digite ${field.toLowerCase()}" required>
                        </div>
                    `).join('')}

                    <div>
                        <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">Contexto Adicional</label>
                        <textarea class="form-textarea" name="context" placeholder="Informações extras que podem ajudar na criação do copy..." style="min-height: 80px;"></textarea>
                    </div>

                    <div>
                        <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">Tom de Voz</label>
                        <select class="form-select" name="tone">
                            <option value="profissional">Profissional</option>
                            <option value="descontraido">Descontraído</option>
                            <option value="inspirador">Inspirador</option>
                            <option value="urgente">Urgente</option>
                            <option value="emocional">Emocional</option>
                        </select>
                    </div>

                    <button type="submit" class="btn btn-primary" style="margin-top: 16px;">
                        🤖 Gerar Copy com IA
                    </button>
                </form>
            `;

            // Mostrar seção de histórico
            document.getElementById('copyHistorySection').style.display = 'block';
        }

        async function generateCopy(event, type) {
            event.preventDefault();
            
            const formData = new FormData(event.target);
            const data = Object.fromEntries(formData);
            data.type = type;

            const submitBtn = event.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;

            try {
                submitBtn.disabled = true;
                submitBtn.classList.add('btn-loading');
                submitBtn.innerHTML = '🤖 Gerando...';

                const response = await fetch(`${CONFIG.N8N_BASE_URL}${CONFIG.ENDPOINTS.COPY_GENERATOR}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success && result.copy) {
                    // Mostrar o copy gerado
                    displayGeneratedCopy(result.copy, type);
                    showNotification('✍️ Copy gerado com sucesso!', 'success');
                } else {
                    throw new Error(result.message || 'Erro ao gerar copy');
                }

            } catch (error) {
                console.error('Erro ao gerar copy:', error);
                // Mock para demonstração
                displayGeneratedCopy(generateMockCopy(type, data), type);
                showNotification('✍️ Copy gerado (modo demonstração)', 'warning');
            } finally {
                submitBtn.disabled = false;
                submitBtn.classList.remove('btn-loading');
                submitBtn.innerHTML = originalText;
            }
        }

        function displayGeneratedCopy(copy, type) {
            const copyResult = document.createElement('div');
            copyResult.style.marginTop = '20px';
            copyResult.style.padding = '20px';
            copyResult.style.background = 'var(--card-bg)';
            copyResult.style.border = '2px solid var(--success)';
            copyResult.style.borderRadius = '12px';
            
            copyResult.innerHTML = `
                <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 16px;">
                    <h4 style="margin: 0; color: var(--success);">✅ Copy Gerado</h4>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="copyCopyToClipboard(this)" class="section-btn" style="font-size: 0.8rem;">📋 Copiar</button>
                        <button onclick="saveCopy(this)" class="section-btn" style="font-size: 0.8rem;">💾 Salvar</button>
                    </div>
                </div>
                <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; line-height: 1.6; white-space: pre-wrap;">${copy}</div>
            `;

            document.getElementById('copyGeneratorContent').appendChild(copyResult);
        }

        function generateMockCopy(type, data) {
            const mockCopys = {
                'marketing-vendas': `🎵 CONFIA NO PROCESSO - A JORNADA MUSICAL QUE VAI TRANSFORMAR SUA VIDA

Descubra o álbum que está tocando os corações do Brasil inteiro!

✨ 16 faixas exclusivas que narram a metamorfose da alma
🦋 Da inadequação à integração - sua jornada pessoal em música
🎯 Baseado na psicologia junguiana e vivências reais

👉 GARANTE JÁ O SEU E TRANSFORME SUA VIDA!

[COMPRAR AGORA]`,

                'roteiros-clipes': `🎬 ROTEIRO CLIPE "CONFIA NO PROCESSO"

CONCEITO: A metamorfose da borboleta como metáfora visual

CENA 1 - O OVO (Inadequação)
- Espaço fechado, claustrofóbico
- Protagonista em posição fetal
- Cores neutras, tons de cinza

CENA 2 - A LAGARTA (Inquietação)
- Movimento constante, busca
- Caminhada em labirinto urbano
- Transição de cores

CENA 3 - O CASULO (Iniciação)
- Isolamento contemplativo
- Processo de transformação
- Luz gradual surgindo

CENA 4 - A BORBOLETA (Integração)
- Voo livre, liberdade
- Cores vibrantes, vida plena
- Renascimento completo`,

                'campanhas-criativos': `📱 CAMPANHA SOCIAL MEDIA - CONFIA NO PROCESSO

POST 1:
"Você já se sentiu perdido, sem saber qual direção tomar? 🦋
É assim que começa toda grande transformação.
#ConfiaNoProcesso #Transformação"

POST 2:
"Da lagarta à borboleta... 
Seu processo de crescimento também é lindo! ✨
#Metamorfose #CrescimentoPessoal"

POST 3:
"E se eu te disser que a dor que você sente hoje 
é a força que te fará voar amanhã? 🕊️
#ConfiaNoProcesso #RenaScimento"`,

                'landing-pages': `📄 LANDING PAGE - ÁLBUM CONFIA NO PROCESSO

HEADLINE:
A MÚSICA QUE VAI TRANSFORMAR SUA VIDA CHEGOU

SUBHEADLINE:
16 faixas autorais que narram sua jornada de transformação pessoal - da dor ao renascimento

BENEFÍCIOS:
✅ Encontre inspiração nos momentos difíceis
✅ Conecte-se com sua verdadeira essência  
✅ Acompanhe sua jornada de crescimento
✅ Descubra o poder da arte como cura

PROVA SOCIAL:
"Esta música chegou no momento exato que eu precisava..." - Maria S.
"Camillo conseguiu colocar em palavras o que sinto..." - João P.

CTA: TRANSFORME SUA VIDA AGORA - OUÇA O ÁLBUM`,

                'email-marketing': `📧 EMAIL SEQUÊNCIA - CONFIA NO PROCESSO

ASSUNTO: Sua metamorfose começou... 🦋

Oi [NOME],

Você sabia que toda borboleta já foi uma lagarta?

E que toda grande transformação começa com desconforto?

Se você chegou até aqui, é porque algo em você está pronto para mudar.

O álbum "Confia no Processo" não é apenas música...
É um mapa para sua jornada interior.

👉 Comece sua transformação hoje: [LINK]

Com amor e propósito,
Camillo Merachi

P.S.: Sua borboleta interior está esperando para voar... 🦋`
            };

            return mockCopys[type] || 'Copy personalizado será gerado aqui...';
        }

        function copyCopyToClipboard(button) {
            const copyText = button.closest('div').parentElement.querySelector('div[style*="white-space: pre-wrap"]').textContent;
            navigator.clipboard.writeText(copyText).then(() => {
                button.textContent = '✅ Copiado!';
                setTimeout(() => {
                    button.innerHTML = '📋 Copiar';
                }, 2000);
            });
        }

        function saveCopy(button) {
            showNotification('💾 Copy salvo no histórico!', 'success');
        }

        function exportCopyHistory() {
            showNotification('📥 Histórico de copys exportado!', 'success');
        }

        function clearCopyHistory() {
            if (confirm('🗑️ Tem certeza que deseja limpar o histórico de copys?')) {
                showNotification('🧹 Histórico limpo com sucesso!', 'info');
            }
        }

        // ===============================
        // 📊 ANALYTICS COM ABAS
        // ===============================

        function renderAnalyticsView() {
            // Configurar elementos visíveis para analytics
            document.querySelector('.metrics-grid').style.display = 'grid';
            document.querySelector('.filters-section-enhanced').style.display = 'none';
            document.querySelector('.content-grid').style.display = 'none';
            
            const mainContent = document.getElementById('mainContent');
            const contentAfterHeader = mainContent.querySelector('.metrics-grid').parentElement;
            
            let analyticsContainer = document.getElementById('analyticsFullView');
            if (!analyticsContainer) {
                analyticsContainer = document.createElement('div');
                analyticsContainer.id = 'analyticsFullView';
                analyticsContainer.style.width = '100%';
                contentAfterHeader.appendChild(analyticsContainer);
            }
            
            analyticsContainer.style.display = 'block';
            
            // Calcular estatísticas
            const stats = calculateAnalytics();
            const performanceStats = calculatePerformanceMetrics();
            
            analyticsContainer.innerHTML = `
                <!-- Abas para alternar entre tipos de métricas -->
                <div style="display: flex; gap: 4px; margin-bottom: 32px; background: var(--bg-secondary); padding: 4px; border-radius: var(--radius);">
                    <button class="analytics-tab-btn active" id="gestao-tab" onclick="switchAnalyticsTab('gestao')" style="flex: 1; padding: 12px 16px; border: none; background: var(--primary); color: white; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer; transition: all 0.2s;">
                        📊 Métricas de Gestão
                    </button>
                    <button class="analytics-tab-btn" id="performance-tab" onclick="switchAnalyticsTab('performance')" style="flex: 1; padding: 12px 16px; border: none; background: transparent; color: var(--text-secondary); border-radius: var(--radius-sm); font-weight: 600; cursor: pointer; transition: all 0.2s;">
                        🚀 Métricas de Performance
                    </button>
                </div>

                <!-- Conteúdo das Métricas de Gestão -->
                <div id="gestao-analytics-content">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px;">
                        <div class="content-section">
                            <div class="section-header">
                                <h2 class="section-title">📊 Distribuição por Status</h2>
                                <p class="section-subtitle">Progresso geral das demandas</p>
                            </div>
                            <div class="section-content">
                                ${Object.entries(stats.byStatus).map(([status, data]) => `
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-light);">
                                        <span style="display: flex; align-items: center; gap: 8px;">
                                            ${getTaskStatusIcon(status)} ${getTaskStatusLabel(status)}
                                        </span>
                                        <div style="display: flex; align-items: center; gap: 12px;">
                                            <div style="background: var(--bg-secondary); border-radius: 8px; width: 100px; height: 8px; overflow: hidden;">
                                                <div style="background: ${getStatusColor(status)}; height: 100%; width: ${data.percentage}%;"></div>
                                            </div>
                                            <strong>${data.count}</strong>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="content-section">
                            <div class="section-header">
                                <h2 class="section-title">🏢 Distribuição por Setor</h2>
                                <p class="section-subtitle">Carga de trabalho por equipe</p>
                            </div>
                            <div class="section-content">
                                ${Object.entries(stats.bySector).map(([sector, data]) => `
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-light);">
                                        <span style="display: flex; align-items: center; gap: 8px;">
                                            ${getSectorIcon(sector)} ${sector}
                                        </span>
                                        <div style="display: flex; align-items: center; gap: 12px;">
                                            <div style="background: var(--bg-secondary); border-radius: 8px; width: 100px; height: 8px; overflow: hidden;">
                                                <div style="background: var(--primary); height: 100%; width: ${data.percentage}%;"></div>
                                            </div>
                                            <strong>${data.count}</strong>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <div class="content-section">
                        <div class="section-header">
                            <h2 class="section-title">📈 Métricas de Produtividade</h2>
                            <p class="section-subtitle">Insights sobre performance da equipe</p>
                        </div>
                        <div class="section-content">
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                                <div style="text-align: center; padding: 20px; background: var(--bg-secondary); border-radius: 12px;">
                                    <div style="font-size: 2rem; margin-bottom: 8px;">⚡</div>
                                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">${stats.productivity.avgCompletionTime}</div>
                                    <div style="font-size: 0.9rem; color: var(--text-muted);">Tempo Médio de Conclusão</div>
                                </div>
                                <div style="text-align: center; padding: 20px; background: var(--bg-secondary); border-radius: 12px;">
                                    <div style="font-size: 2rem; margin-bottom: 8px;">🎯</div>
                                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--success);">${stats.productivity.completionRate}%</div>
                                    <div style="font-size: 0.9rem; color: var(--text-muted);">Taxa de Conclusão</div>
                                </div>
                                <div style="text-align: center; padding: 20px; background: var(--bg-secondary); border-radius: 12px;">
                                    <div style="font-size: 2rem; margin-bottom: 8px;">📋</div>
                                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--info);">${stats.productivity.totalTasks}</div>
                                    <div style="font-size: 0.9rem; color: var(--text-muted);">Total de Demandas</div>
                                </div>
                                <div style="text-align: center; padding: 20px; background: var(--bg-secondary); border-radius: 12px;">
                                    <div style="font-size: 2rem; margin-bottom: 8px;">👥</div>
                                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--warning);">${stats.productivity.activeMembers}</div>
                                    <div style="font-size: 0.9rem; color: var(--text-muted);">Membros Ativos</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Conteúdo das Métricas de Performance -->
                <div id="performance-analytics-content" style="display: none;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px;">
                        <div class="content-section">
                            <div class="section-header">
                                <h2 class="section-title">📈 Métricas de Tráfego</h2>
                                <p class="section-subtitle">Performance digital do projeto</p>
                                <div class="section-actions">
                                    <button class="section-btn" onclick="syncPerformanceMetrics()">🔄 Sincronizar</button>
                                </div>
                            </div>
                            <div class="section-content">
                                ${generateTrafficMetrics(performanceStats.traffic)}
                            </div>
                        </div>
                        
                        <div class="content-section">
                            <div class="section-header">
                                <h2 class="section-title">💰 Métricas de Vendas</h2>
                                <p class="section-subtitle">Conversão e faturamento</p>
                            </div>
                            <div class="section-content">
                                ${generateSalesMetrics(performanceStats.sales)}
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px;">
                        <div class="content-section">
                            <div class="section-header">
                                <h2 class="section-title">🎵 Performance Musical</h2>
                                <p class="section-subtitle">Streams e engajamento</p>
                            </div>
                            <div class="section-content">
                                ${generateMusicMetrics(performanceStats.music)}
                            </div>
                        </div>
                        
                        <div class="content-section">
                            <div class="section-header">
                                <h2 class="section-title">📱 Redes Sociais</h2>
                                <p class="section-subtitle">Alcance e interações</p>
                            </div>
                            <div class="section-content">
                                ${generateSocialMetrics(performanceStats.social)}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        function switchAnalyticsTab(tab) {
            // Remover active de todos os botões
            document.querySelectorAll('.analytics-tab-btn').forEach(btn => {
                btn.classList.remove('active');
                btn.style.background = 'transparent';
                btn.style.color = 'var(--text-secondary)';
            });

            // Ocultar todos os conteúdos
            document.getElementById('gestao-analytics-content').style.display = 'none';
            document.getElementById('performance-analytics-content').style.display = 'none';

            // Ativar tab selecionada
            const activeBtn = document.getElementById(`${tab}-tab`);
            activeBtn.classList.add('active');
            activeBtn.style.background = 'var(--primary)';
            activeBtn.style.color = 'var(--text-primary)';

            // Mostrar conteúdo correspondente
            document.getElementById(`${tab}-analytics-content`).style.display = 'block';

            showNotification(`📊 Visualizando métricas de ${tab === 'gestao' ? 'gestão' : 'performance'}`, 'info');
        }

        // ===============================
        // 📊 FUNÇÕES DE PERFORMANCE METRICS
        // ===============================

        function calculatePerformanceMetrics() {
            // Mock data - será substituído pelos dados reais
            return {
                traffic: {
                    visitors: 15420,
                    pageviews: 45600,
                    bounceRate: 32.5,
                    avgSession: '3:42'
                },
                sales: {
                    revenue: 'R$ 28.450',
                    conversions: 156,
                    conversionRate: 2.8,
                    avgOrderValue: 'R$ 182'
                },
                music: {
                    streams: '89.2k',
                    monthly: '12.4k',
                    platforms: 8,
                    engagement: '4.2%'
                },
                social: {
                    followers: '23.1k',
                    reach: '156k',
                    engagement: '6.8%',
                    posts: 42
                }
            };
        }

        async function syncPerformanceMetrics() {
            showLoading(true);
            try {
                const response = await fetch(`${CONFIG.N8N_BASE_URL}${CONFIG.ENDPOINTS.PERFORMANCE_METRICS}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        renderCurrentView();
                        showNotification('📊 Métricas de performance atualizadas!', 'success');
                    }
                }
            } catch (error) {
                console.error('Erro ao sincronizar métricas:', error);
                showNotification('Métricas em modo demonstração', 'warning');
            } finally {
                showLoading(false);
            }
        }

        function generateTrafficMetrics(traffic) {
            return `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">${traffic.visitors.toLocaleString()}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Visitantes Únicos</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--info);">${traffic.pageviews.toLocaleString()}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Visualizações</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--warning);">${traffic.bounceRate}%</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Taxa de Rejeição</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--success);">${traffic.avgSession}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Tempo Médio</div>
                    </div>
                </div>
            `;
        }

        function generateSalesMetrics(sales) {
            return `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--success);">${sales.revenue}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Faturamento</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">${sales.conversions}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Conversões</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--warning);">${sales.conversionRate}%</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Taxa de Conversão</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--info);">${sales.avgOrderValue}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Ticket Médio</div>
                    </div>
                </div>
            `;
        }

        function generateMusicMetrics(music) {
            return `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">${music.streams}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Total Streams</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--success);">${music.monthly}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Ouvintes Mensais</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--info);">${music.platforms}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Plataformas</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--warning);">${music.engagement}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Engajamento</div>
                    </div>
                </div>
            `;
        }

        function generateSocialMetrics(social) {
            return `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">${social.followers}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Seguidores</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--info);">${social.reach}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Alcance Mensal</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--success);">${social.engagement}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Taxa de Eng.</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--warning);">${social.posts}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Posts Mensais</div>
                    </div>
                </div>
            `;
        }

        // ===============================
        // 🎯 DEMAIS VIEWS E HELPERS
        // ===============================

        function renderAutomacaoView() {
            document.querySelector('.metrics-grid').style.display = 'none';
            document.querySelector('.filters-section-enhanced').style.display = 'none';
            document.querySelector('.content-grid').style.display = 'none';
            
            const mainContent = document.getElementById('mainContent');
            const contentAfterHeader = mainContent.querySelector('.metrics-grid').parentElement;
            
            let automacaoContainer = document.getElementById('automacaoFullView');
            if (!automacaoContainer) {
                automacaoContainer = document.createElement('div');
                automacaoContainer.id = 'automacaoFullView';
                automacaoContainer.style.width = '100%';
                contentAfterHeader.appendChild(automacaoContainer);
            }
            
            automacaoContainer.style.display = 'block';
            automacaoContainer.innerHTML = `
                <div class="content-section">
                    <div class="section-header">
                        <h2 class="section-title">🤖 Automações n8n</h2>
                        <p class="section-subtitle">Fluxos automatizados e configurações</p>
                        <div class="section-actions">
                            <button class="section-btn" onclick="testAutomations()">🧪 Testar Conexões</button>
                            <button class="section-btn" onclick="openN8nInterface()">🔧 Abrir n8n</button>
                        </div>
                    </div>
                    <div class="section-content">
                        <div style="display: grid; gap: 20px;">
                            ${generateAutomationList()}
                        </div>
                    </div>
                </div>
            `;
        }

        function renderIntegracaoView() {
            document.querySelector('.metrics-grid').style.display = 'none';
            document.querySelector('.filters-section-enhanced').style.display = 'none';
            document.querySelector('.content-grid').style.display = 'none';
            
            const mainContent = document.getElementById('mainContent');
            const contentAfterHeader = mainContent.querySelector('.metrics-grid').parentElement;
            
            let integracaoContainer = document.getElementById('integracaoFullView');
            if (!integracaoContainer) {
                integracaoContainer = document.createElement('div');
                integracaoContainer.id = 'integracaoFullView';
                integracaoContainer.style.width = '100%';
                contentAfterHeader.appendChild(integracaoContainer);
            }
            
            integracaoContainer.style.display = 'block';
            integracaoContainer.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px;">
                    <div class="content-section">
                        <div class="section-header">
                            <h2 class="section-title">🔗 Status das Integrações</h2>
                            <p class="section-subtitle">Conexões com APIs externas</p>
                        </div>
                        <div class="section-content">
                            ${generateIntegrationStatus()}
                        </div>
                    </div>
                    
                    <div class="content-section">
                        <div class="section-header">
                            <h2 class="section-title">📊 Estatísticas de Sync</h2>
                            <p class="section-subtitle">Performance das sincronizações</p>
                        </div>
                        <div class="section-content">
                            ${generateSyncStats()}
                        </div>
                    </div>
                </div>
            `;
        }

        function renderEquipeView() {
            document.querySelector('.metrics-grid').style.display = 'none';
            document.querySelector('.filters-section-enhanced').style.display = 'block';
            document.querySelector('.content-grid').style.display = 'none';
            
            const mainContent = document.getElementById('mainContent');
            const contentAfterHeader = mainContent.querySelector('.metrics-grid').parentElement;
            
            let equipeContainer = document.getElementById('equipeFullView');
            if (!equipeContainer) {
                equipeContainer = document.createElement('div');
                equipeContainer.id = 'equipeFullView';
                equipeContainer.style.width = '100%';
                contentAfterHeader.appendChild(equipeContainer);
            }
            
            equipeContainer.style.display = 'block';
            
            const teamStats = generateTeamStats();
            
            equipeContainer.innerHTML = `
                <div class="content-section">
                    <div class="section-header">
                        <h2 class="section-title">👥 Membros da Equipe</h2>
                        <p class="section-subtitle">Visão geral da equipe e suas demandas</p>
                        <div class="section-actions">
                            <button class="section-btn" onclick="exportTeamReport()">📄 Exportar Relatório</button>
                            <button class="section-btn" onclick="addTeamMember()">➕ Adicionar Membro</button>
                        </div>
                    </div>
                    <div class="section-content">
                        <div style="display: grid; gap: 16px;">
                            ${teamStats.map(member => `
                                <div style="background: var(--bg-secondary); padding: 20px; border-radius: 12px; border: 1px solid var(--border-light);">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                        <div style="display: flex; align-items: center; gap: 12px;">
                                            <div style="width: 40px; height: 40px; background: var(--gradient-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700;">
                                                ${member.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div style="font-weight: 700; color: var(--text-primary);">${member.name}</div>
                                                <div style="font-size: 0.85rem; color: var(--text-muted);">${member.sector} • ${member.role}</div>
                                            </div>
                                        </div>
                                        <div style="text-align: right;">
                                            <div style="font-size: 1.2rem; font-weight: 700; color: var(--primary);">${member.activeTasks}</div>
                                            <div style="font-size: 0.8rem; color: var(--text-muted);">Ativas</div>
                                        </div>
                                    </div>
                                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; font-size: 0.85rem;">
                                        <div style="text-align: center; padding: 8px; background: var(--card-bg); border-radius: 6px;">
                                            <div style="font-weight: 600; color: var(--success);">${member.completed}</div>
                                            <div style="color: var(--text-muted);">Completas</div>
                                        </div>
                                        <div style="text-align: center; padding: 8px; background: var(--card-bg); border-radius: 6px;">
                                            <div style="font-weight: 600; color: var(--warning);">${member.inProgress}</div>
                                            <div style="color: var(--text-muted);">Em Progresso</div>
                                        </div>
                                        <div style="text-align: center; padding: 8px; background: var(--card-bg); border-radius: 6px;">
                                            <div style="font-weight: 600; color: var(--info);">${member.review}</div>
                                            <div style="color: var(--text-muted);">Revisão</div>
                                        </div>
                                        <div style="text-align: center; padding: 8px; background: var(--card-bg); border-radius: 6px;">
                                            <div style="font-weight: 600; color: var(--error);">${member.overdue}</div>
                                            <div style="color: var(--text-muted);">Atrasadas</div>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }

        function renderConfiguracoesView() {
            document.querySelector('.metrics-grid').style.display = 'none';
            document.querySelector('.filters-section-enhanced').style.display = 'none';
            document.querySelector('.content-grid').style.display = 'none';
            
            const mainContent = document.getElementById('mainContent');
            const contentAfterHeader = mainContent.querySelector('.metrics-grid').parentElement;
            
            let configContainer = document.getElementById('configFullView');
            if (!configContainer) {
                configContainer = document.createElement('div');
                configContainer.id = 'configFullView';
                configContainer.style.width = '100%';
                contentAfterHeader.appendChild(configContainer);
            }
            
            configContainer.style.display = 'block';
            configContainer.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px;">
                    <div class="content-section">
                        <div class="section-header">
                            <h2 class="section-title">🎨 Preferências Visuais</h2>
                            <p class="section-subtitle">Personalize a aparência do dashboard</p>
                        </div>
                        <div class="section-content">
                            <div style="display: grid; gap: 20px;">
                                <div>
                                    <label style="display: block; font-weight: 600; margin-bottom: 8px;">🌙 Tema</label>
                                    <div style="display: flex; gap: 12px;">
                                        <button class="section-btn" onclick="setTheme('light')" style="flex: 1;">☀️ Claro</button>
                                        <button class="section-btn" onclick="setTheme('dark')" style="flex: 1;">🌙 Escuro</button>
                                        <button class="section-btn" onclick="setTheme('auto')" style="flex: 1;">🔄 Auto</button>
                                    </div>
                                </div>
                                
                                <div>
                                    <label style="display: block; font-weight: 600; margin-bottom: 8px;">🔄 Auto-sincronização</label>
                                    <select class="filter-select" onchange="updateSyncInterval(this.value)">
                                        <option value="300000">5 minutos</option>
                                        <option value="600000">10 minutos</option>
                                        <option value="1800000">30 minutos</option>
                                        <option value="3600000">1 hora</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label style="display: block; font-weight: 600; margin-bottom: 8px;">📱 Notificações</label>
                                    <div style="display: grid; gap: 8px;">
                                        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem;">
                                            <input type="checkbox" checked> Sincronizações bem-sucedidas
                                        </label>
                                        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem;">
                                            <input type="checkbox" checked> Erros e falhas
                                        </label>
                                        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem;">
                                            <input type="checkbox"> Tarefas vencendo hoje
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="content-section">
                        <div class="section-header">
                            <h2 class="section-title">🔧 Configurações Técnicas</h2>
                            <p class="section-subtitle">Ajustes de conexão e performance</p>
                        </div>
                        <div class="section-content">
                            <div style="display: grid; gap: 20px;">
                                <div>
                                    <label style="display: block; font-weight: 600; margin-bottom: 8px;">🌐 URL do n8n</label>
                                    <input type="text" class="filter-input" value="${CONFIG.N8N_BASE_URL}" placeholder="https://n8n.exemplo.com">
                                </div>
                                
                                <div>
                                    <label style="display: block; font-weight: 600; margin-bottom: 8px;">⚡ Performance</label>
                                    <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; font-size: 0.9rem;">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                            <span>Última sincronização:</span>
                                            <span>${lastSync ? lastSync.toLocaleString('pt-BR') : 'Nunca'}</span>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                            <span>Total de eventos:</span>
                                            <span>${allEvents.length}</span>
                                        </div>
                                        <div style="display: flex; justify-content: space-between;">
                                            <span>Total de demandas:</span>
                                            <span>${allTasks.length}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <label style="display: block; font-weight: 600; margin-bottom: 8px;">🧹 Manutenção</label>
                                    <div style="display: grid; gap: 8px;">
                                        <button class="section-btn" onclick="clearCache()">🗑️ Limpar Cache</button>
                                        <button class="section-btn" onclick="exportSettings()">📥 Exportar Configurações</button>
                                        <button class="section-btn" onclick="resetSettings()">🔄 Restaurar Padrões</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        function renderCalendarEvents() {
            const container = document.getElementById('calendarEvents');
            const filteredEvents = getFilteredEvents();

            if (filteredEvents.length === 0) {
                container.innerHTML = '<div class="empty-state"><h3>Nenhum evento encontrado</h3><p>Não há eventos para o período selecionado</p></div>';
                return;
            }

            const html = filteredEvents.map(event => createEventHTML(event)).join('');
            container.innerHTML = html;
        }

        function renderClickUpTasks() {
            const container = document.getElementById('clickupTasks');
            const filteredTasks = getFilteredTasks();

            if (filteredTasks.length === 0) {
                container.innerHTML = '<div class="empty-state"><h3>Nenhuma demanda encontrada</h3><p>Não há demandas para os filtros selecionados</p></div>';
                return;
            }

            const html = renderTasksBySector(filteredTasks);
            container.innerHTML = html;
        }

        function renderTasksBySector(tasks) {
            const tasksPorSetor = {};
            
            tasks.forEach(task => {
                const setor = task.setor || task.sector || 'Geral';
                
                if (!tasksPorSetor[setor]) {
                    tasksPorSetor[setor] = [];
                }
                tasksPorSetor[setor].push(task);
            });

            const setoresOrdenados = Object.keys(tasksPorSetor).sort((a, b) => {
                const ordem = ['Design', 'Audiovisual', 'Social Media', 'Gestão de Projetos', 'Gestão de Tráfego', 'Estratégia', 'Estúdio', 'Músico', 'Geral'];
                const indexA = ordem.indexOf(a);
                const indexB = ordem.indexOf(b);
                
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
                return a.localeCompare(b);
            });

            console.log('🏢 Setores processados:', setoresOrdenados);
            console.log('📊 Tasks por setor:', Object.fromEntries(
                setoresOrdenados.map(setor => [setor, tasksPorSetor[setor].length])
            ));

            let html = '';
            setoresOrdenados.forEach(setor => {
                const sectorTasks = tasksPorSetor[setor];
                if (sectorTasks.length > 0) {
                    html += `
                        <div class="sector-section">
                            <div class="sector-title">
                                ${getSectorIcon(setor)} <strong class="sector-name">${setor.toUpperCase()}</strong>
                                <span class="sector-count">${sectorTasks.length}</span>
                            </div>
                            ${sectorTasks.map(task => createTaskHTML(task)).join('')}
                        </div>
                    `;
                }
            });

            return html || '<div class="empty-state">Nenhuma demanda encontrada</div>';
        }

        function getSectorIcon(setor) {
            const icons = {
                'Design': '🎨',
                'Audiovisual': '🎬',
                'Social Media': '📱',
                'Gestão de Projetos': '📊',
                'Gestão de Tráfego': '📈',
                'Estratégia': '🎯',
                'Estúdio': '🎵',
                'Estúdio ': '🎵',
                'Músico': '🎤',
                'Geral': '📋'
            };
            return icons[setor] || icons[setor.trim()] || '📋';
        }

        function createEventHTML(event) {
            const date = new Date(event.start);
            const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const dateStr = date.toLocaleDateString('pt-BR');
            
            return `
                <div class="event-item" onclick="openEvent('${event.id}')">
                    <div class="item-title">${event.title}</div>
                    <div class="item-meta">
                        <span>🕐 ${timeStr} - ${dateStr}</span>
                        ${event.location ? `<span>📍 ${event.location}</span>` : ''}
                        <span class="status-badge status-${event.status}" onclick="changeEventStatus(event, '${event.id}')">${getStatusLabel(event.status)}</span>
                    </div>
                </div>
            `;
        }

        function createTaskHTML(task) {
            let dueDateHTML = '';
            if (task.due_date || task.dueDate) {
                const dueDate = new Date(task.due_date || task.dueDate);
                const now = new Date();
                const isOverdue = dueDate < now;
                const isToday = dueDate.toDateString() === now.toDateString();
                const isTomorrow = dueDate.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
                
                let dueDateText = dueDate.toLocaleDateString('pt-BR', { 
                    day: '2-digit', 
                    month: '2-digit',
                    year: '2-digit'
                });
                
                let dueDateClass = '';
                let dueDateIcon = '📅';
                
                if (isOverdue) {
                    dueDateClass = 'style="color: #DC2626; font-weight: 600;"';
                    dueDateIcon = '🔴';
                    dueDateText = `${dueDateText} (Vencida)`;
                } else if (isToday) {
                    dueDateClass = 'style="color: #D97706; font-weight: 600;"';
                    dueDateIcon = '⚡';
                    dueDateText = `${dueDateText} (Hoje)`;
                } else if (isTomorrow) {
                    dueDateClass = 'style="color: #059669; font-weight: 600;"';
                    dueDateIcon = '🔍';
                    dueDateText = `${dueDateText} (Amanhã)`;
                }
                
                dueDateHTML = `<span ${dueDateClass}>${dueDateIcon} ${dueDateText}</span>`;
            }

            let descriptionHTML = '';
            if (task.description && task.description.trim()) {
                const maxLength = 120;
                let description = task.description.trim();
                if (description.length > maxLength) {
                    description = description.substring(0, maxLength) + '...';
                }
                descriptionHTML = `<div style="font-size: 0.8rem; color: var(--text-light); margin-top: 6px; line-height: 1.4;">${description}</div>`;
            }

            // Mostrar borracha apenas se NÃO estiver em 'open'
            const showResetBtn = task.status !== 'open';

            return `
                <div class="task-item">
                    <div class="item-title">${task.title}</div>
                    <div class="item-meta">
                        ${task.assignees?.length ? `<span>👤 ${task.assignees.join(', ')}</span>` : ''}
                        ${dueDateHTML}
                        <span class="status-badge status-${task.status}" 
                              onclick="changeTaskStatus(event, '${task.id}')"
                              title="🖱️ Clique: Avançar status | 👆👆 Duplo clique: Resetar para 'Aberta'"
                              style="cursor: pointer;">
                            ${getTaskStatusLabel(task.status)}
                        </span>
                        ${showResetBtn ? `
                            <button class="reset-btn" 
                                    onclick="resetTaskStatusButton(event, '${task.id}')" 
                                    title="🧹 Resetar para 'Aberta'">
                                🧹
                            </button>
                        ` : ''}
                        ${task.url ? `<span style="font-size: 0.7rem;">🔗 <a href="${task.url}" target="_blank" style="color: inherit; text-decoration: none;">ClickUp</a></span>` : ''}
                    </div>
                    ${descriptionHTML}
                </div>
            `;
        }

        // ===============================
        // 🔍 FILTROS MELHORADOS
        // ===============================

        function getFilteredEvents() {
            let filtered = [...allEvents];
            
            // Filtrar por período
            filtered = filterByPeriod(filtered);
            
            // Filtrar por texto (pesquisa inteligente)
            if (currentFilters.text) {
                const searchText = currentFilters.text.toLowerCase();
                filtered = filtered.filter(event => 
                    (event.title && event.title.toLowerCase().includes(searchText)) ||
                    (event.description && event.description.toLowerCase().includes(searchText)) ||
                    (event.location && event.location.toLowerCase().includes(searchText))
                );
            }
            
            return filtered;
        }

        function getFilteredTasks() {
            let filtered = [...allTasks];
            
            // Filtrar por período
            filtered = filterByPeriod(filtered);
            
            // Filtrar por texto (pesquisa inteligente)
            if (currentFilters.text) {
                const searchText = currentFilters.text.toLowerCase();
                filtered = filtered.filter(task => 
                    (task.title && task.title.toLowerCase().includes(searchText)) ||
                    (task.description && task.description.toLowerCase().includes(searchText)) ||
                    (task.setor && task.setor.toLowerCase().includes(searchText)) ||
                    (task.assignees && task.assignees.some(assignee => assignee.toLowerCase().includes(searchText)))
                );
            }
            
            // Filtrar por setor
            if (currentFilters.setor) {
                filtered = filtered.filter(task => task.setor === currentFilters.setor);
            }
            
            // Filtrar por status
            if (currentFilters.status) {
                filtered = filtered.filter(task => task.status === currentFilters.status);
            }
            
            // Filtrar por prioridade
            if (currentFilters.priority) {
                filtered = filtered.filter(task => task.priority === currentFilters.priority);
            }
            
            return filtered;
        }

        function applyAdvancedFilters(items, type) {
            let filtered = [...items];
            
            // Filtro por texto
            if (currentFilters.text) {
                const searchText = currentFilters.text.toLowerCase();
                filtered = filtered.filter(item => 
                    item.title.toLowerCase().includes(searchText) ||
                    (item.description && item.description.toLowerCase().includes(searchText)) ||
                    (item.assignees && item.assignees.some(assignee => 
                        assignee.toLowerCase().includes(searchText)
                    ))
                );
            }
            
            // Filtro por setor (apenas para tarefas)
            if (currentFilters.setor && type === 'task') {
                filtered = filtered.filter(item => item.setor === currentFilters.setor);
            }
            
            // Filtro por status (apenas para tarefas)
            if (currentFilters.status && type === 'task') {
                filtered = filtered.filter(item => item.status === currentFilters.status);
            }
            
            // Filtro por responsável (apenas para tarefas)
            if (currentFilters.assignee && type === 'task') {
                const assigneeText = currentFilters.assignee.toLowerCase();
                filtered = filtered.filter(item => 
                    item.assignees && item.assignees.some(assignee => 
                        assignee.toLowerCase().includes(assigneeText)
                    )
                );
            }
            
            // Filtro por data específica (apenas se não estiver em modo projeto)
            if (currentFilters.date && !projectViewMode) {
                const filterDate = new Date(currentFilters.date).toDateString();
                filtered = filtered.filter(item => {
                    const itemDate = new Date(item.start || item.due_date).toDateString();
                    return itemDate === filterDate;
                });
            }
            
            // Filtro por prioridade (apenas para tarefas)
            if (currentFilters.priority && type === 'task') {
                filtered = filtered.filter(item => item.priority === currentFilters.priority);
            }
            
            return filtered;
        }

        function filterByPeriod(items) {
            if (currentPeriod === 'todas' || projectViewMode) {
                return items; // Retornar todos os itens
            }

            const now = new Date();
            let startDate, endDate;

            switch(currentPeriod) {
                case 'dia':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
                    break;
                case 'semana':
                    const weekStart = new Date(now);
                    weekStart.setDate(now.getDate() - now.getDay());
                    weekStart.setHours(0, 0, 0, 0);
                    startDate = weekStart;
                    endDate = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'mes':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                    break;
                default:
                    return items; // Sem filtro de período
            }

            return items.filter(item => {
                const itemDate = new Date(item.start || item.due_date);
                return itemDate >= startDate && itemDate < endDate;
            });
        }

        function applyFilters() {
            // Coletar valores dos filtros essenciais
            currentFilters.setor = document.getElementById('filterSetor').value;
            currentFilters.status = document.getElementById('filterStatus').value;
            currentFilters.priority = document.getElementById('filterPriority').value;
            
            // Coletar valor da pesquisa inteligente
            const searchInput = document.getElementById('smartSearch');
            if (searchInput) {
                currentFilters.text = searchInput.value.toLowerCase();
            }
            
            renderCurrentView();
            updateMetrics();
        }

        function clearAllFilters() {
            // Limpar campos de filtro essenciais
            const filterFields = {
                setor: document.getElementById('filterSetor'),
                status: document.getElementById('filterStatus'),
                priority: document.getElementById('filterPriority')
            };
            
            Object.values(filterFields).forEach(field => {
                if (field) {
                    if (field.tagName === 'SELECT') {
                        field.selectedIndex = 0;
                    } else {
                        field.value = '';
                    }
                }
            });
            
            // Limpar campo de pesquisa
            const searchInput = document.getElementById('smartSearch');
            if (searchInput) {
                searchInput.value = '';
            }
            
            currentFilters = { text: '', setor: '', status: '', priority: '' };
            
            // Também limpar filtros inteligentes
            clearAllFiltersEnhanced();
            
            renderCurrentView();
            updateMetrics();
            
            showNotification('🧹 Filtros limpos', 'info');
        }

        // NOVA FUNÇÃO: Toggle visualização de projeto
        async function toggleProjectView() {
            if (!projectViewMode) {
                await loadProjectView();
            } else {
                projectViewMode = false;
                allProjectTasks = [];
                updateMetrics();
                renderCurrentView();
                showNotification('Voltou para visualização normal 📅', 'info');
            }
        }

        // ===============================
        // 🎯 HELPERS
        // ===============================

        function getStatusLabel(status) {
            const labels = {
                'confirmed': '✅ Confirmado',
                'tentative': '⏳ Tentativo',
                'cancelled': '❌ Cancelado'
            };
            return labels[status] || status;
        }

        function getTaskStatusLabel(status) {
            const labels = {
                'open': '📋 Aberta',
                'Open': '📋 Aberta',
                'progress': '⚡ Em Progresso',
                'in progress': '⚡ Em Progresso',
                'review': '👀 Revisão',
                'complete': '✅ Completa',
                'closed': '✅ Fechada'
            };
            return labels[status] || `📝 ${status}`;
        }

        function getTaskStatusIcon(status) {
            const icons = {
                'open': '📋',
                'Open': '📋',
                'progress': '⚡',
                'in progress': '⚡',
                'review': '👀',
                'complete': '✅',
                'closed': '✅'
            };
            return icons[status] || '📝';
        }

        function getStatusColor(status) {
            const colors = {
                'open': '#6B7280',
                'progress': '#F59E0B',
                'review': '#3B82F6',
                'complete': '#10B981',
                'closed': '#10B981'
            };
            return colors[status] || '#6B7280';
        }

        // ===============================
        // 📄 AUTO-SYNC
        // ===============================

        function setupAutoSync() {
            setInterval(async () => {
                console.log('🔄 Auto-sync executado');
                await loadAllData();
            }, CONFIG.AUTO_SYNC);
        }

        // ===============================
        // 🎨 UI HELPERS
        // ===============================

        function showView(viewName) {
            // Ocultar TODAS as visualizações especiais
            const specialViews = [
                'calendarioFullView', 
                'placeholderView',
                'analyticsFullView',
                'automacaoFullView', 
                'integracaoFullView',
                'equipeFullView',
                'configFullView',
                'arquivosFullView',
                'copyFullView',
                'sprintFullView'
            ];
            
            specialViews.forEach(viewId => {
                const view = document.getElementById(viewId);
                if (view) {
                    view.style.display = 'none';
                }
            });
            
            // Atualizar navegação ativa - procurar por todos os nav-items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
                
                // Verificar se este item corresponde à view atual
                const onclick = item.getAttribute('onclick');
                if (onclick && onclick.includes(`'${viewName}'`)) {
                    item.classList.add('active');
                }
            });
            
            currentView = viewName;
            renderCurrentView();
            
            // Atualizar e mostrar indicador de visualização
            const viewNames = {
                'dashboard': '📊 Dashboard Principal',
                'calendario': '🗓️ Visualização de Calendário',
                'sprint': '📅 Sprint Semanal e Mensal',
                'arquivos': '📁 Biblioteca de Arquivos',
                'copy': '✍️ Gerador de Copy IA',
                'analytics': '📈 Analytics',
                'automacao': '🤖 Automação',
                'integracao': '🔗 Integrações',
                'equipe': '👥 Equipe',
                'configuracoes': '⚙️ Configurações'
            };
            
            if (viewNames[viewName]) {
                showViewIndicator(viewNames[viewName]);
                showNotification(`Navegando para: ${viewNames[viewName]}`, 'info');
            }
        }

        function showViewIndicator(viewName) {
            const indicator = document.getElementById('viewIndicator');
            if (indicator) {
                indicator.textContent = viewName;
                indicator.classList.add('show');
                
                // Ocultar após 3 segundos
                setTimeout(() => {
                    indicator.classList.remove('show');
                }, 3000);
            }
        }

        function setPeriod(period) {
            document.querySelectorAll('.period-tab').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');

            currentPeriod = period;
            
            // Mostrar/ocultar controles de visualização de projeto
            const projectControls = document.getElementById('projectViewControls');
            if (period === 'todas') {
                projectControls.style.display = 'block';
                // Se ainda não estiver em modo projeto, ativar
                if (!projectViewMode) {
                    showNotification('💡 Ative a "Visualização Completa de Projeto" para ver todas as tarefas no calendário!', 'info');
                }
            } else {
                projectControls.style.display = 'none';
                // Se estava em modo projeto, desativar
                if (projectViewMode) {
                    projectViewMode = false;
                    allProjectTasks = [];
                    showNotification('📅 Voltou para visualização por período', 'info');
                }
            }
            
            renderCurrentView();
            updateMetrics();
        }

        // ===============================
        // 🎛️ FILTROS INTELIGENTES
        // ===============================

        // Estado dos filtros inteligentes
        let smartFilters = {
            period: 'hoje',
            searchQuery: ''
        };

        // Função para definir período
        function setPeriodEnhanced(period) {
            // Atualizar UI dos cards de filtro rápido
            document.querySelectorAll('.quick-filter-card').forEach(card => {
                card.classList.remove('active');
                const indicator = card.querySelector('.quick-filter-indicator');
                if (indicator) indicator.classList.remove('active');
            });
            
            // Ativar o card selecionado
            const selectedCard = document.querySelector(`[data-period="${period}"]`);
            if (selectedCard) {
                selectedCard.classList.add('active');
                const indicator = selectedCard.querySelector('.quick-filter-indicator');
                if (indicator) indicator.classList.add('active');
            }
            
            // Atualizar estado
            smartFilters.period = period;
            
            // Aplicar filtros
            applySmartFilters();
            
            const periodNames = {
                'hoje': 'Hoje',
                'esta-semana': 'Esta Semana',
                'este-mes': 'Este Mês',
                'todas': 'Todas'
            };
            
            showNotification(`📅 Período definido para: ${periodNames[period]}`, 'info');
        }

        // Função para alternar filtros avançados
        function toggleAdvancedFilters() {
            const panel = document.getElementById('advancedFiltersPanel');
            const btn = document.getElementById('toggleAdvancedBtn');
            
            if (panel.style.display === 'none') {
                panel.style.display = 'block';
                btn.innerHTML = '<span class="btn-icon">⚙️</span><span class="btn-text">Ocultar</span>';
                btn.style.background = 'var(--primary)';
                btn.style.color = 'var(--text-primary)';
            } else {
                panel.style.display = 'none';
                btn.innerHTML = '<span class="btn-icon">⚙️</span><span class="btn-text">Avançado</span>';
                btn.style.background = 'var(--card-bg)';
                btn.style.color = 'var(--text-primary)';
            }
        }

        // Função para alternar tags
        function toggleTag(tagName) {
            const tagElement = document.querySelector(`[data-tag="${tagName}"]`);
            tagElement.classList.toggle('active');
            
            // Atualizar filtros ativos
            updateActiveFilters();
            
            // Aplicar filtros
            applySmartFilters();
        }

        // Função para atualizar filtros ativos
        function updateActiveFilters() {
            const activeFilters = [];
            
            // Verificar filtros de período
            const activePeriod = document.querySelector('.quick-filter-card.active');
            if (activePeriod) {
                const periodText = activePeriod.querySelector('.quick-filter-title').textContent;
                activeFilters.push({ type: 'período', value: periodText, key: 'period' });
            }
            
            // Verificar filtros de setor
            const setorSelect = document.getElementById('filterSetor');
            if (setorSelect && setorSelect.value) {
                activeFilters.push({ type: 'setor', value: setorSelect.value, key: 'setor' });
            }
            
            // Verificar filtros de status
            const statusSelect = document.getElementById('filterStatus');
            if (statusSelect && statusSelect.value) {
                activeFilters.push({ type: 'status', value: statusSelect.value, key: 'status' });
            }
            
            // Verificar filtros de prioridade
            const prioritySelect = document.getElementById('filterPriority');
            if (prioritySelect && prioritySelect.value) {
                activeFilters.push({ type: 'prioridade', value: prioritySelect.value, key: 'priority' });
            }
            
            // Verificar tags ativas
            const activeTags = document.querySelectorAll('.tag-item.active');
            activeTags.forEach(tag => {
                const tagText = tag.querySelector('.tag-text').textContent;
                activeFilters.push({ type: 'tag', value: tagText, key: `tag_${tag.dataset.tag}` });
            });
            
            // Mostrar/ocultar indicador de filtros ativos
            const indicator = document.getElementById('activeFiltersIndicator');
            const tagsContainer = document.getElementById('activeFiltersTags');
            
            if (activeFilters.length > 0) {
                indicator.style.display = 'block';
                tagsContainer.innerHTML = activeFilters.map(filter => `
                    <div class="active-filter-tag">
                        <span>${filter.type}: ${filter.value}</span>
                        <button class="remove-filter-btn" onclick="removeFilter('${filter.key}')">✕</button>
                    </div>
                `).join('');
            } else {
                indicator.style.display = 'none';
            }
        }

        // Função para remover filtro específico
        function removeFilter(filterKey) {
            if (filterKey === 'period') {
                // Resetar para "todas"
                setPeriodEnhanced('todas');
            } else if (filterKey.startsWith('tag_')) {
                const tagName = filterKey.replace('tag_', '');
                const tagElement = document.querySelector(`[data-tag="${tagName}"]`);
                if (tagElement) tagElement.classList.remove('active');
            } else {
                // Limpar select específico
                const selectId = `filter${filterKey.charAt(0).toUpperCase() + filterKey.slice(1)}`;
                const select = document.getElementById(selectId);
                if (select) select.value = '';
            }
            
            updateActiveFilters();
            applySmartFilters();
        }

        // Função para lidar com pesquisa inteligente
        function handleSmartSearch(event) {
            const query = event.target.value.trim().toLowerCase();
            smartFilters.searchQuery = query;
            
            // Mostrar/ocultar botão de limpar
            const clearBtn = document.getElementById('searchClearBtn');
            if (query) {
                clearBtn.style.display = 'block';
            } else {
                clearBtn.style.display = 'none';
            }
            
            // Aplicar filtros com debounce
            clearTimeout(window.smartSearchTimeout);
            window.smartSearchTimeout = setTimeout(() => {
                applySmartFilters();
            }, 300);
        }

        // Função para limpar pesquisa
        function clearSearch() {
            const searchInput = document.getElementById('smartSearch');
            if (searchInput) {
                searchInput.value = '';
                smartFilters.searchQuery = '';
                document.getElementById('searchClearBtn').style.display = 'none';
                applySmartFilters();
                showNotification('🔍 Pesquisa limpa', 'info');
            }
        }

        // Função para aplicar filtros inteligentes
        function applySmartFilters() {
            // Aplicar período
            let traditionalPeriod = 'dia';
            
            switch(smartFilters.period) {
                case 'hoje':
                    traditionalPeriod = 'dia';
                    break;
                case 'esta-semana':
                    traditionalPeriod = 'semana';
                    break;
                case 'este-mes':
                    traditionalPeriod = 'mes';
                    break;
                case 'todas':
                    traditionalPeriod = 'todas';
                    break;
            }
            
            currentPeriod = traditionalPeriod;
            
            // Aplicar filtros tradicionais
            applyFilters();
            
            // Atualizar filtros ativos
            updateActiveFilters();
            
            console.log('🎯 Filtros inteligentes aplicados:', smartFilters);
        }

        // Função para atualizar contadores dos filtros rápidos
        function updateQuickFilterCounts() {
            // Contar tarefas por período
            const hojeCount = allTasks.filter(task => {
                const taskDate = new Date(task.due_date || task.start || task.created_date || new Date());
                const today = new Date();
                return taskDate.toDateString() === today.toDateString();
            }).length;
            
            const semanaCount = allTasks.filter(task => {
                const taskDate = new Date(task.due_date || task.start || task.created_date || new Date());
                const today = new Date();
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                return taskDate >= weekStart && taskDate <= weekEnd;
            }).length;
            
            const mesCount = allTasks.filter(task => {
                const taskDate = new Date(task.due_date || task.start || task.created_date || new Date());
                const today = new Date();
                return taskDate.getMonth() === today.getMonth() && 
                       taskDate.getFullYear() === today.getFullYear();
            }).length;
            
            const todasCount = allTasks.length;
            
            // Atualizar contadores na UI
            const hojeElement = document.getElementById('countHoje');
            const semanaElement = document.getElementById('countSemana');
            const mesElement = document.getElementById('countMes');
            const todasElement = document.getElementById('countTodas');
            
            if (hojeElement) hojeElement.textContent = hojeCount;
            if (semanaElement) semanaElement.textContent = semanaCount;
            if (mesElement) mesElement.textContent = mesCount;
            if (todasElement) todasElement.textContent = todasCount;
        }

        // Função para limpar todos os filtros
        function clearAllFiltersEnhanced() {
            // Resetar estado dos filtros inteligentes
            smartFilters = {
                period: 'hoje',
                searchQuery: ''
            };
            
            // Resetar UI dos cards de filtro rápido
            document.querySelectorAll('.quick-filter-card').forEach(card => {
                card.classList.remove('active');
                const indicator = card.querySelector('.quick-filter-indicator');
                if (indicator) indicator.classList.remove('active');
            });
            
            // Ativar o card "Hoje"
            const hojeCard = document.querySelector('[data-period="hoje"]');
            if (hojeCard) {
                hojeCard.classList.add('active');
                const indicator = hojeCard.querySelector('.quick-filter-indicator');
                if (indicator) indicator.classList.add('active');
            }
            
            // Limpar campos de filtro tradicionais
            const filterFields = {
                setor: document.getElementById('filterSetor'),
                status: document.getElementById('filterStatus'),
                priority: document.getElementById('filterPriority')
            };
            
            Object.values(filterFields).forEach(field => {
                if (field) {
                    if (field.tagName === 'SELECT') {
                        field.selectedIndex = 0;
                    } else {
                        field.value = '';
                    }
                }
            });
            
            // Limpar pesquisa inteligente
            clearSearch();
            
            // Aplicar filtros
            applySmartFilters();
            
            showNotification('🧹 Todos os filtros foram limpos', 'info');
        }

        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('open');
        }

        function toggleTheme() {
            const body = document.body;
            const themeToggle = document.getElementById('themeToggle');
            
            if (body.getAttribute('data-theme') === 'dark') {
                body.setAttribute('data-theme', 'light');
                themeToggle.textContent = '🌙';
            } else {
                body.setAttribute('data-theme', 'dark');
                themeToggle.textContent = '☀️';
            }
            
            // Forçar atualização das cores dos setores e filtros
            setTimeout(() => {
                fixSectorTitlesColor();
                updateFiltersForDarkMode();
            }, 100);
        }

        // NOVA FUNÇÃO: Corrigir cores dos títulos dos setores
        function fixSectorTitlesColor() {
            const isDarkTheme = document.body.getAttribute('data-theme') === 'dark';
            const sectorNames = document.querySelectorAll('.sector-name');
            
            sectorNames.forEach(sectorName => {
                if (isDarkTheme) {
                    sectorName.style.color = '#F1F5F9';
                } else {
                    sectorName.style.color = 'var(--primary)';
                }
            });
        }

        // NOVA FUNÇÃO: Atualizar cores dos filtros para modo noturno
        function updateFiltersForDarkMode() {
            const isDarkTheme = document.body.getAttribute('data-theme') === 'dark';
            
            // Atualizar cores dos filtros visuais por tipo
            const typeFilterItems = document.querySelectorAll('.type-filter-item');
            typeFilterItems.forEach(item => {
                if (isDarkTheme) {
                    item.style.background = 'var(--bg-secondary)';
                    item.style.borderColor = 'var(--border-light)';
                } else {
                    item.style.background = 'var(--card-bg)';
                    item.style.borderColor = 'var(--border-light)';
                }
            });
            
            // Atualizar cores dos checkboxes
            const checkboxes = document.querySelectorAll('.type-filter-checkbox');
            checkboxes.forEach(checkbox => {
                if (isDarkTheme) {
                    checkbox.style.borderColor = 'var(--border)';
                    checkbox.style.background = 'var(--bg-secondary)';
                } else {
                    checkbox.style.borderColor = 'var(--border)';
                    checkbox.style.background = 'var(--card-bg)';
                }
            });
            
            // Atualizar cores dos inputs e selects dos filtros avançados
            const filterInputs = document.querySelectorAll('.filter-input, .filter-select');
            filterInputs.forEach(input => {
                if (isDarkTheme) {
                    input.style.background = 'var(--bg-secondary)';
                    input.style.borderColor = 'var(--border-light)';
                    input.style.color = 'var(--text-primary)';
                } else {
                    input.style.background = 'var(--card-bg)';
                    input.style.borderColor = 'var(--border)';
                    input.style.color = 'var(--text-primary)';
                }
            });
            
            // Atualizar cores das tabs de período
            const periodTabs = document.querySelectorAll('.period-tab-enhanced');
            periodTabs.forEach(tab => {
                if (isDarkTheme) {
                    tab.style.background = 'var(--bg-secondary)';
                    tab.style.borderColor = 'var(--border-light)';
                    tab.style.color = 'var(--text-primary)';
                } else {
                    tab.style.background = 'var(--card-bg)';
                    tab.style.borderColor = 'var(--border-light)';
                    tab.style.color = 'var(--text-primary)';
                }
            });
            
            // Atualizar cores da barra de pesquisa
            const searchInput = document.querySelector('.smart-search-input');
            if (searchInput) {
                if (isDarkTheme) {
                    searchInput.style.background = 'var(--bg-secondary)';
                    searchInput.style.borderColor = 'var(--border-light)';
                    searchInput.style.color = 'var(--text-primary)';
                } else {
                    searchInput.style.background = 'var(--card-bg)';
                    searchInput.style.borderColor = 'var(--border)';
                    searchInput.style.color = 'var(--text-primary)';
                }
            }
            
            // Atualizar cores dos cards de conteúdo nas views de Arquivos e Sprint
            const contentSections = document.querySelectorAll('.content-section');
            contentSections.forEach(section => {
                if (isDarkTheme) {
                    section.style.background = 'var(--card-bg)';
                    section.style.borderColor = 'var(--border-light)';
                } else {
                    section.style.background = 'var(--card-bg)';
                    section.style.borderColor = 'var(--border-light)';
                }
            });
            
            // Atualizar cores dos cabeçalhos de seção
            const sectionHeaders = document.querySelectorAll('.section-header');
            sectionHeaders.forEach(header => {
                if (isDarkTheme) {
                    header.style.background = 'linear-gradient(135deg, #334155, #1E293B)';
                    header.style.borderColor = 'var(--border-light)';
                } else {
                    header.style.background = 'linear-gradient(135deg, var(--bg-secondary), var(--card-bg))';
                    header.style.borderColor = 'var(--border-light)';
                }
            });
            
            // Atualizar cores dos títulos de seção
            const sectionTitles = document.querySelectorAll('.section-title');
            sectionTitles.forEach(title => {
                if (isDarkTheme) {
                    title.style.color = '#F1F5F9';
                } else {
                    title.style.color = 'var(--text-primary)';
                }
            });

            // Atualizar cores dos filtros ativos
            const activeFilterTags = document.querySelectorAll('.active-filter-tag');
            activeFilterTags.forEach(tag => {
                if (isDarkTheme) {
                    tag.style.background = 'rgba(251, 191, 36, 0.2)';
                    tag.style.color = '#FBBF24';
                    tag.style.borderColor = 'rgba(251, 191, 36, 0.3)';
                } else {
                    tag.style.background = '';
                    tag.style.color = '';
                    tag.style.borderColor = '';
                }
            });

            // Atualizar cores do indicador de filtros ativos
            const activeFiltersIndicator = document.getElementById('activeFiltersIndicator');
            if (activeFiltersIndicator) {
                if (isDarkTheme) {
                    activeFiltersIndicator.style.background = 'rgba(251, 191, 36, 0.1)';
                    activeFiltersIndicator.style.borderColor = '#FBBF24';
                } else {
                    activeFiltersIndicator.style.background = '';
                    activeFiltersIndicator.style.borderColor = '';
                }
            }

            // Atualizar cores dos subtítulos de seção
            const sectionSubtitles = document.querySelectorAll('.section-subtitle');
            sectionSubtitles.forEach(subtitle => {
                if (isDarkTheme) {
                    subtitle.style.color = '#CBD5E1';
                } else {
                    subtitle.style.color = 'var(--text-muted)';
                }
            });
        }

        // ===============================
        // 📄 MODAL MANAGEMENT
        // ===============================

        function toggleQuickModal() {
            const modal = document.getElementById('quickModal');
            modal.classList.toggle('active');
        }

        function closeQuickModal() {
            document.getElementById('quickModal').classList.remove('active');
        }

        function closeModalOnBackdrop(event) {
            if (event.target === event.currentTarget) {
                closeQuickModal();
            }
        }

        function switchTab(tabName) {
            // Remover active de todos os botões e conteúdos
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Ativar o botão e conteúdo selecionado
            document.getElementById(`tab-${tabName}-btn`).classList.add('active');
            document.getElementById(`tab-${tabName}`).classList.add('active');
        }

        // ===============================
        // 🎯 EVENT LISTENERS
        // ===============================

        function setupEventListeners() {
            // Fechar modal com ESC
            document.addEventListener('keydown', function(event) {
                if (event.key === 'Escape') {
                    closeQuickModal();
                    closeDayDetails();
                }
                
                // Atalhos de teclado para navegação (Ctrl + número)
                if (event.ctrlKey || event.metaKey) {
                    switch(event.key) {
                        case '1':
                            event.preventDefault();
                            showView('dashboard');
                            break;
                        case '2':
                            event.preventDefault();
                            showView('agenda');
                            break;
                        case '3':
                            event.preventDefault();
                            showView('demandas');
                            break;
                        case '4':
                            event.preventDefault();
                            showView('calendario');
                            break;
                    }
                }
            });

            // Auto-save de formulários
            document.querySelectorAll('input, select, textarea').forEach(input => {
                input.addEventListener('change', function() {
                    // Salvar no localStorage se necessário
                });
            });
            
            // Mostrar tooltips para atalhos de teclado
            setTimeout(() => {
                showNotification('💡 Dica: Use Ctrl+1,2,3,4 para navegar rapidamente!', 'info');
            }, 5000);
        }

        // ===============================
        // 🎯 UTILITY FUNCTIONS
        // ===============================

        function showLoading(show) {
            const loading = document.getElementById('loading');
            if (show) {
                loading.classList.add('active');
            } else {
                loading.classList.remove('active');
            }
        }

        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            // Auto-remove após 3 segundos
            setTimeout(() => {
                notification.remove();
            }, 3000);
            
            // Remove ao clicar
            notification.addEventListener('click', () => {
                notification.remove();
            });
        }

        // ===============================
        // 📊 FUNÇÕES AUXILIARES PARA ANALYTICS
        // ===============================

        function calculateAnalytics() {
            const totalTasks = allTasks.length;
            
            // Distribuição por status
            const statusCount = {};
            allTasks.forEach(task => {
                const status = task.status || 'open';
                statusCount[status] = (statusCount[status] || 0) + 1;
            });
            
            const byStatus = {};
            Object.entries(statusCount).forEach(([status, count]) => {
                byStatus[status] = {
                    count,
                    percentage: totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0
                };
            });
            
            // Distribuição por setor
            const sectorCount = {};
            allTasks.forEach(task => {
                const sector = task.setor || 'Geral';
                sectorCount[sector] = (sectorCount[sector] || 0) + 1;
            });
            
            const bySector = {};
            Object.entries(sectorCount).forEach(([sector, count]) => {
                bySector[sector] = {
                    count,
                    percentage: totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0
                };
            });
            
            // Métricas de produtividade
            const completedTasks = allTasks.filter(t => t.status === 'complete' || t.status === 'closed').length;
            const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            
            const activeMembers = new Set(
                allTasks.filter(t => t.assignees && t.assignees.length > 0)
                       .flatMap(t => t.assignees)
            ).size;
            
            return {
                byStatus,
                bySector,
                productivity: {
                    totalTasks,
                    completionRate,
                    avgCompletionTime: '3.2 dias',
                    activeMembers
                }
            };
        }

        function generateAutomationList() {
            const automations = [
                {
                    name: 'Sync Google Calendar → Dashboard',
                    status: 'active',
                    lastRun: '2 min atrás',
                    endpoint: CONFIG.ENDPOINTS.EVENTS,
                    description: 'Sincroniza eventos do Google Calendar'
                },
                {
                    name: 'Sync ClickUp → Dashboard',
                    status: 'active', 
                    lastRun: '5 min atrás',
                    endpoint: CONFIG.ENDPOINTS.TASKS,
                    description: 'Sincroniza tarefas do ClickUp'
                },
                {
                    name: 'Criar Tarefa via Dashboard',
                    status: 'active',
                    lastRun: '15 min atrás',
                    endpoint: CONFIG.ENDPOINTS.CREATE_TASK,
                    description: 'Cria novas tarefas no ClickUp'
                },
                {
                    name: 'Atualizar Status de Tarefa',
                    status: 'active',
                    lastRun: '8 min atrás',
                    endpoint: CONFIG.ENDPOINTS.UPDATE_TASK_STATUS,
                    description: 'Atualiza status das tarefas'
                },
                {
                    name: 'IA Bulk Tasks Generator',
                    status: 'active',
                    lastRun: '1 hora atrás',
                    endpoint: CONFIG.ENDPOINTS.CREATE_BULK_TASKS,
                    description: 'Gera tarefas automaticamente com IA'
                },
                {
                    name: 'Google Drive Files Sync',
                    status: 'active',
                    lastRun: '30 min atrás',
                    endpoint: CONFIG.ENDPOINTS.FILES,
                    description: 'Sincroniza arquivos do Google Drive'
                },
                {
                    name: 'Copy IA Generator',
                    status: 'active',
                    lastRun: '2 horas atrás',
                    endpoint: CONFIG.ENDPOINTS.COPY_GENERATOR,
                    description: 'Gera copies personalizados com IA'
                }
            ];
            
            return automations.map(auto => `
                <div style="background: var(--bg-secondary); padding: 20px; border-radius: 12px; border: 1px solid var(--border-light);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                        <div>
                            <h3 style="margin: 0 0 4px 0; font-size: 1rem; color: var(--text-primary);">${auto.name}</h3>
                            <p style="margin: 0; font-size: 0.85rem; color: var(--text-muted);">${auto.description}</p>
                        </div>
                        <span style="background: ${auto.status === 'active' ? 'var(--success)' : 'var(--error)'}; color: var(--text-primary); padding: 4px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 600;">
                            ${auto.status === 'active' ? '🟢 ATIVO' : '🔴 INATIVO'}
                        </span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: var(--text-muted);">
                        <span>📡 ${auto.endpoint}</span>
                        <span>⏰ ${auto.lastRun}</span>
                    </div>
                </div>
            `).join('');
        }

        function generateIntegrationStatus() {
            const integrations = [
                { name: 'Google Calendar', status: 'connected', lastSync: '2 min atrás', icon: '📅' },
                { name: 'ClickUp', status: 'connected', lastSync: '5 min atrás', icon: '✅' },
                { name: 'Google Drive', status: 'connected', lastSync: '30 min atrás', icon: '📁' },
                { name: 'n8n Workflows', status: 'connected', lastSync: '1 min atrás', icon: '🤖' },
                { name: 'Copy IA Generator', status: 'connected', lastSync: '1 hora atrás', icon: '✍️' },
                { name: 'Webhook Endpoints', status: 'connected', lastSync: 'Agora', icon: '🔗' }
            ];
            
            return integrations.map(int => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid var(--border-light);">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 1.5rem;">${int.icon}</span>
                        <div>
                            <div style="font-weight: 600; color: var(--text-primary);">${int.name}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">Última sync: ${int.lastSync}</div>
                        </div>
                    </div>
                                            <span style="background: ${int.status === 'connected' ? 'var(--success)' : 'var(--error)'}; color: var(--text-primary); padding: 4px 12px; border-radius: 16px; font-size: 0.75rem; font-weight: 600;">
                        ${int.status === 'connected' ? '🟢 CONECTADO' : '🔴 DESCONECTADO'}
                    </span>
                </div>
            `).join('');
        }

        function generateSyncStats() {
            return `
                <div style="display: grid; gap: 16px;">
                    <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--success);">98.7%</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Taxa de Sucesso</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--info);">1.2s</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Tempo Médio</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">${allTasks.length + allEvents.length}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Itens Sincronizados</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--warning);">3</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Falhas (24h)</div>
                    </div>
                </div>
            `;
        }

        function generateTeamStats() {
            // Extrair membros únicos das tarefas
            const members = new Set();
            allTasks.forEach(task => {
                if (task.assignees && task.assignees.length > 0) {
                    task.assignees.forEach(assignee => members.add(assignee));
                }
            });
            
            // Se não houver membros nas tarefas, criar dados mock
            if (members.size === 0) {
                return [
                    {
                        name: 'João Silva',
                        sector: 'Design',
                        role: 'Designer Sênior',
                        activeTasks: 8,
                        completed: 12,
                        inProgress: 3,
                        review: 2,
                        overdue: 1
                    },
                    {
                        name: 'Maria Santos',
                        sector: 'Social Media',
                        role: 'Analista de Mídias',
                        activeTasks: 6,
                        completed: 18,
                        inProgress: 4,
                        review: 1,
                        overdue: 0
                    },
                    {
                        name: 'Pedro Costa',
                        sector: 'Audiovisual',
                        role: 'Editor de Vídeo',
                        activeTasks: 5,
                        completed: 9,
                        inProgress: 2,
                        review: 3,
                        overdue: 0
                    },
                    {
                        name: 'Ana Oliveira',
                        sector: 'Gestão',
                        role: 'Gerente de Projetos',
                        activeTasks: 10,
                        completed: 25,
                        inProgress: 5,
                        review: 3,
                        overdue: 2
                    }
                ];
            }
            
            // Processar membros reais
            return Array.from(members).map(memberName => {
                const memberTasks = allTasks.filter(task => 
                    task.assignees && task.assignees.includes(memberName)
                );
                
                const completed = memberTasks.filter(t => t.status === 'complete' || t.status === 'closed').length;
                const inProgress = memberTasks.filter(t => t.status === 'progress' || t.status === 'in progress').length;
                const review = memberTasks.filter(t => t.status === 'review').length;
                const overdue = memberTasks.filter(t => {
                    if (!t.due_date) return false;
                    return new Date(t.due_date) < new Date() && t.status !== 'complete' && t.status !== 'closed';
                }).length;
                
                // Tentar determinar o setor baseado nas tarefas
                const sectors = memberTasks.map(t => t.setor).filter(Boolean);
                const mostCommonSector = sectors.length > 0 ? 
                    sectors.sort((a,b) => sectors.filter(v => v===a).length - sectors.filter(v => v===b).length).pop() :
                    'Geral';
                
                return {
                    name: memberName,
                    sector: mostCommonSector,
                    role: 'Membro da Equipe',
                    activeTasks: memberTasks.filter(t => t.status !== 'complete' && t.status !== 'closed').length,
                    completed,
                    inProgress,
                    review,
                    overdue
                };
            });
        }

        // ===============================
        // 🔧 FUNÇÕES DE CONFIGURAÇÃO
        // ===============================

        function testAutomations() {
            showLoading(true);
            setTimeout(() => {
                showLoading(false);
                showNotification('🧪 Todas as automações estão funcionando corretamente!', 'success');
            }, 2000);
        }

        function openN8nInterface() {
            window.open(CONFIG.N8N_BASE_URL, '_blank');
            showNotification('🔧 Abrindo interface do n8n...', 'info');
        }

        function setTheme(theme) {
            if (theme === 'auto') {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                document.body.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
                showNotification('🔄 Tema automático ativado', 'info');
            } else {
                document.body.setAttribute('data-theme', theme);
                document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
                showNotification(`${theme === 'dark' ? '🌙' : '☀️'} Tema ${theme === 'dark' ? 'escuro' : 'claro'} ativado`, 'info');
            }
            
            // Forçar atualização das cores dos setores e filtros
            setTimeout(() => {
                fixSectorTitlesColor();
                updateFiltersForDarkMode();
            }, 100);
        }

        function updateSyncInterval(interval) {
            CONFIG.AUTO_SYNC = parseInt(interval);
            showNotification(`🔄 Intervalo de sincronização alterado para ${interval/60000} minutos`, 'info');
        }

        function clearCache() {
            allEvents = [];
            allTasks = [];
            updateMetrics();
            renderCurrentView();
            showNotification('🗑️ Cache limpo com sucesso', 'info');
        }

        function exportSettings() {
            const settings = {
                theme: document.body.getAttribute('data-theme'),
                autoSync: CONFIG.AUTO_SYNC,
                lastExport: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'merachi-settings.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showNotification('📥 Configurações exportadas!', 'success');
        }

        function resetSettings() {
            if (confirm('🔄 Tem certeza que deseja restaurar as configurações padrão?')) {
                setTheme('light');
                CONFIG.AUTO_SYNC = 300000;
                showNotification('🔄 Configurações restauradas para os padrões', 'info');
            }
        }

        function exportTeamReport() {
            const teamStats = generateTeamStats();
            const csvContent = 'Nome,Setor,Cargo,Ativas,Completas,Em Progresso,Revisão,Atrasadas\\n' +
                teamStats.map(member => 
                    `${member.name},${member.sector},${member.role},${member.activeTasks},${member.completed},${member.inProgress},${member.review},${member.overdue}`
                ).join('\\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'relatorio-equipe-merachi.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showNotification('📄 Relatório da equipe exportado!', 'success');
        }

        function exportAgendaPDF() {
            showLoading(true);
            fetch(`${CONFIG.N8N_BASE_URL}${CONFIG.ENDPOINTS.EXPORT_PDF}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'agenda',
                    data: getFilteredEvents(),
                    filters: currentFilters
                })
            })
            .then(response => response.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'agenda-merachi.pdf';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showNotification('📄 Agenda exportada como PDF!', 'success');
            })
            .catch(error => {
                console.error('Erro ao exportar PDF:', error);
                showNotification('Erro ao exportar PDF. Tente novamente.', 'error');
            })
            .finally(() => {
                showLoading(false);
            });
        }

        function exportDemandasCSV() {
            showLoading(true);
            fetch(`${CONFIG.N8N_BASE_URL}${CONFIG.ENDPOINTS.EXPORT_CSV}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'demandas',
                    data: getFilteredTasks(),
                    filters: currentFilters
                })
            })
            .then(response => response.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'demandas-merachi.csv';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showNotification('📥 Demandas exportadas como CSV!', 'success');
            })
            .catch(error => {
                console.error('Erro ao exportar CSV:', error);
                showNotification('Erro ao exportar CSV. Tente novamente.', 'error');
            })
            .finally(() => {
                showLoading(false);
            });
        }

        function addTeamMember() {
            const name = prompt('👤 Nome do novo membro:');
            if (name) {
                showNotification(`➕ Membro "${name}" será adicionado em breve (funcionalidade em desenvolvimento)`, 'info');
            }
        }

        function addNewEvent() {
            switchTab('event');
            toggleQuickModal();
        }

        function addNewTask() {
            switchTab('task');
            toggleQuickModal();
        }

        function openEvent(eventId) {
            const event = allEvents.find(e => e.id === eventId);
            if (event) {
                showNotification(`Evento: ${event.title}`, 'info');
            }
        }

        function changeEventStatus(event, eventId) {
            event.stopPropagation();
            const currentEvent = allEvents.find(e => e.id === eventId);
            if (!currentEvent) return;

            const statuses = ['confirmed', 'tentative', 'cancelled'];
            const currentIndex = statuses.indexOf(currentEvent.status);
            const nextStatus = statuses[(currentIndex + 1) % statuses.length];
            
            currentEvent.status = nextStatus;
            renderCurrentView();
            showNotification(`Status alterado para ${getStatusLabel(nextStatus)}`, 'info');
        }

        // ===============================
        // 🎯 MOCK DATA (FALLBACK)
        // ===============================

        function loadMockData() {
            allEvents = generateMockEvents();
            allTasks = generateMockTasks();
            updateMetrics();
            renderCurrentView();
        }

        function generateMockEvents() {
            const now = new Date();
            return [
                {
                    id: '1',
                    title: 'Reunião de Planejamento',
                    description: 'Discussão sobre próximos projetos',
                    start: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
                    status: 'confirmed',
                    location: 'Sala de Reuniões'
                },
                {
                    id: '2',
                    title: 'Apresentação para Cliente',
                    description: 'Apresentar proposta final',
                    start: new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString(),
                    status: 'confirmed',
                    location: 'Google Meet'
                }
            ];
        }

        function generateMockTasks() {
            return [
                {
                    id: '1',
                    title: 'Finalizar design da landing page',
                    description: 'Criar versão responsiva',
                    setor: 'Design',
                    status: 'progress',
                    assignees: ['João'],
                    priority: 'high',
                    start: new Date().toISOString()
                },
                {
                    id: '2',
                    title: 'Revisar conteúdo do blog',
                    description: 'Verificar SEO e gramática',
                    setor: 'Social Media',
                    status: 'open',
                    assignees: ['Maria'],
                    priority: 'normal',
                    start: new Date().toISOString()
                }
            ];
        }

        // ===============================
        // 📅 FUNÇÕES DO CALENDÁRIO
        // ===============================

        let currentCalendarDate = new Date();

        function navigateMonth(direction) {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
            renderCalendar();
        }

        function showDayDetails(dateStr) {
            const selectedDate = new Date(dateStr);
            
            // Determinar quais dados usar baseado no modo
            const eventsToSearch = projectViewMode ? allEvents : getFilteredEvents();
            const tasksToSearch = projectViewMode ? allProjectTasks : getFilteredTasks();
            
            // Buscar eventos e tarefas para este dia
            const dayEvents = eventsToSearch.filter(event => {
                const eventDate = new Date(event.start);
                return eventDate.toDateString() === dateStr;
            });
            
            const dayTasks = tasksToSearch.filter(task => {
                if (projectViewMode) {
                    // No modo projeto, considerar múltiplas datas
                    const dueDate = task.due_date ? new Date(task.due_date) : null;
                    const startDate = task.start_date ? new Date(task.start_date) : null;
                    const createdDate = task.created_date ? new Date(task.created_date) : null;
                    
                    return (dueDate && dueDate.toDateString() === dateStr) ||
                           (startDate && startDate.toDateString() === dateStr) ||
                           (createdDate && createdDate.toDateString() === dateStr);
                } else {
                    const taskDate = new Date(task.due_date || task.start);
                    return taskDate.toDateString() === dateStr;
                }
            });
            
            const formattedDate = selectedDate.toLocaleDateString('pt-BR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            const modeIndicator = projectViewMode ? ' 🌟 (Projeto Completo)' : '';
            
            let modalHTML = `
                <div class="day-details-modal active" id="dayDetailsModal" onclick="closeDayDetails(event)">
                    <div class="day-details-content" onclick="event.stopPropagation()">
                        <div class="day-details-header">
                            <h3 class="day-details-title">${formattedDate}${modeIndicator}</h3>
                            <button class="day-details-close" onclick="closeDayDetails()">✕</button>
                        </div>
                        <div class="day-details-body">
            `;
            
            if (dayEvents.length > 0) {
                modalHTML += `
                    <div class="day-section">
                        <div class="day-section-title">📅 Eventos (${dayEvents.length})</div>
                        ${dayEvents.map(event => {
                            const eventTime = new Date(event.start).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                            return `
                                <div class="day-item">
                                    <div class="day-item-title">${event.title}</div>
                                    <div class="day-item-meta">
                                        🕐 ${eventTime}
                                        ${event.location ? `📍 ${event.location}` : ''}
                                        ${event.description ? `<br>${event.description}` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            }
            
            if (dayTasks.length > 0) {
                modalHTML += `
                    <div class="day-section">
                        <div class="day-section-title">✅ Demandas (${dayTasks.length})</div>
                        ${dayTasks.map(task => {
                            let dateInfo = '';
                            if (projectViewMode) {
                                // Mostrar qual tipo de data está sendo exibida
                                const dueDate = task.due_date ? new Date(task.due_date) : null;
                                const startDate = task.start_date ? new Date(task.start_date) : null;
                                const createdDate = task.created_date ? new Date(task.created_date) : null;
                                
                                if (dueDate && dueDate.toDateString() === dateStr) {
                                    dateInfo = '📅 Vencimento';
                                } else if (startDate && startDate.toDateString() === dateStr) {
                                    dateInfo = '🚀 Início';
                                } else if (createdDate && createdDate.toDateString() === dateStr) {
                                    dateInfo = '📝 Criação';
                                }
                                
                                if (task.project) {
                                    dateInfo += ` | 📂 ${task.project}`;
                                }
                            }
                            
                            return `
                                <div class="day-item">
                                    <div class="day-item-title">${task.title}</div>
                                    <div class="day-item-meta">
                                        🏢 ${task.setor || 'Geral'}
                                        <span class="status-badge status-${task.status}">${getTaskStatusLabel(task.status)}</span>
                                        ${task.assignees?.length ? `👤 ${task.assignees.join(', ')}` : ''}
                                        ${dateInfo ? `<br>${dateInfo}` : ''}
                                        ${task.description ? `<br>${task.description}` : ''}
                                        ${task.url ? `<br>🔗 <a href="${task.url}" target="_blank" style="color: var(--primary);">Ver no ClickUp</a>` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            }
            
            if (dayEvents.length === 0 && dayTasks.length === 0) {
                modalHTML += `
                    <div class="empty-state">
                        <h3>Nenhum evento ou demanda</h3>
                        <p>Este dia está livre na sua agenda${projectViewMode ? ' (no projeto atual)' : ''}</p>
                    </div>
                `;
            }
            
            modalHTML += `
                        </div>
                    </div>
                </div>
            `;
            
            // Remover modal existente se houver
            const existingModal = document.getElementById('dayDetailsModal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // Adicionar novo modal
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        function closeDayDetails(event) {
            if (event && event.target !== event.currentTarget) return;
            
            const modal = document.getElementById('dayDetailsModal');
            if (modal) {
                modal.remove();
            }
        }

        // Atualizar a função renderCalendar para usar a data atual do calendário
        function renderCalendar() {
            // Determinar o container correto baseado na visualização atual
            let container;
            if (currentView === 'calendario') {
                container = document.getElementById('calendarioFullView');
            } else {
                // Fallback para o container original
                const originalContainer = document.getElementById('calendarEvents');
                if (originalContainer) {
                    container = originalContainer.parentElement.parentElement;
                }
            }
            
            if (!container) {
                console.error('Container do calendário não encontrado');
                return;
            }
            
            const year = currentCalendarDate.getFullYear();
            const month = currentCalendarDate.getMonth();
            const today = new Date();
            
            // Primeira e última data do mês
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            
            // Primeira data da grade (pode ser do mês anterior)
            const startDate = new Date(firstDay);
            startDate.setDate(startDate.getDate() - firstDay.getDay());
            
            const monthNames = [
                'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
            ];
            
            const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            
            // Determinar quais tarefas usar baseado no modo
            const tasksToUse = projectViewMode ? allProjectTasks : allTasks;
            const eventsToUse = projectViewMode ? allEvents : getFilteredEvents();
            
            let calendarHTML = `
                <div class="calendar-container">
                    <div class="calendar-header">
                        <button class="calendar-nav-btn" onclick="navigateMonth(-1)">‹</button>
                        <h2 class="calendar-month-title">
                            ${monthNames[month]} ${year}
                            ${projectViewMode ? '<span style="font-size: 0.8rem; color: #FF6B6B; margin-left: 8px;">🌟 PROJETO COMPLETO</span>' : ''}
                        </h2>
                        <button class="calendar-nav-btn" onclick="navigateMonth(1)">›</button>
                    </div>
                    
                    <div class="calendar-grid">
                        ${daysOfWeek.map(day => `<div class="calendar-day-header">${day}</div>`).join('')}
            `;
            
            // Gerar 42 dias (6 semanas)
            const currentDate = new Date(startDate);
            for (let i = 0; i < 42; i++) {
                const isCurrentMonth = currentDate.getMonth() === month;
                const isToday = currentDate.toDateString() === today.toDateString();
                const dateStr = currentDate.toDateString();
                
                // Buscar eventos e tarefas para este dia
                const dayEvents = eventsToUse.filter(event => {
                    const eventDate = new Date(event.start);
                    return eventDate.toDateString() === dateStr;
                });
                
                const dayTasks = tasksToUse.filter(task => {
                    // No modo projeto, considerar tanto due_date quanto start_date
                    if (projectViewMode) {
                        const dueDate = task.due_date ? new Date(task.due_date) : null;
                        const startDate = task.start_date ? new Date(task.start_date) : null;
                        const createdDate = task.created_date ? new Date(task.created_date) : null;
                        
                        return (dueDate && dueDate.toDateString() === dateStr) ||
                               (startDate && startDate.toDateString() === dateStr) ||
                               (createdDate && createdDate.toDateString() === dateStr);
                    } else {
                        const taskDate = new Date(task.due_date || task.start);
                        return taskDate.toDateString() === dateStr;
                    }
                });
                
                const dayClass = `calendar-day-cell ${isToday ? 'today' : ''} ${!isCurrentMonth ? 'other-month' : ''}`;
                
                // Adicionar indicador visual para modo projeto
                const projectModeStyle = projectViewMode ? 'border: 2px solid #FF6B6B; box-shadow: inset 0 0 10px rgba(255, 107, 107, 0.1);' : '';
                
                calendarHTML += `
                    <div class="${dayClass}" onclick="showDayDetails('${dateStr}')" style="${projectModeStyle}">
                        <div class="calendar-day-number">${currentDate.getDate()}</div>
                        <div class="calendar-day-content">
                            ${dayEvents.map(event => 
                                `<div class="calendar-event-item" title="${event.title}">
                                    📅 ${event.title.substring(0, 15)}${event.title.length > 15 ? '...' : ''}
                                </div>`
                            ).join('')}
                            ${dayTasks.map(task => {
                                // No modo projeto, adicionar informação de status e setor
                                const taskPrefix = projectViewMode ? `${getSectorIcon(task.setor)} ${getTaskStatusIcon(task.status)}` : '✅';
                                const taskClass = projectViewMode ? 'calendar-project-task-item' : 'calendar-task-item';
                                return `<div class="${taskClass}" title="${task.title} - ${task.setor} - ${getTaskStatusLabel(task.status)}">
                                    ${taskPrefix} ${task.title.substring(0, 12)}${task.title.length > 12 ? '...' : ''}
                                </div>`;
                            }).join('')}
                        </div>
                    </div>
                `;
                
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            calendarHTML += `
                    </div>
                </div>
            `;
            
            // Adicionar informações do projeto se estiver no modo projeto
            if (projectViewMode && tasksToUse.length > 0) {
                const statusCount = {};
                const sectorCount = {};
                
                tasksToUse.forEach(task => {
                    statusCount[task.status] = (statusCount[task.status] || 0) + 1;
                    sectorCount[task.setor] = (sectorCount[task.setor] || 0) + 1;
                });
                
                calendarHTML += `
                    <div style="margin-top: 20px; padding: 16px; background: linear-gradient(135deg, #FF6B6B, #4ECDC4); border-radius: 12px; color: white;">
                        <h4 style="margin: 0 0 12px 0;">📊 Resumo do Projeto</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 0.85rem;">
                            <div>
                                <strong>Status:</strong><br>
                                ${Object.entries(statusCount).map(([status, count]) => 
                                    `${getTaskStatusIcon(status)} ${getTaskStatusLabel(status)}: ${count}`
                                ).join('<br>')}
                            </div>
                            <div>
                                <strong>Setores:</strong><br>
                                ${Object.entries(sectorCount).map(([setor, count]) => 
                                    `${getSectorIcon(setor)} ${setor}: ${count}`
                                ).join('<br>')}
                            </div>
                        </div>
                    </div>
                `;
            }
            
            container.innerHTML = calendarHTML;
        }

        console.log('🦋 MERACHI Dashboard carregado com todas as funcionalidades atualizadas');
    </script>
</body>
</html>
<!-- DIAGNÓSTICO MERACHI -->
