class CanvasCore {
    constructor(canvas, canvas_title) {
        this.canvas = canvas
        this.canvas_title = canvas_title
        this.ctx = this.canvas.getContext("2d", {alpha: false, willReadFrequently: false})
        this.is_drawing = false
        this.fill_form = false
        this.selected_tool = "brush"
        this.selected_color = "#000"
        this.brush_width = 5
        this.backup = []
        this.backup_backup = []

        // debouncing, so that it doesn't fire too much/fast
        let resize_timeout;
        window.onresize = () => {
            clearTimeout(resize_timeout)
            resize_timeout = setTimeout(this._resizeCanvas, 400)
        }

        this.canvas.oncontextmenu = (e) => e.preventDefault()
        this.canvas.onpointerdown = this._startDraw
        this.canvas.onpointermove = this._drawing
        this.canvas.onpointerup = this.canvas.onpointerout = () => this.is_drawing = false

        const double_backup = (backup_container1, backup_container2, img) => {
            if (backup_container1.length > 0) {
                img.onload = () => {
                    backup_container2.push(img)
                }
                img.src = this.canvas.toDataURL()
                this.imageToCanvas(backup_container1.pop())
            }
        }

        window.addEventListener("keydown", (e) => {
            let img = new Image()
            if (e.ctrlKey && "zy".includes(e.key)) {
                e.preventDefault()
                if (e.key === 'z')
                    double_backup(this.backup, this.backup_backup, img)
                else
                    double_backup(this.backup_backup, this.backup, img)

                if (this.backup.length === 0)
                    this.canvas_title.classList.remove("hidden")
            }
        })

        this._setDimensions()
        this.fillCanvas()
    }

    fillCanvas = (color = "#fff") => {
        this.canvas_title.classList.remove("hidden") // shows canvas-title
        this.ctx.fillStyle = color
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
        this.ctx.fillStyle = this.selected_color // setting fillstyle back to the selected_color
        this.snapshot = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    }

    imageToCanvas = (img) => {
        this.fillCanvas()

        let scale = Math.min(this.canvas.width / img.width, this.canvas.height / img.height),
                width = Math.round(img.width * scale),
                height = Math.round(img.height * scale)

        // Calculate the position to start drawing the image, centered in the canvas
        let x = Math.round((this.canvas.width - width) / 2);
        let y = Math.round((this.canvas.height - height) / 2);
        this.ctx.drawImage(img, x, y, width, height);
        this.canvas_title.classList.add("hidden")
    }

    _setDimensions = () => {
        this.canvas.width = this.canvas.offsetWidth
        this.canvas.height = this.canvas.offsetHeight
    }

    _resizeCanvas = () => {
        let img = new Image()
        img.onload = () => {
            this._setDimensions()
            this.imageToCanvas(img)
        }
        img.src = this.canvas.toDataURL()
    }

    _startDraw = (e) => {
        let img = new Image()
        img.onload = () => {
            this.backup.push(img)
            this.backup_backup = []
        }
        img.src = this.canvas.toDataURL()

        this.canvas_title.classList.add("hidden")
        this.is_drawing = true
        this.prevMouseX = e.offsetX
        this.prevMouseY = e.offsetY
        this.ctx.beginPath() // creating new path to draw
        this.ctx.lineWidth = this.brush_width
        this.ctx.strokeStyle = this.selected_color
        this.ctx.fillStyle = this.selected_color// passing selected_color as fill style
        this.ctx.lineCap = "round"
        this.ctx.lineJoin = "round"
        // copying canvas data & passing as snapshot value.. this avoids dragging
        this.snapshot = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    }

    _drawing = (e) => {
        if (!this.is_drawing) return

        this.ctx.putImageData(this.snapshot, 0, 0) // adding copied canvas data on to this canvas

        if (this.selected_tool[0] === 'b' || this.selected_tool[0] === 'e') {
            this.ctx.strokeStyle = this.selected_tool[0] === 'e' ? "#fff" : this.selected_color
            this.ctx.lineTo(e.offsetX, e.offsetY) // creating line according to the mouse pointer
            this.ctx.stroke() // drawing/filling line with color
        } else {
            this.ctx.beginPath()

            if (this.selected_tool[0] === 'l')
                this._drawLine(e)
            else if (this.selected_tool[0] === 'r')
                this._drawRect(e)
            else
                this._drawCircle(e)

            this.fill_form ? this.ctx.fill() : this.ctx.stroke()
        }
    }

    _drawLine = (e) => {
        this.ctx.moveTo(this.prevMouseX, this.prevMouseY) // moving line to the mouse pointer
        this.ctx.lineTo(e.offsetX, e.offsetY) // creating line according to the mouse pointer
        this.ctx.stroke()
    }

    _drawRect = (e) => {
        this.ctx.lineJoin = "round"
        this.ctx.rect(e.offsetX, e.offsetY, this.prevMouseX - e.offsetX, this.prevMouseY - e.offsetY)
    }

    _drawCircle = (e) => {
        let radius = Math.sqrt(Math.pow((this.prevMouseX - e.offsetX), 2) + Math.pow((this.prevMouseY - e.offsetY), 2))
        this.ctx.arc(this.prevMouseX, this.prevMouseY, radius, 0, 2 * Math.PI) // creating circle according to the mouse pointer
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
        this.buttons_board = document.querySelector("#buttons-board")
        this.remove = document.querySelector("#remove")
        this.redraw = document.querySelector("#redraw")
        this.history_board = document.querySelector("#history-board")
        this.log_out = document.querySelector("#log-out")
        this.description = document.querySelector("#description")
        this.loading = document.querySelector("#loading")

        this.fill_form_checkbox.onclick = () => this.fill_form = this.fill_form_checkbox.checked
        this.size_slider.onchange = () => this.brush_width = this.size_slider.value
        this.fill.onclick = () => this.fillCanvas(this.selected_color)
        this.clear_canvas.onclick = () => this.fillCanvas()
        this.generate_song.onclick = () => this.paintify(this.canvas.toDataURL())

        this.music_board.onload = () => {
            setTimeout(() => {
                this.music_board.contentWindow.postMessage({command: "toggle"}, '*')
            }, 700)
        }

        this.remove.onclick = () => {
            fetch(("/remove"), {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({data: this.history_board.contentWindow.document.querySelector(".image-selected").src})
            }).then(() => this.history_board.contentWindow.location.reload())
        }

        const remove_img_event = (e) => {
            if (e.key === "Delete" && !this.buttons_board.classList.contains("disabled"))
                this.remove.click()
        }
        window.addEventListener("keydown", remove_img_event)

        this.redraw.onclick = () => {
            let img = this.history_board.contentWindow.document.querySelector(".image-selected")
            this.imageToCanvas(img)
        }

        this.history_board.onload = () => {
            setTimeout(() => {
                this.history_board.contentWindow.window.onkeydown = remove_img_event
                this.buttons_board.classList.add("disabled")

                let imgs = this.history_board.contentWindow.document.querySelectorAll("img")

                imgs.forEach(img => {
                    img.onclick = () => {
                        let selected_img = this.history_board.contentWindow.document.querySelector(".image-selected")

                        if (selected_img)
                            selected_img.classList.remove("image-selected")

                        img.classList.add("image-selected")
                        this.buttons_board.classList.remove("disabled")
                    }
                })

                if (!this.history_board.contentWindow.document.querySelector("a"))
                    this.log_out.classList.remove("hidden")
            }, 700)
        }

        this.tool_btns.forEach(btn => {
            btn.onclick = () => {
                // desselect who was selected and select who I clicked
                document.querySelector(".active").classList.remove("active")
                btn.classList.add("active")
                this.selected_tool = btn.id
            }
        })

        this.color_btns.forEach(btn => {
            btn.onclick = () => {
                // radius button functionality
                document.querySelector(".selected").classList.remove("selected")
                btn.classList.add("selected")
                // get the painting color from the background-color
                this.selected_color = window.getComputedStyle(btn).getPropertyValue("background-color")
            }
        })

        this.color_picker.onclick = this.color_picker.onchange = () => {
            // our parent is actually the round color button, so simulate it's functionality
            this.color_picker.parentElement.style.background = this.color_picker.value
            this.color_picker.parentElement.click()
        }

        PaintifyCanvas.instance = this;
    }

    paintify = (base64_img) => {
        this.generate_song.innerText = "Generating..."
        this.generate_song.disabled = true
        this.description.innerHTML = "Checking your nice drawing..."
        this.loading.classList.remove("hidden")
        this.canvas.style.filter = "brightness(30%)"

        fetch(("/paintify"), {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({data: base64_img})
        }).then(response => {
            this.generate_song.innerText = "Generate Song"
            this.generate_song.disabled = false
            this.history_board.contentWindow.location.reload()
            this.loading.classList.add("hidden")
            this.canvas.style.filter = ""

            response.json().then(data => {
                if (!response.ok) {
                    this.description.innerHTML = "An error occurred :("
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