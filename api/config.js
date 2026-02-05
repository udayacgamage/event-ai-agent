export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ location: 'Colombo', coordinates: { lat: 6.9271, lon: 79.8612 } });
}
