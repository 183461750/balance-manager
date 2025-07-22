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
                    configInfo = `<p>配置方式: Nacos配置 (${config.data.server_addresses})</p>`;
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



// 页面加载时初始化配置状态
document.addEventListener('DOMContentLoaded', () => {
    // 加载保存的配置
    const config = ConfigManager.loadConfig();
    if (!config) {
        // 如果没有保存的配置，设置默认状态
        ConfigManager.saveConfig('nacos', { server_addresses: '' });
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

// 页面加载时初始化组件管理器
document.addEventListener('DOMContentLoaded', function() {
    // 初始化Nacos配置下拉组件
    loadNacosConfigs();

    // 为输入框添加事件监听
    const serverInput = document.getElementById('server_addresses');
    // 调试日志：检查输入值
    console.log('保存前输入值:', serverInput.value);
    // 调试日志：检查输入值
    console.log('保存前输入值:', serverInput.value);
    if (serverInput) {
        serverInput.addEventListener('focus', loadNacosConfigs);
    }


    // 添加Nacos表单提交处理
    const nacosForm = document.getElementById('nacosForm');
    if (nacosForm) {
        nacosForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveNacosConfig();
        });
        console.log('Nacos表单提交事件已绑定');
    } else {
        console.log('未找到Nacos表单元素');
    }

    updateGatewayUrl();
    BootstrapComponentManager.initAll();

    // 为动态内容添加手动初始化接口
    window.initBootstrapDropdowns = () => BootstrapComponentManager.initDropdowns();
});

// 保存Nacos配置到服务器
async function saveNacosConfig() {
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
            // 保存成功后更新本地配置缓存
            ConfigManager.saveConfig('nacos', {
                server_addresses: server_addresses,
                namespace: namespace,
                username: username
            });
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