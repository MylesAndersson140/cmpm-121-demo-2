import "./style.css";

const APP_NAME = "A Nifty Drawing!";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;
app.innerHTML = `
    <h1>${APP_NAME}</h1>
    <canvas id="canvas" width="256" height="256"></canvas>
    <button id="clearButton">Clear</button>
    <button id="undoButton">Undo</button>
    <button id="redoButton">Redo</button>
`;

//Drew inspiration from line 4, as code was showing warnings previously.
const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
const ctx = canvas.getContext("2d")!;

ctx.fillStyle = "white";
ctx.fillRect(0, 0, canvas.width, canvas.height);

class MarkerLine {
    points: Array<[number,number]> = [];

    constructor(initalX: number, initalY: number) {
        this.points.push([initalX, initalY]);
    }

    drag(x: number, y: number) {
        this.points.push([x, y]);
    }

    display(ctx: CanvasRenderingContext2D) {
        if (this.points.length < 2)
            return;
        ctx.beginPath();
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;

        ctx.moveTo(this.points[0][0], this.points[0][1]);

        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i][0], this.points[i][1]);
        }

        ctx.stroke();
        ctx.closePath();
    }
}

//Setting up the drawing state
let isDrawing = false;
let currentLine: MarkerLine | null = null;
let lines: MarkerLine[] = [];
let redoStack: MarkerLine[] = [];
//type Point = [number, number];
//type Line = Point[];
//let lines: Line[] = [];
//let redoStack: Line[] = [];
//let currentLine: Line;

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
    for (const line of lines){
        line.display(ctx);
    }
}

//Event listener for any drawing changes
canvas.addEventListener('drawing-changed', reDraw);

//Mouse event handlers
canvas.addEventListener("mousedown", (e) => {
    isDrawing = true;
    currentLine = new MarkerLine(e.offsetX, e.offsetY);
    lines.push(currentLine);
    canvas.dispatchEvent(drawingChangedEvent);
});

canvas.addEventListener("mousemove", (e) => {
    if (isDrawing && currentLine) {
        currentLine.drag(e.offsetX, e.offsetY);

        //Event to trigger redraw
        canvas.dispatchEvent(drawingChangedEvent);
    }
});

globalThis.addEventListener("mouseup", (_e) => {
    isDrawing = false;
    currentLine = null;

});
//Undo button
const undoButton = document.querySelector("#undoButton")!;
undoButton.addEventListener("click", () => {
    if (lines.length > 0){
        //Grabbing the most recent drawn line
        const linePopped = lines.pop()!;
        redoStack.push(linePopped);
        canvas.dispatchEvent(drawingChangedEvent);
    }
});

//Redo button
const redoButton = document.querySelector("#redoButton")!;
redoButton.addEventListener("click", () => {
    if (redoStack.length > 0) {
        //Grabbing the most recent undone line
        const redoLine = redoStack.pop()!;
        lines.push(redoLine);
        canvas.dispatchEvent(drawingChangedEvent);
    }
})
//Clear button
const clearButton = document.querySelector("#clearButton")!;
clearButton.addEventListener("click", () => {
    lines = [];
    redoStack = [];
    canvas.dispatchEvent(drawingChangedEvent);
});