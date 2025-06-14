window.addEventListener('load', () => {
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    const previewCanvas = document.getElementById('previewCanvas'); // Not used by text tool directly
    const previewCtx = previewCanvas.getContext('2d'); // Not used by text tool directly
    const canvasContainer = document.getElementById('canvasContainer');


    let painting = false;
    let brushColor = '#000000';
    let brushSize = 5; // Will be used as a base for font size too

    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;

    let history = [];
    const MAX_HISTORY_STEPS = 20;

    // --- Element Getters (Toolbar buttons) ---
    const penToolButton = document.getElementById('penTool');
    const colorValueInput = document.getElementById('colorValue');
    const sizePickerButton = document.getElementById('sizePicker');
    const sizeValueInput = document.getElementById('sizeValue');
    const eraserButton = document.getElementById('eraser');
    const clearButton = document.getElementById('clear');
    const undoButton = document.getElementById('undo');
    const rectToolButton = document.getElementById('rectTool');
    const circleToolButton = document.getElementById('circleTool');
    const lineToolButton = document.getElementById('lineTool');
    const textToolButton = document.getElementById('textTool');

    let currentTool = 'pen';
    const toolButtons = [
        penToolButton, eraserButton, rectToolButton,
        circleToolButton, lineToolButton, textToolButton
    ];

    // --- Core Drawing & State Functions (saveState, undoLast, initializeCanvas, setActiveTool, freehandDraw) ---
    function saveState() {
        if (history.length >= MAX_HISTORY_STEPS) { history.shift(); }
        history.push(canvas.toDataURL());
    }
    function undoLast() {
        if (history.length > 0) {
            const lastStateUrl = history.pop();
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = lastStateUrl;
        }
    }
    function initializeCanvas() {
        const targetHeight = window.innerHeight * 0.75;
        const targetWidth = window.innerWidth * 0.9;
        canvas.height = targetHeight; canvas.width = targetWidth;
        previewCanvas.height = targetHeight; previewCanvas.width = targetWidth;
        ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveState();
    }
    function setActiveTool(toolName, clickedButton) {
        currentTool = toolName;
        toolButtons.forEach(button => {
            if (button) button.classList.remove('active-tool');
        });
        if (clickedButton) {
            clickedButton.classList.add('active-tool');
        }
        if (currentTool === 'text') {
            canvas.style.cursor = 'text';
            if (previewCanvas) previewCanvas.style.cursor = 'text';
        } else {
            canvas.style.cursor = 'crosshair';
            if (previewCanvas) previewCanvas.style.cursor = 'crosshair';
        }
        removeTextEditor();
    }
    function freehandDraw(e) {
        if (!painting) return;
        ctx.lineWidth = brushSize; ctx.lineCap = 'round';
        ctx.strokeStyle = (currentTool === 'eraser') ? 'white' : brushColor;
        const currentX = e.offsetX; const currentY = e.offsetY;
        ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(currentX, currentY); ctx.stroke();
        [lastX, lastY] = [currentX, currentY];
    }

    // --- Text Tool Specific Functions ---
    let textInput = null;

    function removeTextEditor() {
        if (textInput) {
            textInput.removeEventListener('blur', handleTextInputBlur);
            textInput.removeEventListener('keydown', handleTextInputKeydown);
            if (textInput.parentNode) {
                textInput.parentNode.removeChild(textInput);
            }
            textInput = null;
        }
    }

    function finalizeText(text, x, y) {
        if (text && text.trim() !== '') {
            const fontSize = Math.max(10, parseFloat(brushSize) * 2.5);
            ctx.font = `${fontSize}px sans-serif`;
            ctx.fillStyle = brushColor;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(text, x, y);
            saveState();
        }
        removeTextEditor();
    }

    function handleTextInputBlur(e) {
        if (textInput && textInput.dataset) {
            finalizeText(e.target.value, parseFloat(textInput.dataset.x), parseFloat(textInput.dataset.y));
        } else {
            removeTextEditor();
        }
    }

    function handleTextInputKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (textInput && textInput.dataset) {
                finalizeText(e.target.value, parseFloat(textInput.dataset.x), parseFloat(textInput.dataset.y));
            }
        } else if (e.key === 'Escape') {
            removeTextEditor();
        }
    }

    function createTextEditor(x, y) {
        removeTextEditor();

        textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.style.position = 'absolute';

        textInput.style.left = (canvas.offsetLeft + x) + 'px';
        textInput.style.top = (canvas.offsetTop + y) + 'px';

        const fontSize = Math.max(10, parseFloat(brushSize) * 2.5);
        textInput.style.fontSize = `${fontSize}px`;
        textInput.style.fontFamily = 'sans-serif';
        textInput.style.color = brushColor;
        textInput.style.border = '1px solid #ccc';
        textInput.style.padding = '2px';
        textInput.style.zIndex = '100';
        textInput.style.width = 'auto';
        textInput.style.minWidth = '100px';

        textInput.dataset.x = x;
        textInput.dataset.y = y;

        textInput.addEventListener('blur', handleTextInputBlur);
        textInput.addEventListener('keydown', handleTextInputKeydown);

        if (canvasContainer) canvasContainer.appendChild(textInput);
        textInput.focus();
    }


    // --- Canvas Event Handlers (mousedown, mousemove, mouseup) ---
    function startPosition(e) {
        if (currentTool !== 'text' && textInput) {
            finalizeText(textInput.value, parseFloat(textInput.dataset.x), parseFloat(textInput.dataset.y));
        }

        painting = true;
        startX = e.offsetX;
        startY = e.offsetY;
        lastX = e.offsetX;
        lastY = e.offsetY;

        if (currentTool === 'pen' || currentTool === 'eraser') {
            freehandDraw(e);
        } else if (currentTool === 'rectangle' || currentTool === 'circle' || currentTool === 'line') {
            if (previewCtx) previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        } else if (currentTool === 'text') {
            painting = false;
            createTextEditor(startX, startY);
        }
    }

    function mouseMove(e) {
        if (!painting) return;
        const currentX = e.offsetX; const currentY = e.offsetY;

        if (currentTool === 'pen' || currentTool === 'eraser') {
            freehandDraw(e);
        } else if (currentTool === 'rectangle') {
            if (previewCtx) {
                previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
                previewCtx.strokeStyle = brushColor; previewCtx.lineWidth = brushSize;
                const width = currentX - startX; const height = currentY - startY;
                previewCtx.strokeRect(startX, startY, width, height);
            }
        } else if (currentTool === 'circle') {
            if (previewCtx) {
                previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
                previewCtx.strokeStyle = brushColor; previewCtx.lineWidth = brushSize;
                const radius = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2));
                if (radius > 0) {
                    previewCtx.beginPath(); previewCtx.arc(startX, startY, radius, 0, 2 * Math.PI); previewCtx.stroke();
                }
            }
        } else if (currentTool === 'line') {
            if (previewCtx) {
                previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
                previewCtx.strokeStyle = brushColor; previewCtx.lineWidth = brushSize; previewCtx.lineCap = 'round';
                previewCtx.beginPath(); previewCtx.moveTo(startX, startY); previewCtx.lineTo(currentX, currentY); previewCtx.stroke();
            }
        }
    }

    function finishedPosition(e) {
        if (currentTool === 'text') {
            painting = false;
            return;
        }

        if (painting) {
            painting = false;
            const currentX = e.offsetX; const currentY = e.offsetY;

            if (currentTool === 'pen' || currentTool === 'eraser') {
                ctx.beginPath(); saveState();
            } else if (currentTool === 'rectangle') {
                if (previewCtx) previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
                ctx.strokeStyle = brushColor; ctx.lineWidth = brushSize;
                const width = currentX - startX; const height = currentY - startY;
                if (width !== 0 || height !== 0) { ctx.strokeRect(startX, startY, width, height); }
                saveState();
            } else if (currentTool === 'circle') {
                if (previewCtx) previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
                ctx.strokeStyle = brushColor; ctx.lineWidth = brushSize;
                const radius = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2));
                if (radius > 0) {
                    ctx.beginPath(); ctx.arc(startX, startY, radius, 0, 2 * Math.PI); ctx.stroke();
                }
                saveState();
            } else if (currentTool === 'line') {
                if (previewCtx) previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
                ctx.strokeStyle = brushColor; ctx.lineWidth = brushSize; ctx.lineCap = 'round';
                if (startX !== currentX || startY !== currentY) {
                    ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(currentX, currentY); ctx.stroke();
                }
                saveState();
            }
        }
    }

    canvas.addEventListener('mousedown', startPosition);
    canvas.addEventListener('mouseup', finishedPosition);
    canvas.addEventListener('mouseout', (e) => { if (painting && currentTool !== 'text') { finishedPosition(e); } });
    canvas.addEventListener('mousemove', mouseMove);

    if (penToolButton) penToolButton.addEventListener('click', () => setActiveTool('pen', penToolButton));
    if (colorValueInput) colorValueInput.addEventListener('input', (e) => { brushColor = e.target.value; });
    if (sizePickerButton) sizePickerButton.addEventListener('click', () => {
        if(sizeValueInput) sizeValueInput.style.display = sizeValueInput.style.display === 'none' ? 'inline-block' : 'none';
    });
    if (sizeValueInput) sizeValueInput.addEventListener('input', (e) => { brushSize = e.target.value; });
    if (eraserButton) eraserButton.addEventListener('click', () => setActiveTool('eraser', eraserButton));
    if (rectToolButton) rectToolButton.addEventListener('click', () => setActiveTool('rectangle', rectToolButton));
    if (circleToolButton) circleToolButton.addEventListener('click', () => setActiveTool('circle', circleToolButton));
    if (lineToolButton) lineToolButton.addEventListener('click', () => setActiveTool('line', lineToolButton));
    if (textToolButton) textToolButton.addEventListener('click', () => setActiveTool('text', textToolButton));

    if (clearButton) clearButton.addEventListener('click', () => {
        removeTextEditor();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (previewCtx) previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        saveState();
    });
    if (undoButton) undoButton.addEventListener('click', () => {
        removeTextEditor();
        undoLast();
    });

    window.addEventListener('resize', () => {
        removeTextEditor();
        const currentDrawingDataUrl = canvas.toDataURL();
        const targetHeight = window.innerHeight * 0.75; const targetWidth = window.innerWidth * 0.9;
        canvas.height = targetHeight; canvas.width = targetWidth;
        if (previewCanvas) {
            previewCanvas.height = targetHeight; previewCanvas.width = targetWidth;
        }
        const img = new Image();
        img.onload = () => {
            ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = currentDrawingDataUrl;
        history = []; setTimeout(() => { saveState(); }, 100);
    });

    initializeCanvas();
    setActiveTool('pen', penToolButton);
});
