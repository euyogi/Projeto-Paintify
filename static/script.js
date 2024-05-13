const canvas = document.querySelector("canvas"),
        tool_btns = document.querySelectorAll(".tool"),
        fillColor = document.querySelector("#fill-color"),
        sizeSlider = document.querySelector("#size-slider"),
        colorBtns = document.querySelectorAll(".colors .option"),
        colorPicker = document.querySelector("#color-picker"),
        clearCanvas = document.querySelector(".clear-canvas"),
        saveImg = document.querySelector(".save-img"),
        ctx = canvas.getContext("2d", {willReadFrequently: true});
musicBoard = document.querySelector("#music-board");
historyBoard = document.querySelector("#history-board");
footer = document.querySelector("p");

// global variables with default value
let prevMouseX, prevMouseY, snapshot,
        isDrawing = false,
        selectedTool = "brush",
        brushWidth = 5,
        selectedColor = "#000";

const setCanvasBackground = () => {
    // setting whole canvas background to white, so the downloaded img background will be white
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = selectedColor; // setting fillstyle back to the selectedColor, it'll be the brush color
}

window.addEventListener("load", () => {
    // setting canvas width/height.. offsetwidth/height returns viewable width/height of an element
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    setCanvasBackground();
});

const drawRect = (e) => {
    // if fillColor isn't checked draw a rect with border else draw rect with background
    if (!fillColor.checked) {
        // creating circle according to the mouse pointer
        return ctx.strokeRect(e.offsetX, e.offsetY, prevMouseX - e.offsetX, prevMouseY - e.offsetY);
    }
    ctx.fillRect(e.offsetX, e.offsetY, prevMouseX - e.offsetX, prevMouseY - e.offsetY);
}

const drawCircle = (e) => {
    ctx.beginPath(); // creating new path to draw circle
    // getting radius for circle according to the mouse pointer
    let radius = Math.sqrt(Math.pow((prevMouseX - e.offsetX), 2) + Math.pow((prevMouseY - e.offsetY), 2));
    ctx.arc(prevMouseX, prevMouseY, radius, 0, 2 * Math.PI); // creating circle according to the mouse pointer
    fillColor.checked ? ctx.fill() : ctx.stroke(); // if fillColor is checked fill circle else draw border circle
}

const drawLine = (e) => {
    ctx.beginPath(); // creating new path to draw
    ctx.moveTo(prevMouseX, prevMouseY); // moving line to the mouse pointer
    ctx.lineTo(e.offsetX, e.offsetY); // creating line according to the mouse pointer
    ctx.stroke();
}

const startDraw = (e) => {
    isDrawing = true;
    prevMouseX = e.offsetX; // passing current mouseX position as prevMouseX value
    prevMouseY = e.offsetY; // passing current mouseY position as prevMouseY value
    ctx.beginPath(); // creating new path to draw
    ctx.lineWidth = brushWidth; // passing brushSize as line width
    ctx.strokeStyle = selectedColor; // passing selectedColor as stroke style
    ctx.fillStyle = selectedColor; // passing selectedColor as fill style
    // copying canvas data & passing as snapshot value.. this avoids dragging the image
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
}

const drawing = (e) => {
    if (!isDrawing) return; // if isDrawing is false return from here
    ctx.putImageData(snapshot, 0, 0); // adding copied canvas data on to this canvas

    if (selectedTool === "brush" || selectedTool === "eraser") {
        // if selected tool is eraser then set strokeStyle to white
        // to paint white color on to the existing canvas content else set the stroke color to selected color
        ctx.strokeStyle = selectedTool === "eraser" ? "#fff" : selectedColor;
        ctx.lineTo(e.offsetX, e.offsetY); // creating line according to the mouse pointer
        ctx.stroke(); // drawing/filling line with color
    } else if (selectedTool === "rectangle") {
        drawRect(e);
    } else if (selectedTool === "circle") {
        drawCircle(e);
    } else {
        drawLine(e);
    }
}

tool_btns.forEach(btn => {
    btn.addEventListener("click", () => { // adding click event to all tool option
        // removing active class from the previous option and adding on current clicked option
        document.querySelector(".options .active").classList.remove("active");
        btn.classList.add("active");
        selectedTool = btn.id;
    });
});

sizeSlider.addEventListener("change", () => brushWidth = sizeSlider.value); // passing slider value as brushSize

colorBtns.forEach(btn => {
    btn.addEventListener("click", () => { // adding click event to all color button
        // removing selected class from the previous option and adding on current clicked option
        document.querySelector(".options .selected").classList.remove("selected");
        btn.classList.add("selected");
        // passing selected btn background color as selectedColor value
        selectedColor = window.getComputedStyle(btn).getPropertyValue("background-color");
    });
});

colorPicker.addEventListener("change", () => {
    // passing picked color value from color picker to last color btn background
    colorPicker.parentElement.style.background = colorPicker.value;
    colorPicker.parentElement.click();
});

clearCanvas.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // clearing whole canvas
    setCanvasBackground();
});

saveImg.addEventListener("click", () => {
    saveImg.innerText = "Generating...";

    fetch(("/musify"), {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({data: canvas.toDataURL()})
    }).then(response => {
        response.text().then(response => {
            musicBoard.src = "https://open.spotify.com/embed/track/" + response.slice(0, response.indexOf("#")) + "?utm_source=generator";
            footer.innerHTML = response.slice(response.indexOf("###") + 4);
        saveImg.innerText = "Generate Song";
        document.getElementById("history-board").contentWindow.location.reload();
        });
    });
});

musicBoard.addEventListener(("load"), () => {
    setTimeout(() => {
        musicBoard.contentWindow.postMessage({command: "toggle"}, '*');
        musicBoard.style.background = "transparent";
    }, 1000);
});

historyBoard.addEventListener(("load"), () => {
    if (!historyBoard.contentWindow.document.querySelector("p") &&
            !footer.innerHTML.endsWith("Log Out"))
        footer.innerHTML += " | <a href='/logout'>Log Out</a>";
})

canvas.addEventListener("pointerdown", startDraw);
canvas.addEventListener("pointermove", drawing);
canvas.addEventListener("pointerup", () => isDrawing = false);
canvas.addEventListener("pointerout", () => isDrawing = false);