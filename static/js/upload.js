import { performClassification } from './classification.js';
import { performReportGeneration } from './report.js';
import { addToHistory, initAutoSave } from './history.js';
import { lastBoxes, lastLabels } from './ground.js';

// DOM 引用
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const browseBtn = document.getElementById('browse-btn');
const uploadContainer = document.getElementById('upload-container');
const imageAnalysisContainer = document.getElementById('image-analysis-container');
const imageLoading = document.getElementById('image-loading');
const cxrImage = document.getElementById('cxr-image');
window.currentImageFile = null; // 新增共享图片，方便所有功能直接访问图片返回

// 触发文件选择
browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
});

fileInput.addEventListener('change', e => {
    if (e.target.files.length > 0) handleImageUpload(e.target.files[0]);
});

// 拖拽上传控制
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
    });
});

dropArea.addEventListener('dragenter', () => dropArea.classList.add('drag-over'));
dropArea.addEventListener('dragover', () => dropArea.classList.add('drag-over'));
dropArea.addEventListener('dragleave', () => dropArea.classList.remove('drag-over'));
dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.remove('drag-over');

    const dt = e.dataTransfer;
    console.log("dt.files:", dt.files); // add图片
    if (dt && dt.files && dt.files.length > 0) {
        const file = dt.files[0];
        window.currentImageFile = file;
        handleImageUpload(file);
    }
});


// 点击上传区域
dropArea.addEventListener('click', (e) => {
    if (e.target === dropArea || e.target.tagName === 'P' || e.target.tagName === 'I') {
        fileInput.click();
    }
});

// 上传处理
export function handleImageUpload(file) {
    if (!file.type.match('image.*')) {
        alert('Please upload an image file.');
        return;
    }
    window.currentImageFile = file; // add图片

    uploadContainer.classList.add('opacity-50');
    imageAnalysisContainer.classList.remove('hidden');
    imageLoading.classList.remove('hidden');

    const reader = new FileReader();
    reader.onload = e => {
        cxrImage.src = e.target.result;
        imageLoading.classList.add('hidden');
        uploadContainer.classList.add('hidden');
        // 异步进行！
        performClassification(file)
            .then(() => performReportGeneration(file))
            .then(() => addToHistory(file.name))
            .then(async () => {
                // 自动保存触发，把报告和分类结果先保存了
                const saveAllAnalysis = initAutoSave();
                await saveAllAnalysis();
            })
            .catch(err => console.error(err));
    };  
    reader.readAsDataURL(file);
}

// 删除图像
document.addEventListener('click', (e) => {
    if (e.target && (e.target.id === 'remove-image-btn' || e.target.closest('#remove-image-btn'))) {
        e.preventDefault();
        e.stopPropagation();

        fileInput.value = '';
        imageAnalysisContainer.classList.add('hidden');
        uploadContainer.classList.remove('hidden', 'opacity-50');
        cxrImage.src = '';
        resetAnalysisResults();
    }
});

// 重置分析结果
function resetAnalysisResults() {
    // report和observation
    document.getElementById('report-content').classList.add('hidden');
    document.getElementById('observation-content').classList.remove('hidden');

    const reportTab = document.getElementById('report-tab');
    const observationTab = document.getElementById('observation-tab');

    reportTab.classList.remove('border-primary', 'text-primary');
    reportTab.classList.add('border-transparent', 'text-gray-500');
    observationTab.classList.remove('border-transparent', 'text-gray-500');
    observationTab.classList.add('border-primary', 'text-primary');

    //  VQA 区域
    const vqaAnswers = document.getElementById('vqa-answers');
    if (vqaAnswers) vqaAnswers.innerHTML = '';

    // grounding toggle
    const groundingToggle = document.getElementById('visual-grounding-toggle');
    if (groundingToggle) {
        groundingToggle.checked = false;
        groundingToggle.dispatchEvent(new Event('change'));
    }
}

// 下载图像(原始图像和canvas一起下载)
document.addEventListener('click', (e) => {
    if (e.target && e.target.closest('[title="Download"]')) {
        e.preventDefault();
        // console.log(lastBoxes, lastLabels)
        downloadCombinedImage(lastBoxes, lastLabels);
    }
});

function downloadCombinedImage(boxes, labels) {
    const img = document.getElementById('cxr-image');
    const width = img.naturalWidth;
    const height = img.naturalHeight;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(img, 0, 0, width, height);

    boxes.forEach((box, idx) => {
        const [x1, y1, x2, y2] = box;
        const startX = x1 * width;
        const startY = y1 * height;
        const boxWidth = (x2 - x1) * width;
        const boxHeight = (y2 - y1) * height;

        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.strokeRect(startX, startY, boxWidth, boxHeight);

        // ctx.fillStyle = 'red';
        // ctx.font = `${Math.round(width/200)}px Arial`; // 动态字体
        // ctx.fillText(labels[idx], startX, startY - 5);
        ctx.fillStyle = 'red';
        ctx.font = '16px Arial';
        const textY = Math.max(16, startY - 5); // 避免越界
        ctx.fillText(labels[idx], startX, textY);
    });

    const link = document.createElement('a');
    link.download = 'CXR_Analysis.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}