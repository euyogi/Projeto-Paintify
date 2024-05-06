from flask import Flask, render_template, request
import git

app = Flask(__name__)
 
@app.route('/update')
def webhook():
    repo = git.Repo(".")
    origin = repo.remotes.origin
    origin.pull()

    return "Updated PythonAnywhere successfully", 200


@app.route('/')
def ola_mundo():
    nome = "glauco"
    return render_template("index.html")
    
if __name__ == "__main__":
    app.run()
