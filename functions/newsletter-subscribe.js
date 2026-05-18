export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'invalid_body' }, 400);
    }

    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!email || !email.includes('@') || !email.includes('.')) {
      return jsonResponse({ error: 'invalid_email' }, 400);
    }

    if (!env.BREVO_API_KEY || !env.BREVO_LIST_ID || !env.BREVO_TEMPLATE_ID) {
      return jsonResponse({ error: 'server_error' }, 500);
    }

    const brevoResp = await fetch('https://api.brevo.com/v3/contacts/doubleOptinConfirmation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
        'api-key': env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        email,
        includeListIds: [parseInt(env.BREVO_LIST_ID, 10)],
        templateId: parseInt(env.BREVO_TEMPLATE_ID, 10),
        redirectionUrl: 'https://epoxya.be/?newsletter=confirme',
      }),
    });

    if (brevoResp.status === 201 || brevoResp.status === 204) {
      return jsonResponse({ success: true }, 200);
    }

    if (brevoResp.status === 400) {
      let errBody = {};
      try {
        errBody = await brevoResp.json();
      } catch {}
      if (errBody && errBody.code === 'duplicate_parameter') {
        return jsonResponse({ error: 'already_subscribed' }, 200);
      }
    }

    return jsonResponse({ error: 'server_error' }, 500);
  } catch {
    return jsonResponse({ error: 'server_error' }, 500);
  }
}

function jsonResponse(payload, status) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
