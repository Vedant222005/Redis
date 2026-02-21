-- KEYS:
-- 1 = whitelist set key
-- 2 = ban key
-- 3 = attempt key

-- ARGV:
-- 1 = ip
-- 2 = max attempts
-- 3 = window TTL
-- 4 = ban TTL

local whitelistKey = KEYS[1]
local banKey = KEYS[2]
local attemptKey = KEYS[3]

local ip = ARGV[1]
local maxAttempts = tonumber(ARGV[2])
local windowTTL = tonumber(ARGV[3])
local banTTL = tonumber(ARGV[4])

-- STEP 1: Check whitelist
if redis.call("SISMEMBER", whitelistKey, ip) == 1 then
    return {"whitelisted", -1}
end

-- STEP 2: Check ban
if redis.call("EXISTS", banKey) == 1 then
    local ttl = redis.call("TTL", banKey)
    return {"banned", ttl}
end

-- STEP 3: Increment attempts
local attempts = redis.call("INCR", attemptKey)

-- STEP 4: Set TTL if first attempt(after windowTTL user gets new attempts)
if attempts == 1 then
    redis.call("EXPIRE", attemptKey, windowTTL)
end

-- STEP 5: Auto ban
if attempts > maxAttempts then
    redis.call("SET", banKey, "1", "EX", banTTL)
    return {"auto_banned", banTTL}
end

-- STEP 6: Allowed
return {"allowed", maxAttempts - attempts}
