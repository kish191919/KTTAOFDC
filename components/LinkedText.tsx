import { Fragment } from "react";

// 본문 속 웹 주소와 이메일을 링크로 바꿔 줍니다. HTML 은 해석하지 않고 글자 그대로 보여 줍니다.
const LINK_RE = /(https?:\/\/[^\s<>"']+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;
// 문장 끝의 마침표·괄호가 주소에 딸려 들어가지 않게 합니다.
const TRAILING_RE = /[.,;:!?)\]]+$/;

export function LinkedText({ text, className }: { text: string; className?: string }) {
  const pieces = text.split(LINK_RE);
  return (
    <div
      className={`[tab-size:2] wrap-anywhere whitespace-pre-wrap ${className ?? ""}`}
    >
      {pieces.map((piece, index) => {
        // split 의 홀수 번째 조각이 정규식에 걸린 주소입니다.
        if (index % 2 === 0) return <Fragment key={index}>{piece}</Fragment>;
        const trailing = piece.match(TRAILING_RE)?.[0] ?? "";
        const target = trailing ? piece.slice(0, -trailing.length) : piece;
        const isEmail = !target.startsWith("http");
        return (
          <Fragment key={index}>
            <a
              href={isEmail ? `mailto:${target}` : target}
              {...(isEmail ? {} : { target: "_blank", rel: "noopener noreferrer" })}
              className="font-medium text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-700"
            >
              {target}
            </a>
            {trailing}
          </Fragment>
        );
      })}
    </div>
  );
}
