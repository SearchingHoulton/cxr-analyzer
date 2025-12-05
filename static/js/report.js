// 执行报告生成
export async function performReportGeneration(file) {
    const loadingEl = document.getElementById('report-loading');
    const resultEl = document.getElementById('report-data');

    loadingEl.classList.remove('hidden');
    resultEl.classList.add('hidden');

    const formData = new FormData();
    formData.append('image', file);

    try {
        const res = await fetch('/generate-report', {
            method: 'POST',
            body: formData
        });
        const data = await res.json(); // Flask 返回 JSON
        displayReportResults(data);
    } catch(err) {
        console.error(err);
        alert('Report generation failed.');
    } finally {
        loadingEl.classList.add('hidden');
        resultEl.classList.remove('hidden');
    }
}

// 渲染报告结果
// export function displayReportResults(data) {
//     const findingsEl = document.getElementById('findings');
//     const impressionsEl = document.getElementById('impressions');

//     const lines = data.findings.split('\n');
//     findingsEl.innerHTML = lines.map(line => `<li>${line}</li>`).join('');
//     impressionsEl.textContent = data.impressions || 'No impression.';
// }
export function displayReportResults(data) {
    console.log(data)
    const findingsEl = document.getElementById('findings');
    const impressionsEl = document.getElementById('impressions');
    // 模型输出进行拆分，优先按照\n分割；如果没有，就用'. '（这种情况要在末尾删除一个.）
    if (findingsEl && data.findings) {
        let lines = []
        if (data.findings.includes('\n')) {
            lines = data.findings.split('\n').map(s => s.trim()).filter(Boolean);
        } else {
            lines = data.findings.split('. ').map(s => s.trim()).filter(Boolean);
        }
        findingsEl.innerHTML = lines.map(line => {
            const text = line.endsWith('.') ? line : line + '.';
            return `<li>${text}</li>`;
        }).join('');
    }else if (findingsEl) {
        findingsEl.innerHTML = '<li>No findings.</li>';
    }

    if (impressionsEl) {
        impressionsEl.textContent = data.impressions?.trim() || 'No impression.';
    }
}