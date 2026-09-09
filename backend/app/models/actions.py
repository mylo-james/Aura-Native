from ..models import db
from sqlalchemy import func



class Action(db.Model):
    #pylint: disable='no-member'
    __tablename__ = 'actions'

    id = db.Column(db.Integer, primary_key=True)
    mood_id = db.Column(db.Integer, db.ForeignKey("moods.id"), nullable=False)
    act_id = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True),
                           server_default=func.now(), nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True),
                           server_default=func.now(), onupdate=func.now(),
                           nullable=False)

    mood = db.relationship("Mood", back_populates="action")
    
    @property
    def to_dict(self):
        return {"id": self.id, "mood_id": self.mood_id, "name": self.name, "created_at": self.created_at, "updated_at": self.updated_at}