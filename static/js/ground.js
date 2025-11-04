import { saveAnalysisResult} from './history.js';

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
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    boxes.forEach((box, idx) => {
        const [x1, y1, x2, y2] = box;
        const startX = x1 * canvas.width;
        const startY = y1 * canvas.height;
        const width = (x2 - x1) * canvas.width;
        const height = (y2 - y1) * canvas.height;

        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.strokeRect(startX, startY, width, height);

        ctx.fillStyle = 'red';
        ctx.font = '16px Arial';
        ctx.fillText(labels[idx], startX, startY - 5);
    });
}

// visualGrounding.js
document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('visual-grounding-toggle');
    const image = document.getElementById('cxr-image');
    const canvas = document.getElementById('grounding-canvas');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        canvas.width = image.clientWidth;
        canvas.height = image.clientHeight;
        if (lastBoxes.length > 0) {
            drawBoundingBox(lastBoxes, lastLabels);
        }
    }

    window.addEventListener('resize', resizeCanvas);
    image.addEventListener('load', resizeCanvas);

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

    // function drawBoundingBox(boxes, labels) {
    //     ctx.clearRect(0, 0, canvas.width, canvas.height);
    //     boxes.forEach((box, idx) => {
    //         const [x1, y1, x2, y2] = box;
    //         const startX = x1 * canvas.width;
    //         const startY = y1 * canvas.height;
    //         const width = (x2 - x1) * canvas.width;
    //         const height = (y2 - y1) * canvas.height;

    //         ctx.strokeStyle = 'red';
    //         ctx.lineWidth = 2;
    //         ctx.strokeRect(startX, startY, width, height);

    //         ctx.fillStyle = 'red';
    //         ctx.font = '16px Arial';
    //         ctx.fillText(labels[idx], startX, startY - 5);
    //     });
    // }

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
    

    // 监听toggle
    // toggle.addEventListener('change', async () => {
    //     if (window.isLoadingHistory) return;

    //     // 历史加载时直接显示已有boxes/labels，不触发新分析
    //     if (window.isLoadingHistory) {
    //         if (toggle.checked) {
    //             drawBoundingBox(lastBoxes, lastLabels);
    //         } else {
    //             ctx.clearRect(0, 0, canvas.width, canvas.height);
    //         }
    //         return;
    //     }
    //     // 新分析逻辑
    //     if (toggle.checked) {
    //         if (!image) return;

    //         try {
    //             const file = await imgToFile(image);
    //             const { boxes, labels } = await fetchGrounding(file);
    //             // 保存到 lastBoxes/lastLabels
    //             lastBoxes = boxes;
    //             lastLabels = labels;
    //             drawBoundingBox(boxes, labels);

    //             // 保存到后端：一定要传 lastBoxes/lastLabels
    //             saveAnalysisResult('grounding', { boxes: lastBoxes, labels: lastLabels });
    //         } catch (err) {
    //             console.error('Visual grounding failed:', err);
    //             toggle.checked = false;
    //         }
    //     } else {
    //         ctx.clearRect(0, 0, canvas.width, canvas.height);
    //         lastBoxes = [];
    //         lastLabels = [];

    //         // 清空后端记录
    //         saveAnalysisResult('grounding', { boxes: lastBoxes, labels: lastLabels });
    //     }
    // });
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
                // saveAnalysisResult('grounding', { boxes: lastBoxes, labels: lastLabels }); // 用户操作保存
            } catch (err) {
                console.error('Visual grounding failed:', err);
                toggle.checked = false;
            }
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            lastBoxes = [];
            lastLabels = [];
            // saveAnalysisResult('grounding', { boxes: lastBoxes, labels: lastLabels }); // 用户操作保存
        }
    });
    
});