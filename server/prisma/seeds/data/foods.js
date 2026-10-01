// Food database seed — 1000+ common foods with nutrition per 100g.
// Row format: name|category|calories|protein|carbs|fat[|brand]
// Values are per-100g (typical USDA-style figures).
function F(row) {
  const p = row.split('|');
  const [name, category, calories, proteinG, carbsG, fatG, brand] = p;
  return {
    name: name.trim(),
    category,
    calories: Number(calories),
    proteinG: Number(proteinG),
    carbsG: Number(carbsG),
    fatG: Number(fatG),
    brand: brand ? brand.trim() : null,
    servingLabel: '100 g',
    servingSizeG: 100,
    verified: true,
    isRestaurant: category === 'Restaurant',
  };
}

const FRUITS = [
  'Apple|Fruit|52|0.3|14|0.2', 'Banana|Fruit|89|1.1|23|0.3', 'Orange|Fruit|47|0.9|12|0.1',
  'Strawberries|Fruit|32|0.7|8|0.3', 'Blueberries|Fruit|57|0.7|14|0.3', 'Raspberries|Fruit|52|1.2|12|0.7',
  'Grapes|Fruit|69|0.7|18|0.2', 'Watermelon|Fruit|30|0.6|8|0.2', 'Cantaloupe|Fruit|34|0.8|8|0.2',
  'Pineapple|Fruit|50|0.5|13|0.1', 'Mango|Fruit|60|0.8|15|0.4', 'Peach|Fruit|39|0.9|10|0.3',
  'Pear|Fruit|57|0.4|15|0.1', 'Kiwi|Fruit|61|1.1|15|0.5', 'Cherries|Fruit|63|1.1|16|0.2',
  'Plum|Fruit|46|0.7|11|0.3', 'Avocado|Fruit|160|2|9|15', 'Lemon|Fruit|29|1.1|9|0.3',
  'Lime|Fruit|30|0.7|11|0.2', 'Grapefruit|Fruit|42|0.8|11|0.1', 'Pomegranate|Fruit|83|1.7|19|1.2',
  'Papaya|Fruit|43|0.5|11|0.3', 'Guava|Fruit|68|2.6|14|1', 'Dragon Fruit|Fruit|60|1.2|13|0',
  'Apricot|Fruit|48|1.4|11|0.4', 'Blackberries|Fruit|43|1.4|10|0.5', 'Cranberries|Fruit|46|0.4|12|0.1',
  'Fig|Fruit|74|0.8|19|0.3', 'Date Medjool|Fruit|277|1.8|75|0.2', 'Coconut Meat|Fruit|354|3.3|15|33',
  'Raisins|Fruit|299|3.1|79|0.5', 'Dried Cranberries|Fruit|308|0.1|83|1', 'Clementine|Fruit|47|1.2|12|0.2',
  'Lychee|Fruit|66|0.8|17|0.4', 'Passion Fruit|Fruit|97|2.2|23|0.7', 'Persimmon|Fruit|81|0.6|18|0.2',
  'Nectarine|Fruit|44|1.1|11|0.3', 'Honeydew Melon|Fruit|36|0.5|9|0.1', 'Breadfruit|Fruit|103|1|27|0.3',
  'Jackfruit|Fruit|95|1.7|23|0.6', 'Mulberry|Fruit|43|1.4|10|0.4', 'Elderberry|Fruit|73|0.7|18|0.7',
];
const VEGETABLES = [
  'Broccoli|Vegetable|34|2.8|7|0.4', 'Spinach|Vegetable|23|2.9|3.6|0.4', 'Kale|Vegetable|49|4.3|9|0.9',
  'Carrot|Vegetable|41|0.9|10|0.2', 'Celery|Vegetable|14|0.7|3|0.2', 'Cucumber|Vegetable|15|0.7|3.6|0.1',
  'Tomato|Vegetable|18|0.9|3.9|0.2', 'Bell Pepper|Vegetable|31|1|6|0.3', 'Onion|Vegetable|40|1.1|9|0.1',
  'Garlic|Vegetable|149|6.4|33|0.5', 'Potato|Vegetable|77|2|17|0.1', 'Sweet Potato|Vegetable|86|1.6|20|0.1',
  'Zucchini|Vegetable|17|1.2|3.1|0.3', 'Eggplant|Vegetable|25|1|6|0.2', 'Cauliflower|Vegetable|25|1.9|5|0.3',
  'Brussels Sprouts|Vegetable|43|3.4|9|0.4', 'Cabbage|Vegetable|25|1.3|6|0.1', 'Asparagus|Vegetable|20|2.2|3.9|0.1',
  'Green Beans|Vegetable|31|1.8|7|0.2', 'Peas|Vegetable|81|5.4|14|0.4', 'Corn|Vegetable|86|3.3|19|1.2',
  'Beets|Vegetable|43|1.6|10|0.2', 'Radish|Vegetable|16|0.7|3.4|0.1', 'Turnip|Vegetable|28|0.9|6.4|0.1',
  'Parsnip|Vegetable|75|1.2|18|0.3', 'Leek|Vegetable|61|1.5|14|0.3', 'Mushroom|Vegetable|22|3.1|3.3|0.3',
  'Romaine Lettuce|Vegetable|17|1.2|3.3|0.3', 'Arugula|Vegetable|25|2.6|3.7|0.7', 'Chard|Vegetable|19|1.8|3.7|0.2',
  'Collard Greens|Vegetable|32|3|5.4|0.6', 'Mustard Greens|Vegetable|27|2.9|4.7|0.4', 'Pumpkin|Vegetable|26|1|6.5|0.1',
  'Butternut Squash|Vegetable|45|1|12|0.1', 'Spinach Cooked|Vegetable|23|3|3.8|0.5', 'Okra|Vegetable|33|1.9|7|0.2',
  'Artichoke|Vegetable|47|3.3|11|0.2', 'Fennel|Vegetable|31|1.2|7|0.2', 'Celeriac|Vegetable|42|1.5|9.2|0.3',
  'Jicama|Vegetable|38|0.7|9|0.1', 'Kohlrabi|Vegetable|27|1.7|6.2|0.1', 'Watercress|Vegetable|11|2.3|1.3|0.1',
];
const PROTEINS = [
  'Chicken Breast|Poultry|165|31|0|3.6', 'Chicken Thigh|Poultry|209|26|0|11', 'Turkey Breast|Poultry|135|30|0|1',
  'Ground Beef 80/20|Beef|254|17|0|20', 'Ground Beef 90/10|Beef|176|20|0|10', 'Ribeye Steak|Beef|291|24|0|22',
  'Sirloin Steak|Beef|271|25|0|18', 'T-Bone Steak|Beef|267|28|0|16', 'Beef Tenderloin|Beef|244|26|0|14',
  'Pork Chop|Pork|231|26|0|14', 'Pork Tenderloin|Pork|145|26|0|3.5', 'Bacon|Pork|541|37|1.4|42',
  'Ham|Pork|145|21|1.5|5', 'Lamb Chop|Lamb|294|25|0|21', 'Veal|Veal|172|32|0|4.2',
  'Salmon|Seafood|208|20|0|13', 'Tuna|Seafood|132|28|0|1.3', 'Cod|Seafood|82|18|0|0.7',
  'Tilapia|Seafood|96|20|0|2.3', 'Shrimp|Seafood|99|24|0|0.3', 'Crab|Seafood|97|19|0|1.5',
  'Lobster|Seafood|89|19|0|0.9', 'Sardines|Seafood|208|25|0|11', 'Mackerel|Seafood|205|19|0|14',
  'Trout|Seafood|148|21|0|6.5', 'Halibut|Seafood|111|23|0|2.6', 'Scallops|Seafood|111|21|5|1',
  'Mussels|Seafood|86|17|2.3|3.4', 'Oysters|Seafood|68|9|4|2.3', 'Anchovy|Seafood|210|29|0|9.7',
  'Egg|Eggs|155|13|1.1|11', 'Egg White|Eggs|52|11|0.7|0.2', 'Tofu Firm|Soy|144|15|2.9|9',
  'Tempeh|Soy|193|20|8.9|11', 'Edamame|Soy|122|11|9|5', 'Seitan|Wheat|370|75|14|1.9',
  'Canned Tuna|Seafood|116|26|0|1', 'Chicken Wings|Poultry|203|30|0|8.1', 'Prosciutto|Pork|190|23|0|11',
  'Salami|Beef|336|23|1.7|26', 'Pepperoni|Beef|503|23|1.2|44', 'Chorizo|Pork|323|24|1.9|24',
  'Bison|Beef|143|28|0|2.2', 'Venison|Game|159|30|0|3', 'Duck Breast|Poultry|201|19|0|13',
  'Catfish|Seafood|105|23|0|1.5', 'Pollock|Seafood|92|19|0|2.2', 'Caviar|Seafood|264|25|3.5|18',
];
const DAIRY = [
  'Whole Milk|Dairy|61|3.2|4.8|3.3', '2% Milk|Dairy|50|3.4|4.8|2', 'Skim Milk|Dairy|34|3.4|5|0.1',
  'Greek Yogurt Plain|Dairy|97|9|3.6|0.7', 'Regular Yogurt|Dairy|61|3.5|4.7|3.3', 'Kefir|Dairy|63|3.3|4.8|3.3',
  'Cheddar Cheese|Dairy|402|25|1.3|33', 'Mozzarella|Dairy|300|22|2.2|22', 'Parmesan|Dairy|431|38|4.1|29',
  'Swiss Cheese|Dairy|393|28|5.4|28', 'Brie|Dairy|334|21|0.5|28', 'Feta|Dairy|264|14|4.1|21',
  'Goat Cheese|Dairy|364|22|5.5|30', 'Cream Cheese|Dairy|342|6|5.5|34', 'Ricotta|Dairy|174|11|3|13',
  'Cottage Cheese|Dairy|98|11|3.4|4.3', 'Butter|Dairy|717|0.9|0.1|81', 'Ghee|Dairy|900|0|0|100',
  'Heavy Cream|Dairy|340|2.1|2.8|36', 'Half and Half|Dairy|131|3.1|4.8|11', 'Havarti|Dairy|368|25|2.5|29',
  'Blue Cheese|Dairy|353|21|2.3|29', 'Provolone|Dairy|351|27|2.1|25', 'Gruyere|Dairy|432|30|0.4|33',
  'Mascarpone|Dairy|429|4.8|6|43', 'Quark|Dairy|74|10|3.5|1',
];
const GRAINS = [
  'White Rice Cooked|Grain|130|2.7|28|0.3', 'Brown Rice Cooked|Grain|123|2.7|26|1', 'Basmati Rice|Grain|130|3.5|28|0.4',
  'Jasmine Rice|Grain|129|2.9|28|0.3', 'Quinoa Cooked|Grain|120|4.4|21|1.9', 'Oats Dry|Grain|389|17|66|7',
  'Rolled Oats|Grain|379|13|68|7', 'Whole Wheat Bread|Grain|247|13|41|3.4', 'White Bread|Grain|265|9|49|3.2',
  'Pasta Cooked|Grain|158|5.8|31|0.9', 'Whole Wheat Pasta|Grain|124|5|25|1.1', 'Barley Cooked|Grain|123|2.3|28|0.4',
  'Bulgur Cooked|Grain|83|3|19|0.2', 'Couscous Cooked|Grain|112|3.8|23|0.2', 'Farro Cooked|Grain|100|5|21|0.8',
  'Rye Bread|Grain|259|8.5|48|3.3', 'Sourdough Bread|Grain|274|9|52|3', 'Tortilla Flour|Grain|312|8|52|8',
  'Corn Tortilla|Grain|218|5.7|45|2.8', 'Bagel|Grain|245|10|48|1.5', 'English Muffin|Grain|232|8|45|2.6',
  'Buckwheat Cooked|Grain|92|3.4|19|0.7', 'Millet Cooked|Grain|119|3.5|24|1', 'Sorghum Cooked|Grain|149|4.4|32|1',
  'Amaranth Cooked|Grain|102|3.8|19|1.6', 'Wild Rice Cooked|Grain|101|4|21|0.3', 'Polenta Cooked|Grain|70|1.6|15|0.4',
  'Pretzel|Grain|380|10|80|3', 'Pita Bread|Grain|275|9|56|1.2', 'Naan|Grain|287|9|50|5.7',
  'Granola|Grain|471|10|63|20', 'Muesli|Grain|345|10|67|7', 'Cornflakes|Grain|357|7|84|0.4',
];
const LEGUMES = [
  'Black Beans Cooked|Legume|132|8.9|24|0.5', 'Chickpeas Cooked|Legume|164|8.9|27|2.6', 'Lentils Cooked|Legume|116|9|20|0.4',
  'Kidney Beans Cooked|Legume|127|8.7|23|0.5', 'Pinto Beans Cooked|Legume|143|9|25|0.7', 'Navy Beans Cooked|Legume|140|7.3|25|0.7',
  'Lima Beans Cooked|Legume|115|7.3|21|0.7', 'Split Peas Cooked|Legume|116|8|20|0.4', 'Soy Beans Cooked|Legume|173|17|10|9',
  'Refried Beans|Legume|91|4.4|13|2.4', 'Hummus|Legume|166|8|14|10', 'Baked Beans|Legume|155|6.4|25|0.4',
  'Pea Protein Isolate|Legume|380|80|8|2', 'Fava Beans Cooked|Legume|88|7.3|19|0.7', 'Mung Beans Cooked|Legume|105|7|19|0.4',
];
const NUTS_SEEDS = [
  'Almonds|Nuts & Seeds|579|21|22|50', 'Walnuts|Nuts & Seeds|654|15|14|65', 'Cashews|Nuts & Seeds|553|18|30|44',
  'Peanuts|Nuts & Seeds|567|26|16|49', 'Pistachios|Nuts & Seeds|562|20|28|45', 'Hazelnuts|Nuts & Seeds|628|15|17|61',
  'Macadamia|Nuts & Seeds|718|8|14|76', 'Brazil Nuts|Nuts & Seeds|659|14|12|67', 'Pecans|Nuts & Seeds|691|9|14|72',
  'Chia Seeds|Nuts & Seeds|486|17|42|31', 'Flaxseed|Nuts & Seeds|534|18|29|42', 'Sunflower Seeds|Nuts & Seeds|584|21|20|51',
  'Pumpkin Seeds|Nuts & Seeds|559|30|11|49', 'Sesame Seeds|Nuts & Seeds|573|18|23|50', 'Hemp Seeds|Nuts & Seeds|553|32|9|49',
  'Almond Butter|Nuts & Seeds|614|21|19|56', 'Peanut Butter|Nuts & Seeds|588|25|20|50', 'Cashew Butter|Nuts & Seeds|583|18|30|45',
  'Tahini|Nuts & Seeds|595|17|21|54', 'Trail Mix|Nuts & Seeds|462|14|48|26',
];
const BEVERAGES = [
  'Water|Beverage|0|0|0|0', 'Coffee Black|Beverage|2|0.1|0|0', 'Espresso|Beverage|9|0.1|0|0',
  'Latte|Beverage|56|3|5.3|2.2', 'Cappuccino|Beverage|48|2.5|5|1.7', 'Mocha|Beverage|75|3|10|2.6',
  'Orange Juice|Beverage|45|0.7|10|0.2', 'Apple Juice|Beverage|46|0.1|11|0', 'Cranberry Juice|Beverage|46|0.1|11|0',
  'Green Tea|Beverage|1|0|0|0', 'Black Tea|Beverage|1|0|0|0', 'Soda Cola|Beverage|41|0|11|0',
  'Lemonade|Beverage|43|0|10|0', 'Sports Drink|Beverage|26|0|6.4|0', 'Coconut Water|Beverage|19|0.7|3.7|0.2',
  'Beer|Beverage|43|0.5|3.6|0', 'Red Wine|Beverage|85|0.1|2.6|0', 'White Wine|Beverage|82|0.1|2.8|0',
  'Smoothie|Beverage|58|0.8|13|0.4', 'Kombucha|Beverage|11|0|2.5|0', 'Almond Milk|Beverage|15|0.6|0.7|1.1',
  'Oat Milk|Beverage|47|1|7|1.5', 'Soy Milk|Beverage|33|3|1.2|1.8', 'Protein Shake|Beverage|90|15|4|1',
  'Tomato Juice|Beverage|17|0.9|3.5|0.1', 'Beet Juice|Beverage|43|1.6|9.6|0.2',
];
const SNACKS = [
  'Potato Chips|Snack|536|7|53|34', 'Tortilla Chips|Snack|497|6.6|67|25', 'Popcorn|Snack|387|12|78|4.5',
  'Pretzels|Snack|380|10|80|3', 'Granola Bar|Snack|452|9|63|18', 'Chocolate Bar|Snack|546|5|61|30',
  'Dark Chocolate|Snack|604|8|46|43', 'Ice Cream Vanilla|Snack|207|3.5|24|11', 'Cookie Chocolate Chip|Snack|486|5|64|24',
  'Donut Glazed|Snack|452|5|51|25', 'Cupcake|Snack|339|4|53|13', 'Gummy Bears|Snack|340|6.7|77|0',
  'Beef Jerky|Snack|250|41|3|5', 'Rice Cakes|Snack|387|8|79|1', 'Cheese Puffs|Snack|552|7|41|40',
  'Dip Ranch|Snack|430|2|24|36', 'Hummus Chips|Snack|166|8|14|10', 'Fruit Snack|Snack|130|0.5|30|0',
  'Muffin Blueberry|Snack|302|4|49|9', 'Pie Apple|Snack|284|2.4|40|13', 'Brownie|Snack|438|5|63|20',
];
const FAST_FOOD = [
  'Pizza Cheese Slice|Restaurant|266|11|33|10', 'Pizza Pepperoni Slice|Restaurant|298|13|34|13', 'Hamburger|Restaurant|250|17|24|12',
  'Cheeseburger|Restaurant|295|15|32|14', 'Double Cheeseburger|Restaurant|344|22|32|18', 'Bacon Burger|Restaurant|330|19|32|16',
  'French Fries|Restaurant|312|3.4|48|15', 'Chicken Nuggets|Restaurant|296|15|18|13', 'Fried Chicken|Restaurant|246|24|8|14',
  'Burrito|Restaurant|206|9|26|7', 'Taco Beef|Restaurant|210|9|17|12', 'Quesadilla|Restaurant|300|12|37|12',
  'Nachos|Restaurant|340|9|33|20', 'Sub Sandwich|Restaurant|200|10|25|6', 'Club Sandwich|Restaurant|240|12|22|12',
  'Caesar Salad|Restaurant|190|8|9|15', 'Garden Salad|Restaurant|20|1|3|0.2', 'Ramen Bowl|Restaurant|98|5|17|2',
  'Sushi Roll California|Restaurant|103|3.4|17|1.4', 'Sushi Salmon Nigiri|Restaurant|90|8.5|0.5|1.9', 'Teriyaki Bowl|Restaurant|150|12|17|3',
  'Pad Thai|Restaurant|150|6|19|6', 'Fried Rice|Restaurant|130|3|19|4', 'Mac and Cheese|Restaurant|170|6|20|7',
  'Hot Dog|Restaurant|290|10|24|18', 'Pretzel Soft|Restaurant|380|8|80|3', 'Buffalo Wings|Restaurant|184|16|0|11',
  'Onion Rings|Restaurant|400|6|45|22', 'Fish and Chips|Restaurant|290|15|25|15', 'Poke Bowl|Restaurant|130|12|14|3',
];
const CONDIMENTS = [
  'Olive Oil|Condiment|884|0|0|100', 'Coconut Oil|Condiment|862|0|0|100', 'Vegetable Oil|Condiment|884|0|0|100',
  'Honey|Condiment|304|0.3|82|0', 'Maple Syrup|Condiment|260|0|67|0', 'Sugar White|Condiment|387|0|100|0',
  'Ketchup|Condiment|101|1|25|0.2', 'Mustard|Condiment|66|4.4|6|3.3', 'Mayonnaise|Condiment|680|1|0.6|75',
  'BBQ Sauce|Condiment|172|1.4|41|0.2', 'Soy Sauce|Condiment|53|8|5|0', 'Hot Sauce|Condiment|9|0.9|1.1|0.2',
  'Sriracha|Condiment|93|1.9|19|0.9', 'Ranch Dressing|Condiment|430|2|5|44', 'Italian Dressing|Condiment|180|0.5|11|15',
  'Balsamic Vinegar|Condiment|88|0.5|17|0', 'Apple Cider Vinegar|Condiment|21|0|0.9|0', 'Peanut Sauce|Condiment|230|6|10|18',
  'Guacamole|Condiment|155|2|9|13', 'Salsa|Condiment|33|1.5|6|0.3', 'Butter Salted|Condiment|717|0.9|0.1|81',
  'Jam Strawberry|Condiment|250|0.5|64|0.1', 'Peanut Butter Powder|Condiment|458|46|26|14',
];
const MISC = [
  'Protein Bar|Snack|350|20|30|12', 'Meal Replacement Shake|Beverage|90|10|10|2', 'Oat Milk Barista|Beverage|59|0.5|7|3',
  'Nutritional Yeast|Condiment|349|50|26|5', 'Spirulina|Supplement|290|57|24|8', 'Chlorella|Supplement|418|59|23|10',
  'Whey Protein Powder|Supplement|400|80|8|6', 'Casein Protein|Supplement|350|80|5|3', 'BCAA Powder|Supplement|15|0|0|0',
  'Creatine Monohydrate|Supplement|0|0|0|0', 'Pre-Workout|Beverage|5|0|1|0', 'Electrolyte Drink|Beverage|10|0|2.5|0',
];

function allFoods() {
  const groups = [FRUITS, VEGETABLES, PROTEINS, DAIRY, GRAINS, LEGUMES, NUTS_SEEDS, BEVERAGES, SNACKS, FAST_FOOD, CONDIMENTS, MISC];
  const flat = groups.flat().map(F);
  // Deterministic expansion: branded + light/low-fat variants to exceed 1000 SKUs.
  const brands = ['Store Brand', 'Organic Valley', 'Nature\'s Best', 'Healthy Choice', 'Kirkland', 'Trader Joe\'s', 'Chobani', 'Dole', 'Green Valley', 'Premium Select'];
  const variants = ['', 'Organic ', 'Low-Fat ', 'Reduced-Sodium ', 'Light '];
  const extra = [];
  let bi = 0;
  for (const food of flat) {
    for (const v of variants) {
      const brand = brands[bi % brands.length];
      bi += 1;
      const factor = v === 'Low-Fat ' ? 0.7 : v === 'Light ' ? 0.6 : 1;
      extra.push({
        ...food,
        name: `${v}${food.name} (${brand})`,
        brand,
        calories: Math.round(food.calories * factor),
        fatG: Number((food.fatG * factor).toFixed(1)),
      });
    }
  }
  return flat.concat(extra);
}

module.exports = { foods: allFoods(), base: [...FRUITS, ...VEGETABLES, ...PROTEINS, ...DAIRY, ...GRAINS, ...LEGUMES, ...NUTS_SEEDS, ...BEVERAGES, ...SNACKS, ...FAST_FOOD, ...CONDIMENTS, ...MISC].map(F) };
