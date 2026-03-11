import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  const GAS_URL = process.env.GAS_URL;
  const API_TOKEN = process.env.API_TOKEN;
  const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;

  // 1. Origin 검증
  const origin = req.headers.origin || req.headers.referer;

  const isLocal = origin && (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1'));
  
  if (!isLocal && (!origin || !origin.startsWith(ALLOWED_ORIGIN))) {
    return res.status(403).json({ result: "error", message: "Forbidden: Invalid Origin" });
  }

  // 2. Rate Limiting (IP 기반, 1분당 50회)
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const identifier = `ratelimit_${ip}`;
    const current = await redis.incr(identifier);
    
    if (current === 1) {
      await redis.expire(identifier, 60);
    }

    if (current > 50) {
      return res.status(429).json({ result: "error", message: "Too Many Requests" });
    }
  } catch (redisError) {
    // Fail-Open: Redis 연결 실패 시에도 서비스 계속 진행
    console.error('Redis Rate Limit Error:', redisError);
  }

  try {
    const url = new URL(GAS_URL);
    url.searchParams.append('token', API_TOKEN);

    if (req.method === 'GET') {
      for (const [key, value] of Object.entries(req.query)) {
        url.searchParams.append(key, value);
      }
    }

    const options = {
      method: req.method,
    };

    if (req.method === 'POST') {
      options.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      options.headers = {
        'Content-Type': 'application/json',
      };
    }

    const response = await fetch(url.toString(), options);
    const data = await response.json();

    res.status(200).json(data);
    
  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ result: "error", message: "서버 통신 중 오류가 발생했습니다." });
  }
}