import { performClassification } from './classification.js';
import { addToHistory } from './history.js';

// DOM 引用
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const browseBtn = document.getElementById('browse-btn');
const uploadContainer = document.getElementById('upload-container');
const imageAnalysisContainer = document.getElementById('image-analysis-container');
const imageLoading = document.getElementById('image-loading');
const cxrImage = document.getElementById('cxr-image');

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
dropArea.addEventListener('drop', () => dropArea.classList.remove('drag-over'));

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

    uploadContainer.classList.add('opacity-50');
    imageAnalysisContainer.classList.remove('hidden');
    imageLoading.classList.remove('hidden');

    const reader = new FileReader();
    reader.onload = e => {
        setTimeout(() => {
            cxrImage.src = e.target.result;
            imageLoading.classList.add('hidden');
            uploadContainer.classList.add('hidden');
            performClassification(file);
            addToHistory(file.name);
        }, 1000);
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
        downloadCombinedImage();
    }
});

function downloadCombinedImage() {
    const img = document.getElementById('cxr-image');
    const overlay = document.getElementById('grounding-canvas');
    if (!img.src) {
        alert('No image to download.');
        return;
    }

    const canvas = document.createElement('canvas');
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(img, 0, 0, width, height);

    if (overlay && overlay.width && overlay.height) {
        ctx.drawImage(
            overlay,
            0, 0, overlay.width, overlay.height,
            0, 0, width, height
        );
    }

    // 自动下载为 PNG 文件
    const link = document.createElement('a');
    link.download = 'CXR_Analysis.png';
    link.href = canvas.toDataURL('image/png');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}