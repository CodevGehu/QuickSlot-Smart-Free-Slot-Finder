import json
import random
import logging
from typing import Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

class ValkeyCache:
    """
    Valkey cache manager for derived availability results.
    Section 8: Valkey stores derived availability, not authoritative reservations.
    If Valkey is unavailable, falls back directly to PostgreSQL.
    """
    def __init__(self):
        self.client = None
        self.is_connected = False
        self._init_client()
        
    def _init_client(self):
        if not settings.CACHE_ENABLED:
            return
        try:
            import valkey
            self.client = valkey.Valkey.from_url(
                settings.VALKEY_URL, 
                socket_connect_timeout=0.5,
                socket_timeout=0.5,
                decode_responses=True
            )
            # Test ping
            self.client.ping()
            self.is_connected = True
            logger.info("Connected to Valkey cache at %s", settings.VALKEY_URL)
        except Exception as e:
            self.is_connected = False
            self.client = None
            logger.warning("Valkey cache unavailable (%s). Falling back to direct PostgreSQL calculation.", e)

    def build_key(self, campus: str, resource_id: str, date_str: str, s_rev: int, c_rev: int, r_rev: int) -> str:
        """Key pattern: avail:v1:{campus}:{resource}:{date}:s{S}:c{C}:r{R}"""
        return f"avail:v1:{campus}:{resource_id}:{date_str}:s{s_rev}:c{c_rev}:r{r_rev}"

    def get_availability(self, key: str) -> Optional[Dict[str, Any]]:
        if not self.is_connected or not self.client:
            return None
        try:
            val = self.client.get(key)
            if val:
                return json.loads(val)
        except Exception as e:
            logger.warning("Valkey get failed for key %s: %s. Using PostgreSQL fallback.", key, e)
        return None

    def set_availability(self, key: str, data: Dict[str, Any]) -> bool:
        if not self.is_connected or not self.client:
            return False
        try:
            ttl = random.randint(settings.CACHE_TTL_MIN, settings.CACHE_TTL_MAX)
            payload = json.dumps(data)
            self.client.set(key, payload, ex=ttl)
            return True
        except Exception as e:
            logger.warning("Valkey set failed for key %s: %s", key, e)
            return False

    def acquire_fill_lock(self, fill_key: str, token: str) -> bool:
        """Stampede lock: SET fill:key token NX PX 2000"""
        if not self.is_connected or not self.client:
            return True  # If no cache, allow direct calculation
        try:
            return bool(self.client.set(fill_key, token, nx=True, px=2000))
        except Exception:
            return True

    def release_fill_lock(self, fill_key: str, token: str) -> None:
        """Lua compare-and-delete: only delete if current token matches caller's token"""
        if not self.is_connected or not self.client:
            return
        lua_script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
        """
        try:
            self.client.eval(lua_script, 1, fill_key, token)
        except Exception as e:
            logger.debug("Fill lock release error: %s", e)

cache = ValkeyCache()
