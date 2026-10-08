import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 배너처럼 글자가 들어간 이미지는 90 품질로 내보냅니다.
    qualities: [75, 90],
    // 관리자가 올린 이미지는 Supabase Storage 의 공개 주소에서 불러옵니다.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
