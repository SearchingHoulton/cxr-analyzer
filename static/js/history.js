// history.js - 历史记录管理模块，主要用来管理历史记录模块
import { displayResults } from './classification.js';
import { displayReportResults } from './report.js'
import { showNotification } from './utils.js'

export let currentFolder = null;

// 添加到历史记录列表
export function addToHistory(filename) {
    const historyList = document.getElementById('history-list');
    const folderName = filename.replace(/\.[^/.]+$/, '');
    
    // 检查是否已存在该文件夹
    const existingItem = document.querySelector(`[data-folder="${folderName}"]`);
    if (existingItem) {
        document.querySelectorAll('.chat-history-item').forEach(el => {
            el.classList.remove('active');
        });
        existingItem.classList.add('active');
        existingItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return folderName;
    }
    
    const date = new Date();
    const formatted = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    
    const item = document.createElement('div');
    item.className = 'chat-history-item slide-in';
    item.dataset.folder = folderName;
    item.dataset.filename = filename;
    
    item.innerHTML = `
        <div class="flex justify-between items-center">
            <span class="text-gray-800 truncate max-w-[180px] font-medium">${filename}</span>
            <span class="text-gray-400 text-xs">${formatted}</span>
        </div>
        <div class="text-gray-500 text-xs mt-1">Click to view analysis</div>
    `;

    item.addEventListener('click', () => loadHistoryItem(folderName));

    // 清除空状态提示
    const placeholder = historyList.querySelector('.text-gray-400.text-center');
    if (placeholder) {
        historyList.innerHTML = '';
    }
    
    // 移除其他项的active状态
    document.querySelectorAll('.chat-history-item').forEach(el => {
        el.classList.remove('active');
    });
    
    // 插入到顶部
    if (historyList.firstChild) {
        historyList.insertBefore(item, historyList.firstChild);
    } else {
        historyList.appendChild(item);
    }

    return folderName;
}

// 上传处理
export async function handleUpload(file) {
    const folderName = addToHistory(file.name);
    currentFolder = folderName;

    // 将图片读取为 base64
    const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // 去掉前缀 data:image/png;base64,
            resolve(reader.result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    // 创建文件夹并保存图片
    const res = await fetch('/create_folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            folder: folderName,
            filename: file.name,
            data: base64Data
        })
    });

    if (!res.ok) {
        throw new Error('Failed to create folder and save image');
    }

    return folderName;
}

// 保存分析结果
export async function saveAnalysisResult(type, data) {
    if (!currentFolder) {
        console.warn('No current folder selected');
        return;
    }
    const res = await fetch('/save_result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            folder: currentFolder,
            type: type,
            data: data
        })
    });

    console.log('✅ Data saved successfully:', data);
}

// 全部保存的功能
export function initAutoSave() {

    async function saveAllAnalysis() {
        const payload = { timestamp: Date.now() };

        // 1. 分类结果
        const grid = document.querySelector('#classification-data .grid');
        if (grid && grid.children.length > 0) {
            const observations = Array.from(grid.children).map(badge => {
                const spans = badge.querySelectorAll('span');
                if (spans.length >= 2) {
                    return {
                        observation: spans[0].textContent.trim(),
                        confidence: parseInt(spans[1].textContent.replace('%', '').trim()),
                        present: badge.classList.contains('observation-positive')
                    };
                }
                return null;
            }).filter(Boolean);

            if (observations.length > 0) {
                payload.classification = { items: observations }; // 必须包装成对象
            }
        }

        // 2. Grounding（如果开启且存在数据）
        const groundingToggle = document.getElementById('visual-grounding-toggle');
        if (groundingToggle && groundingToggle.checked) {
            const groundingModule = await import('./ground.js');
            if (groundingModule.lastBoxes && groundingModule.lastBoxes.length > 0) {
                payload.grounding = {
                    boxes: groundingModule.lastBoxes,
                    labels: groundingModule.lastLabels
                };
            }
        }

        // 3. VQA
        const messages = document.querySelectorAll('#vqa-answers .p-3.bg-neutral');
        if (messages.length > 0) {
            const vqaArray = Array.from(messages).map(msg => {
                const question = msg.querySelector('.text-gray-800')?.textContent.trim();
                const answer = msg.querySelector('.text-gray-700')?.textContent.trim();
                return question && answer ? { question, answer } : null;
            }).filter(Boolean);
            if (vqaArray.length > 0) payload.vqa = vqaArray;
        }

        // 4. 报告
        const report = document.getElementById('report-data')?.textContent;
        if (report && !report.includes('No report generated yet')) {
            const findingsEl = document.getElementById('findings');
            const impressions = document.getElementById('impressions')?.innerHTML;
            const findings = findingsEl 
                ? Array.from(findingsEl.querySelectorAll('li'))
                    .map(li => li.textContent.trim())
                    .join('\n')
                : '';
            payload.report = { findings: findings, impressions: impressions || '' };
        }

        // 新增空数据判断
        if (!payload.classification && !payload.grounding && !payload.vqa && !payload.report) {
            showNotification('No analysis data to save yet.', 'warning');
            return; // 阻止后续保存
        }

        // 一次性保存到后端
        // await saveAnalysisResult('all', payload);
        if (payload.classification) await saveAnalysisResult('classification', payload.classification);
        if (payload.grounding) await saveAnalysisResult('grounding', payload.grounding);
        if (payload.vqa) await saveAnalysisResult('vqa', { items: payload.vqa });
        if (payload.report) await saveAnalysisResult('report', payload.report);     
        
        // 显示通知
        showNotification('Saved successfully, your analysis has been backed up.', 'info');
    }
    // 点击保存按钮触发
    const saveBtn = document.getElementById('vqa-save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveAllAnalysis);
    }
    return saveAllAnalysis;
}

// 加载历史记录项
async function loadHistoryItem(folderName) {
    currentFolder = folderName;
    
    // 更新active状态
    document.querySelectorAll('.chat-history-item').forEach(el => {
        el.classList.remove('active');
    });
    const selectedItem = document.querySelector(`[data-folder="${folderName}"]`);
    if (selectedItem) {
        selectedItem.classList.add('active');
    }

    // 关闭 grounding toggle
    const toggle = document.getElementById('visual-grounding-toggle');
    if (toggle) {
        toggle.checked = false;
        toggle.dispatchEvent(new Event('change'));
    }

    // VQA 区域清空
    const vqaAnswers = document.getElementById('vqa-answers');
    if (vqaAnswers) {
        vqaAnswers.innerHTML = '';
    }
    // 清空classification-data的grid（分类结果区域）
    const classificationGrid = document.querySelector('#classification-data .grid');
    if (classificationGrid) {
        classificationGrid.innerHTML = '';
    }
    // 清空classification-chart（置信度分布区域）
    const classificationChartCanvas = document.getElementById('classification-chart');
    if (classificationChartCanvas) {
        // 先销毁Chart.js实例，否则直接清空内容
        if (classificationChartCanvas._chartInstance) {
            classificationChartCanvas._chartInstance.destroy();
            classificationChartCanvas._chartInstance = null;
        }
        // 彻底清空画布
        const ctx = classificationChartCanvas.getContext('2d');
        ctx && ctx.clearRect(0, 0, classificationChartCanvas.width, classificationChartCanvas.height);
    }
    // 清空report部分
    const findings = document.getElementById('findings');
    const impressions = document.getElementById('impressions');
    const reportLoading = document.getElementById('report-loading');
    const reportData = document.getElementById('report-data');

    if (reportLoading) reportLoading.classList.add('hidden');            // 隐藏 loading
    if (reportData) reportData.classList.remove('hidden');               // 保留显示区域
    if (findings) findings.innerHTML = '<li>No report generated yet.</li>';   // 重置 findings
    if (impressions) impressions.textContent = 'No report generated yet.';   // 重置 impressions

    try {
        console.log("Loading history:", folderName);
        const res = await fetch(`/load_result/${folderName}`);
        if (!res.ok) {
            console.error('Failed to load history');
            return;
        }

        const data = await res.json();

        // 加载图片
        if (data.image_path) {
            const cxrImage = document.getElementById('cxr-image');
            cxrImage.src = data.image_path;
            // 将图片文件同步到全局变量
            fetch(data.image_path)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], `${folderName}.png`, { type: blob.type });
                window.currentImageFile = file;
            });
            document.getElementById('upload-container').classList.add('hidden');
            document.getElementById('image-analysis-container').classList.remove('hidden');
        }
        
        // 加载接地结果
        if (data.grounding && data.grounding.boxes && data.grounding.boxes.length > 0) {
            const groundingModule = await import('./ground.js');
            groundingModule.setLastGrounding(data.grounding.boxes, data.grounding.labels);
            
            const toggle = document.getElementById('visual-grounding-toggle');
            if (toggle) {
                window.isLoadingHistory = true;
                toggle.checked = false;  // 直接改为false，放置触发莫名其妙的自动保存
                groundingModule.drawBoundingBox(data.grounding.boxes, data.grounding.labels);
            
                window.isLoadingHistory = false;
            }
            
        }
        
        // 加载报告
        if (data.report && data.report.findings) {
            displayReportResults(data.report)
        }
        
        // 加载VQA记录
        if (data.vqa && data.vqa.items && data.vqa.items.length > 0) {
            const vqaAnswers = document.getElementById('vqa-answers');
            vqaAnswers.innerHTML = '';
        
            data.vqa.items.forEach(vqaItem => {
                addVQAAnswerFromHistory(vqaItem.question, vqaItem.answer);
            });
        }

        // 加载 classification
        if (data.classification && Array.isArray(data.classification.items) && data.classification.items.length > 0) {
            const observations = data.classification.items; // 直接使用后端数据
            const chartCanvas = document.getElementById('classification-chart');
            if (chartCanvas && chartCanvas._chartInstance) {
                chartCanvas._chartInstance.destroy();
                chartCanvas._chartInstance = null;
            }
            // 重新渲染
            const gridContainer = document.querySelector('#classification-data .grid');
            if (gridContainer) {
                gridContainer.innerHTML = ''; // 清空旧内容
                displayResults(observations);
            }
            // 显示分类区域
            document.getElementById('classification-data').classList.remove('hidden');
        }

    } catch (err) {
        console.error('Error loading history:', err);
        alert('Failed to load history item');
    }
}

export async function initHistoryList() {
    try {
        const res = await fetch('/list_folders');
        if (!res.ok) throw new Error('Failed to fetch folders');
        const folders = await res.json(); // 假设返回 ['file1.png', 'file2.png', ...]

        folders.forEach(filename => {
            addToHistory(filename); // 渲染到列表
        });
    } catch (err) {
        console.error('Error initializing history list:', err);
    }
}

// 从历史记录添加VQA答案
function addVQAAnswerFromHistory(question, answer) {
    const vqaAnswers = document.getElementById('vqa-answers');
    
    // 移除占位符
    const placeholder = vqaAnswers.querySelector('div.text-center');
    if (placeholder) placeholder.remove();

    const el = document.createElement('div');
    el.className = 'p-3 bg-neutral rounded-lg animate-fadeIn';
    el.innerHTML = `
        <div class="flex items-start mb-2">
            <div class="bg-primary/10 text-primary p-1.5 rounded-full mr-3 mt-0.5">
                <i class="fa fa-question text-sm"></i>
            </div>
            <div class="flex-grow">
                <p class="text-gray-800 text-sm">${question}</p>
            </div>
        </div>
        <div class="flex items-start ml-8 relative">
            <div class="bg-success/10 text-success p-1.5 rounded-full mr-3 mt-0.5">
                <i class="fa fa-check text-sm"></i>
            </div>
            <div class="flex-grow relative">
                <p class="text-gray-700 text-sm pr-6">${answer}</p>
                <button class="absolute top-0 right-0 text-gray-400 hover:text-primary transition-colors text-xs copy-btn" title="Copy">
                    <i class="fa fa-clone"></i>
                </button>
            </div>
        </div>`;

    vqaAnswers.appendChild(el);

    // 复制功能
    const copyBtn = el.querySelector('.copy-btn');
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(answer);
        copyBtn.innerHTML = '<i class="fa fa-check text-green-500"></i>';
        setTimeout(() => copyBtn.innerHTML = '<i class="fa fa-clone"></i>', 1200);
    });
}

// 搜索历史记录
export function initHistorySearch() {
    const searchInput = document.querySelector('#history-search-input');
    const historyList = document.getElementById('history-list');
    if (!searchInput || !historyList) return;

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();

        const items = historyList.querySelectorAll('.chat-history-item');
        items.forEach(item => {
            const filename = item.dataset.filename.toLowerCase();
            if (filename.includes(query)) {
                item.style.display = ''; // 显示
            } else {
                item.style.display = 'none'; // 隐藏
            }
        });

        // 可选：如果没有匹配结果显示提示
        let placeholder = historyList.querySelector('.no-match');
        if (!placeholder) {
            placeholder = document.createElement('div');
            placeholder.className = 'no-match text-gray-400 text-center py-2';
            placeholder.textContent = 'No matching history';
            historyList.appendChild(placeholder);
        }
        placeholder.style.display = Array.from(items).some(i => i.style.display !== 'none') ? 'none' : '';
    });
}