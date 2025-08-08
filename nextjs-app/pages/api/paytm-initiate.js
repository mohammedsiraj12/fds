import PaytmChecksum from "paytmchecksum";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { orderId, amount, customerId } = req.body;
  const mid = process.env.PAYTM_MID;
  const mkey = process.env.PAYTM_MKEY;
  const website = process.env.PAYTM_WEBSITE || "WEBSTAGING";
  const callbackUrl =
    process.env.PAYTM_CALLBACK_URL || "http://localhost:3000/payment-success";

  const paytmParams = {
    MID: mid,
    WEBSITE: website,
    INDUSTRY_TYPE_ID: "Retail",
    CHANNEL_ID: "WEB",
    ORDER_ID: orderId,
    CUST_ID: customerId,
    TXN_AMOUNT: amount,
    CALLBACK_URL: callbackUrl,
    EMAIL: req.body.email || "",
    MOBILE_NO: req.body.mobile || "",
  };

  try {
    const checksum = await PaytmChecksum.generateSignature(paytmParams, mkey);
    res.status(200).json({ ...paytmParams, CHECKSUMHASH: checksum });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
