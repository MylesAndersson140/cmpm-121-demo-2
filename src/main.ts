import "./style.css";

const APP_NAME = "A Nifty Safari!";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;
app.innerHTML = `
    <h1>${APP_NAME}</h1>
    <div class="tools">
        <button id="thinMarker" class="selectedTool">Thin Marker</button>
        <button id="thickMarker">Thick Marker</button>
    <div>
    <div class="sticker-tools">
        <button id="fox" class="sticker-btn">🐯</button>
        <button id="elephant" class="sticker-btn">🐘</button>
        <button id="butterfly" class="sticker-btn">🦁</button>
        <button id="giraffe" class="sticker-btn">🦒</button>
        <button id="addCustomSticker">+ Add Custom</button>
    <div>
    <canvas id="canvas" width="256" height="256"></canvas>
    <div class="controls">
        <button id="clearButton">Clear</button>
        <button id="undoButton">Undo</button>
        <button id="redoButton">Redo</button>
        <button id="exportButton">Export</button>
    <div>
`;

const THIN_MARKER = 3;
const THICK_MARKER = 7;
const STICKER = 30;
const EXPORT_SCALE = 4; //4x larger

//Drew inspiration from line 4, as code was showing warnings previously.
const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
const ctx = canvas.getContext("2d")!;

ctx.fillStyle = "white";
ctx.fillRect(0, 0, canvas.width, canvas.height);

type Tool = {
    type: 'marker' | 'sticker';
    marker?: number;
    sticker?: string;
    color?: string;
};

//New interface for drawing
interface DrawCommand {
    display(ctx: CanvasRenderingContext2D): void;
    drag?(x: number, y: number): void;
}

class MarkerPreview implements DrawCommand {
    constructor(
        private x: number, 
        private y: number, 
        private marker: number,
        private color: string
    ){}
    
    display(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        //Color, size, and intensity of the marker preview
        ctx.arc(this.x, this.y, this.marker / 2, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }
}

class StickerPreview implements DrawCommand {
    private rotation: number;

    constructor(private x: number, private y: number, private sticker: string) {
    this.rotation = 0;
    }

    display(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        //Color, size, and intensity of the sticker preview
        ctx.font = `${STICKER}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillText(this.sticker, 0, 0);
        ctx.restore();
    }
}

class MarkerLine implements DrawCommand {
    points: Array<[number,number]> = [];

    constructor(
        initalX: number,
        initalY: number,
        private marker: number,
        private color: string
    ) {
        this.points.push([initalX, initalY]);
    }

    drag(x: number, y: number) {
        this.points.push([x, y]);
    }

    display(ctx: CanvasRenderingContext2D) {
        if (this.points.length < 2)
            return;

        ctx.beginPath();
        ctx.strokeStyle = this.color;
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
    private rotation: number;

    constructor(private x: number, private y: number, private sticker: string) {
        this.rotation = (Math.random() * 30 - 15) * Math.PI / 90;
    }

    drag(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    display(ctx: CanvasRenderingContext2D){
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        ctx.font = `${STICKER}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = "#000000";
        ctx.fillText(this.sticker, 0, 0);

        ctx.restore();
      }
}

//Setting up the drawing state
let isDrawing = false;
let currCommand: DrawCommand | null = null;
let currPreview: DrawCommand;
let lines: DrawCommand[] = [];
let redoStack: DrawCommand[] = [];
let currTool: Tool = {type: 'marker', marker: THIN_MARKER, color: '#000000'};

const drawingChangedEvent = new Event('drawing-changed');
const toolMovedEvent = new Event('tool-moved');


function getRandomColor(): string {
    const hue = Math.random()* 300;
    const saturation = 30 + Math.random() * 20;
    const lightness = 30 + Math.random() * 10;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
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

function exportCanvas() {
    //Temp canvas
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width * EXPORT_SCALE;
    exportCanvas.height = canvas.height * EXPORT_SCALE;
    const exportCtx = exportCanvas.getContext('2d')!;
    
    //White background
    exportCtx.fillStyle = "white";
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    exportCtx.scale(EXPORT_SCALE, EXPORT_SCALE);

    //Redrawing
    for (const command of lines) {
        command.display(exportCtx);
    }

    const anchor = document.createElement("a");
    anchor.href = exportCanvas.toDataURL("image/png");
    anchor.download = "sketchpad.png";
    anchor.click();
}

//Marker selection handlers
const thinMarkerButton = document.querySelector<HTMLButtonElement>("#thinMarker")!;
const thickMarkerButton = document.querySelector<HTMLButtonElement>("#thickMarker")!;
const stickerButtons = document.querySelectorAll(".sticker-btn");
//Done in this manner such that insertBefore functions correctly
const stickerTools = document.querySelector<HTMLDivElement>(".sticker-tools")!;

function markerSelection(marker: number) {
    const color = getRandomColor();
    currTool = {type: 'marker', marker, color};
    document.querySelectorAll('.selectedTool').forEach(el => el.classList.remove('selectedTool'));
    //(marker === THIN_MARKER ? thinMarkerButton : thickMarkerButton).classList.add('selectedTool');
    const button = (marker === THIN_MARKER ? thinMarkerButton : thickMarkerButton);
    button.classList.add('selectedTool');
    button.style.backgroundColor = color;
    button.style.color = 'white';
}

function stickerSelection(sticker: string){
    currTool = { type: 'sticker', sticker };
    document.querySelectorAll('.selectedTool').forEach(el => el.classList.remove('selectedTool'));
}

function createCustomSticker(){
    const customSticker = prompt("Enter custom sticker:", "*")
    if (customSticker){
        const newButton = document.createElement("button");
        newButton.textContent = customSticker;
        newButton.className = "sticker-btn"

        const addButton = document.querySelector("#addCustomSticker")!;
        stickerTools.insertBefore(newButton, addButton);

        newButton.addEventListener("click", () => {
            stickerSelection(customSticker);
            canvas.dispatchEvent(toolMovedEvent);
        });

        stickerSelection(customSticker);
        canvas.dispatchEvent(toolMovedEvent);
    }
}

thinMarkerButton.addEventListener("click", () => markerSelection(THIN_MARKER));
thickMarkerButton.addEventListener("click", () => markerSelection(THICK_MARKER));
stickerButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        stickerSelection(btn.textContent!);
        canvas.dispatchEvent(toolMovedEvent);
    });
});

//Custom stick event handler
const addCustomStickerButton = document.querySelector("#addCustomSticker")!;
addCustomStickerButton.addEventListener("click", createCustomSticker);

//Export button event handler
const exportButton = document.querySelector("#exportButton")!;
exportButton.addEventListener("click", exportCanvas);

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
        currCommand = new MarkerLine(e.offsetX, e.offsetY, currTool.marker!, currTool.color!);
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
        currPreview = new MarkerPreview(x, y, currTool.marker!, currTool.color!);
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