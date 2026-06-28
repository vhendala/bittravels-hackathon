import { searchFlights, getBrandedFares } from '../services/amadeus';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    try {
        console.log('Searching flights GRU -> JFK...');
        const flights = await searchFlights({
            origin: 'GRU',
            destination: 'JFK',
            departureDate: '2026-06-01',
            adults: 1
        });
        if (flights.length === 0) {
            console.log('No flights found');
            return;
        }
        const flight = flights[0];
        console.log('Found flight, getting branded fares...', flight.id);
        const fares = await getBrandedFares(flight);
        console.log('Fares returned:', fares.length);
        if (fares.length > 0) {
            const firstFare: any = fares[0];
            require('fs').writeFileSync('fares-utf8.json', JSON.stringify(firstFare, null, 2), 'utf-8');
            console.log('Saved to fares-utf8.json');
        } else {
            console.log('Returned empty fares array.');
        }
    } catch (e: any) {
        console.error('Error message:', e.message);
    }
}
test();
