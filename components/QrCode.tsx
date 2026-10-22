import qrcode from "qrcode-generator";

/**
 * 주소를 담은 QR 코드. 서버에서 그린 SVG 라 브라우저 코드가 없고, 인쇄해도 흐려지지 않습니다.
 * 크기는 className 으로 정합니다. (예: size-[0.68in])
 */
export function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
  // 종이가 조금 구겨지거나 번져도 읽히도록 오류 정정은 M(약 15%)으로 둡니다.
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const size = qr.getModuleCount();
  let path = "";
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (qr.isDark(row, col)) path += `M${col} ${row}h1v1h-1z`;
    }
  }
  // 둘레에 두 칸을 비워 두어야 카메라가 QR 코드의 테두리를 찾습니다.
  return (
    <svg
      viewBox={`-2 -2 ${size + 4} ${size + 4}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className={className}
    >
      <path d={path} fill="currentColor" />
    </svg>
  );
}
