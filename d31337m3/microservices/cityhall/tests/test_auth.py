import pytest


class TestHealth:
    async def test_health(self, client):
        resp = await client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["service"] == "cityhall"


class TestRegistration:
    REGISTER_PAYLOAD = {
        "first_name": "Alice",
        "last_name": "Smith",
        "dob": "1990-01-15",
        "email": "alice@example.com",
        "username": "alice",
        "password": "StrongPass1!",
        "confirm_password": "StrongPass1!",
    }

    async def test_register_success(self, client):
        resp = await client.post("/auth/register", json=self.REGISTER_PAYLOAD)
        assert resp.status_code == 201
        data = resp.json()
        assert data["username"] == "alice"
        assert "access_token" in data

    async def test_register_duplicate_email(self, client):
        await client.post("/auth/register", json=self.REGISTER_PAYLOAD)
        resp = await client.post("/auth/register", json=self.REGISTER_PAYLOAD)
        assert resp.status_code == 409

    async def test_register_password_mismatch(self, client):
        payload = {**self.REGISTER_PAYLOAD, "confirm_password": "DifferentPass1!"}
        resp = await client.post("/auth/register", json=payload)
        assert resp.status_code == 422


class TestLogin:
    REGISTER_PAYLOAD = {
        "first_name": "Bob",
        "last_name": "Jones",
        "dob": "1985-06-20",
        "email": "bob@example.com",
        "username": "bob",
        "password": "StrongPass1!",
        "confirm_password": "StrongPass1!",
    }

    @pytest.fixture(autouse=True)
    async def setup_user(self, client):
        await client.post("/auth/register", json=self.REGISTER_PAYLOAD)

    async def test_login_success(self, client):
        resp = await client.post("/auth/login", json={"username": "bob", "password": "StrongPass1!"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["username"] == "bob"
        assert "access_token" in data

    async def test_login_wrong_password(self, client):
        resp = await client.post("/auth/login", json={"username": "bob", "password": "wrong"})
        assert resp.status_code == 401

    async def test_login_nonexistent_user(self, client):
        resp = await client.post("/auth/login", json={"username": "nobody", "password": "StrongPass1!"})
        assert resp.status_code == 401


class TestEmailVerification:
    REGISTER_PAYLOAD = {
        "first_name": "Carol",
        "last_name": "Davis",
        "dob": "1992-03-10",
        "email": "carol@example.com",
        "username": "carol",
        "password": "StrongPass1!",
        "confirm_password": "StrongPass1!",
    }

    @pytest.fixture(autouse=True)
    async def setup_user(self, client):
        await client.post("/auth/register", json=self.REGISTER_PAYLOAD)

    async def test_verify_email(self, client):
        resp = await client.post("/auth/verify-email", json={"email": "carol@example.com"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "verification_sent"
        assert "token" in data
        token = data["token"]
        resp2 = await client.post("/auth/confirm-email", json={"email": "carol@example.com", "token": token})
        assert resp2.status_code == 200
        assert resp2.json()["status"] == "email_verified"

    async def test_confirm_email_bad_token(self, client):
        resp = await client.post("/auth/confirm-email", json={"email": "carol@example.com", "token": "bad-token"})
        assert resp.status_code == 400

    async def test_verify_email_nonexistent(self, client):
        resp = await client.post("/auth/verify-email", json={"email": "nobody@example.com"})
        assert resp.status_code == 404
