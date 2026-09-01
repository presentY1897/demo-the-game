import { randomInt } from 'node:crypto'

/**
 * 사람이 보고 받아 적는 코드(방 초대 코드·세션 입장 코드)의 문자 집합.
 * 혼동하기 쉬운 `0/O/1/I`를 뺀 대문자 영숫자 32자.
 */
export const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
export const CODE_LENGTH = 6

export function randomCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  }
  return code
}

/** 소문자·앞뒤 공백을 섞어 입력해도 같은 코드로 해석한다 */
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase()
}
