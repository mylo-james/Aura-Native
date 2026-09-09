from ..models import db
from sqlalchemy import func



class Follow(db.Model):
    #pylint: disable='no-member'
    __tablename__ = 'follows'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    user_followed_id = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True),
                           server_default=func.now(), nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True),
                           server_default=func.now(), onupdate=func.now(),
                           nullable=False)

    user = db.relationship("User", back_populates="follows")
    
    def to_dict(self):
        return {"id": self.id, "user_id": self.user_id, "user_followed_id": self.user_followed_id, "created_at": self.created_at, "updated_at": self.updated_at}