// 表单提交处理
const balanceForm = document.getElementById('balanceForm');
if (balanceForm) {
    balanceForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const resultDiv = document.getElementById('result');
        
        try {
            const response = await fetch('/update_balance', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            
            resultDiv.style.display = 'block';
            if (data.success) {
                resultDiv.className = 'result success fade-enter';
                const config = ConfigManager.loadConfig();
                let configInfo = '';
                if (config.type === 'nacos') {
                    configInfo = `<p>配置方式: Nacos配置 (${config.data.server})</p>`;
                } else {
                    configInfo = `<p>环境: ${data.data.environment}</p>`;
                }
                
                resultDiv.innerHTML = `
                    <h3>修改成功</h3>
                    ${configInfo}
                    <p>新余额: ${data.data.balance}</p>
                `;
                // 更新余额后主动更新网关地址
                updateGatewayUrl();
            } else {
                resultDiv.className = 'result error fade-enter';
                resultDiv.innerHTML = `<p>错误: ${data.message}</p>`;
            }
        } catch (error) {
            resultDiv.style.display = 'block';
            resultDiv.className = 'result error fade-enter';
            resultDiv.innerHTML = `<p>系统错误: ${error.message}</p>`;
        }
    });
}

// 添加密码校验功能
async function verifyPassword() {
    const phone = document.getElementById('phonePassword').value;
    const password = document.getElementById('password').value;
    if (!phone || !password) {
        ToastManager.show('请输入手机号和密码', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('phone', phone);
    formData.append('password', password);
    
    try {
        const response = await fetch('/verify_password', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        if (data.success) {
            ToastManager.show('密码验证通过', 'success');
        } else {
            ToastManager.show(data.message, 'error');
        }
    } catch (error) {
        ToastManager.show('系统错误: ' + error.message, 'error');
    }
}

// 添加修改密码功能
async function updatePassword() {
    const phone = document.getElementById('phonePassword').value;
    const password = document.getElementById('password').value;
    if (!phone || !password) {
        ToastManager.show('请输入手机号和新密码', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('phone', phone);
    formData.append('new_password', password);
    
    try {
        const response = await fetch('/update_password', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        if (data.success) {
            ToastManager.show('密码修改成功', 'success');
            // 清空密码输入框
            document.getElementById('password').value = '';
        } else {
            ToastManager.show(data.message, 'error');
        }
    } catch (error) {
        ToastManager.show('系统错误: ' + error.message, 'error');
    }
}



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
    // 保存配置到localStorage
    saveConfig: function(type, data) {
        // 确保server不会被保存为'未连接'
        if (data.server === '未连接') {
            data.server = '';
        }
        const config = {
            type: type,
            data: data,
            timestamp: new Date().getTime()
        };
        localStorage.setItem('dbConfig', JSON.stringify(config));
        this.updateUI(config);
        // 保存配置后更新网关地址
        updateGatewayUrl();
    },

    // 从localStorage加载配置
    loadConfig: function() {
        const saved = localStorage.getItem('dbConfig');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                // 修复旧配置中的'未连接'文本
                if (config.data && config.data.server === '未连接') {
                    config.data.server = '';
                    // 保存修复后的配置
                    this.saveConfig(config.type, config.data);
                }
                this.updateUI(config);
                // 加载配置后更新网关地址
                updateGatewayUrl();
                return config;
            } catch (e) {
                console.error('加载配置失败:', e);
            }
        }
        return null;
    },

    // 更新UI显示
    updateUI: function(config) {
        if (!config) return;

        const badge = document.getElementById('configBadge');
        const status = document.getElementById('configStatus');
        
        badge.className = 'config-badge ' + config.type;
        if (config.type === 'nacos') {
            status.textContent = 'Nacos: ' + (config.data.server || '');
            // 恢复Nacos表单数据
            if (config.data.server !== undefined) {
                document.getElementById('server_addresses').value = config.data.server === '未连接' ? '' : config.data.server;
                document.getElementById('namespace').value = config.data.namespace || '';
                document.getElementById('username').value = config.data.username || '';
            }
        } else {
            status.textContent = '环境: ' + config.data.envName;
        }
    }
};

// 页面加载时初始化配置状态
document.addEventListener('DOMContentLoaded', () => {
    // 加载保存的配置
    const config = ConfigManager.loadConfig();
    if (!config) {
        // 如果没有保存的配置，设置默认状态
        ConfigManager.saveConfig('nacos', { server: '' });
    }
    
    ToastManager.init();
});

// 点击模态框外部关闭
window.onclick = function(event) {
    const modal = document.getElementById('configModal');
    if (event.target === modal) {
        closeConfigModal();
    }
};

// 修改域名管理器
const DomainManager = {
    CACHE_KEY: 'gatewayDomain',
    
    saveToCache: function(domain) {
        if (!domain) return;
        localStorage.setItem(this.CACHE_KEY, JSON.stringify({
            domain: domain,
            timestamp: new Date().getTime()
        }));
    },
    
    getFromCache: function() {
        const saved = localStorage.getItem(this.CACHE_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                // 检查缓存是否在24小时内
                if (new Date().getTime() - data.timestamp < 24 * 60 * 60 * 1000) {
                    return data.domain;
                }
            } catch (e) {
                console.error('读取域名缓存失败:', e);
            }
        }
        return null;
    },
    
    updateDomainDisplay: function(domain, isLoading = false) {
        const domainElement = document.getElementById('currentDomain');
        const tooltip = domainElement.querySelector('.tooltip');
        
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

// 修改获取网关地址的函数
function updateGatewayUrl() {
    // 检查是否有缓存的域名
    const cachedDomain = DomainManager.getFromCache();
    if (cachedDomain) {
        DomainManager.updateDomainDisplay(cachedDomain);
    }
    
    // 无论是否有缓存，都尝试获取最新数据
    DomainManager.updateDomainDisplay(null, true);  // 显示加载状态
    
    fetch('/get_gateway_url')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.gateway_url) {
                DomainManager.updateDomainDisplay(data.gateway_url);
                // 更新缓存
                DomainManager.saveToCache(data.gateway_url);
            } else {
                // 如果获取失败但有缓存，保持显示缓存的域名
                const fallbackDomain = DomainManager.getFromCache();
                if (fallbackDomain) {
                    DomainManager.updateDomainDisplay(fallbackDomain);
                } else {
                    DomainManager.updateDomainDisplay(null);
                }
            }
        })
        .catch(error => {
            console.error('获取网关地址失败:', error);
            // 发生错误时，尝试使用缓存的域名
            const fallbackDomain = DomainManager.getFromCache();
            if (fallbackDomain) {
                DomainManager.updateDomainDisplay(fallbackDomain);
            } else {
                DomainManager.updateDomainDisplay(null);
            }
        });
}
// Bootstrap组件生命周期管理器 - 彻底解决classList空引用问题
const BootstrapComponentManager = {
    instances: new Map(),
    selectors: {
        dropdown: '[data-bs-toggle="dropdown"]'
    },

    // 初始化所有组件
    initAll: function() {
        this.initDropdowns();
        this.setupMutationObserver();
        this.setupGlobalErrorHandler();
    },

    // 初始化下拉组件
    initDropdowns: function() {
        const elements = [].slice.call(document.querySelectorAll(this.selectors.dropdown));
        elements.forEach(el => this.initDropdown(el));
    },

    // 初始化单个下拉组件
    initDropdown: function(el) {
        // 双重安全检查
        if (!el || !el.isConnected || this.instances.has(el)) return;

        try {
            // 先销毁可能存在的旧实例
            if (el._dropdownInstance) {
                el._dropdownInstance.dispose();
            }

            const instance = new bootstrap.Dropdown(el);
            this.instances.set(el, instance);
            el._dropdownInstance = instance;

            // 添加元素移除前的清理钩子
            const observer = new MutationObserver(mutations => {
                if (!el.isConnected) {
                    this.destroyInstance(el);
                    observer.disconnect();
                }
            });
            observer.observe(el.parentNode, { childList: true });

        } catch (error) {
            console.error('初始化下拉组件失败:', error, el);
        }
    },

    // 销毁组件实例
    destroyInstance: function(el) {
        if (this.instances.has(el)) {
            const instance = this.instances.get(el);
            if (instance && typeof instance.dispose === 'function') {
                instance.dispose();
            }
            this.instances.delete(el);
            delete el._dropdownInstance;
        }
    },

    // 设置DOM变化监控
    setupMutationObserver: function() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                // 处理新增节点
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            // 检查新增节点是否是下拉组件
                            if (node.matches(this.selectors.dropdown)) {
                                this.initDropdown(node);
                            }
                            // 检查新增节点的子节点
                            node.querySelectorAll(this.selectors.dropdown).forEach(el => {
                                this.initDropdown(el);
                            });
                        }
                    });
                }

                // 处理移除节点
                if (mutation.removedNodes.length) {
                    mutation.removedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            // 检查移除节点是否是下拉组件
                            if (node.matches(this.selectors.dropdown)) {
                                this.destroyInstance(node);
                            }
                            // 检查移除节点的子节点
                            node.querySelectorAll(this.selectors.dropdown).forEach(el => {
                                this.destroyInstance(el);
                            });
                        }
                    });
                }
            });
        });

        // 监控整个文档的变化
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false
        });
    },

    // 设置全局错误处理
    setupGlobalErrorHandler: function() {
        window.addEventListener('error', event => {
            if (event.message.includes('Cannot read properties of null (reading \'classList\')') &&
                event.filename.includes('bootstrap.bundle.min.js')) {
                event.preventDefault();
                console.warn('已拦截Bootstrap下拉组件空引用错误，这通常表示DOM元素已被移除');
                // 尝试清理所有无效实例
                this.cleanupInvalidInstances();
            }
        });
    },

    // 清理所有无效实例
    cleanupInvalidInstances: function() {
        const invalidElements = [];
        this.instances.forEach((instance, el) => {
            if (!el || !el.isConnected) {
                invalidElements.push(el);
            }
        });

        invalidElements.forEach(el => this.destroyInstance(el));
        console.log(`已清理${invalidElements.length}个无效的下拉组件实例`);
    }
};

// 页面加载时初始化组件管理器
document.addEventListener('DOMContentLoaded', function() {
    // 初始化Nacos配置下拉组件
    loadNacosConfigs();

    // 为输入框添加事件监听
    const serverInput = document.getElementById('server_addresses');
    if (serverInput) {
        serverInput.addEventListener('focus', loadNacosConfigs);
    }

    // 辅助函数：获取环境标签颜色
    function getEnvBadgeColor(env) {
        const colors = {
            'production': 'success',
            'development': 'primary',
            'test': 'warning',
            'default': 'secondary'
        };
        return colors[env] || 'secondary';
    }

    // 辅助函数：格式化日期
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    updateGatewayUrl();
    BootstrapComponentManager.initAll();

    // 为动态内容添加手动初始化接口
    window.initBootstrapDropdowns = () => BootstrapComponentManager.initDropdowns();
});

// 保存Nacos配置到服务器
async function saveNacosConfig() {
    const server = document.getElementById('server_addresses').value;
    const namespace = document.getElementById('namespace').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!server) {
        ToastManager.show('服务器地址不能为空', 'error');
        return;
    }

    try {
        // 添加错误处理和请求超时
        const response = await Promise.race([
            fetch('/save_nacos_config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    server: server,
                    namespace: namespace,
                    username: username,
                    password: password
                })
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('请求超时')), 10000))
        ]);
        const data = await response.json();

        if (data.success) {
            ToastManager.show('配置保存成功');
            // 配置保存成功，无需重新加载配置列表
        } else {
            ToastManager.show(data.message, 'error');
        }
    } catch (error) {
        ToastManager.show('保存配置失败: ' + error.message, 'error');
    }
}

// 加载Nacos配置数据并填充下拉框
async function loadNacosConfigs() {
    const dropdownMenu = document.getElementById('serverAddressesDropdown');
    const loadingItem = document.getElementById('dropdownLoading');
    const inputElement = document.getElementById('server_addresses');

    // 检查DOM元素是否存在
    if (!dropdownMenu || !loadingItem || !inputElement) {
        console.error('Nacos配置所需DOM元素不存在');
        return;
    }

    // 显示加载状态
    loadingItem.style.display = 'block';
    // 清除现有选项（保留标题和分隔线）
    const existingItems = dropdownMenu.querySelectorAll('li:not(.dropdown-header):not(:has(hr))');
    existingItems.forEach(item => { if (item !== loadingItem) item.remove(); });

    try {
        const response = await fetch('/get_nacos_configs');
        const data = await response.json();

        // 兼容不同数据格式返回
        const configs = Array.isArray(data) ? data : (data && data.configs ? data.configs : []);

        // 隐藏加载状态
        loadingItem.style.display = 'none';

        if (!configs || configs.length === 0) {
            // 无数据状态
            const noDataItem = document.createElement('li');
            noDataItem.className = 'dropdown-item text-muted text-center';
            noDataItem.innerHTML = '<i class="bi bi-info-circle me-2"></i>暂无配置数据';
            dropdownMenu.appendChild(noDataItem);
            return;
        }

        // 按更新时间排序（最新的在前）
        configs.sort((a, b) => new Date(b.last_modified_time || 0) - new Date(a.last_modified_time || 0));

        // 填充下拉选项
        configs.forEach(config => {
            const address = config.server || config.server_addresses || '';
            if (!address) return; // 跳过无效地址

            const item = document.createElement('li');
            item.className = 'dropdown-item d-flex justify-content-between align-items-center';
            item.innerHTML = `
                <div>
                    <strong>${config.data_id || config.name || '未命名配置'}</strong>
                    <div class="text-sm text-muted">${address}</div>
                </div>
                <span class="badge ${getEnvBadgeColor(config.env)}">${config.env || '默认'}</span>
            `;

            // 点击选项填充输入框
            item.addEventListener('click', function() {
                inputElement.value = address;
                // 隐藏下拉菜单
                const bsDropdown = bootstrap.Dropdown.getInstance(inputElement);
                if (bsDropdown) bsDropdown.hide();
            });

            dropdownMenu.appendChild(item);
        });
    } catch (error) {
        console.error('加载配置失败:', error);
        loadingItem.innerHTML = '<i class="bi bi-exclamation-circle me-2"></i>加载失败，请重试';
        loadingItem.classList.remove('text-muted');
        loadingItem.classList.add('text-danger');
    }
}

// 根据输入过滤下拉选项
function filterDropdownOptions() {
    const inputValue = document.getElementById('server_addresses').value.toLowerCase();
    const dropdownItems = document.querySelectorAll('#serverAddressesDropdown li.dropdown-item:not(.dropdown-header):not(:has(hr))');

    dropdownItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(inputValue) ? 'flex' : 'none';
    });
}

// 获取环境标签颜色
function getEnvBadgeColor(env) {
    const colors = {
        'production': 'success',
        'development': 'primary',
        'test': 'warning',
        'default': 'secondary'
    };
    return colors[env] || 'secondary';
}

// 在设置Nacos配置后更新网关地址
function setNacosConfig(event) {
    event.preventDefault();
    const formData = new FormData(document.getElementById('nacosForm'));
    
    fetch('/set_nacos_config', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateGatewayUrl();  // 更新网关地址
            document.getElementById('configBadge').className = 'config-badge nacos';
            document.getElementById('configStatus').textContent = 'Nacos配置';
            closeConfigModal();
        }
        showResult(data.message, data.success);
    })
    .catch(error => {
        console.error('Error:', error);
        showResult('设置失败: ' + error, false);
    });
}

// 添加高级选项切换功能
function toggleAdvancedOptions() {
    const advancedOptions = document.getElementById('advancedOptions');
    const isHidden = advancedOptions.style.display === 'none';
    
    if (isHidden) {
        advancedOptions.style.display = 'block';
        // 使用 requestAnimationFrame 确保过渡动画顺滑
        requestAnimationFrame(() => {
            advancedOptions.style.opacity = '1';
            advancedOptions.style.transform = 'translateY(0)';
        });
    } else {
        advancedOptions.style.opacity = '0';
        advancedOptions.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            advancedOptions.style.display = 'none';
        }, 300);
    }
}



// 切换标签页
function switchTab(tabId) {
    // 隐藏所有标签内容
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 显示选中标签内容
    document.getElementById(tabId + 'Tab').classList.add('active');
    
    // 更新标签按钮状态
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelector(`.nav-tab[onclick="switchTab('${tabId}')"]`).classList.add('active');
}

// 打开配置模态框
function openConfigModal() {
    document.getElementById('configModal').style.display = 'block';
}

// 关闭配置模态框
function closeConfigModal() {
    document.getElementById('configModal').style.display = 'none';
}

// 查询余额
async function queryBalance() {
    const phone = document.getElementById('phone').value;
    if (!phone || phone.length !== 11) {
        ToastManager.show('请输入有效的手机号', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/query_balance?phone=${encodeURIComponent(phone)}`);
        const data = await response.json();
        
        const resultDiv = document.getElementById('result');
        resultDiv.style.display = 'block';
        
        if (data.success) {
            resultDiv.className = 'result success fade-enter';
            resultDiv.innerHTML = `
                <h3>查询结果</h3>
                <p>手机号: ${phone}</p>
                <p>当前余额: ${data.balance}</p>
            `;
        } else {
            resultDiv.className = 'result error fade-enter';
            resultDiv.innerHTML = `<p>错误: ${data.message}</p>`;
        }
    } catch (error) {
        ToastManager.show('查询失败: ' + error.message, 'error');
    }
}

// 显示结果提示
function showResult(message, success) {
    const resultDiv = document.getElementById('result');
    resultDiv.style.display = 'block';
    resultDiv.className = 'result ' + (success ? 'success' : 'error') + ' fade-enter';
    resultDiv.innerHTML = `<p>${message}</p>`;
    
    // 3秒后自动隐藏
    setTimeout(() => {
        resultDiv.style.display = 'none';
    }, 3000);
}