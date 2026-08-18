import { describe, expect, it } from 'vitest'

import { composeAddressLabel } from '../address-label'

describe('composeAddressLabel', () => {
  it('joins a place name with its region context', () => {
    // The reported bug: picking "Adum" wrote only the context.
    expect(composeAddressLabel('Adum', 'Kumasi, Ashanti, Ghana')).toBe(
      'Adum, Kumasi, Ashanti, Ghana',
    )
  })

  it('leaves a full street address alone (already contains the name)', () => {
    expect(
      composeAddressLabel('12 Hauptstrasse', '12 Hauptstrasse, 10115 Berlin, Germany'),
    ).toBe('12 Hauptstrasse, 10115 Berlin, Germany')
  })

  it('does not duplicate when the city is picked itself', () => {
    expect(composeAddressLabel('Kumasi', 'Kumasi, Ashanti, Ghana')).toBe(
      'Kumasi, Ashanti, Ghana',
    )
  })

  it('still joins when the name only appears in a later segment', () => {
    expect(composeAddressLabel('Ashanti', 'Kumasi, Ashanti, Ghana')).toBe(
      'Ashanti, Kumasi, Ashanti, Ghana',
    )
  })

  it('falls back cleanly when either side is missing', () => {
    expect(composeAddressLabel('Adum', '')).toBe('Adum')
    expect(composeAddressLabel('', 'Kumasi, Ghana')).toBe('Kumasi, Ghana')
    expect(composeAddressLabel(null, undefined)).toBe('')
  })
})
