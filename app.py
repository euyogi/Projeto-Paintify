from flask import Flask, url_for, redirect, render_template, request, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from openai import OpenAI
import git
import os
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials

os.environ["SPOTIPY_CLIENT_ID"] = "c873c85352234e17817333ec4dcafe4d"
os.environ["SPOTIPY_CLIENT_SECRET"] = "d8e45a8df24c4ac396d7e2e42285f744"
os.environ["SPOTIPY_REDIRECT_URI"] = "https://euyogi2.pythonanywhere.com"

app = Flask(__name__)
app.secret_key = "123456"
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///db.sqlite3"

db = SQLAlchemy(app)
client = OpenAI(api_key="sk-proj-TJHW89j6QWKs5l0DJJnFT3BlbkFJ9poviL0wNhV2UFAnMB6t")
spotify = spotipy.Spotify(client_credentials_manager=SpotifyClientCredentials())


class Image(db.Model):
    __tablename__ = "images"

    id = db.Column(db.Integer, primary_key=True)
    data = db.Column(db.String, unique=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))

    def __init__(self, data, user_id):
        self.data = data
        self.user_id = user_id


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, unique=True)
    password = db.Column(db.String)
    imgs = db.relationship("Image", backref="users", lazy=True)

    def __init__(self, name, password):
        self.name = name
        self.password = password


class GPT:
    __instance = None

    def __new__(cls, model="gpt-4o"):
        if GPT.__instance is None:
            GPT.__instance = super().__new__(cls)
        return GPT.__instance

    def __init__(self, model="gpt-4o"):
        self.__model = model
        self.__music_name = "No image has been loaded"
        self.__image_description = "No image has been loaded"

    def __update(self, base64_image):
        response = client.chat.completions.create(
            model=self.__model,
            messages=[
                {"role"   : "system",
                 "content": "You will receive an image. Strictly tell a music name based on that image, without quotations or alike. Then, separated by one newline, describe the image with at most 10 words."},
                {
                    "role"   : "user",
                    "content": [
                        {
                            "type"     : "image_url",
                            "image_url": {
                                "url"   : base64_image,
                                "detail": "low",
                            }
                        }
                    ]
                }
            ]
        )

        content = response.choices[0].message.content.split("\n")
        self.__music_name = content[0]
        self.__img_description = content[2]

    def loadImage(self, base64_img):
        self.__update(base64_img)

    def getMusicName(self):
        return self.__music_name

    def getDescription(self):
        return self.__img_description


def getMusicID(music_name):
    try:
        response = spotify.search(q=music_name, limit=1)
    except Exception as e:
        print(e)
        return ""

    return response["tracks"]["items"][0]["id"]


@app.route("/paintify", methods=["POST", "GET"])
def paintify():
    if request.method == "POST":
        base64_img = request.json["data"]

        if "id" in session and Image.query.filter_by(data=base64_img).first() is None:
            img = Image(base64_img, session["id"])
            db.session.add(img)
            db.session.commit()

        gpt = GPT()
        gpt.loadImage(base64_img)
        music_id = getMusicID(gpt.getMusicName())
        img_description = gpt.getDescription()
        return jsonify({"id": music_id, "description": img_description})

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
        name = request.form["username"]
        password = request.form["password"]

        if User.query.filter_by(name=name).first() is None:
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
        name = request.form["username"]
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
    if request.method == "POST":
        repo = git.Repo("/home/euyogi2/Trabalho-OO")
        origin = repo.remotes.origin
        origin.pull()

        return "Updated PythonAnywhere successfully", 200
    else:
        return "Wrong event type", 400


with app.app_context():
    db.create_all()

if __name__ == "__main__":
    app.run()
