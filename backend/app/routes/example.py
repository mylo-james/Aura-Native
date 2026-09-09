# from flask import Blueprint, request, jsonify
# from ..models import db
# from ..models.posts import Post
# from ..models.users import User
# from ..models.follows import Follow
# from ..models.likes import Like
# from ..models.comments import Comment
# from ..auth import require_auth
# from random import randint

# bp = Blueprint("posts", __name__, url_prefix="/api/post")


# @bp.route('/scroll/<length>')
# def index(length):
#     # data = request.json getting from body of request
#     # user = data['user']
#     # print(user)
#     length = int(length)
#     post_list = []
#     post_num = Post.query.count()
#     posts = []
#     rand_int = randint(1, post_num-3)
#     posts = Post.query.filter(Post.id > rand_int).limit(3).all()
#     for post in posts:
#         post_dict = post.to_dict()
#         likes = Like.query.filter(
#             Like.likeable_id == post_dict["id"] and Like.likeableType == 'post').count()
#         comments = Comment.query.filter(
#             Comment.post_id == post_dict["id"]).count()
#         post_dict["like_count"] = likes
#         post_dict["comment_count"] = comments
#         post_list.append(post_dict)
#     return {"posts": post_list}
