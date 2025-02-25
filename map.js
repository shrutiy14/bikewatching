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

function formatTime(minutes) {
    const date = new Date(0, 0, 0, 0, minutes);  // Set hours & minutes
    return date.toLocaleString('en-US', { timeStyle: 'short' });
}

// Global function to compute station traffic
function computeStationTraffic(stations, trips) {
  // Compute departures
  const departures = d3.rollup(
    trips,
    (v) => v.length,
    (d) => d.start_station_id
  );

  // Compute arrivals
  const arrivals = d3.rollup(
    trips,
    (v) => v.length,
    (d) => d.end_station_id
  );

  // Update each station with traffic data
  return stations.map((station) => {
    let id = station.short_name; // Unique ID for the station
    station.arrivals = arrivals.get(id) ?? 0; // Set arrivals (default to 0 if undefined)
    station.departures = departures.get(id) ?? 0; // Set departures (default to 0 if undefined)
    station.totalTraffic = station.arrivals + station.departures; // Total traffic = arrivals + departures
    return station;
  });
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function filterTripsbyTime(trips, timeFilter) {
return timeFilter === -1 
  ? trips // If no filter is applied (-1), return all trips
  : trips.filter((trip) => {
      // Convert trip start and end times to minutes since midnight
      const startedMinutes = minutesSinceMidnight(trip.started_at);
      const endedMinutes = minutesSinceMidnight(trip.ended_at);
      
      // Include trips that started or ended within 60 minutes of the selected time
      return (
        Math.abs(startedMinutes - timeFilter) <= 60 ||
        Math.abs(endedMinutes - timeFilter) <= 60
      );
  });
}

  
let timeFilter = -1;  // Default value for no filter

map.on('load', async () => { 
    const timeSlider = document.getElementById('timeSlider');
    const selectedTime = document.getElementById('timeDisplay');
    const anyTimeLabel = document.createElement('em');
    //const anyTimeLabel = document.getElementById('#any-time');
    anyTimeLabel.textContent = '(any time)';
    selectedTime.appendChild(anyTimeLabel); // Add "(any time)" initially

    

   

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
        //let stations = jsonData.data.stations;
        //console.log('Stations Array:', stations); // Log the array to verify
        const svg = d3.select('#map').select('svg');
        /*
        function getCoords(station) {
            const point = new mapboxgl.LngLat(+station.lon, +station.lat);  // Convert lon/lat to Mapbox LngLat
            const { x, y } = map.project(point);  // Project to pixel coordinates
            return { cx: x, cy: y };  // Return as object for use in SVG attributes
          }*/

        let trips;
        try {
              const csvurl = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv'; // CSV URL
              trips = await d3.csv(csvurl, (trip) => {
                trip.started_at = new Date(trip.started_at);
                trip.ended_at = new Date(trip.ended_at);
                return trip;
              },
            ); // Fetch CSV data
              console.log('Loaded Traffic Data:', trips); // Log to verify structure
              if (!trips || trips.length === 0) {
                console.error("No data loaded in trips.");
            }
        } catch (error) {
              console.error('Error loading traffic data:', error); // Handle errors
        }

        let stations = computeStationTraffic(jsonData.data.stations, trips);
        console.log('Stations with Traffic Data:', stations); // Log to verify the updated station data

        const radiusScale = d3
        .scaleSqrt()
        .domain([0, d3.max(stations, (d) => d.totalTraffic)])
        .range([0, 25]);

          
        // Append circles to the SVG for each station
        const circles = svg.selectAll('circle')
        .data(stations, (d) => d.short_name)
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


        function updateScatterPlot(timeFilter) {
          // Get only the trips that match the selected time filter
          const filteredTrips = filterTripsbyTime(trips, timeFilter);
          
          // Recompute station traffic based on the filtered trips
          const filteredStations = computeStationTraffic(stations, filteredTrips);
          timeFilter === -1 ? radiusScale.range([0, 25]) : radiusScale.range([3, 50]);
          
          // Update the scatterplot by adjusting the radius of circles
          circles
            .data(filteredStations, (d) => d.short_name) 
            .join('circle')  // Ensure the data is bound correctly
            .attr('r', (d) => radiusScale(d.totalTraffic)); // Update circle sizes
        }
      
    
        // Function to update the time display based on the slider value
        function updateTimeDisplay() {
          timeFilter = Number(timeSlider.value);  // Get slider value
    
          if (timeFilter === -1) {
            selectedTime.textContent = '';
            anyTimeLabel.style.display = 'block';  // Show "(any time)"
          } else {
            selectedTime.textContent = formatTime(timeFilter);  // Display formatted time
            anyTimeLabel.style.display = 'none';  // Hide "(any time)"
          }
    
          // Trigger filtering logic (we will implement this in the next step)
          updateScatterPlot(timeFilter);
        }
    
        timeSlider.addEventListener('input', updateTimeDisplay);  // Bind input event to slider
        updateTimeDisplay();  // Initial call to set the correct display

    } catch (error) {
        console.error('Error loading JSON:', error); // Handle errors
    }

    
  });