// Define the regions of interest
var regions = {
  "Amazon": ee.Geometry.Rectangle([-58, -9, -52, -6]),
  "Congo": ee.Geometry.Rectangle([19, -2, 28, 3]),
  "Kalimantan": ee.Geometry.Rectangle([111.2, -2.6, 117.5, 2.6]),
  "Sahara": ee.Geometry.Rectangle([17.6, 10.6, 21.5, 13.5]),
  "SGP": ee.Geometry.Rectangle([-102, 34, -97, 39]),
  "Boreal": ee.Geometry.Rectangle([43.5, 58, 55, 63])
};

// IGBP Land Cover Type Names (from MODIS documentation)
var igbpLandCoverNames = {
  1: "Evergreen Needleleaf Forest",
  2: "Evergreen Broadleaf Forest",
  3: "DeciEvergreen Broadleaf Forest (89.5\%) duous Needleleaf Forest",
  4: "Deciduous Broadleaf Forest",
  5: "Mixed Forests",
  6: "Closed Shrublands",
  7: "Open Shrublands",
  8: "Woody Savannas",
  9: "Savannas",
  10: "Grasslands",
  11: "Permanent Wetlands",
  12: "Croplands",
  13: "Urban and Built-Up",
  14: "Cropland/Natural Vegetation Mosaic",
  15: "Snow and Ice",
  16: "Barren or Sparsely Vegetated",
  17: "Water Bodies"
};

// Load the MODIS Land Cover dataset (MCD12Q1, IGBP classification)
var modisLandCover = ee.ImageCollection('MODIS/061/MCD12Q1')
  .select('LC_Type1') // IGBP classification band
  .filterDate('2020-01-01', '2020-12-31'); // Filter for the year 2020

// Function to calculate dominant land cover type and its percentage
var calculateDominantLandCover = function(region, name) {
  // Clip the land cover image to the region
  var landCover = modisLandCover.mean().clip(region);

  // Calculate pixel area for each land cover type
  var areaImage = ee.Image.pixelArea().addBands(landCover);

  // Reduce region by land cover type to calculate area
  var areaStats = areaImage.reduceRegion({
    reducer: ee.Reducer.sum().group({
      groupField: 1, // Group by land cover type
      groupName: 'landcover'
    }),
    geometry: region,
    scale: 500, // MODIS resolution
    maxPixels: 1e13
  });

  // Get the list of land cover types and their areas
  var landCoverAreas = ee.List(areaStats.get('groups'));

  // Calculate total area of the region
  var totalArea = ee.Number(region.area());
  
  // Map over the list to calculate percentages and map type codes to names
  var landCoverPercentages = landCoverAreas.map(function(group) {
    var groupDict = ee.Dictionary(group);
    // var landcoverType = ee.Number(groupDict.get('landcover')).format();
    var landcoverType = ee.Number(groupDict.get('landcover'));
  
  // Convert to integer
    var landcoverTypeInt = landcoverType.toInt();

    
    var landcoverName = igbpLandCoverNames[landcoverTypeInt] || "Unknown";
    var area = ee.Number(groupDict.get('sum'));
    var percentage = area.divide(totalArea).multiply(100);
    return ee.Feature(null, {
      'Landcover_Type': landcoverType,
      'Landcover_Name': landcoverName,
      'Percentage': percentage
    });
  });

  // Convert to a FeatureCollection
  var landCoverTable = ee.FeatureCollection(landCoverPercentages);

  // Filter to get dominant land cover types (>10%)
  var dominantLandCover = landCoverTable.filter(ee.Filter.gt('Percentage', 10));

  // Print the summary in a readable format
  dominantLandCover.evaluate(function(features) {
    var message = 'Dominant Land Cover Types for ' + name + ':';
    features.features.forEach(function(feature) {
      message += '\n- ' + feature.properties.Landcover_Name +feature.properties.Landcover_Type + ': ' + feature.properties.Percentage.toFixed(2) + '%';
    });
    print(message);
  });

  // Add the region to the map for visualization
  // Map.addLayer(region, {color: 'red'}, name);
};

// Calculate dominant land cover for each region
for (var name in regions) {
  calculateDominantLandCover(regions[name], name);
}

// Define color palette for the IGBP land cover types (adjust as needed)
var landCoverColors = {
  1: 'green', // Evergreen Needleleaf Forest
  2: 'darkgreen', // Evergreen Broadleaf Forest
  3: 'lightgreen', // Deciduous Needleleaf Forest
  4: 'yellowgreen', // Deciduous Broadleaf Forest
  5: 'forestgreen', // Mixed Forests
  6: 'khaki', // Closed Shrublands
  7: 'lightyellow', // Open Shrublands
  8: 'orangered', // Woody Savannas
  9: 'orange', // Savannas
  10: 'lightblue', // Grasslands
  11: 'aqua', // Permanent Wetlands
  12: 'gold', // Croplands
  13: 'gray', // Urban and Built-Up
  14: 'lime', // Cropland/Natural Vegetation Mosaic
  15: 'snow', // Snow and Ice
  16: 'tan', // Barren or Sparsely Vegetated
  17: 'blue' // Water Bodies
};

// Convert the color values to an array manually
var colorArray = [
  'green', 'darkgreen', 'lightgreen', 'yellowgreen', 'forestgreen', 
  'khaki', 'lightyellow', 'orangered', 'orange', 'lightblue', 
  'aqua', 'gold', 'gray', 'lime', 'snow', 'tan', 'blue'
];

// Function to apply the color palette to land cover types
var visualizeLandCover = function(region) {
  // Clip the land cover image to the region
  var landCover = modisLandCover.mean().clip(region);

  // Apply a color palette to the land cover based on the landcover type
  var landCoverVis = landCover.visualize({
    min: 1,
    max: 17,
    palette: colorArray.join(',') // Apply color palette to the land cover
  });

  // Add the land cover visualization to the map
  Map.addLayer(landCoverVis, {}, 'Land Cover Types');
};

// Visualize land cover for each region
for (var name in regions) {
  visualizeLandCover(regions[name]);
}

// Center the map on the first region
Map.centerObject(regions["Amazon"], 6);
