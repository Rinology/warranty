import { Redis } from '@upstash/redis'
import crypto from 'crypto'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  const GAS_URL = process.env.GAS_URL;
  const API_TOKEN = process.env.API_TOKEN;
  const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;
  const RATE_LIMIT = parseInt(process.env.RATE_LIMIT || "50");
  const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || "60");

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
      await redis.expire(identifier, RATE_LIMIT_WINDOW);
    }

    if (current > RATE_LIMIT) {
      return res.status(429).json({ result: "error", message: "Too Many Requests" });
    }
  } catch (redisError) {
    // Fail-Open: Redis 연결 실패 시에도 서비스 계속 진행
    console.error('Redis Rate Limit Error:', redisError);
  }

  // 3. reCAPTCHA 검증
  const recaptchaToken = req.headers['x-recaptcha-token'];
  if (!recaptchaToken) {
    return res.status(403).json({ result: "error", message: "Forbidden: Missing reCAPTCHA token" });
  }

  try {
    // 로컬 개발 환경일 경우 reCAPTCHA 검증을 완전히 생략합니다.
    if (isLocal) {
      console.log("Local env: Skipping reCAPTCHA verification entirely.");
    } else {
      const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
      const verifyUrl = `https://www.google.com/recaptcha/api/siteverify`;
      const verifyResponse = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${RECAPTCHA_SECRET_KEY}&response=${encodeURIComponent(recaptchaToken)}`
      });
      const verifyData = await verifyResponse.json();

      if (!verifyData.success || verifyData.score < 0.3) {
        console.error('reCAPTCHA verification failed:', verifyData);
        return res.status(403).json({ result: "error", message: "Forbidden: 비정상적인 접근이 감지되었습니다." });
      }
    }
  } catch (error) {
    console.error('reCAPTCHA error:', error);
    return res.status(500).json({ result: "error", message: "reCAPTCHA 검증 중 오류가 발생했습니다." });
  }

  try {
    let bodyData = req.body;
    if (req.method === 'POST' && typeof req.body === 'string') {
      try { bodyData = JSON.parse(req.body); } catch (e) {}
    }

    if (req.method === 'POST' && bodyData && bodyData.action === 'getUploadTicket') {
      const timestamp = Date.now().toString();
      const rawSignature = timestamp + API_TOKEN;
      const signature = crypto.createHash('sha256').update(rawSignature).digest('hex');
      
      return res.status(200).json({
        result: "success",
        gasUrl: GAS_URL,
        timestamp: timestamp,
        signature: signature
      });
    }

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