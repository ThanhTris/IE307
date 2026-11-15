import { podiumOrder } from '../../src/features/result/services/resultPresentation';

const entry = (id: string, score: number, isWinner = false) => ({ id, score, isWinner });

describe('podiumOrder', () => {
  it('keeps score order and the server order for equal scores', () => {
    const ordered = podiumOrder([entry('a', 5, true), entry('b', 4), entry('c', 4)]);
    expect(ordered.map(item => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('puts the winner first inside its group of equal scores', () => {
    const ordered = podiumOrder([entry('a', 5), entry('b', 5, true), entry('c', 4)]);
    expect(ordered.map(item => item.id)).toEqual(['b', 'a', 'c']);
  });

  it('never reorders across scores and does not change its input', () => {
    const input = [entry('a', 6), entry('b', 6, true), entry('c', 6)];
    const copy = JSON.stringify(input);
    expect(podiumOrder(input).map(item => item.id)).toEqual(['b', 'a', 'c']);
    expect(JSON.stringify(input)).toBe(copy);
  });
});
