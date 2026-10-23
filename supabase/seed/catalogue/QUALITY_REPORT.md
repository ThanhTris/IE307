# GM-40 — Offline quality report

Draft/test-demo only. This offline build does not import/activate a DB or prove API/approval. Owned-QA importer/checks are separate. No nearby/open venue claim.

39 dishes; 18 shared GM-08 IDs; 0 GM-08-only IDs; mapping 216 mapped / 2 needs_review / 1 excluded.

247 price observations, 0 null amounts; no price/person conversion or dish average.

Equivalent-name collisions: 0 (accent-preserving NFC + case/whitespace normalization). Source menu names remain variants, not aliases.

| Field | Known/nonempty dishes |
| --- | --- |
| description | 34/39 |
| aliases | 1/39 |
| cuisineIds | 5/39 |
| categoryIds | 39/39 |
| mealSlots | 30/39 |
| timeHints | 0/39 |
| origin | 1/39 |
| temperature | 2/39 |
| flavor | 0/39 |
| ingredientTags | 0/39 |
| preparationMethods | 0/39 |
| artwork | 0/39 |

Known/nonempty is structural coverage, not reviewed accuracy or current freshness. Empty arrays mean no evidenced labels.

Meal evidence supplement v1; historical snapshot unchanged; references include school menus and international publishers.

| Meal | Unique dishes | Shortfall for 10 | Shortfall for 20 |
| --- | --- | --- | --- |
| breakfast | 14 | 0 | 6 |
| lunch | 23 | 0 | 0 |
| dinner | 7 | 3 | 13 |
| snack | 1 | 9 | 19 |

Counts overlap across meals; additional cuisine/category filters may reduce them. No unknown label matches all meals.

| Dish | Missing/unknown |
| --- | --- |
| Burger | aliases, cuisineIds, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Bánh bao | aliases, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Bánh cuốn | timeHints, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Bánh cuộn | aliases, cuisineIds, mealSlots, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Bánh mì | aliases, cuisineIds, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Bánh ướt | aliases, mealSlots, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Bún bò | aliases, cuisineIds, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Bún bò chay | aliases, cuisineIds, mealSlots, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Bún chay | aliases, cuisineIds, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Bún gạo lứt | aliases, cuisineIds, mealSlots, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Bún mọc | description, aliases, cuisineIds, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Bún nem nướng | aliases, cuisineIds, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Bún riêu | aliases, cuisineIds, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Bún riêu chay | aliases, cuisineIds, mealSlots, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Bún thịt nướng | aliases, cuisineIds, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Bún đậu | aliases, cuisineIds, mealSlots, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Cơm bò | aliases, cuisineIds, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Cơm canh khổ qua | description, aliases, cuisineIds, mealSlots, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Cơm chay | aliases, cuisineIds, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Cơm chiên | aliases, cuisineIds, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Cơm cá chiên | aliases, cuisineIds, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Cơm cá kho | description, aliases, cuisineIds, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Cơm gà | aliases, cuisineIds, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Cơm sườn | aliases, cuisineIds, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Cơm thịt kho | aliases, cuisineIds, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Cơm trộn | aliases, cuisineIds, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Cơm tôm rim | description, aliases, cuisineIds, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Cơm tấm | aliases, cuisineIds, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Cơm đậu hủ sốt cà | description, aliases, cuisineIds, mealSlots, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Hủ tiếu | aliases, cuisineIds, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Miến | aliases, cuisineIds, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Mì | aliases, cuisineIds, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Mì trộn | aliases, cuisineIds, mealSlots, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Mì Ý | aliases, cuisineIds, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Nui | aliases, cuisineIds, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Phở bò | aliases, timeHints, origin, flavor, ingredientTags, preparationMethods, artwork |
| Phở gà | aliases, timeHints, origin, flavor, ingredientTags, preparationMethods, artwork |
| Salad | aliases, cuisineIds, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
| Xôi | aliases, cuisineIds, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods, artwork |
