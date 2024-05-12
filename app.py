from flask import Flask, url_for, redirect, render_template, request, session
from flask_sqlalchemy import SQLAlchemy
from openai import OpenAI
import git
import os
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials

# UPLOAD_FOLDER = "C://Users/yogiq/OneDrive/Documentos/PyCharm/Trabalho-OO/upload/"
UPLOAD_FOLDER = "/home/euyogi2/Trabalho-OO/upload/"

os.environ["SPOTIPY_CLIENT_ID"] = "c873c85352234e17817333ec4dcafe4d"
os.environ["SPOTIPY_CLIENT_SECRET"] = "d8e45a8df24c4ac396d7e2e42285f744"
os.environ["SPOTIPY_REDIRECT_URI"] = "https://euyogi2.pythonanywhere.com"

app = Flask(__name__)
app.secret_key = "123456"
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///db.sqlite3"
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

db = SQLAlchemy(app)
client = OpenAI(api_key="sk-proj-TJHW89j6QWKs5l0DJJnFT3BlbkFJ9poviL0wNhV2UFAnMB6t")
spotify = spotipy.Spotify(client_credentials_manager=SpotifyClientCredentials())


class Image(db.Model):
    __tablename__ = "images"

    id = db.Column(db.Integer, primary_key=True)
    data = db.Column(db.String)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))

    def __init__(self, data, user_id):
        self.data = data
        self.user_id = user_id


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, unique=True)
    password = db.Column(db.String)
    images = db.relationship('Image', backref='users', lazy=True)

    def __init__(self, name, password):
        self.name = name
        self.password = password


def getSongID(song_name):
    try:
        response = spotify.search(q=song_name, limit=1)
    except:
        response = spotify.search(q=song_name, limit=1)

    return response["tracks"]["items"][0]["id"]


def getSongName(base64_image):
    response = client.chat.completions.create(
        model="gpt-4-turbo",
        messages=[
            {"role": "system", "content": "Answer only with the music name"},
            {
                "role"   : "user",
                "content": [
                    {"type": "text", "text": "Give me a music based on the image:"},
                    {
                        "type"     : "image_url",
                        "image_url": {
                            "url"   : f"{base64_image}",
                            "detail": "low",
                        },
                    },
                ],
            }
        ],
    )

    return response.choices[0].message.content


# Whenever this page gets a post request it pulls my repo and reloads the website
@app.route("/update", methods=["POST"])
def webhook():
    if request.method == "POST":
        repo = git.Repo("/home/euyogi2/Trabalho-OO")
        origin = repo.remotes.origin
        origin.pull()

        return "Updated PythonAnywhere successfully", 200
    else:
        return "Wrong event type", 400


@app.route('/musify', methods=["POST", "GET"])
def musify():
    if request.method == "POST":
        base64_image = request.json["data"]

        if "id" in session:
            image = Image(base64_image, session["id"])
            db.session.add(image)
            db.session.commit()

        music_name = getSongName(base64_image)
        music_url = f"https://open.spotify.com/embed/track/{getSongID(music_name)}?utm_source=generator"
        return music_url

    return render_template("musify.html")


@app.route("/images", methods=["POST", "GET"])
def images():
    if "id" in session:
        images = Image.query.filter_by(user_id=session["id"])
        images = [i.data for i in images]

        return render_template("images.html", logged=True, images=reversed(images))

    return render_template("images.html", logged=False)


@app.route("/users", methods=["POST", "GET"])
def users():
    users = User.query.all()
    return render_template("users.html", usuarios=users)


@app.route("/signup", methods=["POST", "GET"])
def signup():
    if "id" in session:
        return redirect(url_for("upload"))

    if request.method == "POST":
        name = request.form["username"]
        password = request.form["password"]
        if User.query.filter_by(name=name).first() is None:
            user = User(name, password)
            db.session.add(user)
            db.session.commit()
            return redirect(url_for("login"))

    return render_template("signup.html", falhou=request.method == "POST")


@app.route("/login", methods=["GET", "POST"])
def login():
    if "id" in session:
        return redirect(url_for("upload"))

    if request.method == "POST":
        name = request.form["username"]
        password = request.form["password"]
        user = User.query.filter_by(name=name, password=password).first()
        if user is not None:
            session["id"] = user.id
            return redirect(url_for("images"))

    return render_template("login.html", falhou=request.method == "POST")


@app.route("/logout")
def logout():
    session.pop("id", None)
    return redirect(url_for("musify"))


@app.route("/upload", methods=["POST", "GET"])
def upload():
    if "id" not in session:
        return redirect(url_for("login"))

    if request.method == "POST":
        file = request.files["file"]
        save_path = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(save_path)
        return "upload feito com sucesso <a href=\"/logout\">Deslogar</a>"

    return render_template("upload.html")


with app.app_context():
    db.create_all()

if __name__ == "__main__":
    app.run()
