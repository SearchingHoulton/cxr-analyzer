const vqaQuestion = document.getElementById('vqa-question');
const vqaSubmit = document.getElementById('vqa-submit');
const vqaLoading = document.getElementById('vqa-loading');
const vqaAnswers = document.getElementById('vqa-answers');

vqaSubmit.addEventListener('click', processVQAQuestion);
vqaQuestion.addEventListener('keypress', e => { if(e.key==='Enter') processVQAQuestion(); });

export function processVQAQuestion(){
    const q = vqaQuestion.value.trim();
    if(!q) return;
    vqaLoading.classList.remove('hidden');
    vqaQuestion.value='';
    setTimeout(()=>{
        const a = generateVQAAnswer(q);
        addVQAAnswer(q,a);
        vqaLoading.classList.add('hidden');
    },1500);
}

export function generateVQAAnswer(q){
    const lq = q.toLowerCase();
    if(lq.includes('heart')||lq.includes('cardiomegaly')) return `There is ${Math.floor(Math.random()*30+60)}% confidence of cardiomegaly (enlarged heart) observed in the image.`;
    if(lq.includes('lung')||lq.includes('pulmonary')){
        const f=['mild opacity','no significant abnormalities','possible consolidation','clear lung fields'];
        return `The lungs show ${f[Math.floor(Math.random()*f.length)]}.`;
    }
    if(lq.includes('fracture')) return Math.random()>0.7?'There appears to be a possible fracture in the left rib cage.':'No evidence of fractures detected in the image.';
    if(lq.includes('effusion')||lq.includes('fluid')) return Math.random()>0.6?'A small pleural effusion is noted on the right side.':'No pleural effusions identified.';
    const res=['No significant abnormalities detected in relation to your question.',
        'The image shows some findings that may be relevant to your question, but further clinical correlation is recommended.',
        'Based on the analysis, the answer to your question is negative.',
        'There is moderate evidence supporting a positive answer to your question.'];
    return res[Math.floor(Math.random()*res.length)];
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
                <p class="text-gray-700 text-sm pr-6">${a}</p>
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