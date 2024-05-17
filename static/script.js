const music_board = document.querySelector("#music-board"),
        buttons_board = document.querySelector(".buttons-container"),
        remove_btn = document.querySelector("#remove"),
        generate_btn = document.querySelector("#generate"),
        history_board = document.querySelector("#history-board"),
        footer = document.querySelector("p")

class Canvas {
    constructor() {
        this.startDraw = this.startDraw.bind(this);
        this.drawing = this.drawing.bind(this);
        this.drawRect = this.drawRect.bind(this);
        this.drawCircle = this.drawCircle.bind(this);
        this.drawLine = this.drawLine.bind(this);
        this.paintify = this.paintify.bind(this);

        this.canvas = document.querySelector("canvas")
        this.tool_btns = document.querySelectorAll(".tool")
        this.fill_color = document.querySelector("#fill-color")
        this.size_slider = document.querySelector("#size-slider")
        this.color_btns = document.querySelectorAll(".colors .option")
        this.color_picker = document.querySelector("#color-picker")
        this.clear_canvas = document.querySelector(".clear-canvas")
        this.generate = document.querySelector(".generate")
        this.ctx = this.canvas.getContext("2d", {willReadFrequently: true})
        this.isDrawing = false
        this.selectedTool = "brush"
        this.brushWidth = 5
        this.selectedColor = "#000"

        this.canvas.width = this.canvas.offsetWidth
        this.canvas.height = this.canvas.offsetHeight

        this.tool_btns.forEach(btn => {
            btn.addEventListener("click", () => { // adding click event to all tool option
                // removing active class from the previous option and adding on current clicked option
                document.querySelector(".options .active").classList.remove("active")
                btn.classList.add("active")
                this.selectedTool = btn.id
            })
        })

        this.size_slider.addEventListener("change", () => this.brushWidth = this.size_slider.value) // passing slider value as brushSize

        this.color_btns.forEach(btn => {
            btn.addEventListener("click", () => { // adding click event to all color button
                // removing selected class from the previous option and adding on current clicked option
                document.querySelector(".options .selected").classList.remove("selected")
                btn.classList.add("selected")
                // passing selected btn background color as selectedColor value
                this.selectedColor = window.getComputedStyle(btn).getPropertyValue("background-color")
            })
        })

        this.color_picker.addEventListener("change", () => {
            // passing picked color value from color picker to last color btn background
            this.color_picker.parentElement.style.background = this.color_picker.value
            this.color_picker.parentElement.click()
        })

        this.clear_canvas.addEventListener("click", () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height) // clearing whole canvas
            this.setCanvasBackground()
        })

        this.generate.addEventListener("click", () => this.paintify(this.canvas.toDataURL()))

        this.setCanvasBackground()

        this.canvas.addEventListener("pointerdown", this.startDraw)
        this.canvas.addEventListener("pointermove", this.drawing)
        this.canvas.addEventListener("pointerup", () => this.isDrawing = false)
    }

    // All white
    setCanvasBackground() {
        this.ctx.fillStyle = "#fff"
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
        this.ctx.fillStyle = this.selectedColor // setting fillstyle back to the selectedColor
    }

    startDraw(e) {
        this.isDrawing = true
        this.prevMouseX = e.offsetX // passing current mouseX position as prevMouseX value
        this.prevMouseY = e.offsetY // passing current mouseY position as prevMouseY value
        this.ctx.beginPath() // creating new path to draw
        this.ctx.lineWidth = this.brushWidth // passing brushSize as line width
        this.ctx.strokeStyle = this.selectedColor // passing selectedColor as stroke style
        this.ctx.fillStyle = this.selectedColor // passing selectedColor as fill style
        // copying canvas data & passing as snapshot value.. this avoids dragging the image
        this.snapshot = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    }

    drawing(e) {
        if (!this.isDrawing) return // if isDrawing is false return from here
        this.ctx.putImageData(this.snapshot, 0, 0) // adding copied canvas data on to this canvas

        if (this.selectedTool === "brush" || this.selectedTool === "eraser") {
            // if selected tool is eraser then set strokeStyle to white
            // to paint white color on to the existing canvas content else set the stroke color to selected color
            this.ctx.strokeStyle = this.selectedTool === "eraser" ? "#fff" : this.selectedColor
            this.ctx.lineTo(e.offsetX, e.offsetY) // creating line according to the mouse pointer
            this.ctx.stroke() // drawing/filling line with color
        } else if (this.selectedTool === "rectangle")
            this.drawRect(e)
        else if (this.selectedTool === "circle")
            this.drawCircle(e)
        else
            this.drawLine(e)
    }

    drawRect(e) {
        // if fillColor isn't checked draw a rect with border else draw rect with background
        if (!this.fill_color.checked) {
            // creating rectangle according to the mouse pointer
            return this.ctx.strokeRect(e.offsetX, e.offsetY, this.prevMouseX - e.offsetX, this.prevMouseY - e.offsetY)
        }
        this.ctx.fillRect(e.offsetX, e.offsetY, this.prevMouseX - e.offsetX, this.prevMouseY - e.offsetY)
    }

    drawCircle(e) {
        this.ctx.beginPath() // creating new path to draw circle
        // getting radius for circle according to the mouse pointer
        let radius = Math.sqrt(Math.pow((this.prevMouseX - e.offsetX), 2) + Math.pow((this.prevMouseY - e.offsetY), 2))
        this.ctx.arc(this.prevMouseX, this.prevMouseY, radius, 0, 2 * Math.PI) // creating circle according to the mouse pointer
        this.fill_color.checked ? this.ctx.fill() : this.ctx.stroke() // if fillColor is checked fill circle else draw border circle
    }

    drawLine(e) {
        this.ctx.beginPath() // creating new path to draw
        this.ctx.moveTo(this.prevMouseX, this.prevMouseY) // moving line to the mouse pointer
        this.ctx.lineTo(e.offsetX, e.offsetY) // creating line according to the mouse pointer
        this.ctx.stroke()
    }

    paintify(base64_img) {
        console.log("PAINTIFY")
        this.generate.innerText = "Generating..."
        this.generate.disabled = true
        generate_btn.innerText = "Generating..."
        generate_btn.disabled = true

        fetch(("/paintify"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({data: base64_img})
        }).then(response => response.json()).then(data => {
            music_board.src = "https://open.spotify.com/embed/track/" + data.id + "?utm_source=generator"
            footer.innerHTML = data.description
            this.generate.innerText = "Generate Song"
            this.generate.disabled = false
            generate_btn.innerText = "Generate"
            generate_btn.disabled = false
            history_board.contentWindow.location.reload()
        })
    }
}

const canvas = new Canvas()

music_board.addEventListener(("load"), () => {
    setTimeout(() => {
        music_board.contentWindow.postMessage({command: "toggle"}, '*')
        music_board.style.background = "transparent"
    }, 1000)
})

remove_btn.addEventListener(("click"), () => {
    fetch(("/remove"), {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({data: history_board.contentWindow.document.querySelector(".image-selected").src})
    }).then(() => history_board.contentWindow.location.reload())
})

generate_btn.addEventListener(("click"), () => canvas.paintify(history_board.contentWindow.document.querySelector(".image-selected").src))

history_board.addEventListener(("load"), () => {
    buttons_board.classList.add("disabled")

    let imgs = history_board.contentWindow.document.querySelectorAll("img")

    imgs.forEach(img => {
        img.addEventListener("click", () => {
            let selected_imgs = history_board.contentWindow.document.querySelectorAll(".image-selected")

            for (let selected_img of selected_imgs)
                selected_img.classList.remove("image-selected")

            img.classList.add("image-selected")
            buttons_board.classList.remove("disabled")
        })
    })

    if (!history_board.contentWindow.document.querySelector("a") && !footer.innerHTML.endsWith("</a>"))
        footer.innerHTML += " | <a href='/logout'>Log Out</a>"
})

