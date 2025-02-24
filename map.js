import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
// Check that Mapbox GL JS is loaded
console.log("Mapbox GL JS Loaded:", mapboxgl);

  // Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1Ijoic2hydXRpeTE0IiwiYSI6ImNtN2lmc3NwZzAxcHcybnBrOWQyYm1ndDcifQ.vHrxszYZLcMHJ6-G2KnSmg';

  // Initialize the map
const map = new mapboxgl.Map({
    container: 'map', // ID of the div where the map will render
    style: 'mapbox://styles/mapbox/streets-v12', // Map style
    center: [-71.09415, 42.36027], // [longitude, latitude]
    zoom: 12, // Initial zoom level
    minZoom: 5, // Minimum allowed zoom
    maxZoom: 18 // Maximum allowed zoom
});

map.on('load', async () => { 
    // Add the data source for the bike routes
    map.addSource('boston_route', {
      type: 'geojson',
      data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson'
    });

    map.addLayer({
        id: 'bike-lanes',
        type: 'line',
        source: 'boston_route',
        paint: {
          'line-color': '#32D400',  // A bright green using hex code
          'line-width': 5,          // Thicker lines
          'line-opacity': 0.6       // Slightly less transparent
        }
      });
    
    map.addSource('cambridge_route', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson'
    });

    map.addLayer({
        id: 'bike-lanes-cambridge',        // Unique layer ID for Cambridge
        type: 'line',                      // Specifies that the data is a line layer
        source: 'cambridge_route',         // Links this layer to the 'cambridge_route' source
        paint:  {
            'line-color': '#0077FF',  // Blue color for Cambridge bike lanes
            'line-width': 3,          // Thinner lines for Cambridge
            'line-opacity': 0.8         // Less transparent for Cambridge
        }       
    });
    let jsonData;
    try {
        const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
        
        // Await JSON fetch
        jsonData = await d3.json(jsonurl);
        console.log('Loaded JSON Data:', jsonData); // Log to verify structure
        let stations = jsonData.data.stations;
        console.log('Stations Array:', stations); // Log the array to verify
        
    } catch (error) {
        console.error('Error loading JSON:', error); // Handle errors
    }
  });