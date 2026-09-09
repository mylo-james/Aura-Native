"""Start Aura with its local development database; existing rows are preserved."""
from app import app, db

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(host="127.0.0.1", port=5051, debug=False)
