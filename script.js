window.addEventListener('load', () => {
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');

    // Set canvas dimensions
    canvas.height = window.innerHeight * 0.75; // Make canvas responsive
    canvas.width = window.innerWidth * 0.9;

    let painting = false;
    let erasing = false;
    let brushColor = '#000000';
    let brushSize = 5;
    let lastX = 0;
    let lastY = 0;

    // Toolbar elements
    const colorPickerButton = document.getElementById('colorPicker');
    const colorValueInput = document.getElementById('colorValue');
    const sizePickerButton = document.getElementById('sizePicker');
    const sizeValueInput = document.getElementById('sizeValue');
    const eraserButton = document.getElementById('eraser');
    const clearButton = document.getElementById('clear'); // We'll handle this in the next step

    function startPosition(e) {
        painting = true;
        [lastX, lastY] = [e.offsetX, e.offsetY];
        draw(e); // Allows drawing dots
    }

    function finishedPosition() {
        painting = false;
        ctx.beginPath(); // Reset path for next drawing operation
    }

    function draw(e) {
        if (!painting) return;

        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';

        if (erasing) {
            ctx.strokeStyle = 'white'; // Eraser uses white color
        } else {
            ctx.strokeStyle = brushColor;
        }

        // Record current mouse position relative to the canvas
        const currentX = e.offsetX;
        const currentY = e.offsetY;

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();

        [lastX, lastY] = [currentX, currentY]; // Update last position
    }

    // Event Listeners for drawing
    canvas.addEventListener('mousedown', startPosition);
    canvas.addEventListener('mouseup', finishedPosition);
    canvas.addEventListener('mouseout', finishedPosition); // Stop drawing if mouse leaves canvas
    canvas.addEventListener('mousemove', draw);

    // Toolbar Event Listeners
    colorPickerButton.addEventListener('click', () => {
        colorValueInput.click(); // Trigger hidden color input
    });

    colorValueInput.addEventListener('input', (e) => {
        brushColor = e.target.value;
        erasing = false; // Turn off eraser when a color is chosen
    });

    sizePickerButton.addEventListener('click', () => {
        // Toggle visibility of the range slider
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
        erasing = true;
        // Optionally, indicate eraser is active, e.g., change button style
    });

    // Resize canvas when window is resized
    window.addEventListener('resize', () => {
        const currentDrawing = ctx.getImageData(0, 0, canvas.width, canvas.height);
        canvas.height = window.innerHeight * 0.75;
        canvas.width = window.innerWidth * 0.9;
        ctx.putImageData(currentDrawing, 0, 0); // Restore drawing
    });

    // Event Listener for Clear Button
    clearButton.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
});
