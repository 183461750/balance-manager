// Toast消息管理器
const ToastManager = {
    init: function() {},
    show: function(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type} fade-in`;
        toast.innerHTML = `
            <div class="toast-icon"><i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i></div>
            <div class="toast-message">${message}</div>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// 配置状态管理
const ConfigManager = {
    saveConfig: function(type, data) {
        if (data.server === '未连接') data.server = '';
        const config = { type, data, timestamp: new Date().getTime() };
        localStorage.setItem('dbConfig', JSON.stringify(config));
        this.updateUI(config);
        updateGatewayUrl();
    },
    loadConfig: function() {
        const saved = localStorage.getItem('dbConfig');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                if (config.data?.server === '未连接') {
                    config.data.server = '';
                    this.saveConfig(config.type, config.data);
                }
                this.updateUI(config);
                return config;
            } catch (e) { console.error('加载配置失败:', e); }
        }
        return null;
    },
    updateUI: function(config) {
        if (!config) return;
        const badge = document.getElementById('configBadge');
        const status = document.getElementById('configStatus');
        badge.className = `config-badge ${config.type}`;
        if (config.type === 'nacos') {
            status.textContent = `Nacos: ${config.data.server || ''}`;
            if (config.data.server !== undefined) {
                document.getElementById('server_addresses').value = config.data.server === '未连接' ? '' : config.data.server;
                document.getElementById('namespace').value = config.data.namespace || '';
                document.getElementById('username').value = config.data.username || '';
            }
        } else status.textContent = `环境: ${config.data.envName}`;
    }
};

// 域名管理器
const DomainManager = {
    CACHE_KEY: 'gatewayDomain',
    saveToCache: function(domain) {
        if (domain) localStorage.setItem(this.CACHE_KEY, JSON.stringify({ domain, timestamp: new Date().getTime() }));
    },
    getFromCache: function() {
        const saved = localStorage.getItem(this.CACHE_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (new Date().getTime() - data.timestamp < 24 * 60 * 60 * 1000) return data.domain;
            } catch (e) { console.error('读取域名缓存失败:', e); }
        }
        return null;
    },
    updateDomainDisplay: function(domain, isLoading = false) {
        const domainElement = document.getElementById('currentDomain');
        const tooltip = domainElement?.querySelector('.tooltip');
        if (isLoading && !domain) {
            domainElement.className = 'loading';
            domainElement.textContent = '加载中...';
            return;
        }
        domainElement.className = '';
        if (domain) {
            domainElement.textContent = domain;
            domainElement.title = domain;
            if (tooltip) tooltip.textContent = domain;
        } else {
            const cachedDomain = this.getFromCache();
            if (cachedDomain) {
                domainElement.textContent = cachedDomain;
                domainElement.title = cachedDomain;
                if (tooltip) tooltip.textContent = cachedDomain;
            } else {
                domainElement.textContent = '';
                domainElement.title = '';
                if (tooltip) tooltip.textContent = '';
            }
        }
    }
};

// Bootstrap组件生命周期管理器
const BootstrapComponentManager = {
    instances: new Map(),
    selectors: { dropdown: '[data-bs-toggle="dropdown"]' },
    initAll: function() {
        this.initDropdowns();
        this.setupMutationObserver();
        this.setupGlobalErrorHandler();
    },
    initDropdowns: function() {
        [].slice.call(document.querySelectorAll(this.selectors.dropdown)).forEach(el => this.initDropdown(el));
    },
    initDropdown: function(el) {
        if (!el || !el.isConnected || this.instances.has(el)) return;
        try {
            if (el._dropdownInstance) el._dropdownInstance.dispose();
            const instance = new bootstrap.Dropdown(el);
            this.instances.set(el, instance);
            el._dropdownInstance = instance;
            const observer = new MutationObserver(mutations => {
                if (!el.isConnected) {
                    this.destroyInstance(el);
                    observer.disconnect();
                }
            });
            observer.observe(el.parentNode, { childList: true });
        } catch (error) { console.error('初始化下拉组件失败:', error, el); }
    },
    destroyInstance: function(el) {
        if (this.instances.has(el)) {
            const instance = this.instances.get(el);
            if (instance?.dispose) instance.dispose();
            this.instances.delete(el);
            delete el._dropdownInstance;
        }
    },
    setupMutationObserver: function() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length) mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        if (node.matches(this.selectors.dropdown)) this.initDropdown(node);
                        node.querySelectorAll(this.selectors.dropdown).forEach(el => this.initDropdown(el));
                    }
                });
                if (mutation.removedNodes.length) mutation.removedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        if (node.matches(this.selectors.dropdown)) this.destroyInstance(node);
                        node.querySelectorAll(this.selectors.dropdown).forEach(el => this.destroyInstance(el));
                    }
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    },
    setupGlobalErrorHandler: function() {
        window.addEventListener('error', event => {
            if (event.message.includes('Cannot read properties of null (reading \'classList\')') &&
                event.filename.includes('bootstrap.bundle.min.js')) {
                event.preventDefault();
                console.warn('已拦截Bootstrap下拉组件空引用错误');
                this.cleanupInvalidInstances();
            }
        });
    },
    cleanupInvalidInstances: function() {
        const invalidElements = [];
        this.instances.forEach((_, el) => !el?.isConnected && invalidElements.push(el));
        invalidElements.forEach(el => this.destroyInstance(el));
        console.log(`已清理${invalidElements.length}个无效下拉组件实例`);
    }
};

// 辅助函数
function getEnvBadgeColor(env) {
    const colors = { production: 'success', development: 'primary', test: 'warning', default: 'secondary' };
    return colors[env] || 'secondary';
}
function formatDate(dateString) {
    return new Date(dateString).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function updateGatewayUrl() {
    try {
        // 从ConfigManager获取Nacos配置
        const config = ConfigManager.loadConfig();
        if (!config || config.type !== 'nacos' || !config.data) {
            DomainManager.updateDomainDisplay(null);
            return;
        }
        
        const serverAddress = config.data.server_addresses;
        const namespace = config.data.namespace;
        
        if (!serverAddress || !namespace) {
            DomainManager.updateDomainDisplay(null);
            return;
        }
        
        // 构建带参数的请求URL
        const url = `/get_gateway_url?server_address=${encodeURIComponent(serverAddress)}&namespace=${encodeURIComponent(namespace)}`;
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.gateway_url) {
                    DomainManager.updateDomainDisplay(data.gateway_url);
                    DomainManager.saveToCache(data.gateway_url);
                } else {
                    const fallback = DomainManager.getFromCache();
                    DomainManager.updateDomainDisplay(fallback || null);
                }
            })
            .catch(error => {
                console.error('获取网关地址失败:', error);
                const fallback = DomainManager.getFromCache();
                DomainManager.updateDomainDisplay(fallback || null);
            });
    } catch (error) {
        console.error('更新网关地址失败:', error);
        const fallback = DomainManager.getFromCache();
        DomainManager.updateDomainDisplay(fallback || null);
    }
}