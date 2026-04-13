from django.core.cache import cache
import time


ONLINE_TIMEOUT = 30

def set_user_online(user_id):
    cache.set(f"user_online_{user_id}", time.time(), timeout=ONLINE_TIMEOUT)

def is_user_online(user_id):
    last_seen = cache.get(f"user_online_{user_id}")
    return last_seen is not None

def get_last_seen(user_id):
    return cache.get(f"user_online_{user_id}")
