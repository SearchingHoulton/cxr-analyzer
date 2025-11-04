import './classification.js'; // 14种疾病分类
import './ground.js' // 画方框
import { handleUpload, saveAnalysisResult, initHistoryList } from './history.js';
import {initResizable} from './resize.js'; // 拖拽控制宽度
import { initSubTabs } from './tabs.js';  // 切换报告/观察子标签
import './vqa.js'; // 问答部分
import './upload.js'; // 图片上传区域,上传,下载,删除

// 初始化内容
document.addEventListener('DOMContentLoaded', () => {
    // 初始化历史列表
    initHistoryList();

    // 页面操作监控:调整边框,切换tab
    initResizable();
    initSubTabs();

    // 初始化自动保存
    initAutoSave();
});

window.isLoadingHistory = false;

// 图片上传监控
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    if (!fileInput) {
        console.error('❌ file-input not found');
        return;
    }

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            await handleUpload(file);
            console.log('✅ Folder created and history updated');
        } catch (err) {
            console.error('❌ Upload error:', err);
            alert(err.message);
        }
    });
});

// 自动保存触发
function initAutoSave() {

    async function saveAllAnalysis() {
        const payload = { timestamp: Date.now() };

        // 1. 分类结果
        const grid = document.querySelector('#classification-data .grid');
        if (grid && grid.children.length > 0) {
            const observations = Array.from(grid.children).map(badge => {
                const text = badge.textContent.trim();
                const match = text.match(/(.+?)(\d+)%/);
                return match ? {
                    observation: match[1].trim(),
                    confidence: parseInt(match[2]),
                    present: badge.classList.contains('observation-positive')
                } : null;
            }).filter(Boolean);
            if (observations.length > 0) payload.classification = observations;
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
        const summary = document.getElementById('findings-summary')?.textContent;
        if (summary && !summary.includes('No report generated yet')) {
            const recommendations = document.getElementById('recommendations')?.innerHTML;
            payload.report = { findings: summary, recommendations: recommendations || '' };
        }

        // 一次性保存到后端
        // await saveAnalysisResult('all', payload);
        if (payload.classification) await saveAnalysisResult('classification', payload.classification);
        if (payload.grounding) await saveAnalysisResult('grounding', payload.grounding);
        if (payload.vqa) await saveAnalysisResult('vqa', { items: payload.vqa });
        if (payload.report) await saveAnalysisResult('report', payload.report);        
    }

    // 点击保存按钮触发
    const saveBtn = document.getElementById('vqa-save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveAllAnalysis);
    }
}


export { initAutoSave };