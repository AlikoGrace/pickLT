import { Client, Databases, ID, Query } from 'node-appwrite';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const MOVES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVES;
const MOVE_STATUS_HISTORY_COLLECTION = process.env.APPWRITE_COLLECTION_MOVE_STATUS_HISTORY;
const INVENTORY_CATALOG_COLLECTION = process.env.APPWRITE_COLLECTION_INVENTORY_CATALOG;

// Move type thresholds
const THRESHOLDS = {
  light: { maxPoints: 25, maxWeightKg: 200, maxItems: 15 },
  regular: { maxPoints: 80, maxWeightKg: 800, maxItems: 40 },
};
const TYPE_ORDER = { light: 0, regular: 1, premium: 2 };

function classifyMoveServer(inventory, catalogItems, currentMoveType) {
  let totalPoints = 0;
  let totalWeightKg = 0;
  let totalVolumeCm3 = 0;
  let totalItems = 0;

  for (const [itemId, quantity] of Object.entries(inventory)) {
    if (quantity <= 0) continue;
    const item = catalogItems.find(i => i.itemId === itemId);
    if (!item) continue;
    totalPoints += (item.moveClassificationWeight || 0) * quantity;
    totalWeightKg += (item.weightKg || 0) * quantity;
    totalVolumeCm3 += ((item.widthCm || 0) * (item.heightCm || 0) * (item.depthCm || 0)) * quantity;
    totalItems += quantity;
  }

  let recommendedType = 'light';
  if (totalPoints > THRESHOLDS.regular.maxPoints || totalWeightKg > THRESHOLDS.regular.maxWeightKg || totalItems > THRESHOLDS.regular.maxItems) {
    recommendedType = 'premium';
  } else if (totalPoints > THRESHOLDS.light.maxPoints || totalWeightKg > THRESHOLDS.light.maxWeightKg || totalItems > THRESHOLDS.light.maxItems) {
    recommendedType = 'regular';
  }

  return { recommendedType, totalPoints, totalWeightKg, totalVolumeCm3, totalItems };
}

// Generate a human-readable move handle
function generateHandle() {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `MV-${year}-${random}`;
}

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
    const { clientId, moveCategory, moveType, moveDate, ...moveData } = body;

    if (!clientId) {
      return res.json({ error: 'clientId is required' }, 400);
    }

    // Fetch inventory catalog for server-side classification
    let systemMoveType = moveType || 'light';
    let totalItemCount = 0;
    let totalWeightKg = 0;
    let totalVolumeCm3 = 0;

    if (moveData.inventoryItems) {
      const inventoryObj = typeof moveData.inventoryItems === 'string'
        ? JSON.parse(moveData.inventoryItems)
        : moveData.inventoryItems;

      const catalog = await databases.listDocuments(DATABASE_ID, INVENTORY_CATALOG_COLLECTION, [Query.limit(100)]);
      const classification = classifyMoveServer(inventoryObj, catalog.documents, moveType || 'light');
      systemMoveType = classification.recommendedType;
      totalItemCount = classification.totalItems;
      totalWeightKg = classification.totalWeightKg;
      totalVolumeCm3 = classification.totalVolumeCm3;
    }

    const handle = generateHandle();

    // Create the move document
    const move = await databases.createDocument(
      DATABASE_ID,
      MOVES_COLLECTION,
      ID.unique(),
      {
        handle,
        clientId,
        status: 'draft',
        moveCategory: moveCategory || 'scheduled',
        moveType: moveType || 'light',
        systemMoveType,
        moveDate: moveDate || null,
        totalItemCount,
        totalWeightKg,
        totalVolumeCm3,
        inventoryItems: typeof moveData.inventoryItems === 'object'
          ? JSON.stringify(moveData.inventoryItems)
          : moveData.inventoryItems || null,
        // Pickup
        pickupLocation: moveData.pickupLocation || null,
        pickupLatitude: moveData.pickupLatitude || null,
        pickupLongitude: moveData.pickupLongitude || null,
        pickupStreetAddress: moveData.pickupStreetAddress || null,
        pickupApartmentUnit: moveData.pickupApartmentUnit || null,
        pickupFloorLevel: moveData.pickupFloorLevel || null,
        pickupElevator: moveData.pickupElevator ?? null,
        pickupParking: moveData.pickupParking || null,
        pickupHaltverbot: moveData.pickupHaltverbot ?? null,
        // Dropoff
        dropoffLocation: moveData.dropoffLocation || null,
        dropoffLatitude: moveData.dropoffLatitude || null,
        dropoffLongitude: moveData.dropoffLongitude || null,
        dropoffStreetAddress: moveData.dropoffStreetAddress || null,
        dropoffApartmentUnit: moveData.dropoffApartmentUnit || null,
        dropoffFloorLevel: moveData.dropoffFloorLevel || null,
        dropoffElevator: moveData.dropoffElevator ?? null,
        dropoffParking: moveData.dropoffParking || null,
        dropoffHaltverbot: moveData.dropoffHaltverbot ?? null,
        // Other
        homeType: moveData.homeType || null,
        customItems: moveData.customItems || [],
        packingServiceLevel: moveData.packingServiceLevel || null,
        packingMaterials: moveData.packingMaterials || [],
        packingNotes: moveData.packingNotes || null,
        arrivalWindow: moveData.arrivalWindow || null,
        flexibility: moveData.flexibility || null,
        crewSize: moveData.crewSize || null,
        vehicleType: moveData.vehicleType || null,
        additionalServices: moveData.additionalServices || [],
        storageWeeks: moveData.storageWeeks || 0,
        coverPhotoId: moveData.coverPhotoId || null,
        galleryPhotoIds: moveData.galleryPhotoIds || [],
        contactFullName: moveData.contactFullName || null,
        contactPhone: moveData.contactPhone || null,
        contactEmail: moveData.contactEmail || null,
        contactNotes: moveData.contactNotes || null,
        isBusinessMove: moveData.isBusinessMove ?? null,
        companyName: moveData.companyName || null,
        vatId: moveData.vatId || null,
        routeDistanceMeters: moveData.routeDistanceMeters || null,
        routeDurationSeconds: moveData.routeDurationSeconds || null,
        termsAccepted: moveData.termsAccepted ?? null,
        privacyAccepted: moveData.privacyAccepted ?? null,
      }
    );

    // Create initial status history entry
    await databases.createDocument(
      DATABASE_ID,
      MOVE_STATUS_HISTORY_COLLECTION,
      ID.unique(),
      {
        moveId: move.$id,
        fromStatus: '',
        toStatus: 'draft',
        changedBy: clientId,
        changedAt: new Date().toISOString(),
        note: 'Move created',
      }
    );

    log(`Move created: ${move.$id} (${handle}) for client ${clientId}`);

    return res.json({
      success: true,
      move,
      systemMoveType,
    });
  } catch (err) {
    error(`Create move failed: ${err.message}`);
    return res.json({ error: err.message }, 500);
  }
};
