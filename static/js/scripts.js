// 获取Nacos配置参数
function getNacosParams() {
    const config = ConfigManager.loadConfig();
    if (config.type === 'nacos' && config.data) {
        const params = new URLSearchParams();
        if (config.data.server_addresses) {
            params.append('server_address', config.data.server_addresses);
        }
        if (config.data.namespace) {
            params.append('namespace', config.data.namespace);
        }
        if (config.data.username) {
            params.append('username', config.data.username);
        }
        if (config.data.password) {
            params.append('password', config.data.password);
        }
        return params.toString();
    }
    return '';
}

// 表单提交处理
const balanceForm = document.getElementById('balanceForm');
if (balanceForm) {
    balanceForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const resultDiv = document.getElementById('result');
        
        try {
            const nacosParams = getNacosParams();
            const url = '/update_balance' + (nacosParams ? '?' + nacosParams : '');
            
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            
            resultDiv.style.display = 'block';
            if (data.success) {
                resultDiv.className = 'result success fade-enter';
                resultDiv.innerHTML = `
                    <h3>修改成功</h3>
                    <p>新余额: ${data.data.balance}</p>
                    <p>服务器: ${data.data.server_info}</p>
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
        const nacosParams = getNacosParams();
        const url = '/verify_password' + (nacosParams ? '?' + nacosParams : '');
        
        const response = await fetch(url, {
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
        const nacosParams = getNacosParams();
        const url = '/update_password' + (nacosParams ? '?' + nacosParams : '');
        
        const response = await fetch(url, {
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



// 页面加载时初始化配置状态
document.addEventListener('DOMContentLoaded', () => {
    // 加载保存的配置
    const config = ConfigManager.loadConfig();
    if (!config) {
        // 如果没有保存的配置，设置默认状态
        ConfigManager.saveConfig('nacos', { server_addresses: '' });
    }
    
    ToastManager.init();
    BootstrapComponentManager.initAll();
    
    // 初始化Nacos配置下拉组件
    loadNacosConfigs();

    // 为输入框添加事件监听
    const serverInput = document.getElementById('server_addresses');
    if (serverInput) {
        serverInput.addEventListener('focus', loadNacosConfigs);
    }

    // 添加Nacos表单提交处理 - 检查并保存配置
    const nacosForm = document.getElementById('nacosForm');
    if (nacosForm) {
        nacosForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const serverInput = document.getElementById('server_addresses') || document.querySelector('input[name="server_addresses"]');
            const namespaceInput = document.getElementById('namespace') || document.querySelector('input[name="namespace"]');
            const usernameInput = document.getElementById('username') || document.querySelector('input[name="username"]');
            const passwordInput = document.getElementById('password') || document.querySelector('input[name="password"]');

            if (!serverInput || !namespaceInput || !usernameInput || !passwordInput) {
                ToastManager.show('配置表单元素不完整', 'error');
                return;
            }

            const config = {
                server_addresses: serverInput.value.trim(),
                namespace: namespaceInput.value.trim(),
                username: usernameInput.value.trim(),
                password: passwordInput.value.trim()
            };

            if (!config.server_addresses) {
                ToastManager.show('服务器地址不能为空', 'error');
                return;
            }

            try {
                // 检查当前输入的IP是否在下拉列表中
                const existingConfigs = await fetch('/get_nacos_configs').then(r => r.json());
                const isExisting = Array.isArray(existingConfigs) && 
                                 existingConfigs.some(c => c.server_addresses === config.server_addresses);

                // 如果IP不在列表中，则调用保存接口
                if (!isExisting) {
                    const saveResponse = await fetch('/save_nacos_config', {
                        method: 'POST',
                        body: JSON.stringify(config),
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        credentials: 'same-origin'
                    });
                    
                    const saveData = await saveResponse.json();
                    if (!saveData.success) {
                        ToastManager.show(saveData.message || '保存配置失败', 'error');
                        return;
                    }
                }

                // 保存到本地存储
                ConfigManager.saveConfig('nacos', config);
                localStorage.setItem('nacosServerAddress', config.server_addresses);
                localStorage.setItem('nacosNamespace', config.namespace);
                
                // 更新UI显示实际IP
                document.getElementById('configBadge').className = 'config-badge nacos';
                document.getElementById('configStatus').textContent = config.server_addresses;
                
                // 更新网关地址和域名显示
                updateGatewayUrl();
                closeConfigModal();
                ToastManager.show(isExisting ? '配置连接成功' : '配置保存并连接成功', 'success');
                
                // 重新加载下拉列表
                loadNacosConfigs();
                
            } catch (error) {
                ToastManager.show('配置处理失败: ' + error.message, 'error');
            }
        });
    }
    
    // 页面加载完成后更新网关地址
    setTimeout(() => {
        updateGatewayUrl();
    }, 100);
});

// 点击模态框外部关闭
window.onclick = function(event) {
    const modal = document.getElementById('configModal');
    if (event.target === modal) {
        closeConfigModal();
    }
};

// 保存Nacos配置到服务器
async function saveNacosConfig() {
    console.log('saveNacosConfig函数被调用，开始处理Nacos配置保存');
    // 获取输入框元素并验证 - 双重检查ID和name属性
    const serverInput = document.getElementById('server_addresses') || document.querySelector('input[name="server_addresses"]');
    const namespaceInput = document.getElementById('namespace') || document.querySelector('input[name="namespace"]');
    const usernameInput = document.getElementById('username') || document.querySelector('input[name="username"]');
    const passwordInput = document.getElementById('password') || document.querySelector('input[name="password"]');

    // 详细元素检查日志
    console.log('=== 元素选择诊断 ===');
    console.log('服务器地址元素:', serverInput);
    console.log('命名空间元素:', namespaceInput);
    console.log('用户名元素:', usernameInput);
    console.log('密码元素:', passwordInput);

    if (!serverInput || !namespaceInput || !usernameInput || !passwordInput) {
        console.error('配置表单元素缺失:', { serverInput, namespaceInput, usernameInput, passwordInput });
        ToastManager.show('配置表单元素不完整', 'error');
        return;
    }

    // 获取最新输入值 - 最终验证
    const server_addresses = serverInput.value.trim();
    const namespace = namespaceInput.value.trim();
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    // 输入值完整性检查
    console.log('=== 输入值验证 ===');
    console.log('服务器地址原始值:', serverInput.value);
    console.log('服务器地址处理后:', server_addresses);
    console.log('所有输入值:', { server_addresses, namespace, username, password: '******' });

    if (!server_addresses) {
        console.error('服务器地址为空:', server_addresses);
        ToastManager.show('服务器地址不能为空', 'error');
        return;
    }

    // 最终验证和调试日志
    console.log('=== 开始保存Nacos配置 ===');
    console.log('服务器地址输入值:', server_addresses);
    console.log('命名空间输入值:', namespace);
    console.log('用户名输入值:', username);

    if (!server_addresses) {
        ToastManager.show('服务器地址不能为空', 'error');
        return;
    }

    try {
        // 添加错误处理和请求超时
        const response = await Promise.race([
            fetch('/save_nacos_config', {
                method: 'POST',
                body: JSON.stringify({
                server_addresses: server_addresses,
                namespace: namespace,
                username: username,
                password: password
            }),
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin'
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('请求超时')), 10000))
        ]);
        // 先检查HTTP响应状态
        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
        }
        // 再解析响应数据
        const data = await response.json();
        console.log('服务器响应:', data);

        if (data.success) {
            ToastManager.show('配置保存成功');
            // 更新网关地址
            updateGatewayUrl();
            // 保存成功后更新本地配置缓存
        ConfigManager.saveConfig('nacos', {
            server_addresses: server_addresses,
            namespace: namespace,
            username: username
        });
        // 保存到localStorage供后续请求使用
        localStorage.setItem('nacosServerAddress', server_addresses);
        localStorage.setItem('nacosNamespace', namespace);
            // 关闭模态框
            closeConfigModal();
            // 更新Nacos IP回显
            document.getElementById('currentDomain').textContent = server_addresses;
            // 更新按钮显示的IP地址
            document.getElementById('configStatus').textContent = server_addresses;
            // 获取并更新域名
            updateGatewayUrl();
        } else {
            ToastManager.show(data.message || '保存失败', 'error');
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
            const address = config.server_addresses || '';
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

// 获取并更新网关地址
async function updateGatewayUrl() {
    try {
        // 从ConfigManager获取Nacos配置
        const config = ConfigManager.loadConfig();
        if (!config || config.type !== 'nacos' || !config.data) {
            document.getElementById('currentDomain').textContent = '未配置Nacos';
            return;
        }
        
        const serverAddress = config.data.server_addresses;
        const namespace = config.data.namespace;
        
        if (!serverAddress || !namespace) {
            document.getElementById('currentDomain').textContent = 'Nacos配置不完整';
            return;
        }
        
        // 构建带参数的请求URL
        const url = `/get_gateway_url?server_address=${encodeURIComponent(serverAddress)}&namespace=${encodeURIComponent(namespace)}`;
        
        const response = await fetch(url);
        const data = await response.json();
        const domainElement = document.getElementById('currentDomain');
        
        if (data.success && data.gateway_url) {
            // 显示域名和IP地址
            domainElement.textContent = data.gateway_url;
            // 添加Tooltip显示完整信息
            domainElement.title = `IP地址: ${serverAddress}\n域名: ${data.gateway_url}`;
        } else {
            domainElement.textContent = '未获取到网关配置';
            domainElement.title = `IP地址: ${serverAddress}\n未获取到网关配置`;
        }
    } catch (error) {
        console.error('获取网关地址失败:', error);
        const domainElement = document.getElementById('currentDomain');
        domainElement.textContent = '获取网关失败';
        domainElement.title = `获取网关失败: ${error.message}`;
    }
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
        // 构建查询URL，支持Nacos配置
        let url = `/get_balance?phone=${encodeURIComponent(phone)}`;
        
        // 检查是否有Nacos配置
        const config = ConfigManager.loadConfig();
        if (config.type === 'nacos' && config.data) {
            const nacosConfig = config.data;
            if (nacosConfig.server_addresses) {
                url += `&server_address=${encodeURIComponent(nacosConfig.server_addresses)}`;
            }
            if (nacosConfig.namespace) {
                url += `&namespace=${encodeURIComponent(nacosConfig.namespace)}`;
            }
            if (nacosConfig.username) {
                url += `&username=${encodeURIComponent(nacosConfig.username)}`;
            }
            if (nacosConfig.password) {
                url += `&password=${encodeURIComponent(nacosConfig.password)}`;
            }
        }
        
        const response = await fetch(url, {
            method: 'GET'
        });
        const data = await response.json();
        
        const resultDiv = document.getElementById('result');
        resultDiv.style.display = 'block';
        
        if (data.success) {
            resultDiv.className = 'result success fade-enter';
            resultDiv.innerHTML = `
                <h3>查询结果</h3>
                <p>手机号: ${phone}</p>
                <p>当前余额: ${data.data.balance}</p>
                <p>环境: ${data.data.environment}</p>
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