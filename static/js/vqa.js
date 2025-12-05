const vqaQuestion = document.getElementById('vqa-question');
const vqaSubmit = document.getElementById('vqa-submit');
const vqaLoading = document.getElementById('vqa-loading');
const vqaAnswers = document.getElementById('vqa-answers');

vqaSubmit.addEventListener('click', processVQAQuestion);
vqaQuestion.addEventListener('keypress', e => { if(e.key==='Enter') processVQAQuestion(); });

export async function processVQAQuestion() {
    const q = vqaQuestion.value.trim();
    if (!q) return;

    vqaLoading.classList.remove('hidden');
    vqaQuestion.value = '';

    // 先显示问题，保留一个 div 用来显示答案
    const el = document.createElement('div');
    el.className = 'p-3 bg-neutral rounded-lg animate-fadeIn';
    el.innerHTML = `
        <div class="flex items-start mb-2">
            <div class="bg-primary/10 text-primary p-1.5 rounded-full mr-3 mt-0.5">
                <i class="fa fa-question text-sm"></i>
            </div>
            <div class="flex-grow">
                <p class="text-gray-800 text-sm">${q}</p>
            </div>
        </div>
        <div class="flex items-start ml-8 relative">
            <div class="bg-success/10 text-success p-1.5 rounded-full mr-3 mt-0.5">
                <i class="fa fa-check text-sm"></i>
            </div>
            <div class="flex-grow relative">
                <p class="text-gray-700 text-sm pr-6">...</p>
                <button class="absolute top-0 right-0 text-gray-400 hover:text-primary transition-colors text-xs copy-btn" title="Copy">
                    <i class="fa fa-clone"></i>
                </button>
            </div>
        </div>`;

    vqaAnswers.appendChild(el);
    vqaAnswers.scrollTop = vqaAnswers.scrollHeight;

    const answerP = el.querySelector('p.text-gray-700');  // 用来填答案
    const copyBtn = el.querySelector('.copy-btn');
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(answerP.textContent);
        copyBtn.innerHTML = '<i class="fa fa-check text-green-500"></i>';
        setTimeout(() => copyBtn.innerHTML = '<i class="fa fa-clone"></i>', 1200);
    });

    try {
        if (!window.currentImageFile) {
            alert('No image loaded.');
            vqaLoading.classList.add('hidden');
            return;
        }

        const formData = new FormData();
        formData.append('image', window.currentImageFile, window.currentImageFile.name);
        formData.append('question', q);

        const res = await fetch('/vqa', { method: 'POST', body: formData });
        const data = await res.json();

        if (res.ok) {
            // 用 marked 渲染答案
            answerP.innerHTML = marked.parse(data.answer);
        } else {
            answerP.textContent = 'Error: ' + (data.error || 'Unknown error');
        }
    } catch (err) {
        answerP.textContent = 'Error: ' + err.message;
    } finally {
        vqaLoading.classList.add('hidden');
    }
}


// 问答部分
export function addVQAAnswer(q, a) {
    // 删除无问题提示
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
                <p class="text-gray-800 text-sm">${q}</p>
            </div>
        </div>
        <div class="flex items-start ml-8 relative">
            <div class="bg-success/10 text-success p-1.5 rounded-full mr-3 mt-0.5">
                <i class="fa fa-check text-sm"></i>
            </div>
            <div class="flex-grow relative">
                <p class="text-gray-700 text-sm pr-6">${marked.parse(a)}</p>
                <button class="absolute top-0 right-0 text-gray-400 hover:text-primary transition-colors text-xs copy-btn" title="Copy">
                    <i class="fa fa-clone"></i>
                </button>
            </div>
        </div>`;

    // 旧到新：直接加到末尾
    vqaAnswers.appendChild(el);
    vqaAnswers.scrollTop = vqaAnswers.scrollHeight;

    // 复制功能
    const copyBtn = el.querySelector('.copy-btn');
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(a);
        copyBtn.innerHTML = '<i class="fa fa-check text-green-500"></i>';
        setTimeout(() => copyBtn.innerHTML = '<i class="fa fa-clone"></i>', 1200);
    });
}

// 粘贴问答功能
const vqaInput = document.getElementById('vqa-question');
const quickButtons = document.querySelectorAll('.flex.flex-wrap.gap-2 button');
quickButtons.forEach(button => {
    button.addEventListener('click', () => {
        vqaInput.value = button.textContent.trim();
        vqaInput.focus();
    });
});