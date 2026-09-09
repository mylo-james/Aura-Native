from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from . import (users, follows, moods, actions)  #model file names here

#run migrations with 
# install psycopg2-binary
# flask db init
# flask db migrate
# flask db upgrade
