from ..models import db
from sqlalchemy import func



class Mood(db.Model):
    #pylint: disable='no-member'
    __tablename__ = 'moods'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    level = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(50))
    content = db.Column(db.String(2000))
    created_at = db.Column(db.DateTime(timezone=True),
                           server_default=func.now(), nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True),
                           server_default=func.now(), onupdate=func.now(),
                           nullable=False)

    user = db.relationship("User", back_populates="mood")
    action = db.relationship("Action", back_populates="mood")

    def to_dict(self):
        return {"id": self.id, "user_id": self.user_id, "level": self.level, "title": self.title, "content": self.content, "created_at": self.created_at, "updated_at": self.updated_at}