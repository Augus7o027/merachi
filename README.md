# 🦋 MERACHI - Confia no Processo

Sistema de gestão integrado e moderno com Google Calendar, ClickUp e Google Drive. Uma Progressive Web App (PWA) completa e funcional.

![Version](https://img.shields.io/badge/version-1.0.0-purple)
![License](https://img.shields.io/badge/license-MIT-green)
![PWA](https://img.shields.io/badge/PWA-enabled-blue)

## ✨ Funcionalidades

### 📊 Dashboard Principal
- Visão geral de métricas e KPIs
- Gráficos e estatísticas em tempo real
- Filtros inteligentes e busca avançada

### 🗓️ Calendário Integrado
- Sincronização com Google Calendar
- Visualização de eventos e tarefas
- Modo de visualização mensal/semanal/diário

### 📅 Gestão de Sprint
- Visualização de tarefas do ClickUp
- Organização por setores e prioridades
- Modo projeto completo

### 📁 Gerenciamento de Arquivos
- Integração com Google Drive
- Visualização e busca de arquivos
- Organização por pastas

### ✍️ Gerador de Copy com IA
- Geração automática de textos
- Múltiplos estilos e formatos
- Exportação facilitada

### 📈 Analytics e Performance
- Métricas de desempenho
- Análise de produtividade
- Relatórios personalizados

## 🚀 Tecnologias

- **Frontend**: HTML5, CSS3 (Custom Properties), JavaScript (ES6+)
- **Build Tool**: Vite
- **PWA**: Service Workers, Web App Manifest
- **APIs**: N8N, Google Calendar API, ClickUp API, Google Drive API
- **Offline**: Cache API, IndexedDB

## 📦 Instalação

### Pré-requisitos

- Node.js >= 18.0.0
- npm >= 9.0.0

### Passo a Passo

1. **Clone o repositório**
   ```bash
   git clone https://github.com/Augus7o027/merachi.git
   cd merachi
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente**
   ```bash
   cp .env.example .env
   # Edite o arquivo .env com suas configurações
   ```

4. **Execute em modo de desenvolvimento**
   ```bash
   npm run dev
   ```

5. **Build para produção**
   ```bash
   npm run build
   ```

6. **Visualize a build de produção**
   ```bash
   npm run preview
   ```

## 📁 Estrutura do Projeto

```
merachi/
├── public/                 # Arquivos públicos
│   ├── index.html         # HTML principal (limpo e modular)
│   ├── manifest.json      # PWA Manifest
│   └── sw.js             # Service Worker
├── src/                   # Código fonte
│   ├── css/              # Estilos
│   │   └── styles.css    # Estilos principais
│   ├── js/               # JavaScript modular
│   │   ├── app.js        # Aplicação principal
│   │   └── config.js     # Configurações
│   └── assets/           # Assets (imagens, ícones)
│       └── icons/        # Ícones PWA
├── dist/                  # Build de produção
├── config/                # Arquivos de configuração
├── .env.example          # Exemplo de variáveis de ambiente
├── .gitignore            # Git ignore
├── package.json          # Dependências e scripts
├── vite.config.js        # Configuração do Vite
└── README.md             # Este arquivo
```

## ⚙️ Configuração

### Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

```env
# N8N API Configuration
VITE_N8N_BASE_URL=https://seu-n8n-server.com

# Endpoints (customize conforme necessário)
VITE_ENDPOINT_EVENTS=/webhook/dashboard-events
VITE_ENDPOINT_TASKS=/webhook/clickup-tasks
# ... outros endpoints

# Auto Sync Interval (milliseconds)
VITE_AUTO_SYNC_INTERVAL=300000

# Application Settings
VITE_APP_NAME=MERACHI
VITE_APP_VERSION=1.0.0
VITE_APP_ENVIRONMENT=production
```

### Feature Flags

Habilite ou desabilite funcionalidades:

```env
VITE_FEATURE_OFFLINE_MODE=true
VITE_FEATURE_PUSH_NOTIFICATIONS=true
VITE_FEATURE_BACKGROUND_SYNC=true
```

## 🎨 Temas

A aplicação suporta tema claro e escuro:

- **Tema Claro** (padrão)
- **Tema Escuro** (ativável pelo usuário)

As cores são totalmente customizáveis via CSS Custom Properties em `src/css/styles.css`.

## 📱 PWA Features

### Instalação
A aplicação pode ser instalada em qualquer dispositivo:
- Desktop (Windows, Mac, Linux)
- Mobile (Android, iOS)
- Tablet

### Offline First
- Funciona offline após primeira visita
- Cache inteligente de recursos
- Sincronização automática quando online

### Notificações Push
- Atualizações em tempo real
- Alertas de tarefas e eventos
- Notificações personalizáveis

## 🔄 Scripts Disponíveis

```bash
npm run dev         # Servidor de desenvolvimento
npm run build       # Build de produção
npm run preview     # Preview da build
npm run serve       # Serve arquivos estáticos
npm run lint        # Lint do código
npm run format      # Formatar código
```

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 👥 Autores

- **MERACHI Team** - *Desenvolvimento inicial*

## 🙏 Agradecimentos

- Google Calendar API
- ClickUp API
- Google Drive API
- N8N
- Comunidade Open Source

## 📞 Suporte

Para suporte, abra uma issue no [GitHub](https://github.com/Augus7o027/merachi/issues).

---

**MERACHI** - Confia no Processo 🦋