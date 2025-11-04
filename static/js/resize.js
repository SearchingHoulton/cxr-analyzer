// 用鼠标拖动控制侧边栏的宽度
export function initResizable() {
    function makeResizable(handleClass, targetId, direction) {
        const handle = document.querySelector(`#${targetId} .${handleClass}`);
        const target = document.getElementById(targetId);
        let isResizing = false;
        let startX, startWidth;

        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = target.offsetWidth;
            document.body.style.cursor = 'col-resize';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const delta = direction === 'left' ? e.clientX - startX : startX - e.clientX;
            const newWidth = startWidth + delta;
            const minWidth = parseInt(target.style.minWidth) || 200;
            const maxWidth = parseInt(target.style.maxWidth) || 500;

            if (newWidth >= minWidth && newWidth <= maxWidth) {
                target.style.width = newWidth + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            isResizing = false;
            document.body.style.cursor = 'default';
        });
    }

    makeResizable('resize-handle-left', 'history-sidebar', 'left');
    makeResizable('resize-handle-right', 'vqa-sidebar', 'right');
}