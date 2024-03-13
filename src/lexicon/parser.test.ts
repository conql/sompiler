import { expect, test } from 'vitest'
import { sum } from './parser'

test("111", () => {
    expect(sum(1, 2)).toBe(3);
})

