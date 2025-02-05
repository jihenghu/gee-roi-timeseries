// Step 1: Define the region (Sub-Sahara, Chad) as a rectangle

// var region =    ee.Geometry.Rectangle([-58, -9, -52, -6]);//  Amazon
// var region =    ee.Geometry.Rectangle([19, -2, 28, 3]); // Congo
// var region =    ee.Geometry.Rectangle([111.2, -2.6, 117.5, 2.6]); // Kalimantan
var region =    ee.Geometry.Rectangle([17.6, 10.6, 21.5, 13.5]); // Sahara
// var region =    ee.Geometry.Rectangle([-102, 34, -97, 39]); // SGP
// var region =    ee.Geometry.Rectangle([43.5, 58, 55, 63]); // Boreal


// // Step 2: Compute the centroid of the rectangle
// var centroid = region.centroid(); 

// // Step 3: Center the map on the region
// Map.centerObject(region, 7); // Adjust zoom level as needed

// Map.addLayer(region, {color: 'red'}, 'Study Area');  // Show the region in red
// Map.addLayer(centroid, {color: 'blue'}, 'Centroid'); // Show the centroid in blue

// Step 2: Load the MODIS NDVI dataset (MOD13Q1, 16-day composite, 500m resolution)
var modis_ndvi = ee.ImageCollection('MODIS/061/MYD13A3')
                  .select("NDVI") // Select only the NDVI band
                  .filterBounds(region) // Filter images covering the region
                  .filterDate('2014-01-01', '2023-12-31'); // Filter by time range

// Step 3: Convert NDVI values to correct scale (MODIS NDVI is stored as integer values scaled by 0.0001)
var scaleNDVI = function(image) {
  return image.multiply(0.0001).copyProperties(image, ["system:time_start"]);
};

var scaled_ndvi = modis_ndvi.map(scaleNDVI);
  
// Step 4: Generate a time series by computing the mean NDVI over the region for each time step
var ndvi_timeseries = scaled_ndvi.map(function(image) {
  var mean_ndvi = image.reduceRegion({
    reducer: ee.Reducer.mean(), // Compute mean NDVI
    geometry: region,
    scale: 500, // MODIS resolution
    maxPixels: 1e13
  }).get("NDVI"); // Get NDVI value
   // Return an image with the date and NDVI value as properties
  return ee.Feature(null, {
    date: ee.Date(image.get("system:time_start")).format("YYYY-MM-dd"),
    NDVI: mean_ndvi
  });
});


// Step 5: Convert the FeatureCollection to a chart and display it
var chart = ui.Chart.feature.byFeature(ndvi_timeseries, "date", "NDVI")
  .setOptions({
    title: "MODIS NDVI Time Series (Sub-Sahara, Chad)",
    hAxis: { title: "Date" },
    vAxis: { title: "NDVI" },
    lineWidth: 2,
    pointSize: 3
  });

// Print and Display the chart
print(chart);

// Step 6: Add the latest NDVI image to the map for visualization
var latest_ndvi = scaled_ndvi.sort("system:time_start", false).first(); // Get most recent image

Map.centerObject(region, 7); // Zoom to the study area
Map.addLayer(latest_ndvi, {min: 0, max: 1, palette: ['red', 'yellow', 'green']}, "Latest NDVI");
Map.addLayer(region, {color: 'white'}, "Study Area");

// Step 7: Export the NDVI time series data to Google Drive as a CSV file
Export.table.toDrive({
  collection: ndvi_timeseries, // The FeatureCollection containing the time series data
  description: 'NDVI_TimeSeries_Export', // Description of the export task
  fileFormat: 'CSV', // Export as CSV
  selectors: ['date', 'NDVI'] // Specify the columns to export
});

