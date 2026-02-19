import { useState } from "react";
import "./App.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icon issue in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Convert Web Mercator (EPSG:3857) to Lon/Lat (EPSG:4326)
function webMercatorToLonLat(x, y) {
  const lon = (x / 6378137) * (180 / Math.PI);
  const lat = (2 * Math.atan(Math.exp(y / 6378137)) - Math.PI / 2) * (180 / Math.PI);
  return { lon, lat };
}

export default function App() {
  const [license, setLicense] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchByLicense = async () => {
    if (!license) return;

    setLoading(true);
    setError("");
    setRows([]);

    const params = new URLSearchParams({
      where: `LicenseNumber = ${license}`,
      outFields: "*",
      returnGeometry: "true",
      resultRecordCount: "1",
      f: "json",
    });

    const url = `https://services2.arcgis.com/WW3T8U6q5EkZ9U3n/ArcGIS/rest/services/Long_Term_Care_Residential_Care_view/FeatureServer/1/query?${params}`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) throw new Error(data.error.message);

      if (data.features?.length) {
        const formatted = data.features.map((f) => {
          let gps = null;
          if (f.geometry?.x && f.geometry?.y) {
            gps = webMercatorToLonLat(f.geometry.x, f.geometry.y);
          }
          return { ...f.attributes, gps };
        });
        setRows(formatted);
      } else {
        setError("No facility found for this license number.");
      }
    } catch (err) {
      setError(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>WA Long-Term Care Facility Search</h2>

      <div className="search-box">
        <input
          type="number"
          placeholder="Enter License Number"
          value={license}
          onChange={(e) => setLicense(e.target.value)}
        />
        <button onClick={searchByLicense}>Search</button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}

      {rows.length > 0 && (
        <>
          <table>
            <thead>
              <tr>
                <th>Facility Name</th>
                <th>License #</th>
                <th>City</th>
                <th>Zip</th>
                <th>Phone</th>
                <th>Address</th>
                <th>State</th>
                <th>Status</th>
                <th>POC</th>
                <th>Longitude</th>
                <th>Latitude</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.FacilityName}</td>
                  <td>{r.LicenseNumber}</td>
                  <td>{r.LocationCity}</td>
                  <td>{r.LocationZipCode}</td>
                  <td>{r.TelephoneNmbr}</td>
                  <td>{r.LocationAddress}</td>
                  <td>{r.LocationState}</td>
                  <td>{r.FacilityStatus}</td>
                   <td>{r.FacilityPOC }</td>
                  <td>{r.Longitude }</td>
                  <td>{r.Latitude }</td>
                </tr>
              ))}
            </tbody>
          </table>

          {rows[0].gps && (
            <MapContainer
              id="map"
              center={[rows[0].Latitude, rows[0].Longitude]}
              zoom={15}
              scrollWheelZoom={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              <Marker position={[rows[0].gps.lat, rows[0].gps.lon]}>
                <Popup>
                  {rows[0].FacilityName}
                  <br />
                 {rows[0].LocationAddress}
                  <br />
                  {rows[0].LocationCity}, {rows[0].LocationState } {rows[0].LocationZipCode}
                </Popup>
              </Marker>
            </MapContainer>
          )}
        </>
      )}
    </div>
  );
}
