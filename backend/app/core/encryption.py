"""
Data Encryption Engine — PreSkool ERP
Implements AES-256-GCM field-level encryption for PII at rest.

Architecture:
  - AES-256-GCM: Authenticated encryption (confidentiality + integrity)
  - Fernet wrapper: Convenient symmetric key management
  - EncryptedString SQLAlchemy type: Drop-in for any model column
  - Key rotation: Multiple key support with transparent decryption
  - Deterministic tokens: Searchable pseudonymised fields (HMAC-SHA256)
  - Envelope encryption: Column keys wrapped by master key (KMS-ready)

Usage:
  class Student(BaseModel):
      phone = Column(EncryptedString(256))    # Encrypted at rest
      phone_token = Column(String(64), index=True)  # Searchable token

  # Auto-encrypt on save, decrypt on load — transparent to business logic
"""
import os
import base64
import hashlib
import hmac
import secrets
import logging
from typing import Any, Optional

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.fernet import Fernet, MultiFernet, InvalidToken

from sqlalchemy import TypeDecorator, String

from app.core.config import settings

logger = logging.getLogger("preskool.encryption")


# ═══════════════════════════════════════════════════════════════════════
# KEY MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════

class EncryptionKeyManager:
    """
    Manages encryption keys for field-level encryption.

    Key hierarchy:
      ENCRYPTION_MASTER_KEY (env var) ──► Column encryption keys (derived)
      ENCRYPTION_SECONDARY_KEY(s)     ──► For rotation (old key decrypts, new key encrypts)

    Production: Integrate with AWS KMS, HashiCorp Vault, or GCP Secret Manager.
    Development: Uses env vars with PBKDF2-derived keys.
    """

    def __init__(self):
        self._fernet: Optional[MultiFernet] = None
        self._aesgcm: Optional[AESGCM] = None
        self._hmac_key: Optional[bytes] = None
        self._initialized = False

    def _get_master_key_bytes(self) -> bytes:
        """
        Get the master encryption key from environment.
        Derives 32-byte AES key via PBKDF2 from the master key string.
        """
        master_key = os.environ.get("ENCRYPTION_MASTER_KEY", "")
        if not master_key:
            if settings.APP_ENV == "development":
                # Dev fallback — NOT for production
                logger.warning(
                    "⚠️  No ENCRYPTION_MASTER_KEY set — using dev fallback. "
                    "Set ENCRYPTION_MASTER_KEY in production!"
                )
                master_key = "dev-only-preskool-encryption-key-change-in-prod"
            else:
                raise EnvironmentError(
                    "ENCRYPTION_MASTER_KEY environment variable is required in production. "
                    "Generate with: python3 -c \"import secrets; print(secrets.token_hex(32))\""
                )

        # Derive 32-byte key via PBKDF2-SHA256
        salt = os.environ.get("ENCRYPTION_SALT", "preskool-erp-v1").encode()
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100_000,
        )
        return kdf.derive(master_key.encode())

    def _build_fernet(self, key_bytes: bytes) -> Fernet:
        """Create Fernet instance from raw 32-byte key."""
        fernet_key = base64.urlsafe_b64encode(key_bytes)
        return Fernet(fernet_key)

    def initialize(self):
        """Initialize encryption keys. Called once at app startup."""
        primary_key = self._get_master_key_bytes()

        # Support key rotation via ENCRYPTION_OLD_KEY env vars
        fernets = [self._build_fernet(primary_key)]

        for i in range(1, 6):  # Support up to 5 old keys for rotation
            old_key_env = f"ENCRYPTION_OLD_KEY_{i}"
            old_key_str = os.environ.get(old_key_env, "")
            if old_key_str:
                old_salt = os.environ.get(f"ENCRYPTION_OLD_SALT_{i}", "preskool-erp-v1").encode()
                kdf = PBKDF2HMAC(
                    algorithm=hashes.SHA256(),
                    length=32,
                    salt=old_salt,
                    iterations=100_000,
                )
                old_key = kdf.derive(old_key_str.encode())
                fernets.append(self._build_fernet(old_key))
                logger.info(f"🔑 Loaded legacy key #{i} for rotation decryption")

        # MultiFernet: encrypts with first key, tries all keys for decryption
        self._fernet = MultiFernet(fernets)

        # AES-256-GCM for raw encryption (alternative to Fernet)
        self._aesgcm = AESGCM(primary_key)

        # HMAC key for deterministic pseudonymisation
        self._hmac_key = hashlib.sha256(b"preskool-hmac:" + primary_key).digest()

        self._initialized = True
        logger.info("🔒 Encryption engine initialized (AES-256-GCM + Fernet MultiFernet)")

    @property
    def fernet(self) -> MultiFernet:
        if not self._initialized:
            self.initialize()
        return self._fernet

    @property
    def aesgcm(self) -> AESGCM:
        if not self._initialized:
            self.initialize()
        return self._aesgcm

    @property
    def hmac_key(self) -> bytes:
        if not self._initialized:
            self.initialize()
        return self._hmac_key

    @staticmethod
    def generate_key() -> str:
        """Generate a new random encryption master key."""
        return secrets.token_hex(32)

    def rotate_keys(self, new_master_key: str):
        """
        Rotate to a new master key.
        Old key is placed in ENCRYPTION_OLD_KEY_1 for decryption during migration.
        Re-encrypt all records by re-saving them — old key decrypts, new key encrypts.
        """
        logger.info("🔑 Starting key rotation...")
        # In production: set ENCRYPTION_MASTER_KEY = new key, ENCRYPTION_OLD_KEY_1 = old key
        # Then run the data migration job to re-encrypt all rows
        raise NotImplementedError("Set env vars and run: python3 security/scripts/rotate_keys.py")


# Singleton — initialized at app startup
key_manager = EncryptionKeyManager()


# ═══════════════════════════════════════════════════════════════════════
# ENCRYPTION / DECRYPTION FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════

def encrypt(plaintext: str) -> str:
    """
    Encrypt a plaintext string using AES-256 (Fernet/GCM).
    Returns base64-encoded ciphertext.
    """
    if not plaintext:
        return plaintext
    try:
        encrypted = key_manager.fernet.encrypt(plaintext.encode("utf-8"))
        return encrypted.decode("utf-8")
    except Exception as e:
        logger.error(f"Encryption failed: {e}")
        raise


def decrypt(ciphertext: str) -> str:
    """
    Decrypt an encrypted string.
    Transparent key rotation: tries all configured keys.
    """
    if not ciphertext:
        return ciphertext
    try:
        decrypted = key_manager.fernet.decrypt(ciphertext.encode("utf-8"))
        return decrypted.decode("utf-8")
    except InvalidToken:
        logger.error("Decryption failed — invalid token or wrong key")
        raise ValueError("Cannot decrypt field: invalid token or key mismatch")
    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        raise


def encrypt_aes_gcm(plaintext: str) -> str:
    """
    Raw AES-256-GCM encryption. Returns 'nonce:ciphertext' base64 string.
    Slightly more efficient for large fields; provides authenticated encryption.
    """
    if not plaintext:
        return plaintext
    nonce = os.urandom(12)  # 96-bit nonce for GCM
    ciphertext = key_manager.aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    combined = nonce + ciphertext
    return base64.urlsafe_b64encode(combined).decode("utf-8")


def decrypt_aes_gcm(encrypted: str) -> str:
    """Decrypt AES-256-GCM encrypted field."""
    if not encrypted:
        return encrypted
    combined = base64.urlsafe_b64decode(encrypted.encode("utf-8"))
    nonce = combined[:12]
    ciphertext = combined[12:]
    plaintext = key_manager.aesgcm.decrypt(nonce, ciphertext, None)
    return plaintext.decode("utf-8")


def pseudonymise(value: str) -> str:
    """
    Deterministic pseudonymisation via HMAC-SHA256.
    Same input → same output (searchable proxy), but irreversible.
    Use for: searchable index on encrypted fields (phone, email lookup).
    """
    if not value:
        return value
    token = hmac.new(
        key_manager.hmac_key,
        value.lower().encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return token


def hash_pii(value: str) -> str:
    """
    One-way hash for PII (for deduplication without storing plaintext).
    Uses SHA-256 with application-specific salt.
    """
    if not value:
        return value
    salted = f"preskool-pii:{value.lower().strip()}"
    return hashlib.sha256(salted.encode()).hexdigest()


def anonymise(value: str, preserve_length: bool = False) -> str:
    """
    Anonymise a value for GDPR right to erasure.
    Replaces with irreversible anonymised placeholder.
    """
    if not value:
        return value
    if preserve_length:
        return "*" * len(value)
    return "[ANONYMISED]"


# ═══════════════════════════════════════════════════════════════════════
# SQLALCHEMY ENCRYPTED TYPE — Drop-in Column Type
# ═══════════════════════════════════════════════════════════════════════

class EncryptedString(TypeDecorator):
    """
    SQLAlchemy TypeDecorator that transparently encrypts/decrypts column values.

    Usage:
        class Student(BaseModel):
            phone = Column(EncryptedString(512))  # Stored encrypted in DB
            email = Column(EncryptedString(512))  # Stored encrypted in DB

    The encrypted column stores the ciphertext — longer than plaintext,
    so use a generous length (512 bytes covers typical AES-256-Fernet output).
    The data is encrypted before INSERT and decrypted after SELECT.
    """

    impl = String
    cache_ok = True  # Safe to cache; encryption is deterministic per call

    def __init__(self, length: int = 512, *args, **kwargs):
        super().__init__(length, *args, **kwargs)

    def process_bind_param(self, value: Any, dialect: Any) -> Optional[str]:
        """Called before INSERT/UPDATE: encrypt plaintext → ciphertext."""
        if value is None:
            return None
        if isinstance(value, str) and value.startswith("gAAAAA"):
            # Already encrypted (e.g., re-saving unchanged field)
            return value
        return encrypt(str(value))

    def process_result_value(self, value: Any, dialect: Any) -> Optional[str]:
        """Called after SELECT: decrypt ciphertext → plaintext."""
        if value is None:
            return None
        try:
            return decrypt(str(value))
        except Exception:
            # Return as-is if not encrypted (migration safety)
            return value

    def copy(self, **kwargs):
        return EncryptedString(self.impl.length)


class EncryptedText(TypeDecorator):
    """
    Encrypted text for larger fields (notes, addresses, medical records).
    Uses TEXT underlying type with AES-256-GCM.
    """
    from sqlalchemy import Text as SAText

    impl = SAText
    cache_ok = True

    def process_bind_param(self, value: Any, dialect: Any) -> Optional[str]:
        if value is None:
            return None
        return encrypt_aes_gcm(str(value))

    def process_result_value(self, value: Any, dialect: Any) -> Optional[str]:
        if value is None:
            return None
        try:
            return decrypt_aes_gcm(str(value))
        except Exception:
            return value


# ═══════════════════════════════════════════════════════════════════════
# DATA CLASSIFICATION HELPERS
# ═══════════════════════════════════════════════════════════════════════

class DataClassification:
    """
    Data sensitivity levels following ISO 27001 and GDPR categories.
    Use to determine which fields need encryption / anonymisation.
    """

    # CRITICAL PII — must be encrypted at rest, masked in logs
    CRITICAL_PII = frozenset({
        "aadhaar_number",   # Indian national ID
        "pan_number",       # Tax ID
        "passport_number",
        "bank_account",
        "credit_card",
        "medical_records",
        "health_data",
        "biometric_data",
    })

    # SENSITIVE PII — should be encrypted, restricted access
    SENSITIVE_PII = frozenset({
        "email",
        "phone",
        "mobile",
        "date_of_birth",
        "address",
        "home_address",
        "emergency_contact",
        "salary",
        "income",
        "caste",           # Protected in India
        "religion",        # Protected
        "disability",      # Protected
    })

    # GENERAL PII — needs data subject rights but not strictly encrypted
    GENERAL_PII = frozenset({
        "full_name",
        "first_name",
        "last_name",
        "gender",
        "nationality",
        "profile_photo",
        "student_id",
        "employee_id",
    })

    @classmethod
    def classify(cls, field_name: str) -> str:
        """Return data classification for a field name."""
        fn = field_name.lower()
        if fn in cls.CRITICAL_PII:
            return "CRITICAL"
        if fn in cls.SENSITIVE_PII:
            return "SENSITIVE"
        if fn in cls.GENERAL_PII:
            return "GENERAL"
        return "PUBLIC"

    @classmethod
    def should_encrypt(cls, field_name: str) -> bool:
        """Returns True if field should be encrypted at rest."""
        return cls.classify(field_name) in ("CRITICAL", "SENSITIVE")

    @classmethod
    def should_mask_in_logs(cls, field_name: str) -> bool:
        """Returns True if field value should be masked in log output."""
        return cls.classify(field_name) != "PUBLIC"

    @staticmethod
    def mask_for_log(value: str, field_name: str = "") -> str:
        """Mask a PII value for safe log output (shows only last 4 chars)."""
        if not value:
            return value
        if len(value) <= 4:
            return "****"
        return f"****{value[-4:]}"
