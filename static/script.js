class CanvasCore {
    constructor(canvas, canvas_title) {
        this.canvas = canvas
        this._canvas_title = canvas_title
        this._ctx = this.canvas.getContext("2d", {alpha: false, willReadFrequently: false})
        this._state = "not drawing"
        this.selected_tool = "brush"
        this.fill_shape = false
        this._background_color = "#fff"
        this.selected_color = "#000"
        this.brush_width = 5
        this._backup = []
        this._backup_backup = []

        // debouncing, so that it doesn't fire too much/fast
        let resize_timeout;
        window.onresize = () => {
            clearTimeout(resize_timeout)
            resize_timeout = setTimeout(this._resizeCanvas, 400)
        }

        this.canvas.oncontextmenu = (e) => e.preventDefault()
        this.canvas.onpointerdown = this._startDraw
        this.canvas.onpointermove = this._drawing
        this.canvas.onpointerup = this.canvas.onpointerout = () => this._state = "not drawing"

        window.addEventListener("keydown", (e) => {
            if (e.ctrlKey && "zy".includes(e.key)) {
                e.preventDefault()
                let [backup1, backup2] = [this._backup, this._backup_backup]
                if (e.key === 'y') [backup1, backup2] = [backup2, backup1]

                if (backup1.length > 0) {
                    this._toImage(this.canvas.toDataURL()).then(img => backup2.push(img))
                    this.imageToCanvas(backup1.pop())
                }

                if (this._backup.length === 0)
                    this._canvas_title.classList.remove("hidden")
            }
        })

        this._setDimensions()
        this.fillCanvas()
    }

    fillCanvas = (color = "#fff") => {
        this._canvas_title.classList.remove("hidden") // shows canvas-title
        this._ctx.fillStyle = color
        this._background_color = color
        this._ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
        this._ctx.fillStyle = this.selected_color // setting fillstyle back to the selected_color
        this._snapshot = this._ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    }

    imageToCanvas = (img) => {
        this.fillCanvas(this._background_color)

        let scale = Math.min(this.canvas.width / img.width, this.canvas.height / img.height),
                width = Math.round(img.width * scale),
                height = Math.round(img.height * scale)

        // Calculate the position to start drawing the image, centered in the canvas
        let x = Math.round((this.canvas.width - width) / 2);
        let y = Math.round((this.canvas.height - height) / 2);
        this._ctx.drawImage(img, x, y, width, height);
        this._canvas_title.classList.add("hidden")
    }

    _setDimensions = () => {
        this.canvas.width = this.canvas.offsetWidth
        this.canvas.height = this.canvas.offsetHeight
    }

    // creates a new image object, set src, when image load we can use it
    _toImage(src) {
        return new Promise((func) => {
            const img = new Image()
            img.onload = () => func(img)
            img.src = src
        });
    }

    _resizeCanvas = () => {
        this._toImage(this.canvas.toDataURL()).then(img => {
            this._setDimensions()
            this.imageToCanvas(img)
        })
    }

    _startDraw = (e) => {
        this._toImage(this.canvas.toDataURL()).then(img => {
            this._backup.push(img)
            this._backup_backup = []
        })

        if (this.selected_tool[0] === 'e') {
            this._ctx.strokeStyle = this._background_color
            this._ctx.fillStyle = this._background_color
        } else {
            this._ctx.strokeStyle = this.selected_color
            this._ctx.fillStyle = this.selected_color
        }

        this._state = "drawing"
        this._canvas_title.classList.add("hidden")
        this._prev_mouse_x = e.offsetX
        this._prev_mouse_y = e.offsetY
        this._ctx.beginPath() // creating new path to draw
        this._ctx.lineWidth = this.brush_width
        this._ctx.lineCap = this._ctx.lineJoin = "round"
        // copying canvas data & passing as snapshot value. avoids dragging
        this._snapshot = this._ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    }

    _drawing = (e) => {
        if (this._state[0] === 'n') return;

        this._ctx.putImageData(this._snapshot, 0, 0) // adding copied canvas data on to this canvas
        if (this.selected_tool[0] === 'r') this._ctx.lineJoin = "miter"

        if (this.selected_tool[0] === 'b' || this.selected_tool[0] === 'e') this._ctx.lineTo(e.offsetX, e.offsetY)
        else {
            this._ctx.beginPath()
            if (this.selected_tool[0] === 'l') this._drawLine(e)
            else if (this.selected_tool[0] === 'c') this._drawCircle(e)
            else this._drawRect(e)
        }

        if (this.fill_shape) this._ctx.fill()
        this._ctx.stroke()
    }

    _drawLine = (e) => {
        this._ctx.moveTo(this._prev_mouse_x, this._prev_mouse_y)
        this._ctx.lineTo(e.offsetX, e.offsetY)
    }

    _drawRect = (e) => {
        this._ctx.rect(e.offsetX, e.offsetY, this._prev_mouse_x - e.offsetX, this._prev_mouse_y - e.offsetY)
    }

    _drawCircle = (e) => {
        let radius = Math.sqrt(Math.pow((this._prev_mouse_x - e.offsetX), 2) + Math.pow((this._prev_mouse_y - e.offsetY), 2))
        this._ctx.arc(this._prev_mouse_x, this._prev_mouse_y, radius, 0, 2 * Math.PI)
    }
}

class PaintifyCanvas extends CanvasCore {
    static instance;

    constructor(canvas, canvas_title, music_board, history_board, buttons_board, remove,
                redraw, tool_btns, color_btns, fill_shape_checkbox, fill, size_slider,
                color_picker, clear_canvas, generate_song, description, log_out, loading) {

        if (PaintifyCanvas.instance)
            return PaintifyCanvas.instance;

        super(canvas, canvas_title)

        this._music_board = music_board
        this._history_board = history_board
        this._buttons_board = buttons_board
        this._remove = remove
        this._redraw = redraw
        this._tool_btns = tool_btns
        this._color_btns = color_btns
        this._fill_shape_checkbox = fill_shape_checkbox
        this._fill = fill
        this._size_slider = size_slider
        this._color_picker = color_picker
        this._clear_canvas = clear_canvas
        this._generate_song = generate_song
        this._description = description
        this._log_out = log_out
        this._loading = loading

        this._fill_shape_checkbox.addEventListener("click", () => this.fill_shape = this._fill_shape_checkbox.checked)
        this._size_slider.onchange = () => this.brush_width = this._size_slider.value
        this._fill.onclick = () => this.fillCanvas(this.selected_color)
        this._clear_canvas.onclick = () => this.fillCanvas()
        this._generate_song.onclick = () => this.paintify(this.canvas.toDataURL())

        this._music_board.onload = () => {
            setTimeout(() => {
                this._music_board.contentWindow.postMessage({command: "toggle"}, '*')
            }, 500)
        }

        this._remove.onclick = () => {
            fetch(("/remove"), {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({data: this._history_board.contentWindow.document.querySelector(".image-selected").src})
            }).then(() => this._history_board.contentWindow.location.reload())
        }

        const remove_img_event = (e) => {
            if (e.key === "Delete" && !this._buttons_board.classList.contains("disabled"))
                this._remove.click()
        }
        window.addEventListener("keydown", remove_img_event)

        this._redraw.onclick = () => {
            let img = this._history_board.contentWindow.document.querySelector(".image-selected")
            this.imageToCanvas(img)
        }

        this._history_board.onload = () => {
            const contentWindow = this._history_board.contentWindow
            contentWindow.window.onkeydown = remove_img_event
            this._buttons_board.classList.add("disabled")

            contentWindow.document.querySelectorAll("img").forEach(img => {
                img.onclick = () => {
                    contentWindow.document.querySelector(".image-selected")?.classList.remove("image-selected")
                    img.classList.add("image-selected")
                    this._buttons_board.classList.remove("disabled")
                }
            })

            if (!contentWindow.document.querySelector("a")) this._log_out.classList.remove("hidden")
        }

        this._tool_btns.forEach(btn => {
            btn.onclick = () => {
                // desselect who was selected and select who I clicked
                document.querySelector(".active").classList.remove("active")
                btn.classList.add("active")
                this.selected_tool = btn.id
            }
        })

        this._color_btns.forEach(btn => {
            btn.onclick = () => {
                // radius button functionality
                document.querySelector(".selected").classList.remove("selected")
                btn.classList.add("selected")
                // get the painting color from the background-color
                this.selected_color = window.getComputedStyle(btn).getPropertyValue("background-color")
            }
        })

        this._color_picker.onchange = () => {
            // our parent is actually the round color button, so simulate it's functionality
            this._color_picker.parentElement.style.background = this._color_picker.value
            this._color_picker.parentElement.click()
        }

        PaintifyCanvas.instance = this;
    }

    paintify = (base64_img) => {
        this._generate_song.innerText = "Generating..."
        this._generate_song.disabled = true
        this._description.innerHTML = "Checking your nice drawing..."
        this._loading.classList.remove("hidden")
        this.canvas.style.filter = "brightness(30%)"

        fetch(("/"), {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({data: base64_img})
        }).then(response => {
            this._generate_song.innerText = "Generate Song"
            this._generate_song.disabled = false
            this._history_board.contentWindow.location.reload()
            this._loading.classList.add("hidden")
            this.canvas.style.filter = ""

            response.json().then(data => {
                if (!response.ok) {
                    this._description.innerHTML = "An error occurred :("
                    alert("Open AI says:\n\n" + data.description + "\n\nPlease try again.")
                    return
                }

                this._music_board.src = "https://open.spotify.com/embed/track/" + data.id + "?utm_source=generator"
                this._music_board.style.background = "transparent"
                this._description.innerHTML = data.description
            })
        })
    }
}

new PaintifyCanvas(
        document.querySelector("canvas"),
        document.querySelector("#canvas-title"),
        document.querySelector("#music-board"),
        document.querySelector("#history-board"),
        document.querySelector("#buttons-board"),
        document.querySelector("#remove"),
        document.querySelector("#redraw"),
        document.querySelectorAll(".tool"),
        document.querySelectorAll(".color"),
        document.querySelector("#fill-shape"),
        document.querySelector("#fill"),
        document.querySelector("#size-slider"),
        document.querySelector("#color-picker"),
        document.querySelector("#clear-canvas"),
        document.querySelector("#generate-song"),
        document.querySelector("#description"),
        document.querySelector("#log-out"),
        document.querySelector("#loading")
)