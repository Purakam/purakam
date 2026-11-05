"""A small in-memory sliding-window rate limiter.

Each key (for example "login:someone@example.com") remembers when its recent
events happened. A key is "blocked" once it has `limit` events inside the last
`window` seconds, and unblocks by itself as the oldest ones age out.

It lives in this process's memory, so it resets if the server restarts and is
not shared between several server processes. That matches how this app runs
today (a single uvicorn worker). If you ever run more than one worker, switch
this for a shared store such as Redis - the callers only use the four methods
below, so nothing else would need to change.
"""
import math
import threading
import time
from collections import deque


class RateLimiter:
    def __init__(self, clock=time.monotonic):
        self._clock = clock
        self._events = {}  # key -> (deque of timestamps, window seconds)
        self._lock = threading.Lock()
        self._calls = 0

    def _live_events(self, key, now, window):
        entry = self._events.get(key)
        if entry is None:
            return None
        events = entry[0]
        while events and now - events[0] >= window:
            events.popleft()
        if not events:
            del self._events[key]
            return None
        return events

    def _sweep(self, now):
        # Forget keys that have gone quiet, so a flood of one-off keys (say,
        # random email addresses) can't make memory grow without bound.
        for key in list(self._events):
            events, window = self._events[key]
            if not events or now - events[-1] >= window:
                del self._events[key]

    def retry_after(self, key, limit, window):
        """Seconds until this key is allowed another event, or 0 if it already is."""
        with self._lock:
            now = self._clock()
            events = self._live_events(key, now, window)
            if events is None or len(events) < limit:
                return 0
            # It frees up when enough of the oldest events have aged out to
            # drop back below the limit.
            oldest_that_matters = events[len(events) - limit]
            return max(1, math.ceil(oldest_that_matters + window - now))

    def hit(self, key, window):
        """Record that an event just happened for this key."""
        with self._lock:
            now = self._clock()
            self._calls += 1
            if self._calls % 500 == 0:
                self._sweep(now)
            entry = self._events.get(key)
            if entry is None:
                entry = (deque(), window)
                self._events[key] = entry
            entry[0].append(now)

    def consume(self, key, limit, window):
        """Allow-and-record in one step. Returns 0 if allowed (and counts it),
        otherwise the number of seconds to wait (and counts nothing)."""
        wait = self.retry_after(key, limit, window)
        if wait:
            return wait
        self.hit(key, window)
        return 0

    def reset(self, key):
        """Forget everything recorded for this key."""
        with self._lock:
            self._events.pop(key, None)