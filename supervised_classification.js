var cloudFilter = ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 5);    
var startDate = '2018-01-01';
var endDate = '2020-12-31';

var image = sentinel2.filter(ee.Filter.date(startDate,endDate)).filterBounds(thames)
.filter(cloudFilter).median();

print(image);

var tcc = {bands:['B4','B3','B2'],min:0,max:2500, gamma: 1.1};
Map.addLayer(image.clip(thames), tcc, 'tcc');
Map.centerObject(thames,12);

// Create Training Data
var training_points = water.merge(Urban).merge(others);

print(training_points)

var label = 'Class';
var bands = ['B2','B3','B4', 'B8'];
var input = image.select(bands);

// Overlay the points on the input imagery to get training 
var trainImage = input.sampleRegions({
  collection:training_points,
  properties:[label],
  scale: 10
});

var training_data = trainImage.randomColumn();
var split = 0.8
var train_set = training_data.filter(ee.Filter.lt('random', split));
print(train_set.size())
var test_set = training_data.filter(ee.Filter.greaterThanOrEquals('random', split));
print(test_set.size())

// ML CarTress Model
var trained_classifier = ee.Classifier.smileCart().train(train_set, label, bands); 

// Classify theimage
var classified = input.classify(trained_classifier);

// Define a palette for the classification

var landcoverPalette = [
  '006FF5', //water(0)
  'FF5733', //urban (1)
  '#DAF7A6' //others(2)
  ]


Map.addLayer(classified.clip(thames), {palette: landcoverPalette, min:0, max:2},'classification');

// Classify the image
var test_classify = test_set.classify(trained_classifier);

// Get a confusion matrix and overall accuracy for the validation sample.

var testAccuracy = test_classify.errorMatrix(label, 'classification');
print('Validation error matrix', testAccuracy);
print('Validation accuracy', testAccuracy.accuracy());

// Export classified map to Google Drive

// Export.image.toDrive({
//   image:classified.clip(thames),
//   description:'thames_Sentinel_2_CART',
//   scale: 10,
//   region: thames,
//   maxPixels:1e13
// })


