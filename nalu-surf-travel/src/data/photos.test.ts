import { DESTINATIONS } from './destinations';
import { DESTINATION_PHOTOS } from './photos';

test('every destination has a photo entry with a non-empty src and alt', () => {
  for (const d of DESTINATIONS) {
    const photo = DESTINATION_PHOTOS[d.id];
    expect(photo).toBeDefined();
    expect(photo.src.length).toBeGreaterThan(0);
    expect(photo.alt.length).toBeGreaterThan(0);
  }
});
