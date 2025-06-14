window.addEventListener('load', () => {
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');

    canvas.height = window.innerHeight * 0.75;
    canvas.width = window.innerWidth * 0.9;

    let painting = false;
    let erasing = false;
    let brushColor = '#000000';
    let brushSize = 5;
    let lastX = 0;
    let lastY = 0;

    // History for Undo
    let history = [];
    const MAX_HISTORY_STEPS = 20; // Max number of undo steps

    // Toolbar elements
    const colorPickerButton = document.getElementById('colorPicker');
    const colorValueInput = document.getElementById('colorValue');
    const sizePickerButton = document.getElementById('sizePicker');
    const sizeValueInput = document.getElementById('sizeValue');
    const eraserButton = document.getElementById('eraser');
    const clearButton = document.getElementById('clear');
    const undoButton = document.getElementById('undo'); // New Undo button

    // Function to save current canvas state
    function saveState() {
        if (history.length >= MAX_HISTORY_STEPS) {
            history.shift(); // Remove oldest state if history is full
        }
        history.push(canvas.toDataURL()); // Save as data URL
        // console.log("State saved. History size:", history.length);
    }

    // Function to undo the last action
    function undoLast() {
        if (history.length > 0) {
            const lastStateUrl = history.pop();
            // console.log("Undoing. History size:", history.length);
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas before redrawing
                ctx.drawImage(img, 0, 0);
            };
            img.src = lastStateUrl;
        } else {
            // console.log("No more history to undo.");
            // Optionally, provide feedback to the user, e.g., disable undo button
        }
    }

    // Save initial blank state
    saveState();


    function setActiveTool(tool) {
        eraserButton.classList.remove('active-tool');
        colorPickerButton.classList.remove('active-tool');
        if (tool === 'eraser') {
            eraserButton.classList.add('active-tool');
            erasing = true;
        } else {
            colorPickerButton.classList.add('active-tool');
            erasing = false;
        }
    }
    setActiveTool('pen');

    function startPosition(e) {
        painting = true;
        [lastX, lastY] = [e.offsetX, e.offsetY];
        // For continuous drawing, we save state on mouseup.
        // If you want to save state before a new line starts (even if it's just a dot),
        // you could call saveState() here, but it might be too frequent.
        // Let's stick to saving on mouseup for distinct actions.
        draw(e); // Allows drawing dots
    }

    function finishedPosition() {
        if (painting) {
            painting = false;
            ctx.beginPath();
            saveState(); // Save state when a drawing action is completed
        }
    }

    function draw(e) {
        if (!painting) return;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        if (erasing) {
            ctx.strokeStyle = 'white';
        } else {
            ctx.strokeStyle = brushColor;
        }
        const currentX = e.offsetX;
        const currentY = e.offsetY;
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
        [lastX, lastY] = [currentX, currentY];
    }

    canvas.addEventListener('mousedown', startPosition);
    canvas.addEventListener('mouseup', finishedPosition);
    canvas.addEventListener('mouseout', finishedPosition); // Also save state if mouse leaves canvas while painting
    canvas.addEventListener('mousemove', draw);

    colorPickerButton.addEventListener('click', () => {
        setActiveTool('pen');
        colorValueInput.click();
    });

    colorValueInput.addEventListener('input', (e) => {
        brushColor = e.target.value;
        setActiveTool('pen');
    });

    sizePickerButton.addEventListener('click', () => {
        if (sizeValueInput.style.display === 'none') {
            sizeValueInput.style.display = 'inline-block';
        } else {
            sizeValueInput.style.display = 'none';
        }
    });

    sizeValueInput.addEventListener('input', (e) => {
        brushSize = e.target.value;
    });

    eraserButton.addEventListener('click', () => {
        setActiveTool('eraser');
    });

    clearButton.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        saveState(); // Save the cleared state so it can be part of history
    });

    undoButton.addEventListener('click', () => {
        undoLast();
    });

    window.addEventListener('resize', () => {
        // Managing history on resize is tricky.
        // For simplicity, current drawing is restored, but undo history might become misaligned.
        // A more robust solution would be to redraw history items or clear history.
        // For now, let's keep the current behavior and note this limitation.
        const currentDrawingDataUrl = canvas.toDataURL(); // Get current drawing before resize

        canvas.height = window.innerHeight * 0.75;
        canvas.width = window.innerWidth * 0.9;

        // Restore the drawing after resize
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
        };
        img.src = currentDrawingDataUrl;

        // After resizing and restoring, the old history might not map perfectly.
        // It's often best to clear history or re-evaluate.
        // For this version, we'll leave history as is, but it's a point for future improvement.
        // To be safe, we could clear history:
        // history = [];
        // saveState(); // Save the resized (and hopefully restored) state as the new initial state.
        // This would mean undo history is lost on resize.
        // Let's try to save the current state after resize.
        // Delay slightly to ensure drawing is restored.
        setTimeout(() => {
            // Clear history because previous states were for a different canvas size
            history = [];
            saveState();
        }, 100);
    });
});
