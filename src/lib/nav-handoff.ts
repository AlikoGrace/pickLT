/**
 * Hand the destination to Google Maps or Waze (plan maps/mover-navigation-mode)
 * for drivers who prefer them; those apps speak the phone's own language.
 * Universal links: they open the app when installed, the website otherwise.
 */
export interface NavTarget {
  latitude: number;
  longitude: number;
}

export function googleMapsUrl({ latitude, longitude }: NavTarget): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
}

export function wazeUrl({ latitude, longitude }: NavTarget): string {
  return `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;
}
