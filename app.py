from flask import Flask, render_template, request
import git

app = Flask(__name__)
 
@app.route('/update', methods=["POST"])
def webhook():
    if request.method == "POST":
        repo = git.Repo("https://github.com/euyogi/Trabalho-OO")
        origin = repo.remotes.origin
        origin.pull()
        
        return "Updated PythonAnywhere successfully", 200
    else:
        return "Wrong event type", 400


@app.route('/')
def ola_mundo():
    nome = "glauco"
    return render_template("index.html")
    
if __name__ == "__main__":
    app.run()
