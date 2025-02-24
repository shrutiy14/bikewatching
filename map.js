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

// Function to convert station coordinates to pixel coordinates using map.project()
function getCoords(station) {
    const point = new mapboxgl.LngLat(+station.lon, +station.lat);  // Convert lon/lat to Mapbox LngLat
    const { x, y } = map.project(point);  // Project to pixel coordinates
    return { cx: x, cy: y };  // Return as object for use in SVG attributes
  }
  

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
        const svg = d3.select('#map').select('svg');
        function getCoords(station) {
            const point = new mapboxgl.LngLat(+station.lon, +station.lat);  // Convert lon/lat to Mapbox LngLat
            const { x, y } = map.project(point);  // Project to pixel coordinates
            return { cx: x, cy: y };  // Return as object for use in SVG attributes
          }

        let trips;
        try {
              const csvurl = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv'; // CSV URL
              trips = await d3.csv(csvurl); // Fetch CSV data
              console.log('Loaded Traffic Data:', trips); // Log to verify structure
        } catch (error) {
              console.error('Error loading traffic data:', error); // Handle errors
        }
  
        const departures = d3.rollup(
              trips,
              (v) => v.length,  // Count the number of trips per station (departures)
              (d) => d.start_station_id  // Group by start station ID
        );
  
        const arrivals = d3.rollup(
              trips,
              (v) => v.length,  // Count the number of trips per station (arrivals)
              (d) => d.end_station_id  // Group by end station ID
        );
  
        stations = stations.map((station) => {
              let id = station.short_name;  // Unique ID for the station
              station.arrivals = arrivals.get(id) ?? 0;  // Set arrivals (default to 0 if undefined)
              station.departures = departures.get(id) ?? 0;  // Set departures (default to 0 if undefined)
              station.totalTraffic = station.arrivals + station.departures;  // Total traffic = arrivals + departures
              return station;
        });
        
        // Log stations to verify the properties have been added correctly
        console.log('Stations with Traffic Data:', stations);

        const radiusScale = d3
        .scaleSqrt()
        .domain([0, d3.max(stations, (d) => d.totalTraffic)])
        .range([0, 25]);

          
        // Append circles to the SVG for each station
        const circles = svg.selectAll('circle')
        .data(stations)
        .enter()
        .append('circle')
        .attr('r', d => radiusScale(d.totalTraffic) || 5)               // Radius of the circle
        .attr('fill', 'steelblue')  // Circle fill color
        .attr('stroke', 'white')    // Circle border color
        .attr('stroke-width', 1)    // Circle border thickness
        .attr('opacity', 0.6)      // Circle opacity
        .each(function(d) {
            // Add <title> for browser tooltips
            d3.select(this)
              .append('title')
              .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
          });

        function updatePositions() {
            circles
              .attr('cx', d => getCoords(d).cx)  // Set the x-position using projected coordinates
              .attr('cy', d => getCoords(d).cy); // Set the y-position using projected coordinates
          }
        
        updatePositions()

        // Reposition markers on map interactions
        map.on('move', updatePositions);     // Update during map movement
        map.on('zoom', updatePositions);     // Update during zooming
        map.on('resize', updatePositions);   // Update on window resize
        map.on('moveend', updatePositions);  // Final adjustment after movement ends
        /*
        // Step 4.1: Fetch and parse the traffic data
        let trips;
        try {
            const csvurl = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv'; // CSV URL
            trips = await d3.csv(csvurl); // Fetch CSV data
            console.log('Loaded Traffic Data:', trips); // Log to verify structure
        } catch (error) {
            console.error('Error loading traffic data:', error); // Handle errors
        }

        const departures = d3.rollup(
            trips,
            (v) => v.length,  // Count the number of trips per station (departures)
            (d) => d.start_station_id  // Group by start station ID
          );

        const arrivals = d3.rollup(
            trips,
            (v) => v.length,  // Count the number of trips per station (arrivals)
            (d) => d.end_station_id  // Group by end station ID
        );

        stations = stations.map((station) => {
            let id = station.short_name;  // Unique ID for the station
            station.arrivals = arrivals.get(id) ?? 0;  // Set arrivals (default to 0 if undefined)
            station.departures = departures.get(id) ?? 0;  // Set departures (default to 0 if undefined)
            station.totalTraffic = station.arrivals + station.departures;  // Total traffic = arrivals + departures
            return station;
          });
      
          // Log stations to verify the properties have been added correctly
        console.log('Stations with Traffic Data:', stations);
*/
    } catch (error) {
        console.error('Error loading JSON:', error); // Handle errors
    }

    
  });