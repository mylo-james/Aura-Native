from flask import Blueprint, request, jsonify

from app.models import db
from app.models.users import User
from app.models.moods import Mood
from app.models.actions import Action
from app.models.follows import Follow
from ..config import Configuration
from ..auth import require_auth

bp = Blueprint("follow", __name__, url_prefix='/api/follow')

@bp.route('', methods=["POST"])
def create():
  data = request.json
  user_to_follow = User.query.filter(User.phoneNumber == data["phoneNumber"]).first()
  if not user_to_follow:
    return {"error": "Friend could not be added"}, 401
  to_follow_dict = user_to_follow.to_dict()
  follow_exists = Follow.query.filter(Follow.user_id == data['currentUserId']).filter(Follow.user_followed_id == to_follow_dict['id']).first()
  if follow_exists:
    return {'error': 'Friend already exists'}, 401
  user_followed = user_to_follow.to_dict()
  print(user_followed['id'])
  follow = Follow(user_id=int(data['currentUserId']), user_followed_id=user_followed['id'])
  db.session.add(follow)
  
  db.session.commit()

  return {'message': 'Friend added'}

@bp.route('/user/<id>/')
def getUserFollows(id):
  user_id = int(id)

  friends = Follow.query.filter(Follow.user_id == user_id).all()
  friends_moods = []
 
  for friend in friends:
    friend_dict = friend.to_dict()
    user = User.query.filter(User.id == friend_dict['user_followed_id']).first()
    mood = Mood.query.filter(Mood.user_id == friend_dict['user_followed_id']).first()
    if not mood:
      mood_dict = {}
    else:
      mood_dict = mood.to_dict()
    
    friends_moods.append({'mood': mood_dict, 'user': user.to_dict()})
  return {'moods': friends_moods}

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

  