# Inventory Catalog — PickLT

Use this file as a reference to populate the `inventory_catalog` collection in the Appwrite database.

Each item should be created as a document in the **inventory_catalog** collection with the attributes listed below.

> **Admin extensibility**: New items and categories can be added at any time through the admin panel. The frontend dynamically derives category tabs from the items fetched from the database — if you add items with a new `category` value, that category will appear automatically.

## Collection Schema (per BACKEND_ARCHITECTURE.md)

| Attribute                  | Type   | Required | Description                                                        |
| -------------------------- | ------ | -------- | ------------------------------------------------------------------ |
| `itemId`                   | string | Yes      | Unique slug identifier (e.g. `sofa_2seater`)                       |
| `name`                     | string | Yes      | Display name shown to the user                                     |
| `category`                 | string | Yes      | Category slug (see Categories below — admins can add new ones)     |
| `widthCm`                  | integer| Yes      | Width in centimetres                                               |
| `heightCm`                 | integer| Yes      | Height in centimetres                                              |
| `depthCm`                  | integer| Yes      | Depth in centimetres                                               |
| `weightKg`                 | float  | Yes      | Approximate weight in kilograms                                    |
| `moveClassificationWeight` | float  | Yes      | Points used by the classification algorithm (see section 5)        |
| `moveTypeMinimum`          | enum   | Yes      | `light` \| `regular` \| `premium` — minimum move type for this item|

---

## Categories

These are the **initial** categories. Admins can introduce new categories by creating items with a new `category` slug — the frontend picks them up automatically.

| Slug            | Display Name  |
| --------------- | ------------- |
| `living_room`   | Living Room   |
| `bedroom`       | Bedroom       |
| `kitchen`       | Kitchen       |
| `office`        | Office        |
| `boxes`         | Boxes         |
| `miscellaneous` | Miscellaneous |
| `special`       | Special Items |

---

## Items

### Living Room

| itemId             | name             | widthCm | heightCm | depthCm | weightKg | moveClassificationWeight | moveTypeMinimum |
| ------------------ | ---------------- | ------- | -------- | ------- | -------- | ------------------------ | --------------- |
| `sofa_2seater`     | Sofa (2-seater)  | 160     | 85       | 90      | 45       | 8                        | regular         |
| `sofa_3seater`     | Sofa (3-seater)  | 220     | 85       | 90      | 65       | 12                       | regular         |
| `coffee_table`     | Coffee table     | 120     | 45       | 60      | 20       | 3                        | light           |
| `tv`               | TV               | 120     | 70       | 10      | 15       | 2                        | light           |
| `tv_stand`         | TV stand         | 150     | 50       | 45      | 30       | 4                        | regular         |
| `bookshelf_living` | Bookshelf        | 80      | 180      | 30      | 40       | 5                        | regular         |
| `armchair`         | Armchair         | 80      | 90       | 85      | 25       | 4                        | regular         |

### Bedroom

| itemId            | name              | widthCm | heightCm | depthCm | weightKg | moveClassificationWeight | moveTypeMinimum |
| ----------------- | ----------------- | ------- | -------- | ------- | -------- | ------------------------ | --------------- |
| `bed_90`          | Bed (90 cm)       | 90      | 50       | 200     | 35       | 6                        | regular         |
| `bed_140`         | Bed (140 cm)      | 140     | 50       | 200     | 50       | 8                        | regular         |
| `bed_160`         | Bed (160 cm)      | 160     | 50       | 200     | 60       | 10                       | regular         |
| `mattress`        | Mattress          | 160     | 25       | 200     | 30       | 5                        | regular         |
| `wardrobe_small`  | Wardrobe (small)  | 100     | 200      | 60      | 60       | 8                        | regular         |
| `wardrobe_medium` | Wardrobe (medium) | 150     | 200      | 60      | 80       | 12                       | premium         |
| `wardrobe_large`  | Wardrobe (large)  | 250     | 220      | 60      | 120      | 18                       | premium         |
| `nightstand`      | Nightstand        | 50      | 55       | 40      | 15       | 2                        | light           |

### Kitchen

| itemId               | name                 | widthCm | heightCm | depthCm | weightKg | moveClassificationWeight | moveTypeMinimum |
| -------------------- | -------------------- | ------- | -------- | ------- | -------- | ------------------------ | --------------- |
| `dining_table_small` | Dining table (small) | 120     | 75       | 80      | 30       | 5                        | regular         |
| `dining_table_large` | Dining table (large) | 200     | 75       | 100     | 50       | 8                        | regular         |
| `chairs`             | Chairs               | 45      | 90       | 45      | 5        | 1                        | light           |
| `fridge_small`       | Fridge (small)       | 55      | 85       | 60      | 35       | 4                        | regular         |
| `fridge_medium`      | Fridge (medium)      | 60      | 145      | 65      | 55       | 6                        | regular         |
| `fridge_large`       | Fridge (large)       | 90      | 180      | 70      | 90       | 10                       | premium         |
| `dishwasher`         | Dishwasher           | 60      | 85       | 60      | 45       | 5                        | regular         |
| `microwave`          | Microwave            | 50      | 30       | 40      | 15       | 2                        | light           |

### Office

| itemId             | name            | widthCm | heightCm | depthCm | weightKg | moveClassificationWeight | moveTypeMinimum |
| ------------------ | --------------- | ------- | -------- | ------- | -------- | ------------------------ | --------------- |
| `office_desk`      | Office desk     | 140     | 75       | 70      | 35       | 5                        | regular         |
| `office_chair`     | Office chair    | 65      | 120      | 65      | 15       | 2                        | light           |
| `bookshelf_office` | Bookshelf       | 80      | 180      | 30      | 40       | 5                        | regular         |
| `filing_cabinet`   | Filing cabinet  | 45      | 130      | 60      | 35       | 4                        | regular         |

### Boxes

| itemId            | name            | widthCm | heightCm | depthCm | weightKg | moveClassificationWeight | moveTypeMinimum |
| ----------------- | --------------- | ------- | -------- | ------- | -------- | ------------------------ | --------------- |
| `cardboard_boxes` | Cardboard boxes | 60      | 40       | 40      | 20       | 2                        | light           |
| `suitcases`       | Suitcases       | 75      | 50       | 30      | 25       | 2                        | light           |

### Miscellaneous

| itemId    | name    | widthCm | heightCm | depthCm | weightKg | moveClassificationWeight | moveTypeMinimum |
| --------- | ------- | ------- | -------- | ------- | -------- | ------------------------ | --------------- |
| `bicycle` | Bicycle | 180     | 100      | 60      | 15       | 3                        | light           |
| `lamp`    | Lamp    | 40      | 160      | 40      | 8        | 1                        | light           |
| `mirror`  | Mirror  | 80      | 180      | 5       | 20       | 2                        | light           |
| `rug`     | Rug     | 200     | 5        | 300     | 15       | 2                        | light           |
| `plants`  | Plants  | 40      | 100      | 40      | 10       | 1                        | light           |

### Special Items

| itemId            | name                    | widthCm | heightCm | depthCm | weightKg | moveClassificationWeight | moveTypeMinimum |
| ----------------- | ----------------------- | ------- | -------- | ------- | -------- | ------------------------ | --------------- |
| `piano`           | Piano                   | 150     | 100      | 60      | 250      | 25                       | premium         |
| `safe`            | Safe                    | 50      | 60       | 50      | 150      | 20                       | premium         |
| `treadmill`       | Treadmill               | 180     | 140      | 80      | 100      | 15                       | premium         |
| `aquarium`        | Aquarium                | 120     | 60       | 50      | 80       | 12                       | premium         |
| `glass_cabinet`   | Glass cabinet           | 100     | 180      | 40      | 60       | 10                       | premium         |
| `artwork_fragile` | Artwork / Fragile items | 100     | 150      | 10      | 15       | 5                        | regular         |
