import prisma from '../../lib/prisma'; // 4 levels up

export async function GET(req) {
  try {
    const mothers = await prisma.motherProfile.findMany();
    return new Response(JSON.stringify(mothers), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('GET /api/mothers error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    // simple validation
    if (!body.preferredName || !body.deliveryType || !body.deliveryDate) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const mother = await prisma.motherProfile.create({
      data: {
        preferredName: body.preferredName,
        deliveryType: body.deliveryType,
        deliveryDate: new Date(body.deliveryDate),
        contactMethods: body.contactMethods || {}, // default empty object
      },
    });

    return new Response(JSON.stringify(mother), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('POST /api/mothers error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
