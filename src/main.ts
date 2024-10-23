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

type Point = [number, number];
type Line = Point[];
let lines: Line[] = [];
let currentLine: Line = [];

const drawingChangedEvent = new Event('drawing-changed');

//Function to handle drawing
function reDraw(){
    //Clearing the canvas
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    //Line style
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;

    //Iterating through the array and redrawing all the lines
    lines.forEach(line => {
        if (line.length < 2)
            return;

        ctx.beginPath();
        ctx.moveTo(line[0][0], line[0][1]);

        for (let i = 1; i < line.length; i++){
            ctx.lineTo(line[i][0], line[i][1]);
        }

        ctx.stroke();
        ctx.closePath();
    });
}

//Event listener for any drawing changes
canvas.addEventListener('drawing-changed', reDraw);

//Mouse event handlers
canvas.addEventListener("mousedown", (e) => {
    isDrawing = true;
    x = e.offsetX;
    y = e.offsetY;
    currentLine = [[x, y]];
    lines.push(currentLine);
});

canvas.addEventListener("mousemove", (e) => {
    if (isDrawing) {
        x = e.offsetX;
        y = e.offsetY;
        currentLine.push([x, y]);

        //Event to trigger redraw
        canvas.dispatchEvent(drawingChangedEvent);
    }
});

window.addEventListener("mouseup", (e) => {
    if (isDrawing){
        isDrawing = false;
        currentLine = [];
    }
});

//Clear button
const clearButton = document.querySelector("#clearButton")!;

clearButton.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});