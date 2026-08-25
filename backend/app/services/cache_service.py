import json
import os

try:
    import redis
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    redis_client = redis.Redis.from_url(redis_url, decode_responses=True)
except Exception:
    redis_client = None

DEFAULT_TTL = 300 # 5 minutes

def get_cache(key: str):
    """
    Cache-Aside: Retrieve JSON deserialized object from Redis if available
    """
    if not redis_client:
        return None
    try:
        data = redis_client.get(key)
        if data:
            record_hit()
            return json.loads(data)
        record_miss()
        return None
    except Exception:
        record_miss()
        return None

def set_cache(key: str, value: any, ttl_seconds: int = DEFAULT_TTL):
    """
    Cache-Aside: Store JSON serialized data in Redis with TTL
    """
    if not redis_client:
        return False
    try:
        serialized = json.dumps(value, default=str)
        redis_client.set(key, serialized, ex=ttl_seconds)
        return True
    except Exception:
        return False

def delete_cache(key: str):
    """
    Invalidate single cache key
    """
    if not redis_client:
        return False
    try:
        redis_client.delete(key)
        return True
    except Exception:
        return False

def invalidate_pattern(pattern: str):
    """
    Deliberate Cache Invalidation: Flush all keys matching namespace pattern (e.g. 'products:*')
    """
    if not redis_client:
        return False
    try:
        keys = redis_client.keys(pattern)
        if keys:
            redis_client.delete(*keys)
        return True
    except Exception:
        return False

def record_hit():
    if redis_client:
        try:
            redis_client.incr("cache:stats:hits")
        except Exception:
            pass

def record_miss():
    if redis_client:
        try:
            redis_client.incr("cache:stats:misses")
        except Exception:
            pass

def get_cache_stats():
    if not redis_client:
        return {"status": "disabled", "hit_ratio": "0%", "hits": 0, "misses": 0}
    try:
        hits = int(redis_client.get("cache:stats:hits") or 0)
        misses = int(redis_client.get("cache:stats:misses") or 0)
        total = hits + misses
        ratio = f"{round((hits / total * 100), 1)}%" if total > 0 else "100.0%"
        return {
            "status": "active",
            "hit_ratio": ratio,
            "hits": hits,
            "misses": misses,
            "redis_connected": True
        }
    except Exception:
        return {"status": "error", "hit_ratio": "0%", "hits": 0, "misses": 0}
