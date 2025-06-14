window.addEventListener('load', () => {
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    const previewCanvas = document.getElementById('previewCanvas');
    const previewCtx = previewCanvas ? previewCanvas.getContext('2d') : null;
    const canvasContainer = document.getElementById('canvasContainer');

    let painting = false;
    let brushColor = '#000000';
    let brushSize = 5;

    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;

    let history = [];
    const MAX_HISTORY_STEPS = 20;

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
        if (previewCanvas) {
            previewCanvas.height = targetHeight; previewCanvas.width = targetWidth;
        }
        ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveState();
    }

    function setActiveTool(toolName, clickedButton) {
        currentTool = toolName;
        console.log("[setActiveTool] Current tool set to:", currentTool); // Logging
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
        if (toolName !== 'text') {
            removeTextEditor();
        }
    }

    function freehandDraw(e) {
        if (!painting) return;
        ctx.lineWidth = brushSize; ctx.lineCap = 'round';
        ctx.strokeStyle = (currentTool === 'eraser') ? 'white' : brushColor;
        const currentX = e.offsetX; const currentY = e.offsetY;
        ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(currentX, currentY); ctx.stroke();
        [lastX, lastY] = [currentX, currentY];
    }

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
        console.log(`[finalizeText] Attempting. Text: "${text}", x: ${x}, y: ${y}, brushColor: ${brushColor}, brushSize: ${brushSize}`);

        // Explicitly check if x and y are valid numbers.
        // parseFloat can return NaN. isNaN() checks this.
        if (isNaN(x) || isNaN(y)) {
            console.error("[finalizeText] Invalid coordinates provided.", { x_coord: x, y_coord: y });
            removeTextEditor();
            return;
        }

        if (text && text.trim() !== '') {
            const fontSize = Math.max(10, parseFloat(brushSize) * 2.5);
            if (isNaN(fontSize) || fontSize <= 0) {
                console.error("[finalizeText] Invalid font size calculated:", fontSize, "from brushSize:", brushSize);
                removeTextEditor();
                return;
            }

            ctx.font = `${fontSize}px sans-serif`;
            ctx.fillStyle = brushColor;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';

            console.log(`[finalizeText] Drawing with font: ${ctx.font}, color: ${ctx.fillStyle}`);
            ctx.fillText(text, x, y);
            saveState();
            console.log("[finalizeText] Text drawn on canvas and state saved.");
        } else {
            console.log("[finalizeText] No text or only whitespace, not drawing.");
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

        console.log(`[createTextEditor] Called with x: ${x}, y: ${y}`);
        console.log(`[createTextEditor] canvas.offsetLeft: ${canvas.offsetLeft}, canvas.offsetTop: ${canvas.offsetTop}`);

        textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.style.position = 'absolute'; // Position relative to the nearest positioned ancestor (canvasContainer)

        // Simplified positioning:
        // Assumes canvas is effectively at (0,0) within canvasContainer,
        // and textInput is a child of canvasContainer.
        // Therefore, canvas-relative click coordinates (x,y) can be used directly
        // for textInput's left/top style when textInput is also child of canvasContainer.
        textInput.style.left = x + 'px';
        textInput.style.top = y + 'px';

        console.log(`[createTextEditor] Using simplified positioning. style.left: ${textInput.style.left}, style.top: ${textInput.style.top}`);

        const fontSize = Math.max(10, parseFloat(brushSize) * 2.5);
        textInput.style.fontSize = `${fontSize}px`;
        textInput.style.fontFamily = 'sans-serif';

        textInput.style.color = '#000000';
        textInput.style.backgroundColor = '#F0F0F0';
        textInput.style.border = '1px solid #333333';

        textInput.style.padding = '2px';
        textInput.style.zIndex = '100';
        textInput.style.minWidth = '100px';
    // textInput.style.width = 'auto'; // Let minWidth and content define width, or set explicitly if needed.
    textInput.style.boxSizing = 'border-box'; // Ensure padding/border don't add to width/height for positioning

    textInput.dataset.x = x; // Still store original canvas-relative coords for drawing
        textInput.dataset.y = y;

        textInput.addEventListener('blur', handleTextInputBlur);
        textInput.addEventListener('keydown', handleTextInputKeydown);

        if (canvasContainer) canvasContainer.appendChild(textInput);
        textInput.focus();
    console.log("[createTextEditor] Text input created, styled, appended, and focused with simplified positioning.");
    }

    function startPosition(e) {
        if (currentTool !== 'text' && textInput) {
            const oldInput = textInput;
            if(oldInput && typeof oldInput.value !== 'undefined' && typeof oldInput.dataset !== 'undefined') {
                 console.log("[startPosition] Finalizing text from previous input due to new canvas interaction.");
                 finalizeText(oldInput.value, parseFloat(oldInput.dataset.x), parseFloat(oldInput.dataset.y));
            } else {
                removeTextEditor(); // Clean up if somehow in a bad state
            }
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
            console.log("[startPosition] Text tool selected. Calling createTextEditor.");
            painting = false;
            createTextEditor(startX, startY);
        }
    }

    function mouseMove(e) {
        if (!painting || !previewCtx) return; // Added !previewCtx check for safety
        const currentX = e.offsetX; const currentY = e.offsetY;

        if (currentTool === 'pen' || currentTool === 'eraser') {
            freehandDraw(e); // This draws on main ctx, no previewCtx needed here
        } else if (currentTool === 'rectangle') {
            previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            previewCtx.strokeStyle = brushColor; previewCtx.lineWidth = brushSize;
            const width = currentX - startX; const height = currentY - startY;
            previewCtx.strokeRect(startX, startY, width, height);
        } else if (currentTool === 'circle') {
            previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            previewCtx.strokeStyle = brushColor; previewCtx.lineWidth = brushSize;
            const radius = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2));
            if (radius > 0) {
                previewCtx.beginPath(); previewCtx.arc(startX, startY, radius, 0, 2 * Math.PI); previewCtx.stroke();
            }
        } else if (currentTool === 'line') {
            previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            previewCtx.strokeStyle = brushColor; previewCtx.lineWidth = brushSize; previewCtx.lineCap = 'round';
            previewCtx.beginPath(); previewCtx.moveTo(startX, startY); previewCtx.lineTo(currentX, currentY); previewCtx.stroke();
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
        if(sizeValueInput) sizeValueInput.style.display = (sizeValueInput.style.display === 'none' || !sizeValueInput.style.display) ? 'inline-block' : 'none';
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
