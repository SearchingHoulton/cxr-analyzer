// history.js - 历史记录管理模块（修正版）
import { displayResults } from './classification.js';

// let currentFolder = null;
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
            document.getElementById('upload-container').classList.add('hidden');
            document.getElementById('image-analysis-container').classList.remove('hidden');
        }
        
        // 加载分类结果
        console.log(data.classification)
        if (data.classification && data.classification.length > 0) {
            console.log(1)
            displayResults(data.classification);
            document.getElementById('classification-data').classList.remove('hidden');
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
            const findingsSummary = document.getElementById('findings-summary');
            if (findingsSummary) {
                findingsSummary.textContent = data.report.findings;
            }
        }
        
        // 加载VQA记录
        if (data.vqa && data.vqa.items && data.vqa.items.length > 0) {
            const vqaAnswers = document.getElementById('vqa-answers');
            vqaAnswers.innerHTML = '';
        
            data.vqa.items.forEach(vqaItem => {
                addVQAAnswerFromHistory(vqaItem.question, vqaItem.answer);
            });
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
