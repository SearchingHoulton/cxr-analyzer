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
    container.innerHTML = data.map(obs => `
        <div class="observation-badge observation-${obs.present ? 'positive' : 'negative'}">
            <div class="flex items-center justify-between w-full">
                <span>${obs.observation}</span>
                <span class="text-xs ml-2">${obs.confidence}%</span>
            </div>
        </div>
    `).join('');
}