import { buildFaqJsonLd, type FaqItem } from './faqJsonld';

const FIXTURE: FaqItem[] = [
  { question: 'When is the best time to surf Uluwatu?', answer: 'Apr – Oct, dry season.' },
  { question: 'Do I need to be advanced to surf Teahupo\'o?', answer: "Yes — it's rated Advanced." },
];

test('wraps each FAQ in a schema.org FAQPage/Question/Answer shape', () => {
  const graph = buildFaqJsonLd(FIXTURE);
  expect(graph['@context']).toBe('https://schema.org');
  expect(graph['@type']).toBe('FAQPage');
  expect(graph.mainEntity).toHaveLength(2);
  for (const q of graph.mainEntity) {
    expect(q['@type']).toBe('Question');
    expect(q.acceptedAnswer['@type']).toBe('Answer');
  }
});

test('preserves question/answer text verbatim and in order', () => {
  const graph = buildFaqJsonLd(FIXTURE);
  expect(graph.mainEntity[0].name).toBe(FIXTURE[0].question);
  expect(graph.mainEntity[0].acceptedAnswer.text).toBe(FIXTURE[0].answer);
  expect(graph.mainEntity[1].name).toBe(FIXTURE[1].question);
  expect(graph.mainEntity[1].acceptedAnswer.text).toBe(FIXTURE[1].answer);
});

test('returns an empty mainEntity for an empty list, not an error', () => {
  expect(buildFaqJsonLd([]).mainEntity).toEqual([]);
});

test('serializes to JSON with no undefined values', () => {
  const json = JSON.stringify(buildFaqJsonLd(FIXTURE));
  expect(json).not.toContain('undefined');
  expect(json.length).toBeGreaterThan(0);
});
