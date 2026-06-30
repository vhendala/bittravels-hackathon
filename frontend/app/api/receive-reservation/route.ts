import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        // Mock sanitization & validation to simulate backend
        const { internal_id, customer, flight } = body;
        
        if (!internal_id || !customer || !flight) {
             return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        console.log('📥 Nova requisição recebida no Webhook (Serverless):', body);

        return NextResponse.json({ success: true, message: 'Reservation received successfully' });
    } catch (err) {
        console.error('[/api/receive-reservation] Error:', err);
        return NextResponse.json(
            { error: 'Failed to process reservation' },
            { status: 500 }
        );
    }
}
