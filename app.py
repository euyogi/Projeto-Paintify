from flask import Flask, render_template
app = Flask(__name__)
 
@app.route('/')
def ola_mundo():
    nome = "glauco"
    return render_template("index.html", visitante=nome)    
    
if __name__ == '__main__':
    app.run()