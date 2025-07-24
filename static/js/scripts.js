// 获取Nacos配置参数
function getNacosParams() {
    console.log('getNacosParams called');
    const config = ConfigManager.loadConfig();
    if (config.type === 'nacos' && config.data) {
        const params = new URLSearchParams();
        
        // 确保必需参数存在
        if (!config.data.server_addresses) {
            console.error('缺少server_address配置');
            return null;
        }
        if (!config.data.namespace) {
            console.warn('缺少namespace配置，使用默认值: server');
            config.data.namespace = 'server';
        }
        
        params.append('server_address', config.data.server_addresses);
        params.append('namespace', config.data.namespace || 'server');
        params.append('username', config.data.username || 'nacos');
        params.append('password', config.data.password || 'nacos');
        
        return params.toString();
    }
    return null;
}

// 表单提交处理 - 移到DOMContentLoaded中确保DOM已加载
function initBalanceForm() {
    const debugStatus = document.getElementById('debugStatus');
    debugStatus.textContent += 'initBalanceForm函数执行\n';
    
    // 查找表单元素
    const balanceForm = document.getElementById('balanceForm');
    if (balanceForm) {
        debugStatus.textContent += '找到balanceForm元素\n';
    } else {
        debugStatus.textContent += '错误: 未找到balanceForm元素\n';
    }
    
    // 查找查询按钮
    const queryBalanceBtn = document.getElementById('queryBalanceBtn');
    if (queryBalanceBtn) {
        debugStatus.textContent += '找到queryBalanceBtn元素\n';
        try {
            queryBalanceBtn.addEventListener('click', function(e) {
  e.preventDefault();
  queryBalance();
});
            debugStatus.textContent += 'queryBalanceBtn点击事件绑定成功\n';
        } catch (error) {
            debugStatus.textContent += '绑定点击事件失败: ' + error.message + '\n';
        }
    } else {
        debugStatus.textContent += '错误: 未找到queryBalanceBtn元素\n';
    }
    
    // 检查表单提交事件
    if (balanceForm) {
        debugStatus.textContent += '开始绑定表单提交事件\n';
        try {
            balanceForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                debugStatus.textContent += '表单提交事件触发，开始修改余额...\n';
                
                const phoneInput = document.getElementById('phone');
                const balanceInput = document.getElementById('balance');
                
                if (!phoneInput || !balanceInput) {
                    debugStatus.textContent += '错误: 找不到表单元素\n';
                    ToastManager.show('表单配置错误，请联系管理员', 'error');
                    return;
                }
                
                const phone = phoneInput.value;
                const balance = balanceInput.value;
                
                if (!phone || phone.length !== 11) {
                    debugStatus.textContent += '错误: 无效手机号\n';
                    ToastManager.show('请输入有效的手机号', 'error');
                    return;
                }
                
                if (!balance || isNaN(balance)) {
                    debugStatus.textContent += '错误: 无效余额值\n';
                    ToastManager.show('请输入有效的余额值', 'error');
                    return;
                }
                
                try {
                    debugStatus.textContent += '开始构建更新URL...\n';
                    
                    // 获取Nacos配置
                    const config = ConfigManager.loadConfig();
                    let url = '/update_balance';
                    
                    if (config.type === 'nacos' && config.data) {
                        const nacosConfig = config.data;
                        if (nacosConfig.server_addresses) {
                            url += `?server_address=${encodeURIComponent(nacosConfig.server_addresses)}`;
                            debugStatus.textContent += `添加server_address参数: ${nacosConfig.server_addresses}\n`;
                        }
                        if (nacosConfig.namespace) {
                            url += `${url.includes('?') ? '&' : '?'}namespace=${encodeURIComponent(nacosConfig.namespace)}`;
                            debugStatus.textContent += `添加namespace参数: ${nacosConfig.namespace}\n`;
                        }
                    }
                    
                    const formData = new FormData();
                    formData.append('phone', phone);
                    formData.append('balance', balance);
                    
                    debugStatus.textContent += `发起更新请求: ${url}\n`;
                    const response = await fetch(url, {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (!response.ok) {
                        throw new Error(`HTTP错误: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    debugStatus.textContent += '更新请求成功，处理响应...\n';
                    
                    const resultDiv = document.getElementById('result');
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
                        const errorMessage = data.message || '更新失败';
                        const userFriendlyMessage = errorMessage.includes('conn') || errorMessage.includes('数据库') || errorMessage.includes('connection') ?
                            '系统繁忙，请稍后重试或联系管理员' :
                            errorMessage.includes('用户不存在') ?
                            '未找到该用户的余额信息，请确认手机号是否正确' :
                            errorMessage.includes('Nacos') ?
                            '配置服务异常，请检查网络连接或联系管理员' :
                            errorMessage;
                        
                        resultDiv.innerHTML = `<p>${userFriendlyMessage}</p>`;
                    }
                } catch (error) {
                    debugStatus.textContent += `更新错误: ${error.message}\n`;
                    const resultDiv = document.getElementById('result');
                    resultDiv.style.display = 'block';
                    resultDiv.className = 'result error fade-enter';
                    const userFriendlyMessage = error.message.includes('NetworkError') || error.message.includes('fetch') ?
                        '网络连接异常，请检查网络设置' :
                        '系统异常，请稍后重试';
                    resultDiv.innerHTML = `<p>${userFriendlyMessage}</p>`;
                }
            });
            debugStatus.textContent += '表单提交事件绑定成功\n';
        } catch (error) {
            debugStatus.textContent += '绑定表单提交事件失败: ' + error.message + '\n';
        }
    }

}

// 添加密码校验功能
async function verifyPassword() {
    const phone = document.getElementById('phonePassword').value;
    const password = document.getElementById('password').value;
    if (!phone || !password) {
        ToastManager.show('请输入手机号和密码', 'error');
        return;
    }
    
    // 检查是否已配置Nacos参数
    const nacosParams = getNacosParams();
    if (!nacosParams) {
        ToastManager.show('请先配置Nacos服务器参数：服务器地址不能为空', 'error');
        document.getElementById('configBtn').click();
        return;
    }
    
    const formData = new FormData();
    formData.append('phone', phone);
    formData.append('password', password);
    
    try {
        const url = '/verify_password?' + nacosParams;
        
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        const resultDiv = document.getElementById('passwordResult');
        resultDiv.style.display = 'block';
        
        if (data.success) {
            resultDiv.className = 'result success fade-enter';
            resultDiv.innerHTML = `
                <h3>密码验证结果</h3>
                <p>手机号: ${phone}</p>
                <p>验证状态: <span class="text-success">验证通过</span></p>
                <p>密码正确</p>
            `;
            ToastManager.show('密码验证通过', 'success');
        } else {
            resultDiv.className = 'result error fade-enter';
            resultDiv.innerHTML = `
                <h3>密码验证结果</h3>
                <p>手机号: ${phone}</p>
                <p>验证状态: <span class="text-danger">验证失败</span></p>
                <p>错误信息: ${data.message}</p>
            `;
            ToastManager.show(data.message, 'error');
        }
    } catch (error) {
        const resultDiv = document.getElementById('passwordResult');
        resultDiv.style.display = 'block';
        resultDiv.className = 'result error fade-enter';
        resultDiv.innerHTML = `
            <h3>密码验证结果</h3>
            <p>手机号: ${phone}</p>
            <p>验证状态: <span class="text-danger">系统错误</span></p>
            <p>错误信息: ${error.message}</p>
        `;
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
    
    // 检查是否已配置Nacos参数
    const nacosParams = getNacosParams();
    if (!nacosParams) {
        ToastManager.show('请先配置Nacos服务器参数', 'error');
        document.getElementById('configBtn').click();
        return;
    }
    
    const formData = new FormData();
    formData.append('phone', phone);
    formData.append('new_password', password);
    
    try {
        const url = '/update_password?' + nacosParams;
        
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        const resultDiv = document.getElementById('passwordResult');
        resultDiv.style.display = 'block';
        
        if (data.success) {
            resultDiv.className = 'result success fade-enter';
            resultDiv.innerHTML = `
                <h3>密码修改结果</h3>
                <p>手机号: ${phone}</p>
                <p>修改状态: <span class="text-success">修改成功</span></p>
                <p>新密码已生效</p>
            `;
            ToastManager.show('密码修改成功', 'success');
            // 清空密码输入框
            document.getElementById('password').value = '';
        } else {
            resultDiv.className = 'result error fade-enter';
            resultDiv.innerHTML = `
                <h3>密码修改结果</h3>
                <p>手机号: ${phone}</p>
                <p>修改状态: <span class="text-danger">修改失败</span></p>
                <p>错误信息: ${data.message}</p>
            `;
            ToastManager.show(data.message, 'error');
        }
    } catch (error) {
        const resultDiv = document.getElementById('passwordResult');
        resultDiv.style.display = 'block';
        resultDiv.className = 'result error fade-enter';
        resultDiv.innerHTML = `
            <h3>密码修改结果</h3>
            <p>手机号: ${phone}</p>
            <p>修改状态: <span class="text-danger">系统错误</span></p>
            <p>错误信息: ${error.message}</p>
        `;
        ToastManager.show('系统错误: ' + error.message, 'error');
    }
}



// 页面加载时初始化配置状态
document.addEventListener('DOMContentLoaded', async function() {
    const debugStatus = document.getElementById('debugStatus');
    debugStatus.textContent += 'DOMContentLoaded事件触发\n';
    let config;
    try {
        // 加载保存的配置
        debugStatus.textContent += '开始加载配置...\n';
        config = ConfigManager.loadConfig();
        debugStatus.textContent += '配置加载成功\n';
        // 检查配置类型并加载Nacos配置
        if (config.type === 'nacos') {
            debugStatus.textContent += '检测到Nacos配置，开始加载...\n';
            try {
                await loadNacosConfigs();
                debugStatus.textContent += 'Nacos配置加载完成\n';
            } catch (nacosError) {
                debugStatus.textContent += 'Nacos配置加载失败: ' + nacosError.message + '\n';
            }
        }
        // 无论Nacos配置是否成功，始终初始化表单
        debugStatus.textContent += '准备调用initBalanceForm...\n';
        initBalanceForm();
        debugStatus.textContent += 'initBalanceForm调用完成\n';
    } catch (error) {
        debugStatus.textContent += '初始化错误: ' + error.message + '\n';
        console.error('初始化失败:', error);
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
                updateGatewayUrl({type: 'nacos', data: config});
                closeConfigModal();
                ToastManager.show(isExisting ? '配置连接成功' : '配置保存并连接成功', 'success');
                
                // 重新加载下拉列表
                loadNacosConfigs();
                
            } catch (error) {
                ToastManager.show('配置处理失败: ' + error.message, 'error');
            }
        });
    }
    
    // 初始加载网关地址
    updateGatewayUrl(config);
    
    // 初始化余额表单
    initBalanceForm();
    
    // 添加实时手机号验证
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function() {
            const phone = this.value.replace(/\D/g, '').trim();
            const isValid = /^[0-9]{11}$/.test(phone);
            
            if (phone.length > 0 && phone.length <= 11) {
                this.style.borderColor = isValid ? '#28a745' : '#ffc107';
                this.style.boxShadow = isValid ? 
                    '0 0 0 0.2rem rgba(40, 167, 69, 0.25)' : 
                    '0 0 0 0.2rem rgba(255, 193, 7, 0.25)';
            } else {
                this.style.borderColor = '';
                this.style.boxShadow = '';
            }
        });
        
        phoneInput.addEventListener('blur', function() {
            const phone = this.value.replace(/\D/g, '').trim();
            if (phone.length > 0 && phone.length !== 11) {
                this.style.borderColor = '#dc3545';
                this.style.boxShadow = '0 0 0 0.2rem rgba(220, 53, 69, 0.25)';
            }
        });
    }
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

        // 填充下拉选项（移除标题，直接显示配置项）
        configs.forEach(config => {
            const address = config.server_addresses || '';
            if (!address) return; // 跳过无效地址

            const item = document.createElement('li');
            item.className = 'dropdown-item d-flex justify-content-between align-items-center';
            item.innerHTML = `
                <div>
                    <strong>${config.data_id || config.name || address}</strong>
                    <div class="text-sm text-muted">${config.namespace || '默认命名空间'}</div>
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
async function updateGatewayUrl(configData = null) {
    try {
        // 使用传入的配置或从ConfigManager获取
        let config = configData;
        if (!config) {
            config = ConfigManager.loadConfig();
        }
        
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
    
    // 切换标签时隐藏密码结果区域
    if (tabId !== 'password') {
        const passwordResult = document.getElementById('passwordResult');
        if (passwordResult) {
            passwordResult.style.display = 'none';
        }
    }
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
    console.log('queryBalance called');
    const debugStatus = document.getElementById('debugStatus');
    debugStatus.textContent += 'queryBalance函数执行\n';
    
    const phoneInput = document.getElementById('phone');
    debugStatus.textContent += `手机号输入框元素: ${phoneInput ? '已找到' : '未找到'}\n`;
    const rawValue = phoneInput ? phoneInput.value : '无输入框';
    debugStatus.textContent += `原始输入值: [${rawValue}]\n`;
    const phone = phoneInput ? rawValue.replace(/\D/g, '').trim() : '';
    debugStatus.textContent += `获取到的手机号: [${phone}] (长度: ${phone.length})\n`;
    const isValid = /^[0-9]{11}$/.test(phone);
    debugStatus.textContent += `手机号验证结果: ${isValid ? '有效' : '无效'}\n`;
    if (!isValid) {
        const message = phone.length === 0 ? 
          '请输入11位手机号' : 
          phone.length < 11 ? 
          `手机号位数不足：当前${phone.length}位，需要11位` : 
          phone.length > 11 ? 
          `手机号位数过多：当前${phone.length}位，需要11位` : 
          '手机号格式不正确，请输入11位数字';
        
        debugStatus.textContent += `错误: ${message}\n`;
        ToastManager.show(message, 'error');
        
        // 高亮显示输入框
        phoneInput.style.borderColor = '#dc3545';
        phoneInput.style.boxShadow = '0 0 0 0.2rem rgba(220, 53, 69, 0.25)';
        phoneInput.focus();
        
        // 3秒后恢复样式
        setTimeout(() => {
          phoneInput.style.borderColor = '';
          phoneInput.style.boxShadow = '';
        }, 3000);
        
        return;
    }
    
    try {
        debugStatus.textContent += '开始构建查询URL...\n';
        let url = `/get_balance?phone=${encodeURIComponent(phone)}`;
        
        // 获取Nacos配置
        const config = ConfigManager.loadConfig();
        if (config.type === 'nacos' && config.data) {
            const nacosConfig = config.data;
            if (nacosConfig.server_addresses) {
                url += `&server_address=${encodeURIComponent(nacosConfig.server_addresses)}`;
                debugStatus.textContent += `添加server_address参数: ${nacosConfig.server_addresses}\n`;
            }
            if (nacosConfig.namespace) {
                url += `&namespace=${encodeURIComponent(nacosConfig.namespace)}`;
                debugStatus.textContent += `添加namespace参数: ${nacosConfig.namespace}\n`;
            }
        }
        
        debugStatus.textContent += `发起请求: ${url}\n`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status}`);
        }
        const data = await response.json();
        debugStatus.textContent += '请求成功，处理响应...\n';
        
        const resultDiv = document.getElementById('result');
        resultDiv.style.display = 'block';
        if (data.success) {
            resultDiv.textContent = `当前余额: ${data.data.balance}元`;
        } else {
            resultDiv.textContent = `查询失败: ${data.message}`;
        }
    } catch (error) {
        debugStatus.textContent += `查询错误: ${error.message}\n`;
        const resultDiv = document.getElementById('result');
        resultDiv.style.display = 'block';
        resultDiv.className = 'result error fade-enter';
        const userFriendlyMessage = error.message.includes('NetworkError') || error.message.includes('fetch') ?
            '网络连接异常，请检查网络设置' :
            '系统异常，请稍后重试';
        resultDiv.innerHTML = `<p>${userFriendlyMessage}</p>`;
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