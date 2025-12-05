import './classification.js'; // 14种疾病分类
import './ground.js' // 画方框
import { handleUpload, initAutoSave, initHistoryList, initHistorySearch } from './history.js';
import {initResizable} from './resize.js'; // 拖拽控制宽度
import { initSubTabs } from './utils.js';  // 切换报告/观察子标签
import './vqa.js'; // 问答部分
import './upload.js'; // 图片上传区域,上传,下载,删除

// 初始化内容
document.addEventListener('DOMContentLoaded', async () => {
    // 等待历史列表加载完成再初始化搜索
    await initHistoryList();
    initHistorySearch();

    // 页面操作监控:调整边框,切换tab
    initResizable();
    initSubTabs();  

    // 初始化自动保存
    initAutoSave();
});

window.isLoadingHistory = false;

// 图片上传监控
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    if (!fileInput) {
        console.error('❌ file-input not found');
        return;
    }

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            await handleUpload(file);
            console.log('✅ Folder created and history updated');
        } catch (err) {
            console.error('❌ Upload error:', err);
            alert(err.message);
        }
    });
});