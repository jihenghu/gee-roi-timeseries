// Step 1: Define the region (Sub-Sahara, Chad)
var region =    ee.Geometry.Rectangle([-58, -9, -52, -6]);//  Amazon
// var region =    ee.Geometry.Rectangle([19, -2, 28, 3]); // Congo
// var region =    ee.Geometry.Rectangle([111.2, -2.6, 117.5, 2.6]); // Kalimantan
// var region =    ee.Geometry.Rectangle([17.6, 10.6, 21.5, 13.5]); // Sahara
// var region =    ee.Geometry.Rectangle([-102, 34, -97, 39]); // SGP
// var region =    ee.Geometry.Rectangle([43.5, 58, 55, 63]); // Boreal

// Step 2: Load the GPM IMERG monthly precipitation dataset (in mm)
var gpm = ee.ImageCollection("NASA/GPM_L3/IMERG_MONTHLY_V06")
              .select("precipitation") // Select precipitation band
              .filterBounds(region) // Filter to study area
              .filterDate('2014-01-01', '2023-12-31'); // Time range

// Step 3: Compute the mean monthly rainfall over the region
var rainfall_timeseries = gpm.map(function(image) {
  var mean_rainfall = image.reduceRegion({
    reducer: ee.Reducer.mean(), // Compute mean rainfall
    geometry: region,
    scale: 10000, // IMERG resolution ~10km
    maxPixels: 1e13
  }).get("precipitation"); // Get rainfall value

  // Return a Feature with date and rainfall value
  return ee.Feature(null, {
    date: ee.Date(image.get("system:time_start")).format("YYYY-MM"),
    Rainfall: mean_rainfall
  });
});

// Step 4: Create and display the monthly rainfall time series chart
var chart = ui.Chart.feature.byFeature(rainfall_timeseries, "date", "Rainfall")
  .setOptions({
    title: "GPM IMERG Monthly Rainfall Time Series (Sub-Sahara, Chad)",
    hAxis: { title: "Date" },
    vAxis: { title: "Rainfall (mm/hr)" },
    lineWidth: 2,
    pointSize: 3
  });

print(chart); // Display chart

// Step 5: Add the latest monthly rainfall image to the map for visualization
var latest_rainfall = gpm.sort("system:time_start", false).first(); // Get most recent image

Map.centerObject(region, 7); // Zoom to study area
Map.addLayer(latest_rainfall, {min: 0, max: 200, palette: ['white', 'blue', 'purple']}, "Latest Monthly Rainfall");
Map.addLayer(region, {color: 'white'}, "Study Area");

// Step 6: Export the monthly rainfall time series data to Google Drive as a CSV file
Export.table.toDrive({
  collection: rainfall_timeseries, // The FeatureCollection containing the time series data
  description: 'IMERG_Monthly_Rainfall_TimeSeries_Export', // Description of the export task
  fileFormat: 'CSV', // Export as CSV
  selectors: ['date', 'Rainfall'] // Specify columns to export
});
