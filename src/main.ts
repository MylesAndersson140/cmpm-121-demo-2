import "./style.css";

const APP_NAME = "A Nifty Drawing!";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;
app.innerHTML = `
    <h1>${APP_NAME}</h1>
    <canvas id="canvas" width="256" height="256"></canvas>
    <button id="clearButton">Clear</button>
`;

//Drew inspiration from line 4, as code was showing warnings previously.
const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
const ctx = canvas.getContext("2d")!;

ctx.fillStyle = "white";
ctx.fillRect(0, 0, canvas.width, canvas.height);

//Setting up the drawing state
let isDrawing = false;
let x = 0;
let y = 0;

canvas.addEventListener("mousedown", (e) => {
    x = e.offsetX;
    y = e.offsetY;
    isDrawing = true;
});

canvas.addEventListener("mousemove", (e) => {
    if (isDrawing) {
        drawLine(ctx, x, y, e.offsetX, e.offsetY);
        x = e.offsetX;
        y = e.offsetY;
    }
});

window.addEventListener("mouseup", (e) => {
    if (isDrawing){
        drawLine(ctx, x, y, e.offsetX, e.offsetY);
        x = 0;
        y = 0;
        isDrawing = false;
    }
});

//Line aspects
ctx.strokeStyle = "#000000";
ctx.lineWidth = 2;

function drawLine(ctx, x1, y1, x2, y2){
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.closePath();
}

const clearButton = document.querySelector("#clearButton")!;

clearButton.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});