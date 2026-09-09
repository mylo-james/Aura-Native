# from ..models import db
# from sqlalchemy import func
# # from werkzeug.security import generate_password_hash, check_password_hash   for Auth


# class ModelName(db.Model):
#     __tablename__ = 'model_names'

#     id = db.Column(db.Integer, primary_key=True)


#     created_at = db.Column(db.DateTime(timezone=True),
#                            server_default=func.now(), nullable=False)
#     updated_at = db.Column(db.DateTime(timezone=True),
#                            server_default=func.now(), onupdate=func.now(),
#                            nullable=False)

#     # user = db.relationship("User", back_populates="comments") relationship example
    
#  @property
#     # def password(self):
#     #     return hashed_password

#     # @password.setter
#     # def password(self, password):
#     #     self.hashed_password = generate_password_hash(password)

#     # def check_password(self, password):
#     #     return check_password_hash(self.hashed_password, password)

#     def to_dict(self):
#         return {"id": self.id, "created_at": self.created_at, "updated_at": self.updated_at}