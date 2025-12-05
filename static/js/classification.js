// 执行分类
export async function performClassification(file) {
    const loadingEl = document.getElementById('classification-loading');
    const resultEl = document.getElementById('classification-data');

    loadingEl.classList.remove('hidden');
    resultEl.classList.add('hidden');

    const formData = new FormData();
    formData.append('image', file);

    try {
        const res = await fetch('/classify', {
            method: 'POST',
            body: formData
        });
        const data = await res.json(); // Flask 返回 JSON
        console.log(data);
        displayResults(data);
    } catch(err) {
        console.error(err);
        alert('Classification failed.');
    } finally {
        loadingEl.classList.add('hidden');
        resultEl.classList.remove('hidden');
    }
}

// 渲染结果
export function displayResults(data) {
    const container = document.querySelector('#classification-data .grid');
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(4, 1fr)';
    container.style.gap = '10px';

    container.innerHTML = data.map(obs => `
        <div class="observation-badge observation-${obs.present ? 'positive' : 'negative'}">
            <div class="flex items-center justify-between w-full">
                <span>${obs.observation}</span>
                <span class="text-xs ml-2">${obs.confidence}%</span>
            </div>
        </div>
    `).join('');

    const chartCanvas = document.getElementById('classification-chart');

    // 销毁旧实例
    if (chartCanvas._chartInstance) {
        chartCanvas._chartInstance.destroy();
        chartCanvas._chartInstance = null;
    }

    const ctx = chartCanvas.getContext('2d');
    const chartData = {
        labels: data.map(d => d.observation),
        datasets: [{
            label: 'Confidence %',
            data: data.map(d => d.confidence),
            backgroundColor: data.map(d => d.present ? 'rgba(239,68,68,0.7)' : 'rgba(34,197,94,0.7)'),
        }]
    };

    // 创建新实例并保存
    const chart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, max: 100 } }
        }
    });
    chartCanvas._chartInstance = chart;
}