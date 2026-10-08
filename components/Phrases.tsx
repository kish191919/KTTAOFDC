import { Fragment } from "react";

/**
 * 끊어 읽는 단위로 나눠 적은 글을 보여 줍니다.
 * 단위마다 한 덩어리로 묶어 두어, 칸이 좁아 줄이 바뀔 때 단위 사이에서만 바뀝니다.
 * (단위 하나가 칸보다 길면 그 안에서는 평소처럼 줄이 바뀝니다)
 */
export function Phrases({ parts }: { parts: readonly string[] }) {
  return parts.map((part, index) => (
    <Fragment key={part}>
      {index > 0 && " "}
      <span className="inline-block">{part}</span>
    </Fragment>
  ));
}

/**
 * 글 속의 괄호 묶음이 줄 끝에서 "(KTTA / in USA)" 처럼 둘로 갈라지지 않게 묶어 보여 줍니다.
 * 괄호 바로 뒤에 붙은 조사·쉼표("(KTTA of DC)는")도 함께 묶습니다.
 */
export function KeepParens({ text }: { text: string }) {
  return text.split(/(\([^()]*\)\S*)/).map((part, index) =>
    index % 2 === 1 ? (
      <span key={index} className="whitespace-nowrap">
        {part}
      </span>
    ) : (
      part
    ),
  );
}
