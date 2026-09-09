"""Regression checks use an isolated temporary SQLite database, never demo data."""
import os
import sys
import tempfile
import unittest
from pathlib import Path

_temp = tempfile.TemporaryDirectory(prefix="aura-test-")
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_temp.name) / 'test.sqlite3'}"
os.environ["SECRET_KEY"] = "test-only-key-for-aura-compatibility-regressions"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import app, db

class LocalRecoveryTests(unittest.TestCase):
    def setUp(self):
        self.context = app.app_context()
        self.context.push()
        db.create_all()
        self.client = app.test_client()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.context.pop()

    def register(self):
        response = self.client.post("/api/session/register", json={
            "name": "Test Person", "phoneNumber": "202-555-0199",
            "password": "TestPassword1!", "confirmPassword": "TestPassword1!",
        })
        self.assertEqual(response.status_code, 200)
        return response.get_json()

    def test_registration_login_and_token_validation(self):
        registered = self.register()
        self.assertIsInstance(registered["access_token"], str)
        login = self.client.post("/api/session/login", json={
            "phoneNumber": "202-555-0199", "password": "TestPassword1!",
        })
        self.assertEqual(login.status_code, 200)
        checked = self.client.post("/api/session/check", json={
            "access_token": login.get_json()["access_token"],
        })
        self.assertEqual(checked.status_code, 200)
        self.assertEqual(checked.get_json()["user"]["id"], registered["user"]["id"])
        invalid = self.client.post("/api/session/check", json={"access_token": "invalid"})
        self.assertEqual(invalid.status_code, 401)

    def test_journal_write_read_edit_delete(self):
        user_id = self.register()["user"]["id"]
        saved = self.client.post("/api/mood", json={
            "currentUserId": user_id, "level": 5, "title": "A local moment",
            "content": "Saved to SQLite.", "actions": [3, 9],
        })
        self.assertEqual(saved.status_code, 200)
        history = self.client.get(f"/api/mood/user/{user_id}/page/0").get_json()["moods"]
        self.assertEqual(len(history), 1)
        mood_id = history[0]["id"]
        self.assertEqual(history[0]["level"], 5)
        edited = self.client.put(f"/api/mood/{mood_id}", json={
            "title": "Edited locally", "content": "The edit persists.",
        })
        self.assertEqual(edited.status_code, 200)
        reread = self.client.get(f"/api/mood/user/{user_id}/page/0").get_json()["moods"]
        self.assertEqual(reread[0]["title"], "Edited locally")
        self.assertEqual(self.client.delete(f"/api/mood/{mood_id}").status_code, 200)
        self.assertEqual(self.client.get(f"/api/mood/user/{user_id}/page/0").get_json()["moods"], [])

if __name__ == "__main__":
    unittest.main()
