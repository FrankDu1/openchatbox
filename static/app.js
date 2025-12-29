// App state
let messages = [];
let models = { aliyun: [], openai: [] };
let isLoading = false;
let showImageGen = false;
let showSettings = false;
let chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
let currentChatId = null;
let dailyFreeLimit = 10;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Lucide icons
    lucide.createIcons();
    
    // Load theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.getElementById('themeIcon').setAttribute('data-lucide', 'sun');
    }
    lucide.createIcons();
    
    // Load app config
    await loadConfig();
    
    // Load models
    await loadModels();
    
    // Load chat history
    loadChatHistory();
    
    // Load API key
    loadApiKey();
    
    // Update usage quota
    updateUsageQuota();
    
    // Initialize marked.js
    marked.setOptions({
        breaks: true,
        gfm: true
    });
});

// Load app configuration
async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        const appNameElement = document.getElementById('appName');
        if (appNameElement) {
            appNameElement.textContent = currentLang === 'zh' ? config.appName : config.appNameEn;
        }
        // Update title
        document.title = currentLang === 'zh' ? config.appName : config.appNameEn;
        
        // Store daily free limit
        dailyFreeLimit = config.dailyFreeLimit || 10;
        updateUsageQuota();
    } catch (error) {
        console.error('Failed to load config:', error);
    }
}

// Make loadConfig available globally
window.loadConfig = loadConfig;

// Load models from API
async function loadModels() {
    try {
        const response = await fetch('/api/models');
        models = await response.json();
        updateModelSelect();
    } catch (error) {
        console.error('Failed to load models:', error);
        models = {
            aliyun: [{ id: 'qwen-plus', name: 'Qwen Plus', name_zh: '通义千问 Plus' }],
            openai: [{ id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }]
        };
        updateModelSelect();
    }
}

// Update model select based on provider
function updateModelSelect() {
    const provider = document.getElementById('provider').value;
    const modelSelect = document.getElementById('model');
    modelSelect.innerHTML = '';
    
    const providerModels = models[provider] || [];
    providerModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = currentLang === 'zh' && model.name_zh ? model.name_zh : model.name;
        modelSelect.appendChild(option);
    });
}

// Theme toggle
function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.getElementById('themeIcon').setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    lucide.createIcons();
}

// Settings toggle
function toggleSettings() {
    showSettings = !showSettings;
    const panelDisplay = showSettings ? 'block' : 'none';
    document.getElementById('settingsPanel').style.display = panelDisplay;
    document.getElementById('settingsBtn').classList.toggle('active', showSettings);
}

// Image generation toggle
function toggleImageGen() {
    showImageGen = !showImageGen;
    document.getElementById('chatArea').style.display = showImageGen ? 'none' : 'flex';
    document.getElementById('imageGenArea').style.display = showImageGen ? 'block' : 'none';
    document.getElementById('inputArea').style.display = showImageGen ? 'none' : 'block';
    document.getElementById('imageGenBtn').classList.toggle('active', showImageGen);
    
    // Remove newChat highlight when switching to image gen
    if (showImageGen) {
        document.getElementById('newChatBtn').classList.remove('active');
    }
}

// Provider change
function onProviderChange() {
    updateModelSelect();
}

// New chat
function newChat() {
    currentChatId = null;
    messages = [];
    
    // Switch back to chat view if in image generation mode
    if (showImageGen) {
        showImageGen = false;
        document.getElementById('chatArea').style.display = 'flex';
        document.getElementById('imageGenArea').style.display = 'none';
        document.getElementById('inputArea').style.display = 'block';
        document.getElementById('imageGenBtn').classList.remove('active');
    }
    
    // Highlight new chat button
    document.getElementById('newChatBtn').classList.add('active');
    document.getElementById('imageGenBtn').classList.remove('active');
    
    document.getElementById('chatArea').innerHTML = `
        <div class="welcome-screen">
            <div class="welcome-icon">
                <i data-lucide="sparkles" style="width: 64px; height: 64px;"></i>
            </div>
            <h1 data-i18n="title">${t('title')}</h1>
            <p data-i18n="subtitle">${t('subtitle')}</p>
        </div>
    `;
    lucide.createIcons();
    updateChatHistoryUI();
}

// Chat history management
function loadChatHistory() {
    chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    updateChatHistoryUI();
}

function saveChatHistory() {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

function updateChatHistoryUI() {
    const listEl = document.getElementById('chatHistoryList');
    if (!listEl) return;
    
    if (chatHistory.length === 0) {
        listEl.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-secondary); font-size: 0.875rem;">暂无历史记录</div>';
        return;
    }
    
    listEl.innerHTML = chatHistory.map(chat => `
        <div class="chat-history-item ${chat.id === currentChatId ? 'active' : ''}" 
             onclick="loadChat('${chat.id}')">
            <span class="chat-history-title">${escapeHtml(chat.title)}</span>
            <button class="chat-history-delete" onclick="event.stopPropagation(); deleteChat('${chat.id}')">
                <i data-lucide="trash-2"></i>
            </button>
        </div>
    `).join('');
    
    lucide.createIcons();
}

function saveCurrentChat() {
    if (messages.length === 0) return;
    
    const title = messages.find(m => m.role === 'user')?.content.substring(0, 30) || '新对话';
    
    if (currentChatId) {
        // Update existing chat
        const chat = chatHistory.find(c => c.id === currentChatId);
        if (chat) {
            chat.messages = [...messages];
            chat.title = title;
            chat.updatedAt = new Date().toISOString();
        }
    } else {
        // Create new chat
        currentChatId = Date.now().toString();
        chatHistory.unshift({
            id: currentChatId,
            title: title,
            messages: [...messages],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }
    
    // Keep only last 50 chats
    if (chatHistory.length > 50) {
        chatHistory = chatHistory.slice(0, 50);
    }
    
    saveChatHistory();
    updateChatHistoryUI();
}

function loadChat(chatId) {
    const chat = chatHistory.find(c => c.id === chatId);
    if (!chat) return;
    
    currentChatId = chatId;
    messages = [...chat.messages];
    renderMessages();
    updateChatHistoryUI();
}

function deleteChat(chatId) {
    if (confirm('确定要删除这个对话吗？')) {
        chatHistory = chatHistory.filter(c => c.id !== chatId);
        saveChatHistory();
        
        if (currentChatId === chatId) {
            newChat();
        } else {
            updateChatHistoryUI();
        }
    }
}

// API key management
function loadApiKey() {
    const customKey = localStorage.getItem('customApiKey') || '';
    const keyInput = document.getElementById('customApiKey');
    if (keyInput) {
        keyInput.value = customKey;
    }
}

function saveApiKey() {
    const customKey = document.getElementById('customApiKey').value.trim();
    localStorage.setItem('customApiKey', customKey);
    updateUsageQuota();
}

function getApiKey() {
    return localStorage.getItem('customApiKey') || '';
}

// Usage quota management
async function updateUsageQuota() {
    const customKey = getApiKey();
    const quotaEl = document.getElementById('usageQuota');
    const quotaCountEl = document.getElementById('quotaCount');
    
    if (!quotaEl || !quotaCountEl) return;
    
    // Only show quota if using default key
    if (customKey) {
        quotaEl.style.display = 'none';
    } else {
        try {
            const response = await fetch('/api/usage');
            const usage = await response.json();
            
            quotaEl.style.display = 'block';
            quotaCountEl.textContent = `${usage.used}/${usage.limit}`;
            
            // Highlight if near or over limit
            if (usage.remaining === 0) {
                quotaCountEl.style.color = '#f85149';
            } else if (usage.remaining <= usage.limit * 0.2) {
                quotaCountEl.style.color = '#d29922';
            } else {
                quotaCountEl.style.color = 'var(--text-primary)';
            }
        } catch (error) {
            console.error('Failed to fetch usage:', error);
            quotaEl.style.display = 'none';
        }
    }
}

// Send message
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message || isLoading) return;
    
    // Add user message
    messages.push({ role: 'user', content: message });
    input.value = '';
    input.style.height = 'auto'; // Reset textarea height
    renderMessages();
    
    // Show loading
    isLoading = true;
    showThinking();
    
    try {
        const provider = document.getElementById('provider').value;
        const model = document.getElementById('model').value;
        const temperature = 0.7;
        const maxTokens = 2000;
        
        // Get user's custom API key if set
        const customApiKey = getApiKey();
        
        const requestBody = {
            messages,
            provider,
            model,
            temperature,
            max_tokens: maxTokens
        };
        
        // Include custom API key if provided
        if (customApiKey) {
            requestBody.api_key = customApiKey;
        }
        
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            messages.push({
                role: 'assistant',
                content: data.message.content
            });
            
            // Update usage quota after successful request
            updateUsageQuota();
            
            // Save chat history after successful response
            saveCurrentChat();
        } else if (response.status === 429) {
            // Quota exceeded
            alert(data.detail || t('quotaExceeded'));
            // Open settings panel
            if (!showSettings) {
                toggleSettings();
            }
            return; // Don't add error message to chat
        } else {
            messages.push({
                role: 'assistant',
                content: `Error: ${data.detail || 'Unknown error'}`
            });
        }
    } catch (error) {
        messages.push({
            role: 'assistant',
            content: `Error: ${error.message}`
        });
    } finally {
        isLoading = false;
        renderMessages();
    }
}

// Render messages
function renderMessages() {
    const chatArea = document.getElementById('chatArea');
    chatArea.innerHTML = '';
    
    messages.forEach(msg => {
        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper ${msg.role}`;
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        if (msg.role === 'user') {
            content.innerHTML = `<div class="message-text">${escapeHtml(msg.content)}</div>`;
        } else {
            content.innerHTML = `<div class="message-markdown">${marked.parse(msg.content)}</div>`;
        }
        
        wrapper.appendChild(content);
        chatArea.appendChild(wrapper);
    });
    
    chatArea.scrollTop = chatArea.scrollHeight;
}

// Show thinking indicator
function showThinking() {
    const chatArea = document.getElementById('chatArea');
    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper assistant';
    wrapper.id = 'thinkingIndicator';
    
    wrapper.innerHTML = `
        <div class="message-content">
            <div class="thinking-indicator">
                <div class="thinking-dot"></div>
                <div class="thinking-dot"></div>
                <div class="thinking-dot"></div>
            </div>
        </div>
    `;
    
    chatArea.appendChild(wrapper);
    chatArea.scrollTop = chatArea.scrollHeight;
}

// Generate image
async function generateImage() {
    const prompt = document.getElementById('imagePrompt').value.trim();
    if (!prompt || isLoading) return;
    
    isLoading = true;
    const btn = document.getElementById('generateBtn');
    btn.disabled = true;
    btn.innerHTML = `<span data-i18n="generating">${t('generating')}</span>`;
    
    try {
        const imageProvider = document.getElementById('imageProvider').value;
        const customApiKey = getApiKey();
        
        const requestBody = {
            prompt,
            provider: imageProvider,
            size: '1024x1024',
            n: 1
        };
        
        if (customApiKey) {
            requestBody.api_key = customApiKey;
        }
        
        const response = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (response.ok && data.images) {
            const gallery = document.getElementById('imageGallery');
            gallery.innerHTML = '';
            
            data.images.forEach(img => {
                const imgEl = document.createElement('img');
                imgEl.src = img.url;
                imgEl.className = 'generated-image';
                gallery.appendChild(imgEl);
            });
        } else {
            alert(`Error: ${data.detail || 'Failed to generate image'}`);
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    } finally {
        isLoading = false;
        btn.disabled = false;
        btn.innerHTML = `<span data-i18n="generateImage">${t('generateImage')}</span>`;
    }
}

// Handle keyboard shortcuts
function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Auto resize textarea
function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
