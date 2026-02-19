import { Client, Databases, Query } from 'node-appwrite';

const DATABASE_ID = '6990885c000627570048';
const MOVES_COLLECTION = '6991e46d001ab2a9f7d8';
const INVENTORY_CATALOG_COLLECTION = '699511da003b87d1039d';

// Pricing constants
const BASE_RATE_PER_KM = 1.50; // EUR per km
const MOVE_TYPE_MULTIPLIER = { light: 1.0, regular: 1.3, premium: 1.8 };
const FLOOR_SURCHARGE_NO_ELEVATOR = 15; // EUR per floor
const PACKING_RATES = { none: 0, partial: 50, full: 120, unpacking: 180 };
const CREW_RATES = { '1': 0, '2': 30, '3': 60, '4plus': 100 };
const MINIMUM_PRICE = 49;

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] ?? '');
  const databases = new Databases(client);

  if (req.method !== 'POST') {
    return res.json({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = JSON.parse(req.body || '{}');
    const { moveId, routeDistanceMeters, routeDurationSeconds, moveType, packingServiceLevel, crewSize, pickupFloorLevel, pickupElevator, dropoffFloorLevel, dropoffElevator, storageWeeks } = body;

    const distanceKm = (routeDistanceMeters || 0) / 1000;

    // Base price from distance
    let basePrice = distanceKm * BASE_RATE_PER_KM;

    // Move type multiplier
    const effectiveType = moveType || 'light';
    const multiplier = MOVE_TYPE_MULTIPLIER[effectiveType] || 1.0;
    basePrice *= multiplier;

    // Floor surcharges (no elevator)
    let floorSurcharge = 0;
    const pickupFloor = parseInt(pickupFloorLevel || '0', 10);
    const dropoffFloor = parseInt(dropoffFloorLevel || '0', 10);
    if (!pickupElevator && pickupFloor > 0) {
      floorSurcharge += pickupFloor * FLOOR_SURCHARGE_NO_ELEVATOR;
    }
    if (!dropoffElevator && dropoffFloor > 0) {
      floorSurcharge += dropoffFloor * FLOOR_SURCHARGE_NO_ELEVATOR;
    }

    // Packing surcharge
    const packingSurcharge = PACKING_RATES[packingServiceLevel] || 0;

    // Crew surcharge
    const crewSurcharge = CREW_RATES[crewSize] || 0;

    // Storage surcharge
    const storageSurcharge = (storageWeeks || 0) * 25; // €25 per week

    // Total
    let estimatedPrice = basePrice + floorSurcharge + packingSurcharge + crewSurcharge + storageSurcharge;
    estimatedPrice = Math.max(estimatedPrice, MINIMUM_PRICE);
    estimatedPrice = Math.round(estimatedPrice * 100) / 100;

    const breakdown = {
      basePrice: Math.round(basePrice * 100) / 100,
      distanceKm: Math.round(distanceKm * 100) / 100,
      moveTypeMultiplier: multiplier,
      floorSurcharge,
      packingSurcharge,
      crewSurcharge,
      storageSurcharge,
      estimatedPrice,
    };

    // If moveId is provided, update the move document
    if (moveId) {
      await databases.updateDocument(DATABASE_ID, MOVES_COLLECTION, moveId, {
        estimatedPrice,
        routeDistanceMeters: routeDistanceMeters || null,
        routeDurationSeconds: routeDurationSeconds || null,
      });
    }

    log(`Price calculated: €${estimatedPrice} for ${distanceKm}km ${effectiveType} move`);

    return res.json({ success: true, breakdown });
  } catch (err) {
    error(`Calculate price failed: ${err.message}`);
    return res.json({ error: err.message }, 500);
  }
};
