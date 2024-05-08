from flask import Flask, render_template, request
from flask_sqlalchemy import SQLAlchemy
import git

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///minhabase.sqlite3'
db = SQLAlchemy(app)


class Usuario(db.Model):
    __tablename__ = "usuarios"

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String, unique=True)
    senha = db.Column(db.String)

    def __init__(self, nome, senha):
        self.nome = nome
        self.senha = senha


@app.route("/update", methods=["POST"])
def webhook():
    if request.method == "POST":
        repo = git.Repo("/home/euyogi2/Trabalho-OO")
        origin = repo.remotes.origin
        origin.pull()

        return "Updated PythonAnywhere successfully", 200
    else:
        return "Wrong event type", 400


@app.route('/')
def index():
    # Exemplo de variáveis que você pode passar para o template
    titulo = "Exemplo de Flask"
    numeros = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
    return render_template('index.html', titulo=titulo, numeros=numeros)


@app.route("/usuario", methods=['POST', 'GET'])
def addUsuario():
    if request.method == 'POST':
        nome = request.form['nome']
        senha = request.form['senha']
        user = Usuario(nome, senha)
        db.session.add(user)
        db.session.commit()

    users = Usuario.query.all()
    return render_template('usuario.html', usuarios=users)


if __name__ == '__main__':
    app.run()
    db.create_all()
