import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 배너처럼 글자가 들어간 이미지는 90 품질로 내보냅니다.
    qualities: [75, 90],
  },
  // data/*.json 은 요청 시점(ISR 재생성)에도 읽으므로 서버 번들에 포함시킵니다.
  outputFileTracingIncludes: {
    "/*": ["./data/**/*.json"],
  },
};

export default nextConfig;
