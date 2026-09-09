from flask import Blueprint, request, jsonify

from app.models import db
from app.models.moods import Mood
from app.models.actions import Action
from ..config import Configuration
from ..auth import require_auth

bp = Blueprint("mood", __name__, url_prefix='/api/mood')

@bp.route('', methods=["POST"])
def create():
  data = request.json
  mood = Mood(user_id=data['currentUserId'], level=data['level'],
              title=data['title'], content=data['content'])
  db.session.add(mood)
  
  for action in data['actions']:
    action = Action(act_id=(action))
    action.mood = mood
    db.session.add(action)
  
  db.session.commit()

  return {'message': 'done'}

@bp.route('/user/<id>/page/<page>')
def getUserMoods(id, page):
  user_id = int(id)
  page = int(page)
  moods = Mood.query.filter(Mood.user_id == user_id).order_by(Mood.created_at.desc()).offset(page).limit(3)
  mood_list = []
  for mood in moods:
    mood_list.append(mood.to_dict())
  return {'moods': mood_list}

@bp.route('/<id>', methods=['DELETE'])
def delete(id):
  int_id = int(id)
  print(id)
  actions = Action.query.filter(Action.mood_id == int_id).all()
  mood = Mood.query.filter(Mood.id == int_id).first()
  for  action in actions:
    db.session.delete(action)
  db.session.delete(mood)
  db.session.commit()
  return mood.to_dict()


@bp.route('/<id>', methods=['PUT'])
def put(id):
  data = request.json
  int_id = int(id)
  mood = Mood.query.filter(Mood.id == int_id).first()
  mood.title = data['title']
  mood.content = data['content']
  db.session.commit()

  return mood.to_dict()

  