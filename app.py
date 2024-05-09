from flask import Flask, url_for, redirect, render_template, request, session
from flask_sqlalchemy import SQLAlchemy
import git
import os

# UPLOAD_FOLDER = "C://Users/yogiq/OneDrive/Documentos/PyCharm/Trabalho-OO/upload/"
UPLOAD_FOLDER = "/home/euyogi2/Trabalho-OO/upload/"

app = Flask(__name__)
app.secret_key = "123456"
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///db.sqlite3"
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

db = SQLAlchemy(app)


class Usuario(db.Model):
    __tablename__ = "usuarios"

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String, unique=True)
    senha = db.Column(db.String)

    def __init__(self, nome, senha):
        self.nome = nome
        self.senha = senha


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


@app.route("/")
def index():
    if "username" in session:
        return "Logado como {}. <a href=\"/logout\">Deslogar</a>".format(session["username"])

    return "Você não está logado. <a href=\"/login\">Logar</a>"


@app.route("/usuarios", methods=["POST", "GET"])
def usuarios():
    if request.method == "POST":
        nome = request.form["username"]
        senha = request.form["password"]
        user = Usuario(nome, senha)
        db.session.add(user)
        db.session.commit()

    users = Usuario.query.all()
    return render_template("usuarios.html", usuarios=users)


@app.route("/signup", methods=["POST", "GET"])
def signup():
    if "username" in session:
        return redirect(url_for("index"))

    if request.method == "POST":
        nome = request.form["username"]
        senha = request.form["password"]
        if Usuario.query.filter_by(nome=nome).first() is None:
            user = Usuario(nome, senha)
            db.session.add(user)
            db.session.commit()
            return redirect(url_for("login"))

    return render_template("signup.html", falhou=request.method == "POST")


@app.route("/login", methods=["GET", "POST"])
def login():
    if "username" in session:
        return redirect(url_for("index"))

    if request.method == "POST":
        nome = request.form["username"]
        senha = request.form["password"]
        if Usuario.query.filter_by(nome=nome, senha=senha).first() is not None:
            session["username"] = nome
            return redirect(url_for("upload"))

    return render_template("login.html", falhou=request.method == "POST")


@app.route("/logout")
def logout():
    session.pop("username", None)
    return redirect(url_for("index"))


@app.route("/upload", methods=["POST", "GET"])
def upload():
    if "username" not in session:
        return redirect(url_for("index"))

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
