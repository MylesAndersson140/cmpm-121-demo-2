import "./style.css";

const APP_NAME = "A Nifty Drawing!";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;
app.innerHTML = `
    <h1>${APP_NAME}</h1>
    <div class="tools">
        <button id="thinMarker" class="selectedTool">Thin Marker</button>
        <button id="thickMarker">Thick Marker</button>
    <div>
    <div class="sticker-tools">
        <button id="fox">🦊</button>
        <button id="elephant">🐘</button>
        <button id="butterfly">🦋</button>
        <button id="giraffe">🦒</button>
    <canvas id="canvas" width="256" height="256"></canvas>
    <div class="controls">
        <button id="clearButton">Clear</button>
        <button id="undoButton">Undo</button>
        <button id="redoButton">Redo</button>
`;

const THIN_MARKER = 2;
const THICK_MARKER = 6;
const STICKER = 25;

//Drew inspiration from line 4, as code was showing warnings previously.
const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
const ctx = canvas.getContext("2d")!;

ctx.fillStyle = "white";
ctx.fillRect(0, 0, canvas.width, canvas.height);

type Tool = {
    type: 'marker' | 'sticker';
    marker?: number;
    sticker?: string;
};

//New interface for drawing
interface DrawCommand {
    display(ctx: CanvasRenderingContext2D): void;
    drag?(x: number, y: number): void;
}

class MarkerPreview implements DrawCommand {
    constructor(private x: number, private y: number, private marker: number){}

    display(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        //Color, size, and intensity of the marker preview
        ctx.arc(this.x, this.y, this.marker / 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,1)";
        ctx.fill();
        ctx.closePath();
    }
}

class StickerPreview implements DrawCommand {
    constructor(private x: number, private y: number, private sticker: string) {}

    display(ctx: CanvasRenderingContext2D) {
        //Color, size, and intensity of the sticker preview
        ctx.font = `${STICKER}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillText(this.sticker, this.x, this.y);
    }
}

class MarkerLine implements DrawCommand {
    points: Array<[number,number]> = [];
    //marker: number;

    constructor(initalX: number, initalY: number, private marker: number) {
        this.points.push([initalX, initalY]);
        //this.marker = marker;
    }

    drag(x: number, y: number) {
        this.points.push([x, y]);
    }

    display(ctx: CanvasRenderingContext2D) {
        if (this.points.length < 2)
            return;

        ctx.beginPath();
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = this.marker;

        ctx.moveTo(this.points[0][0], this.points[0][1]);

        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i][0], this.points[i][1]);
        }

        ctx.stroke();
        ctx.closePath();
    }
}

//Class that assists us in placing the sticker on the canvas
class Sticker implements DrawCommand {
    constructor(private x: number, private y: number, private sticker: string) {}

    drag(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    display(ctx: CanvasRenderingContext2D){
        ctx.font = `${STICKER}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = "#000000";
        ctx.fillText(this.sticker, this.x, this.y);
      }
}

//Setting up the drawing state
let isDrawing = false;
let currCommand: DrawCommand | null = null;
let currPreview: DrawCommand;
let lines: DrawCommand[] = [];
let redoStack: DrawCommand[] = [];
let currTool: Tool = { type: 'marker', marker: THIN_MARKER };

const drawingChangedEvent = new Event('drawing-changed');
const toolMovedEvent = new Event('tool-moved');

//Function to handle drawing
function reDraw(){
    //Clearing the canvas
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    //Iterating through the array and redrawing all the lines
    for (const command of lines){
        command.display(ctx);
    }

    if (!isDrawing && currPreview) {
        currPreview.display(ctx);
    }
}

//Marker selection handlers
const thinMarkerButton = document.querySelector("#thinMarker")!;
const thickMarkerButton = document.querySelector("#thickMarker")!;
const stickerButtons = document.querySelectorAll(".sticker-tools button");

function markerSelection(marker: number) {
    currTool = { type: 'marker', marker };
    document.querySelectorAll('.selectedTool').forEach(el => el.classList.remove('selectedTool'));
    (marker === THIN_MARKER ? thinMarkerButton : thickMarkerButton).classList.add('selectedTool');

}

function stickerSelection(sticker: string){
    currTool = { type: 'sticker', sticker };
    document.querySelectorAll('.selectedTool').forEach(el => el.classList.remove('selectedTool'));
}

thinMarkerButton.addEventListener("click", () => markerSelection(THIN_MARKER));
thickMarkerButton.addEventListener("click", () => markerSelection(THICK_MARKER));
stickerButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        stickerSelection(btn.textContent!);
        canvas.dispatchEvent(toolMovedEvent);
    });
});

//Event listener for any changes
canvas.addEventListener('drawing-changed', reDraw);
canvas.addEventListener('tool-moved', reDraw);

//Mouse event handlers
canvas.addEventListener("mouseenter", (e) => {
    updatePreview(e.offsetX, e.offsetY);
});

canvas.addEventListener("mousedown", (e) => {
    isDrawing = true;
    if (currTool.type === 'marker') {
        currCommand = new MarkerLine(e.offsetX, e.offsetY, currTool.marker!);
    } else {
        currCommand = new Sticker(e.offsetX, e.offsetY, currTool.sticker!);
    }
    lines.push(currCommand);
    redoStack = [];
    canvas.dispatchEvent(drawingChangedEvent);
});

canvas.addEventListener("mousemove", (e) => {
    if (isDrawing && currCommand?.drag) {
        currCommand.drag(e.offsetX, e.offsetY);

        //Event to trigger redraw
        canvas.dispatchEvent(drawingChangedEvent);
    } else {
        updatePreview(e.offsetX, e.offsetY);
    }
});

globalThis.addEventListener("mouseup", (_e) => {
    isDrawing = false;
    currCommand = null;

});

//Helper function that changes the preview type
function updatePreview(x: number, y: number){
    if (currTool.type === 'marker') {
        currPreview = new MarkerPreview(x, y, currTool.marker!);
    } else {
        currPreview = new StickerPreview(x, y, currTool.sticker!);
    }
    canvas.dispatchEvent(toolMovedEvent);
}

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
});

//Clear button
const clearButton = document.querySelector("#clearButton")!;
clearButton.addEventListener("click", () => {
    lines = [];
    redoStack = [];
    canvas.dispatchEvent(drawingChangedEvent);
});