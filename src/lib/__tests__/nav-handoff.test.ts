import { describe, expect, it } from 'vitest'

import { googleMapsUrl, wazeUrl } from '../nav-handoff';

describe('nav hand-off links (plan maps/mover-navigation-mode)', () => {
  const t = { latitude: 6.67314, longitude: -1.55698 };
  it('opens Google Maps driving directions to the destination', () => {
    expect(googleMapsUrl(t)).toBe('https://www.google.com/maps/dir/?api=1&destination=6.67314,-1.55698&travelmode=driving');
  });
  it('opens Waze navigation to the destination', () => {
    expect(wazeUrl(t)).toBe('https://waze.com/ul?ll=6.67314,-1.55698&navigate=yes');
  });
});
