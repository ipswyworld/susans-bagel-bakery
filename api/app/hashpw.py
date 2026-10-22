"""Usage: python -m app.hashpw  -> prints a value for ADMIN_PASSWORD_HASH."""
import getpass

from .security import hash_password

if __name__ == "__main__":
    print(hash_password(getpass.getpass("New admin password: ")))
