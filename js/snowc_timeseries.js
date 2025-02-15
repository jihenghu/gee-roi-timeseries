// Step 1: Define the region (Sub-Sahara, Chad)
// var region =    ee.Geometry.Rectangle([-58, -9, -52, -6]);//  Amazon
// var region =    ee.Geometry.Rectangle([19, -2, 28, 3]); // Congo
// var region =    ee.Geometry.Rectangle([111.2, -2.6, 117.5, 2.6]); // Kalimantan
// var region =    ee.Geometry.Rectangle([17.6, 10.6, 21.5, 13.5]); // Sahara
// var region =    ee.Geometry.Rectangle([-102, 34, -97, 39]); // SGP
var region =    ee.Geometry.Rectangle([43.5, 58, 55, 63]); // Boreal

// Step 2: Load the MODIS Snow Cover dataset (MOD10A2)
var dataset = ee.ImageCollection('MODIS/061/MOD10A2')
  .filter(ee.Filter.date('2014-01-01', '2023-12-31'))  // Filter by date range
  .select('Eight_Day_Snow_Cover');  // Select the 8-day snow cover band

// Step 3: Generate a time series using the original 8-day snow cover data
var snow_cover_timeseries = dataset.map(function(image) {
  var date = ee.Date(image.get('system:time_start'));
  var snow_percentage = image.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: region,
    scale: 1000,  // MODIS resolution ~1km
    maxPixels: 1e8
  }).get('Eight_Day_Snow_Cover');

  // Filter out snow cover values greater than 100
// Cap snow cover to a maximum of 100%
  snow_percentage = ee.Number(snow_percentage).min(100);  // Max snow cover is 100%

  return ee.Feature(null, {
    date: date.format('YYYY-MM-dd'),
    SnowCover: snow_percentage
  });
});

// Step 4: Display the 8-day snow cover chart
var chart = ui.Chart.feature.byFeature(snow_cover_timeseries, 'date', 'SnowCover')
  .setOptions({
    title: 'MODIS Eight-Day Snow Cover Percentage Time Series (Sub-Sahara, Chad)',
    hAxis: { title: 'Date' },
    vAxis: { title: 'Snow Cover (%)' },
    lineWidth: 2,
    pointSize: 3
  });

print(chart);  // Display chart

// // Step 5: Add the latest snow cover image to the map for visualization
// var latest_snow_cover = dataset.sort('system:time_start', false).first(); // Get most recent image

Map.centerObject(region, 7);  // Zoom to study area
// Map.addLayer(latest_snow_cover, {min: 0, max: 100, palette: ['white', 'blue']}, 'Latest Snow Cover');
Map.addLayer(region, {color: 'white'}, 'Study Area');

// Step 6: Export the snow cover time series data to Google Drive as a CSV file
Export.table.toDrive({
  collection: snow_cover_timeseries,  // The FeatureCollection containing the time series data
  description: 'MOD10A2_SnowCover_TimeSeries_',  // Description of the export task
  fileFormat: 'CSV',  // Export as CSV
  selectors: ['date', 'SnowCover']  // Specify columns to export
});
