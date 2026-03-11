export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { token } = req.body;

        const targetUrl = `https://crm.nidaro.no/api/member/checkin?MemberSessionToken=${token}`;
        
        const payload = new URLSearchParams({
            "ActorUUID": "f53ee762-3cc7-4929-a062-21304e993c25", 
            "InstanceUUID": "8c5553c6097149099bb9d66534977262", 
            "Location": "2",
            "MemberSessionToken": token 
        });

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: payload
        });

        if (response.ok) {
            res.status(200).json({ success: true });
        } else {
            res.status(response.status).json({ error: `Failed: ${response.status}` });
        }
    } catch (error) {
        console.error("Network error:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
