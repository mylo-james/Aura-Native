from flask import Flask
from flask_migrate import Migrate
from flask_cors import CORS

from app.config import Configuration
from app.routes import session, mood, follow
from app.models import db

app = Flask(__name__)
CORS(app)
app.config.from_object(Configuration)
db.init_app(app)
migrate = Migrate(app, db)

app.register_blueprint(session.bp)
app.register_blueprint(mood.bp)
app.register_blueprint(follow.bp)

