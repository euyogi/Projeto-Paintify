from flask import Flask, url_for, redirect, render_template, request, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from openai import OpenAI
from git import Repo
from json import load
from os import environ
from spotipy import Spotify
from spotipy.oauth2 import SpotifyClientCredentials

# setting up
KEYS_PATH = "KEYS.json" if "LOCAL" in environ else "/home/euyogi2/Trabalho-OO/KEYS.json"
with open(KEYS_PATH) as f:
    keys = load(f)
    environ["SPOTIPY_CLIENT_ID"] = keys["SPOTIPY_CLIENT_ID"]
    environ["SPOTIPY_CLIENT_SECRET"] = keys["SPOTIPY_CLIENT_SECRET"]
    environ["SPOTIPY_REDIRECT_URI"] = "https://euyogi2.pythonanywhere.com"
    client = OpenAI(api_key=keys["OPEN_AI_KEY"])

app = Flask(__name__)
app.secret_key = "123456"
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///db.sqlite3"

db = SQLAlchemy(app)
spotify_core = Spotify(client_credentials_manager=SpotifyClientCredentials())


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, unique=True)
    password = db.Column(db.String)
    imgs = db.relationship("Image", backref="user", lazy=True)

    def __init__(self, name, password):
        self.name = name
        self.password = password


class Image(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    data = db.Column(db.String, unique=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"))

    def __init__(self, data, user_id):
        self.data = data
        self.user_id = user_id


class SpotifyDecorator:
    _instance = None

    def __new__(cls, spotify):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._spotify = spotify

        return SpotifyDecorator._instance

    def getMusicID(self, music_name):
        response = self._spotify.search(q=music_name, limit=1)
        return response["tracks"]["items"][0]["id"]


class GPT:
    _instance = None

    def __new__(cls, model="gpt-4o"):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._model = model
            cls._music_name = "No image has been loaded"
            cls._img_description = "No image has been loaded"

        return GPT._instance

    def loadImage(self, base64_image):
        try:
            response = client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role"   : "system",
                     "content": "Describe the drawing with less than 10 words. Then, separated by a /, suggest a music related"},
                    {"role": "user", "content": [
                        {"type": "image_url", "image_url": {"url": base64_image, "detail": "low"}}
                    ]}
                ]
            )
            print(response)
            content = response.choices[0].message.content.split("/")
            self._music_name = content[1].strip()
            self._img_description = content[0].strip()
        except Exception as e:
            self._music_name = "Error"
            self._img_description = str(e).split("message': ")[1].split(", \'type")[0]


    def getMusicName(self):
        return self._music_name

    def getDescription(self):
        return self._img_description


@app.route("/paintify", methods=["GET", "POST"])
def paintify():
    if request.method == "POST":
        base64_img = request.json["data"]

        if "id" in session and Image.query.filter_by(data=base64_img).first() is None:
            img = Image(base64_img, session["id"])
            db.session.add(img)
            db.session.commit()

        gpt = GPT()
        gpt.loadImage(base64_img)
        spotify = SpotifyDecorator(spotify_core)
        img_description = gpt.getDescription()

        code = 403 if gpt.getMusicName() == "Error" else 201
        return jsonify({"id": spotify.getMusicID(gpt.getMusicName()), "description": img_description}), code

    return render_template("paintify.html")


@app.route("/imgs")
def imgs():
    if "id" in session:
        images_list = Image.query.filter_by(user_id=session["id"])
        images_list = [i.data for i in images_list]
        return render_template("imgs.html", logged=True, imgs=reversed(images_list), empty=len(images_list) == 0)

    return render_template("imgs.html", logged=False)


@app.route("/users")
def users():
    users_list = User.query.all()
    return render_template("users.html", users=users_list)


@app.route("/signup", methods=["GET", "POST"])
def signup():
    if "id" in session:
        return redirect(url_for("login"))

    if request.method == "POST":
        name = request.form["username"].lower()
        password = request.form["password"]
        user = User.query.filter_by(name=name).first()

        if user is None:
            user = User(name, password)
            db.session.add(user)
            db.session.commit()
            return redirect(url_for("login"))

    return render_template("auth.html", type="Sign Up", falhou=request.method == "POST")


@app.route("/login", methods=["GET", "POST"])
def login():
    if "id" in session:
        return redirect(url_for("paintify"))

    if request.method == "POST":
        name = request.form["username"].lower()
        password = request.form["password"]
        user = User.query.filter_by(name=name, password=password).first()

        if user is not None:
            session["id"] = user.id
            return redirect(url_for("imgs"))

    return render_template("auth.html", type="Login", falhou=request.method == "POST")


@app.route("/logout")
def logout():
    session.pop("id", None)
    return redirect(url_for("paintify"))


@app.route("/remove", methods=["POST"])
def remove():
    base64_img = request.json["data"]
    img = Image.query.filter_by(data=base64_img).first()
    db.session.delete(img)
    db.session.commit()
    return jsonify({"message": "Image deleted successfully"}), 200


# Whenever this page gets a post request it pulls my repo and reloads the website
@app.route("/update", methods=["POST"])
def webhook():
    repo = Repo("/home/euyogi2/Trabalho-OO")
    repo.remotes.origin.pull()
    return "Updated PythonAnywhere successfully", 200


with app.app_context():
    db.create_all()

if __name__ == "__main__":
    app.run()
