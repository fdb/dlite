import matplotlib.pyplot as plt
import StringIO
from matplotlib import numpy as np
from flask import Flask
from flask import send_file

app = Flask(__name__)

@app.route("/")
def render():
    x = np.arange(0,np.pi*3,.1)
    y = np.sin(x)

    fig = plt.figure()
    plt.plot(x,y)

    fig.show()
    svg_io = StringIO.StringIO()
    fig.savefig(svg_io, format='svg')
    svg_io.seek(0)  # rewind the data
    return send_file(svg_io, mimetype='image/svg+xml')

if __name__ == "__main__":
    app.run()



