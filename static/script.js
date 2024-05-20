class CanvasCore {
    constructor(canvas, canvas_title) {
        this.canvas = canvas
        this.canvas_title = canvas_title
        this.ctx = this.canvas.getContext("2d", {willReadFrequently: true})
        this.is_drawing = false
        this.selected_tool = "brush"
        this.fill_form = false
        this.brush_width = 5
        this.selected_color = "#000"

        this.canvas.addEventListener('contextmenu', function (e) {
            e.preventDefault();
        });

        const setBackground = () => {
            this.canvas.width = this.canvas.offsetWidth
            this.canvas.height = this.canvas.offsetHeight
            this.setCanvasBackground()
        }

        // debouncing, so that it doesn't fire too much/fast
        let resize_timeout;
        window.addEventListener("resize", () => {
            clearTimeout(resize_timeout)
            resize_timeout = setTimeout(setBackground, 400)
        })
        setBackground();

        this.canvas.addEventListener("pointerdown", this.startDraw)
        this.canvas.addEventListener("pointermove", this.drawing)
        this.canvas.addEventListener("pointerup", () => this.is_drawing = false)
        this.canvas.addEventListener("pointerout", () => this.is_drawing = false)
    }

    setCanvasBackground = (color = "#fff") => {
        this.canvas_title.classList.remove("hidden") // shows canvas-title
        this.ctx.fillStyle = color
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
        this.ctx.fillStyle = this.selected_color // setting fillstyle back to the selected_color
    }

    startDraw = (e) => {
        this.canvas_title.classList.add("hidden")
        this.is_drawing = true
        this.prevMouseX = e.offsetX // passing current mouseX position as prevMouseX value
        this.prevMouseY = e.offsetY // passing current mouseY position as prevMouseY value
        this.ctx.beginPath() // creating new path to draw
        this.ctx.lineWidth = this.brush_width // passing brushSize as line width
        this.ctx.strokeStyle = this.selected_color // passing selected_color as stroke style
        this.ctx.fillStyle = this.selected_color // passing selected_color as fill style
        // copying canvas data & passing as snapshot value.. this avoids dragging the image
        this.snapshot = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    }

    drawing = (e) => {
        if (!this.is_drawing) return
        this.ctx.putImageData(this.snapshot, 0, 0) // adding copied canvas data on to this canvas

        if (this.selected_tool === "brush" || this.selected_tool === "eraser") {
            this.ctx.strokeStyle = this.selected_tool === "eraser" ? "#fff" : this.selected_color
            this.ctx.lineTo(e.offsetX, e.offsetY) // creating line according to the mouse pointer
            this.ctx.stroke() // drawing/filling line with color
        } else {
            this.ctx.beginPath()

            if (this.selected_tool === "line") {
                this.drawLine(e)
                this.ctx.stroke()
            } else if (this.selected_tool === "rectangle")
                this.drawRect(e)
            else
                this.drawCircle(e)

            this.fill_form ? this.ctx.fill() : this.ctx.stroke()
        }
    }

    drawRect = (e) => {
        this.ctx.rect(e.offsetX, e.offsetY, this.prevMouseX - e.offsetX, this.prevMouseY - e.offsetY)
    }

    drawCircle = (e) => {
        let radius = Math.sqrt(Math.pow((this.prevMouseX - e.offsetX), 2) + Math.pow((this.prevMouseY - e.offsetY), 2))
        this.ctx.arc(this.prevMouseX, this.prevMouseY, radius, 0, 2 * Math.PI) // creating circle according to the mouse pointer
    }

    drawLine = (e) => {
        this.ctx.moveTo(this.prevMouseX, this.prevMouseY) // moving line to the mouse pointer
        this.ctx.lineTo(e.offsetX, e.offsetY) // creating line according to the mouse pointer
    }
}

class PaintifyCanvas extends CanvasCore {
    static instance;

    constructor() {
        if (PaintifyCanvas.instance)
            return PaintifyCanvas.instance;

        super(document.querySelector("canvas"), document.querySelector("#canvas-title"))

        this.tool_btns = document.querySelectorAll(".tool")
        this.fill_form_checkbox = document.querySelector("#fill-form")
        this.size_slider = document.querySelector("#size-slider")
        this.fill = document.querySelector("#fill")
        this.color_btns = document.querySelectorAll(".color")
        this.color_picker = document.querySelector("#color-picker")
        this.clear_canvas = document.querySelector("#clear-canvas")
        this.generate_song = document.querySelector("#generate-song")
        this.music_board = document.querySelector("#music-board")
        this.buttons_board = document.querySelector(".row .button-column")
        this.remove_btn = document.querySelector("#remove")
        this.generate_btn = document.querySelector("#generate")
        this.history_board = document.querySelector("#history-board")
        this.log_out = document.querySelector("#log-out")
        this.description = document.querySelector("#description")

        this.tool_btns.forEach(btn => {
            btn.addEventListener("click", () => {
                // desselect who was selected and select who I clicked
                document.querySelector(".active").classList.remove("active")
                btn.classList.add("active")
                this.selected_tool = btn.id
            })
        })

        this.fill_form_checkbox.addEventListener("click", () => this.fill_form = this.fill_form_checkbox.checked)
        this.size_slider.addEventListener("change", () => this.brush_width = this.size_slider.value)
        this.fill.addEventListener("click", () => this.setCanvasBackground(this.selected_color))

        this.color_btns.forEach(btn => {
            btn.addEventListener("click", () => {
                // radius button functionality
                document.querySelector(".selected").classList.remove("selected")
                btn.classList.add("selected")
                // get the painting color from the background-color
                this.selected_color = window.getComputedStyle(btn).getPropertyValue("background-color")
            })
        })

        this.color_picker.addEventListener("change", () => {
            // our parent is actually the round color button, so simulate it's functionality
            this.color_picker.parentElement.style.background = this.color_picker.value
            this.color_picker.parentElement.click()
        })

        this.clear_canvas.addEventListener("click", () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
            this.setCanvasBackground()
        })

        this.generate_song.addEventListener("click", () => this.paintify(this.canvas.toDataURL()))

        this.music_board.addEventListener("load", () => {
            setTimeout(() => {
                this.music_board.contentWindow.postMessage({command: "toggle"}, '*')
            }, 700)
        })

        this.remove_btn.addEventListener("click", () => {
            fetch(("/remove"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({data: this.history_board.contentWindow.document.querySelector(".image-selected").src})
            }).then(() => this.history_board.contentWindow.location.reload())
        })

        this.generate_btn.addEventListener("click", () =>
                canvas.paintify(this.history_board.contentWindow.document.querySelector(".image-selected").src))

        this.history_board.addEventListener("load", () => {
            this.buttons_board.classList.add("disabled")

            let imgs = this.history_board.contentWindow.document.querySelectorAll("img")

            imgs.forEach(img => {
                img.addEventListener("click", () => {
                    let selected_img = this.history_board.contentWindow.document.querySelector(".image-selected")

                    if (selected_img)
                        selected_img.classList.remove("image-selected")

                    img.classList.add("image-selected")
                    this.buttons_board.classList.remove("disabled")
                })
            })

            if (!this.history_board.contentWindow.document.querySelector("a"))
                this.log_out.classList.remove("hidden")
        })

        PaintifyCanvas.instance = this;
    }

    paintify = (base64_img) => {
        this.generate_song.innerText = "Generating..."
        this.generate_btn.innerText = "Generating..."
        this.generate_song.disabled = true
        this.generate_btn.disabled = true
        this.description.innerHTML = "Checking your nice drawing..."

        fetch(("/paintify"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({data: base64_img})
        }).then(response => {
            this.generate_song.innerText = "Generate Song"
            this.generate_btn.innerText = "Generate"
            this.generate_song.disabled = false
            this.generate_btn.disabled = false
            this.history_board.contentWindow.location.reload()
            this.description.innerHTML = "An error occurred :("

            response.json().then(data => {
                if (!response.ok) {
                    alert("Open AI says:\n\n" + data.description + "\n\nPlease try again.")
                    return
                }

                this.music_board.src = "https://open.spotify.com/embed/track/" + data.id + "?utm_source=generator"
                this.music_board.style.background = "transparent"
                this.description.innerHTML = data.description
            })
        })
    }
}

const canvas = new PaintifyCanvas()