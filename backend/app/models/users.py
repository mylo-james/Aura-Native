from ..models import db
from sqlalchemy import func
from sqlalchemy.orm import validates
from werkzeug.security import generate_password_hash, check_password_hash


class User(db.Model):
    #pylint: disable=no-member
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    phoneNumber = db.Column(db.String(12), unique=True, nullable=False)
    hashed_password = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True),
                           server_default=func.now(), nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True),
                           server_default=func.now(), onupdate=func.now(),
                           nullable=False)

    follows = db.relationship("Follow", back_populates="user")
    mood = db.relationship("Mood", back_populates="user")
    
    

    @validates('name', 'phoneNumber')
    def validate_values(self, key, value):
        if key == 'name':
            if not value:
                raise AssertionError('Must provide a username!')
        if key == 'phoneNumber':
            if not value:
                raise AssertionError('Must provide an phone number!')
            if User.query.filter(User.phoneNumber == value).first():
                raise AssertionError('Phone Number already exists!')
        return value                    

    
    @property
    def password(self):
        return hashed_password

    @password.setter
    def password(self, password):
        self.hashed_password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.hashed_password, password)

    def to_dict(self):
        return {"id": self.id, "phoneNumber": self.phoneNumber, "name": self.name, "created_at": self.created_at, "updated_at": self.updated_at}