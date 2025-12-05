import { showNotification } from './utils.js'

// 在文件顶部声明
export let lastBoxes = [];
export let lastLabels = [];

// 添加设置函数
export function setLastGrounding(boxes, labels) {
    lastBoxes = boxes;
    lastLabels = labels;
}

export function drawBoundingBox(boxes, labels) {
    const canvas = document.getElementById('grounding-canvas');
    const image = document.getElementById('cxr-image');
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 容器尺寸
    const container = image.parentElement;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // 图片显示尺寸和偏移（考虑 object-contain）
    const imgAspect = image.naturalWidth / image.naturalHeight;
    const containerAspect = containerWidth / containerHeight;

    let imgDisplayWidth, imgDisplayHeight;
    let offsetX = 0, offsetY = 0;

    if (imgAspect > containerAspect) {
        // 宽度撑满
        imgDisplayWidth = containerWidth;
        imgDisplayHeight = containerWidth / imgAspect;
        offsetY = (containerHeight - imgDisplayHeight) / 2;
    } else {
        // 高度撑满
        imgDisplayHeight = containerHeight;
        imgDisplayWidth = containerHeight * imgAspect;
        offsetX = (containerWidth - imgDisplayWidth) / 2;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    boxes.forEach((box, idx) => {
        const [x1, y1, x2, y2] = box;
        const startX = x1 * imgDisplayWidth + offsetX;
        const startY = y1 * imgDisplayHeight + offsetY;
        const width = (x2 - x1) * imgDisplayWidth;
        const height = (y2 - y1) * imgDisplayHeight;

        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.strokeRect(startX, startY, width, height);

        ctx.fillStyle = 'red';
        ctx.font = '16px Arial';
        ctx.fillText(labels[idx], startX, startY - 5);
    });
}

// 监听器负责初始化Canvas大小与事件
document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('visual-grounding-toggle');
    const image = document.getElementById('cxr-image');
    const canvas = document.getElementById('grounding-canvas');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        const canvas = document.getElementById('grounding-canvas');
        const image = document.getElementById('cxr-image');
        const container = image.parentElement;
        if (!canvas || !image || !container) return;
    
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    
        if (lastBoxes.length > 0) {
            drawBoundingBox(lastBoxes, lastLabels);
        }
    }

    window.addEventListener('resize', resizeCanvas);
    document.getElementById('cxr-image').addEventListener('load', resizeCanvas);

    async function imgToFile(img) {
        try {
            const response = await fetch(img.src);
            const blob = await response.blob();
            return new File([blob], 'image.png', { type: blob.type });
        } catch (err) {
            console.error('转换图片为文件失败', err);
            return null;
        }
    }

    async function fetchGrounding(file) {
        if (!file) return { boxes: [], labels: [] };
    
        const formData = new FormData();
        formData.append('image', file);
    
        try {
            const response = await fetch('/grounding', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            console.log('Raw grounding data from server:', data);
    
            const boxes = [];
            const labels = [];
    
            if (!data.findings || !Array.isArray(data.findings) || data.findings.length === 0) {
                console.warn('No findings returned from grounding API.');
                return { boxes, labels };
            }
    
            data.findings.forEach(f => {
                if (!f.bbox || !f.label) {
                    console.warn('Skipping invalid finding:', f);
                    return;
                }
    
                let x1, y1, x2, y2;
                const maxVal = Math.max(...f.bbox);
                if (maxVal > 1) { // 像素坐标
                    x1 = f.bbox[0] / image.naturalWidth;
                    y1 = f.bbox[1] / image.naturalHeight;
                    x2 = f.bbox[2] / image.naturalWidth;
                    y2 = f.bbox[3] / image.naturalHeight;
                } else { // 已经是归一化坐标
                    [x1, y1, x2, y2] = f.bbox;
                }
    
                boxes.push([x1, y1, x2, y2]);
                labels.push(f.label);
            });
            return { boxes, labels };
        } catch (err) {
            return { boxes: [], labels: [] };
        }
    }
    
    toggle.addEventListener('change', async () => {
        // 如果正在加载历史，则不触发保存
        if (window.isLoadingHistory) return; 
    
        if (toggle.checked) {
            if (!image) return;
            try {
                const file = await imgToFile(image);
                const { boxes, labels } = await fetchGrounding(file);
                lastBoxes = boxes;
                lastLabels = labels;
                drawBoundingBox(boxes, labels);
                // 如果没有可画的显示没有通知，有的话显示已经绘制x个box
                if (boxes.length > 0) {
                    drawBoundingBox(boxes, labels);
                    showNotification(`Drawn ${boxes.length} boxes`, 'info');
                } else {
                    showNotification('No boxes detected to draw', 'warning');
                }
            } catch (err) {
                console.error('Visual grounding failed:', err);
                toggle.checked = false;
            }
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            lastBoxes = [];
            lastLabels = [];
        }
    });
    
});