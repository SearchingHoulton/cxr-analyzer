// 显示消息提示函数
const notification = document.getElementById('notification');
export function showNotification(message, type) {
    // 设置消息内容和类型
    notification.textContent = message;
    notification.className = `notification ${type}`;
    
    // 显示消息
    notification.classList.add('show');
    
    // 3秒后隐藏消息
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// 切换tab
export function initSubTabs() {
    const tabs = {
        report: document.getElementById('report-tab'),
        observation: document.getElementById('observation-tab')
    };

    const contents = {
        report: document.getElementById('report-content'),
        observation: document.getElementById('observation-content')
    };

    if (!tabs.report || !tabs.observation) {
        console.warn('Sub-tabs not found in DOM.');
        return;
    }

    // 绑定点击事件
    tabs.report.addEventListener('click', () => switchSubTab('report', tabs, contents));
    tabs.observation.addEventListener('click', () => switchSubTab('observation', tabs, contents));

    // 默认显示 Report
    switchSubTab('report', tabs, contents);

    // 监听 classification-data 状态变化
    const classificationData = document.getElementById('classification-data');
    if (classificationData) {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.attributeName === 'class' && !classificationData.classList.contains('hidden')) {
                    // 此处可扩展自动生成报告逻辑
                }
            }
        });
        observer.observe(classificationData, { attributes: true });
    }
}

function switchSubTab(tabName, tabs, contents) {
    const activeClasses = ['text-primary', 'border-primary'];
    const inactiveClasses = ['text-gray-500', 'border-transparent'];

    Object.keys(tabs).forEach((key) => {
        const isActive = key === tabName;
        tabs[key].classList.toggle('text-primary', isActive);
        tabs[key].classList.toggle('border-primary', isActive);
        tabs[key].classList.toggle('text-gray-500', !isActive);
        tabs[key].classList.toggle('border-transparent', !isActive);
        contents[key].classList.toggle('hidden', !isActive);
    });
}