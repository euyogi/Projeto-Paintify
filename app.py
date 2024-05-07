from flask import Flask, render_template, request
import git

app = Flask(__name__)


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


if __name__ == '__main__':
    app.run(debug=True)
