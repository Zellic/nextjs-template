import Redis from "ioredis";

/*
nextjs hot reloads pages sometimes, so cache the Redis instance in the NodeJS global object to prevent it being
recreated
*/
if (global.redis === undefined) {
	if(process.env.REDIS_OBJECT === undefined)
		throw new Error("Redis config not specified...")
	global.redis = new Redis(JSON.parse(process.env.REDIS_OBJECT))
}

export const redis: Redis = global.redis