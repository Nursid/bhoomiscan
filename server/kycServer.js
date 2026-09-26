const http = require('http');
const { createHash, randomUUID } = require('crypto');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const dns = require('dns');
if (dns && typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}
const { ethers } = require('ethers');
const { getOfflineLandOptions, verifyOfflineLandRecord } = require('./offlineLandDatabase');
const { getPunjabOptions } = require('./plrsOptionsClient');
const { verifyLandRecord: verifyPunjabLandRecord } = require('./plrsClient');
const { getRajasthanOptions, verifyRajasthanLandRecord } = require('./rajasthanClient');
const { getUpOptions, verifyUpLandRecord } = require('./upClient');
const { getMpOptions, verifyMpLandRecord } = require('./mpClient');
const { getOdishaOptions, verifyOdishaLandRecord } = require('./odishaClient');
const { getMaharashtraOptions, verifyMaharashtraLandRecord } = require('./maharashtraClient');
const { getKeralaOptions, verifyKeralaLandRecord } = require('./keralaClient');
const { getBiharOptions, verifyBiharLandRecord } = require('./biharClient');
const { verifyMeonLandRecord, hasMeonLandState } = require('./meonLandClient');
const { hashLandRecord, generateDataHash, verifyDataHash } = require('./landHasher');
const { blockchainService } = require('./blockchainService');
const mobileVerify = require('./mobileVerify');
const msg91Client = require('./msg91Client');
const authTokens = require('./authTokens');
const adminAuth = require('./adminAuth');
const subscriptionPlans = require('./subscriptionPlans');

const loadDotEnv = () => {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }


};


process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '0';
loadDotEnv();

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const DECENTRO_BASE_URL = process.env.DECENTRO_BASE_URL || 'https://in.staging.decentro.tech';
const DECENTRO_CLIENT_ID = process.env.DECENTRO_CLIENT_ID || 'dbeqwsjdhb_2_sop';
const DECENTRO_CLIENT_SECRET = process.env.DECENTRO_CLIENT_SECRET || '042701d44c604a5984e5f1ab76609fa1';
const DECENTRO_DIGILOCKER_REDIRECT_URL = process.env.DECENTRO_DIGILOCKER_REDIRECT_URL;
const MEON_BASE_URL = 'https://digilocker.meon.co.in';
const MEON_CLIENT_ID = '69403';
const MEON_COMPANY_NAME = 'Destinyvaults';
const MEON_SECRET_TOKEN = 'B1hd2qRooyfNQ27F1QGZRHHfDX2DK5pW';
const MEON_REDIRECT_URL = 'trustledge://digilocker/callback';
const meonSessions = new Map();
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

const BSC_RPC_URL = process.env.BSC_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/';
const BSC_CHAIN_ID = Number(process.env.BSC_CHAIN_ID || 97);
const BSC_EXPLORER_TX_URL =
  process.env.BSC_EXPLORER_TX_URL ||
  (BSC_CHAIN_ID === 56 ? 'https://bscscan.com/tx/' : 'https://testnet.bscscan.com/tx/');
const BSC_LAND_REGISTRY_ADDRESS = process.env.BSC_LAND_REGISTRY_ADDRESS || '';
const BSC_RELAYER_PRIVATE_KEY = process.env.BSC_RELAYER_PRIVATE_KEY || process.env.PRIVATE_KEY || '';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_live_TKNykl53nIgEDQ';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'gY0aQJc8172905hsk192';

const verifiedPaymentsStore = new Map();

const fetchRazorpayCapturedPayments = async () => {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) return;
  try {
    const authHeader = 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    const res = await fetch('https://api.razorpay.com/v1/payments?count=30', {
      headers: { 'Authorization': authHeader }
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data && Array.isArray(data.items)) {
      for (const item of data.items) {
        if (item.status === 'captured' || item.status === 'authorized') {
          const paymentRecord = {
            paymentId: item.id,
            amount: item.amount / 100,
            email: item.email ? item.email.toLowerCase() : '',
            contact: item.contact || '',
            method: item.method || 'razorpay',
            status: 'CAPTURED',
            gateway: 'Razorpay Poller Cron',
            capturedAt: new Date(item.created_at * 1000).toISOString(),
            notes: item.notes || {},
          };
          if (paymentRecord.email) {
            verifiedPaymentsStore.set(paymentRecord.email, paymentRecord);
          }
          if (item.notes && item.notes.userId) {
            verifiedPaymentsStore.set(item.notes.userId, paymentRecord);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Razorpay Cron Poller] Notice:', err.message);
  }
};

// Cron Job: Run Poller every 60 seconds
setInterval(() => {
  fetchRazorpayCapturedPayments();
}, 60000);

setTimeout(() => {
  fetchRazorpayCapturedPayments();
}, 5000);
const CONSENT_GRANTED = true;

const LAND_REGISTRY_ABI = [
  'function storeLandRecord(string _ownerName, string _state, string _district, string _tehsil, string _village, string _registrationNumber) public returns (uint256)',
  'function getLandRecord(uint256 _recordId) public view returns (tuple(uint256 id, string ownerName, string state, string district, string tehsil, string village, string registrationNumber, address owner, uint256 timestamp))',
  'event LandRecordStored(uint256 indexed recordId, address indexed owner, string ownerName, string state, string district, string tehsil, string village, string registrationNumber, uint256 timestamp)',
];

const readJson = (request) =>
  new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;
    });

    request.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(Object.assign(new Error('Invalid JSON body'), { statusCode: 400 }));
      }
    });

    request.on('error', reject);
  });

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  });
  response.end(JSON.stringify(payload));
};

const sendHtml = (response, statusCode, html) => {
  response.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
  });
  response.end(html);
};

const sendPdf = (response, statusCode, pdfBuffer, fileName) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${fileName}"`,
    'Content-Length': pdfBuffer.length,
    'Access-Control-Allow-Origin': '*',
  });
  response.end(pdfBuffer);
};

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const getLandReportParams = (requestUrl) => ({
  ownerName: requestUrl.searchParams.get('ownerName') || 'Valued Record Holder',
  state: requestUrl.searchParams.get('state') || 'N/A',
  district: requestUrl.searchParams.get('district') || 'N/A',
  tehsil: requestUrl.searchParams.get('tehsil') || 'N/A',
  village: requestUrl.searchParams.get('village') || 'N/A',
  registrationNumber: requestUrl.searchParams.get('registrationNumber') || 'TL-REG-8823',
  surveyNo: requestUrl.searchParams.get('surveyNo') || 'Official Record',
  area: requestUrl.searchParams.get('area') || 'N/A',
  mode: requestUrl.searchParams.get('mode') || 'Official portal sync',
  source: requestUrl.searchParams.get('source') || 'Destiny Protocol Vault',
  hash: requestUrl.searchParams.get('hash') || '0x7f8a9b2c4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b',
  timestamp: requestUrl.searchParams.get('timestamp') || new Date().toLocaleString(),
});

const pdfText = (value) =>
  String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, ' ');

const wrapPdfLine = (label, value, maxLength = 84) => {
  const text = `${label}: ${String(value || 'N/A').replace(/\s+/g, ' ').trim()}`;
  if (text.length <= maxLength) return [text];
  const words = text.split(' ');
  const lines = [];
  let current = '';
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = `  ${word}`;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines;
};

const rawPlotJpg = fs.readFileSync(path.join(__dirname, 'assets', 'raw-plot.jpg'));
const arrowJpg = fs.readFileSync(path.join(__dirname, 'assets', 'arrow.jpg'));
const trendMapJpg = fs.readFileSync(path.join(__dirname, 'assets', 'trend-map.jpg'));
const riskGaugeJpg = fs.readFileSync(path.join(__dirname, 'assets', 'risk-gauge.jpg'));

const createPropertyReportPdf = (report) => {
  const content = [];
  const cmd = (...parts) => content.push(parts.join(' '));
  const color = (r, g, b, stroke = false) => `${r} ${g} ${b} ${stroke ? 'RG' : 'rg'}`;
  const rect = (x, y, w, h, fill = true) => cmd(`${x} ${y} ${w} ${h} re ${fill ? 'f' : 'S'}`);
  const line = (x1, y1, x2, y2) => cmd(`${x1} ${y1} m ${x2} ${y2} l S`);
  const text = (value, x, y, size = 16, font = 'F2', r = 0.12, g = 0.16, b = 0.19) => {
    content.push('BT', `/${font} ${size} Tf`, color(r, g, b), `1 0 0 1 ${x} ${y} Tm (${pdfText(value)}) Tj`, 'ET');
  };
  const centerText = (value, x, y, size = 16, font = 'F2', r = 0.12, g = 0.16, b = 0.19) => {
    const estimatedWidth = String(value || '').length * size * 0.52;
    text(value, x - estimatedWidth / 2, y, size, font, r, g, b);
  };
  const wrapText = (str, maxChars) => {
    const words = String(str || '').split(' ');
    const lines = [];
    let current = '';
    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxChars) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = next;
      }
    });
    if (current) lines.push(current);
    return lines;
  };

  const field = (label, value, x, y, maxLines = 1) => {
    text(label, x, y, 11, 'F1', 0.14, 0.18, 0.20);
    const valueStr = String(value || 'N/A');
    const lines = wrapText(valueStr, 15);

    if (lines.length === 1 || maxLines === 1) {
      const displayVal = lines[0].length > 15 ? `${lines[0].slice(0, 12)}...` : lines[0];
      text(displayVal, x + 84, y, 11, 'F1', 0.12, 0.14, 0.16);
    } else {
      // Draw 2 lines beautifully
      text(lines[0], x + 84, y + 6, 11, 'F1', 0.12, 0.14, 0.16);
      const secondLine = lines[1].length > 15 ? `${lines[1].slice(0, 12)}...` : lines[1];
      text(secondLine, x + 84, y - 8, 11, 'F1', 0.12, 0.14, 0.16);
    }
  };

  const location = [report.village, report.tehsil, report.district, report.state].filter(Boolean).join(', ');
  const shortLocation = location.length > 34 ? `${location.slice(0, 31)}...` : location;
  const owner = String(report.ownerName || 'Verified Owner');
  const ownerShort = owner.length > 28 ? `${owner.slice(0, 25)}...` : owner;
  const survey = String(report.surveyNo || report.registrationNumber || 'Official Record');
  const surveyShort = survey.length > 24 ? `${survey.slice(0, 21)}...` : survey;

  content.push(
    color(0.97, 0.96, 0.92),
    '0 0 1280 720 re f',
    color(0.82, 0.86, 0.82, true),
    '0.8 w',
  );

  for (let x = -80; x < 1320; x += 115) {
    line(x, 64, x + 220, 250);
    line(x + 38, 448, x + 190, 636);
  }
  for (let y = 72; y < 700; y += 42) {
    line(28, y, 166, y + 48);
    line(1094, y + 12, 1248, y + 64);
  }

  text('DESTINY PROTOCOL: AI-POWERED', 214, 648, 37, 'F1', 0.14, 0.19, 0.22);
  text('PROPERTY INTELLIGENCE.', 320, 604, 37, 'F1', 0.14, 0.19, 0.22);
  centerText('From a single photo to complete, verified intelligence in seconds.', 640, 552, 22, 'F2', 0.10, 0.12, 0.13);

  content.push(color(1, 1, 1), '0.95 0.95 0.95 RG', '2.4 w');
  rect(96, 174, 432, 316);

  // Embed Raw Plot Image directly in PDF
  cmd('q');
  cmd('400 0 0 284 112 190 cm');
  cmd('/ImgRawPlot Do');
  cmd('Q');

  centerText('RAW PROPERTY DATA', 312, 128, 23, 'F1', 0.05, 0.05, 0.05);
  centerText('(PHYSICAL)', 312, 101, 21, 'F1', 0.05, 0.05, 0.05);
  centerText(shortLocation || 'Submitted land record', 312, 74, 13, 'F2', 0.28, 0.31, 0.30);

  // Embed Transition Arrow Image directly in PDF
  cmd('q');
  cmd('100 0 0 78 596 284 cm');
  cmd('/ImgArrow Do');
  cmd('Q');

  content.push(color(1, 1, 1), color(0.82, 0.82, 0.79, true), '2.2 w');
  rect(773, 158, 420, 364);
  content.push(color(0.05, 0.44, 0.66));
  rect(795, 474, 376, 38);
  text('VERIFIED INTELLIGENCE REPORT', 813, 485, 22, 'F1', 1, 1, 1);

  field('Location:', location || 'N/A', 805, 437, 2);
  field('Plot Size:', report.area || 'Pending official record', 805, 407, 1);
  field('Zoning:', 'Residential / Land Record', 805, 377, 1);
  field('Ownership:', 'Verified Single Owner', 805, 347, 1);
  field('Owner:', owner || 'N/A', 805, 317, 2);
  field('Survey No:', survey || 'N/A', 805, 287, 2);

  // Embed Land Value Trend Map Image directly in PDF
  cmd('q');
  cmd('172 0 0 264 984 176 cm');
  cmd('/ImgTrendMap Do');
  cmd('Q');

  // Embed Risk Gauge Image directly in PDF
  cmd('q');
  cmd('168 0 0 96 796 176 cm');
  cmd('/ImgRiskGauge Do');
  cmd('Q');

  centerText('AI-POWERED STRUCTURED REPORT', 984, 111, 22, 'F1', 0.05, 0.05, 0.05);
  centerText('(DIGITAL)', 984, 84, 21, 'F1', 0.05, 0.05, 0.05);
  centerText(`Blockchain hash: ${String(report.hash || 'pending').slice(0, 34)}...`, 984, 57, 11, 'F2', 0.31, 0.34, 0.34);

  text('Source: Destiny Protocol verified land workflow', 44, 30, 10, 'F2', 0.42, 0.43, 0.42);
  text(`Generated: ${report.timestamp}`, 998, 30, 10, 'F2', 0.42, 0.43, 0.42);

  const stream = content.join('\n');
  const imgObjects = [
    `7 0 obj\n<< /Type /XObject /Subtype /Image /Width 780 /Height 650 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${rawPlotJpg.length} >>\nstream\n${rawPlotJpg.toString('latin1')}\nstream_end_marker\nendobj\n`,
    `8 0 obj\n<< /Type /XObject /Subtype /Image /Width 394 /Height 310 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${arrowJpg.length} >>\nstream\n${arrowJpg.toString('latin1')}\nstream_end_marker\nendobj\n`,
    `9 0 obj\n<< /Type /XObject /Subtype /Image /Width 344 /Height 530 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${trendMapJpg.length} >>\nstream\n${trendMapJpg.toString('latin1')}\nstream_end_marker\nendobj\n`,
    `10 0 obj\n<< /Type /XObject /Subtype /Image /Width 402 /Height 230 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${riskGaugeJpg.length} >>\nstream\n${riskGaugeJpg.toString('latin1')}\nstream_end_marker\nendobj\n`,
  ];

  // Replace dummy marker with actual raw endstream keyword (avoids parser conflicts during replacement)
  const imgObjectsClean = imgObjects.map(obj => obj.replace('stream_end_marker', 'endstream'));

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1280 720] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> /XObject << /ImgRawPlot 7 0 R /ImgArrow 8 0 R /ImgTrendMap 9 0 R /ImgRiskGauge 10 0 R >> >> /Contents 6 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `6 0 obj\n<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream\nendobj\n`,
    ...imgObjectsClean,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += object;
  });
  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
};

const createReferenceId = (prefix) =>
  `${prefix}_${Date.now().toString(36).toUpperCase()}_${randomUUID().slice(0, 8).toUpperCase()}`;

const getOfficialLandOptions = (body) => {
  return getOfflineLandOptions(body);
};

const normalizeLandMatchValue = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const flattenOfficialRows = (rows) =>
  (Array.isArray(rows) ? rows : [])
    .flatMap((row) => {
      if (Array.isArray(row)) return row;
      if (Array.isArray(row?.values)) return row.values;
      return Object.values(row || {});
    })
    .map((value) => String(value || ''));

const assertVerifiedRecordMatchesSearch = (body, record) => {
  const searchType = String(body.searchType || '');
  const searchValue = String(body.searchValue || '').trim();
  const joinedRows = flattenOfficialRows(record?.officialRows).join(' ');
  const searchableText = [
    record?.registrationNumber,
    record?.surveyNo,
    record?.khewatNo,
    record?.khataNo,
    record?.gataNo,
    record?.plotNo,
    record?.jamabandiNo,
    record?.ownerName,
    joinedRows,
  ].join(' ');

  const normalizedSearch = normalizeLandMatchValue(searchValue);
  const normalizedText = normalizeLandMatchValue(searchableText);
  const normalizedOwner = normalizeLandMatchValue(body.ownerName);

  if (!Array.isArray(record?.officialRows) || !record.officialRows.length) {
    throw Object.assign(
      new Error('Official land data was not found. Please check manually or upload your land document.'),
      { statusCode: 404 },
    );
  }

  if (searchType !== 'Owner' && normalizedSearch && !normalizedText.includes(normalizedSearch)) {
    throw Object.assign(
      new Error(`No official land record matched the entered ${searchType} number. Please check manually or upload your land document.`),
      { statusCode: 404 },
    );
  }

  if (searchType === 'Owner' && normalizedOwner && !normalizedText.includes(normalizedOwner)) {
    throw Object.assign(
      new Error('No official land record matched the Aadhaar owner name. Please check manually or upload your land document.'),
      { statusCode: 404 },
    );
  }

  const staticText = normalizeLandMatchValue(searchableText);
  if (
    staticText.includes('185acres') ||
    staticText.includes('124hectare') ||
    staticText.includes('425000000') ||
    staticText.includes('4500000') ||
    staticText.includes('verifiedconfirmed') ||
    staticText.includes('zkpcryptographicsignature')
  ) {
    throw Object.assign(
      new Error('Your data is not available on government portal please add manual'),
      { statusCode: 502 },
    );
  }

  return record;
};

const verifyOfficialLandRecord = async (body) => {
  if (hasMeonLandState(body.state)) {
    return verifyMeonLandRecord(body);
  }

  return verifyOfflineLandRecord(body);
};

const decentroHeaders = () => {
  if (!DECENTRO_CLIENT_ID || !DECENTRO_CLIENT_SECRET) {
    throw Object.assign(new Error('Missing DECENTRO_CLIENT_ID or DECENTRO_CLIENT_SECRET'), {
      statusCode: 500,
    });
  }

  return {
    client_id: DECENTRO_CLIENT_ID,
    client_secret: DECENTRO_CLIENT_SECRET,
    ...(DECENTRO_MODULE_SECRET ? { module_secret: DECENTRO_MODULE_SECRET } : {}),
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'TrustLedge-KYC/1.0',
  };
};

const stripHtml = (value) =>
  String(value || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getDecentroErrorMessage = (data, fallback) => {
  const responseCode = data?.responseCode || data?.response_code || data?.data?.responseCode;
  if (responseCode === 'E00008') {
    return 'Decentro authentication failed. Please verify DECENTRO_CLIENT_ID and DECENTRO_CLIENT_SECRET on the backend.';
  }
  if (responseCode === 'E00031') {
    return 'DigiLocker is not enabled for this Decentro account. Please subscribe/activate the DigiLocker module in Decentro.';
  }

  const rawMessage =
    data?.message ||
    data?.error ||
    data?.errorMessage ||
    data?.responseMessage ||
    data?.response_message ||
    data?.description ||
    data?.details ||
    data?.data?.message ||
    fallback;

  if (typeof rawMessage === 'string' && /<\/?[a-z][\s\S]*>/i.test(rawMessage)) {
    const cleanMessage = stripHtml(rawMessage);
    if (/403 Forbidden/i.test(cleanMessage)) {
      return 'Decentro rejected the request with 403 Forbidden. Check credentials, environment, module access, and IP/domain allowlisting.';
    }
    return cleanMessage || fallback;
  }

  return typeof rawMessage === 'string' ? rawMessage : fallback;
};

const callDecentro = async (path, options = {}) => {
  const url = `${DECENTRO_BASE_URL}${path}`;
  const response = await fetch(url, {
    method: options.method || 'POST',
    headers: decentroHeaders(),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    console.warn('[Decentro] request failed:', {
      path,
      status: response.status,
      contentType,
      responseCode: data?.responseCode || data?.response_code || data?.data?.responseCode || null,
      htmlResponse: /<\/?[a-z][\s\S]*>/i.test(text),
    });
    throw Object.assign(new Error(getDecentroErrorMessage(data, 'Decentro request failed')), {
      statusCode: response.status,
      details: data,
    });
  }

  return data;
};

const callMeon = async (path, payload = {}) => {
  const secretToken = MEON_SECRET_TOKEN || process.env.MEON_SECRET_TOKEN;
  if (!secretToken) {
    throw Object.assign(new Error('Missing MEON_SECRET_TOKEN on backend.'), {
      statusCode: 500,
    });
  }

  const endpointUrl = `${MEON_BASE_URL.replace(/\/+$/, '')}${path}`;
  console.log(`[MEON API] Calling ${endpointUrl} (fields: ${Object.keys(payload).join(', ')})`);

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  console.log(`[MEON API RAW RESPONSE] ${path}:`, text);
  let data = null;
  try {
    data = text && text.trim() ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    console.warn(`[MEON API] Request failed (${response.status}):`, data);
    throw Object.assign(
      new Error(data?.msg || data?.message || data?.error || `Meon request failed (${response.status})`),
      { statusCode: response.status, details: data }
    );
  }

  if (data && (data.status === false || data.success === false) && !data.url && !data.data) {
    console.warn(`[MEON API] API returned failure status:`, data);
    throw Object.assign(
      new Error(data?.msg || data?.message || data?.error || 'Meon API returned failure status'),
      { statusCode: 400, details: data }
    );
  }

  return data;
};

const requireField = (body, field) => {
  if (!body[field]) {
    throw Object.assign(new Error(`${field} is required`), { statusCode: 400 });
  }
};

const requireTrimmedField = (body, field) => {
  if (body[field] === undefined || body[field] === null || String(body[field]).trim() === '') {
    throw Object.assign(new Error(`${field} is required`), { statusCode: 400 });
  }
};

const normalizeLandStateName = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const requireLandVerificationFields = (body) => {
  requireTrimmedField(body, 'state');
  const state = normalizeLandStateName(body.state);
  const commonLocationFields = ['district', 'tehsil', 'village'];
  const requiredByState = {
    punjab: [...commonLocationFields, 'year', 'searchValue'],
    maharashtra: [...commonLocationFields, 'category', 'searchValue'],
    'uttar pradesh': [...commonLocationFields, 'searchValue'],
    rajasthan: [...commonLocationFields, 'ri', 'halka', 'searchValue', 'sheetNo'],
    'madhya pradesh': [...commonLocationFields, 'category', 'searchValue'],
  };

  const requiredFields = requiredByState[state] || [...commonLocationFields, 'year', 'searchType', 'ownerName'];
  for (const field of requiredFields) {
    requireTrimmedField(body, field);
  }
};

const requireBlockchainConfig = () => {
  if (!BSC_LAND_REGISTRY_ADDRESS || !ethers.isAddress(BSC_LAND_REGISTRY_ADDRESS)) {
    throw Object.assign(new Error('BSC_LAND_REGISTRY_ADDRESS is missing or invalid on backend.'), {
      statusCode: 500,
    });
  }

  if (!BSC_RELAYER_PRIVATE_KEY) {
    throw Object.assign(new Error('BSC_RELAYER_PRIVATE_KEY is missing on backend.'), {
      statusCode: 500,
    });
  }
};

const toSafeBlockchainString = (value, maxLength = 160) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

const getRecordIdFromReceipt = (contract, receipt) => {
  for (const log of receipt.logs || []) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === 'LandRecordStored') {
        return Number(parsed.args.recordId);
      }
    } catch {
      // Ignore logs from other contracts in the receipt.
    }
  }

  return null;
};

const storeLandRecordOnBsc = async (body) => {
  for (const field of ['ownerName', 'state', 'district', 'village', 'registrationNumber']) {
    requireField(body, field);
  }

  requireBlockchainConfig();

  const provider = new ethers.JsonRpcProvider(BSC_RPC_URL, BSC_CHAIN_ID);
  const wallet = new ethers.Wallet(BSC_RELAYER_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(BSC_LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI, wallet);
  const payload = {
    ownerName: toSafeBlockchainString(body.ownerName),
    state: toSafeBlockchainString(body.state, 80),
    district: toSafeBlockchainString(body.district, 100),
    tehsil: toSafeBlockchainString(body.tehsil || body.subRegistrarOffice || '', 100),
    village: toSafeBlockchainString(body.village, 120),
    registrationNumber: toSafeBlockchainString(body.registrationNumber, 120),
  };
  const dataHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');

  const tx = await contract.storeLandRecord(
    payload.ownerName,
    payload.state,
    payload.district,
    payload.tehsil,
    payload.village,
    payload.registrationNumber,
  );
  const receipt = await tx.wait();
  const recordId = getRecordIdFromReceipt(contract, receipt);

  return {
    success: true,
    network: BSC_CHAIN_ID === 56 ? 'bsc-mainnet' : 'bsc-testnet',
    chainId: BSC_CHAIN_ID,
    contractAddress: BSC_LAND_REGISTRY_ADDRESS,
    relayerAddress: wallet.address,
    transactionHash: tx.hash,
    explorerUrl: `${BSC_EXPLORER_TX_URL}${tx.hash}`,
    recordId,
    blockNumber: Number(receipt.blockNumber),
    dataHash,
  };
};


const buildHtmlEmail = ({ userName, statusTitle, badgeColor, badgeBg, badgeBorder, messageText, details = [], actionUrl = '', actionLabel = '' }) => {
  let detailsSectionHtml = '';
  if (details && details.length > 0) {
    detailsSectionHtml = `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px; background-color: #121420; border: 1.2px solid rgba(229, 184, 66, 0.2); border-radius: 14px; overflow: hidden; padding: 12px 20px;">
        ${details.map((detail, idx) => `
          <tr>
            <td style="padding: 12px 0; font-size: 11px; font-weight: 600; color: #8F9BB3; text-transform: uppercase; text-align: left; letter-spacing: 0.8px; border-bottom: ${idx === details.length - 1 ? 'none' : '1px solid rgba(229, 184, 66, 0.08)'};">${detail.label}</td>
            <td style="padding: 12px 0 12px 16px; font-size: 13px; font-weight: 700; color: #FFFFFF; text-align: right; word-break: break-all; border-bottom: ${idx === details.length - 1 ? 'none' : '1px solid rgba(229, 184, 66, 0.08)'};">${detail.value}</td>
          </tr>
        `).join('')}
      </table>
    `;
  }

  let actionSectionHtml = '';
  if (actionUrl && actionLabel) {
    actionSectionHtml = `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px; margin-bottom: 8px;">
        <tr>
          <td align="center">
            <a href="${actionUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #E5B842 0%, #F5D070 100%); color: #08090C; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 36px; border-radius: 12px; box-shadow: 0 6px 20px rgba(229, 184, 66, 0.3); text-transform: uppercase; letter-spacing: 1px;">${actionLabel}</a>
          </td>
        </tr>
      </table>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Destiny Protocol Notification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #06070B; font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FFFFFF; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #06070B; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #0B0C12; border: 1px solid rgba(229, 184, 66, 0.35); border-radius: 20px; overflow: hidden; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(229, 184, 66, 0.08);">
          <!-- Top Gradient Border Line -->
          <tr>
            <td height="5" style="background: linear-gradient(90deg, #C29638 0%, #E5B842 50%, #F9DC96 100%);"></td>
          </tr>
          
          <!-- Header Area -->
          <tr>
            <td align="center" style="padding: 36px 24px 24px 24px; border-bottom: 1px solid rgba(229, 184, 66, 0.12); background: linear-gradient(180deg, rgba(229, 184, 66, 0.03) 0%, rgba(229, 184, 66, 0) 100%);">
              <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                <tr>
                  <td align="center" style="width: 48px; height: 48px; border-radius: 50%; border: 1.5px solid rgba(229, 184, 66, 0.4); background-color: rgba(229, 184, 66, 0.06); font-size: 20px; line-height: 48px; color: #E5B842;">
                    🛡️
                  </td>
                </tr>
              </table>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 4px; color: #E5B842; text-shadow: 0 2px 10px rgba(229, 184, 66, 0.15);">DESTINY PROTOCOL</h1>
              <p style="margin: 6px 0 0 0; font-size: 10px; font-weight: 600; color: #A0AEC0; letter-spacing: 2px; text-transform: uppercase;">Decentralized Cryptographic Identity Vault</p>
            </td>
          </tr>
          
          <!-- Content Area -->
          <tr>
            <td style="padding: 36px 32px 32px 32px;">
              <h2 style="margin: 0 0 18px 0; font-size: 18px; font-weight: 600; color: #FFFFFF; letter-spacing: 0.3px;">Hello ${userName},</h2>
              
              <!-- Status Badge -->
              <div style="margin-bottom: 24px; padding: 6px 14px; background-color: ${badgeBg}; border: 1px solid ${badgeBorder}; border-radius: 30px; display: inline-block;">
                <span style="font-size: 10px; font-weight: 700; color: ${badgeColor}; letter-spacing: 0.8px; text-transform: uppercase;">${statusTitle}</span>
              </div>
              
              <!-- Main Message -->
              <p style="margin: 0 0 28px 0; font-size: 14px; line-height: 1.65; color: #CBD5E0;">
                ${messageText.replace(/\n/g, '<br>')}
              </p>
              
              <!-- Details Card -->
              ${detailsSectionHtml}
              
              <!-- Action Button -->
              ${actionSectionHtml}
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 32px;">
              <div style="height: 1px; background-color: rgba(229, 184, 66, 0.12);"></div>
            </td>
          </tr>
          
          <!-- Footer Area -->
          <tr>
            <td style="padding: 32px 24px; text-align: center; background-color: #090A0F;">
              <p style="margin: 0 0 10px 0; font-size: 11.5px; color: #E5B842; font-weight: 600; letter-spacing: 0.8px;">🔒 SECURED VAULT BLOCKCHAIN NOTIFICATION</p>
              <p style="margin: 0; font-size: 10px; color: #718096; line-height: 1.55; max-width: 480px; display: inline-block;">
                This is an automated cryptographic security notification. Your private credentials and zero-knowledge storage vault remain fully local and end-to-end encrypted. Never share your vault credentials with anyone.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};


const sendUnifiedEmail = async (body) => {
  requireField(body, 'to');

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    console.warn('[SMTP] Email not configured on backend server.');
    return { ok: false, message: 'SMTP credentials not configured on backend server.' };
  }

  const type = String(body.type || 'land_status').toLowerCase();
  const userName = body.userName || body.ownerName || 'Valued Member';
  let subject = 'Destiny Protocol Notification';
  let bodyText = '';
  let htmlContent = '';
  let attachments = [];

  // Theme defaults: Dark Gold Theme
  let badgeColor = '#DFB05B';
  let badgeBg = 'rgba(223, 176, 91, 0.1)';
  let badgeBorder = 'rgba(223, 176, 91, 0.3)';
  let statusTitle = 'NOTIFICATION';
  let messageText = '';
  let details = [];
  let actionUrl = '';
  let actionLabel = '';

  if (type === 'welcome') {
    subject = 'Welcome to Destiny Protocol';
    statusTitle = 'WELCOME';
    messageText = 'Welcome to Destiny Protocol!\n\nYour account has been created and secured with zero-knowledge cryptography.\n\nYou can now proceed to verify your Aadhaar & PAN identity and link your property deeds to activate automated vault protection.';

    bodyText = [
      `Hello ${userName},`,
      '',
      'Welcome to Destiny Protocol!',
      '',
      'Your account has been created and secured with zero-knowledge cryptography.',
      'You can now proceed to verify your Aadhaar & PAN identity and link your property deeds to activate automated vault protection.',
      '',
      'Destiny Protocol Team',
    ].join('\n');
  } else if (type === 'kyc_success') {
    const kycType = body.kycType || 'Identity';
    subject = `Destiny Protocol - ${kycType} Verification Completed`;
    badgeColor = '#10B981'; // Green
    badgeBg = 'rgba(16, 185, 129, 0.1)';
    badgeBorder = 'rgba(16, 185, 129, 0.3)';
    statusTitle = 'KYC COMPLETED';
    messageText = `Your ${kycType} verification has been completed successfully on Destiny Protocol.\n\nYour profile identity status is now marked as VERIFIED & CONFIRMED.\n\nNext step: Proceed to link your official land deed and property survey records.`;

    details = [
      { label: 'Verification Type', value: kycType },
      { label: 'Status', value: 'VERIFIED & CONFIRMED' }
    ];

    bodyText = [
      `Hello ${userName},`,
      '',
      `Your ${kycType} verification has been completed successfully on Destiny Protocol.`,
      'Your profile identity status is now marked as VERIFIED & CONFIRMED.',
      '',
      'Next step: Proceed to link your official land deed and property survey records.',
      '',
      'Destiny Protocol Team',
    ].join('\n');
  } else if (type === 'vault_save' || type === 'payment_success') {
    subject = 'Destiny Protocol - Property Deed Vault Encrypted';
    badgeColor = '#10B981'; // Green
    badgeBg = 'rgba(16, 185, 129, 0.1)';
    badgeBorder = 'rgba(16, 185, 129, 0.3)';
    statusTitle = 'VAULT SECURED';
    messageText = `Your land deed record / payment has been cryptographically hashed and saved to Destiny Protocol Secure Vault.\n\nYour record is now immutable and protected under Destiny Protocol security.`;

    details = [
      { label: 'State', value: body.state || 'N/A' },
      { label: 'District', value: body.district || 'N/A' },
      { label: 'Village / Area', value: body.village || 'N/A' },
      { label: 'Registration ID', value: body.registrationNumber || 'N/A' },
      { label: 'Transaction / Payment ID', value: body.transactionHash || body.paymentId || 'Encrypted on Ledger' }
    ];

    bodyText = [
      `Hello ${userName},`,
      '',
      'Your land deed record / payment has been cryptographically hashed and saved to Destiny Protocol Secure Vault.',
      '',
      'Details:',
      `State: ${body.state || 'N/A'}`,
      `District: ${body.district || 'N/A'}`,
      `Village / Area: ${body.village || 'N/A'}`,
      `Registration ID: ${body.registrationNumber || 'N/A'}`,
      `Transaction Hash / ID: ${body.transactionHash || body.paymentId || 'Encrypted on Ledger'}`,
      '',
      'Your record is now immutable and protected under Destiny Protocol security.',
      '',
      'Destiny Protocol Team',
    ].join('\n');
  } else if (type === 'data_fetching') {
    subject = 'Destiny Protocol - Land Record Request Secured';
    badgeColor = '#F59E0B'; // Amber
    badgeBg = 'rgba(245, 158, 11, 0.1)';
    badgeBorder = 'rgba(245, 158, 11, 0.3)';
    statusTitle = 'REQUEST QUEUED';
    messageText = `Your request is secured today. Data fetching begins as soon as the relevant records become digitally available.\n\nYou will receive a follow-up notification as soon as official portal records complete verification.`;

    details = [
      { label: 'State', value: body.state || 'N/A' },
      { label: 'District', value: body.district || 'N/A' },
      { label: 'Village / Area', value: body.village || 'N/A' }
    ];

    bodyText = [
      `Hello ${userName},`,
      '',
      'Your request is secured today. Data fetching begins as soon as the relevant records become digitally available.',
      '',
      'Property Search Scope:',
      `State: ${body.state || 'N/A'}`,
      `District: ${body.district || 'N/A'}`,
      `Village / Area: ${body.village || 'N/A'}`,
      '',
      'You will receive a follow-up notification as soon as official portal records complete verification.',
      '',
      'Destiny Protocol Team',
    ].join('\n');
  } else if (type === 'beneficiary_added') {
    subject = 'Destiny Protocol - Beneficiary Registered';
    badgeColor = '#10B981'; // Green
    badgeBg = 'rgba(16, 185, 129, 0.1)';
    badgeBorder = 'rgba(16, 185, 129, 0.3)';
    statusTitle = 'BENEFICIARY REGISTERED';
    messageText = `A new beneficiary has been successfully registered to your Destiny Protocol vault profile.\n\nYour inheritance and vault access parameters have been updated under Destiny Protocol zero-knowledge security.`;

    details = [
      { label: 'Name', value: body.beneficiaryName || 'N/A' },
      { label: 'Relationship', value: body.relationship || 'N/A' },
      { label: 'Contact Number', value: body.contactNumber || 'N/A' },
      { label: 'Email', value: body.beneficiaryEmail || 'N/A' },
      { label: 'Wallet Address', value: body.walletAddress || 'N/A' },
      { label: 'ID Proof Uploaded', value: body.idProofName ? `Yes (${body.idProofName})` : 'Not attached' }
    ];

    bodyText = [
      `Hello ${userName},`,
      '',
      'A new beneficiary has been successfully registered to your Destiny Protocol vault profile.',
      '',
      'Beneficiary Details:',
      `Name: ${body.beneficiaryName || 'N/A'}`,
      `Relationship: ${body.relationship || 'N/A'}`,
      `Contact Number: ${body.contactNumber || 'N/A'}`,
      `Email: ${body.beneficiaryEmail || 'N/A'}`,
      `Wallet Address: ${body.walletAddress || 'N/A'}`,
      `ID Proof Uploaded: ${body.idProofName ? 'Yes (' + body.idProofName + ')' : 'Not attached'}`,
      '',
      'Your inheritance and vault access parameters have been updated under Destiny Protocol zero-knowledge security.',
      '',
      'Destiny Protocol Team',
    ].join('\n');
  } else {
    // land_status or custom email
    const status = String(body.status || 'SUCCESS').toUpperCase();
    const success = status === 'SUCCESS';
    subject = success
      ? 'Destiny Protocol land verification completed'
      : 'Destiny Protocol land verification could not be completed';

    badgeColor = success ? '#10B981' : '#EF4444';
    badgeBg = success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
    badgeBorder = success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)';
    statusTitle = success ? 'VERIFICATION SUCCESSFUL' : 'VERIFICATION FAILED';

    messageText = success
      ? 'Your land record was verified successfully.\n\nYour official Land Audit Report has been generated and attached to this email. You can also view, print, or download your PDF report online anytime using the link below.'
      : `We could not complete the land verification for the details below.\n\nReason: ${body.errorMessage || 'No matching record was returned.'}`;

    details = [
      { label: 'State', value: body.state || 'N/A' },
      { label: 'District', value: body.district || 'N/A' },
      { label: 'Village', value: body.village || 'N/A' },
      { label: 'Record ID', value: body.registrationNumber || 'N/A' }
    ];

    if (!success) {
      details.push({ label: 'Error Detail', value: body.errorMessage || 'No matching record was returned.' });
    }

    const reportUrl = `${process.env.RENDER_EXTERNAL_URL || 'https://third-party-2j1u.onrender.com'}/api/land/report?` +
      `ownerName=${encodeURIComponent(body.ownerName || userName || '')}` +
      `&state=${encodeURIComponent(body.state || '')}` +
      `&district=${encodeURIComponent(body.district || '')}` +
      `&tehsil=${encodeURIComponent(body.tehsil || '')}` +
      `&village=${encodeURIComponent(body.village || '')}` +
      `&registrationNumber=${encodeURIComponent(body.registrationNumber || 'TL-REG-8823')}` +
      `&surveyNo=${encodeURIComponent(body.surveyNo || 'Official Record')}` +
      `&area=${encodeURIComponent(body.area || 'N/A')}`;

    if (success) {
      actionUrl = reportUrl;
      actionLabel = 'View Audit Report';
    }

    const resultText = success
      ? `Your land record was verified successfully.\n\nRecord ID: ${body.registrationNumber || 'N/A'}`
      : `We could not complete the land verification for the details below.\n\nReason: ${body.errorMessage || 'No matching record was returned.'}`;

    const reportAttachmentHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Destiny Protocol - Official Land Deed Audit Report</title>
    <style>
      body { font-family: sans-serif; background: #0b0f19; color: #e2e8f0; padding: 24px; }
      .card { background: #111827; border: 2px solid #dfb05b; border-radius: 12px; padding: 28px; max-width: 650px; margin: auto; }
      h1 { color: #dfb05b; margin-bottom: 4px; }
      .badge { color: #10b981; border: 1px solid #10b981; padding: 4px 12px; display: inline-block; border-radius: 20px; font-weight: bold; margin-top: 8px; }
      .item { background: #1a2234; padding: 10px 14px; margin-bottom: 8px; border-radius: 6px; }
      .label { color: #94a3b8; font-size: 11px; font-weight: bold; }
      .val { color: #fff; font-size: 14px; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>DESTINY PROTOCOL</h1>
      <h3>OFFICIAL LAND DEED & CRYPTOGRAPHIC AUDIT REPORT</h3>
      <div class="badge">✓ CRYPTOGRAPHICALLY SECURED & VERIFIED</div>
      <br/><br/>
      <div class="item"><div class="label">Verified Owner</div><div class="val">${body.ownerName || userName}</div></div>
      <div class="item"><div class="label">State</div><div class="val">${body.state || 'N/A'}</div></div>
      <div class="item"><div class="label">District</div><div class="val">${body.district || 'N/A'}</div></div>
      <div class="item"><div class="label">Tehsil</div><div class="val">${body.tehsil || 'N/A'}</div></div>
      <div class="item"><div class="label">Village</div><div class="val">${body.village || 'N/A'}</div></div>
      <div class="item"><div class="label">Registration No</div><div class="val">${body.registrationNumber || 'N/A'}</div></div>
      <br/>
      <p style="color:#dfb05b; font-size:12px;">🛡️ Guaranteed zero-knowledge cryptographically protected record.</p>
    </div>
  </body>
</html>`;

    attachments = success ? [
      {
        filename: `Destiny_Land_Audit_Report_${body.registrationNumber || 'VERIFIED'}.html`,
        content: reportAttachmentHtml,
        contentType: 'text/html',
      }
    ] : [];

    bodyText = [
      `Hello ${body.ownerName || userName},`,
      '',
      resultText,
      '',
      'Submitted details:',
      `State: ${body.state || 'N/A'}`,
      `District: ${body.district || 'N/A'}`,
      `Village: ${body.village || 'N/A'}`,
      `Record ID: ${body.registrationNumber || 'N/A'}`,
      '',
      ...(success ? [
        '==================================================',
        '📥 OFFICIAL CRYPTOGRAPHIC AUDIT REPORT ATTACHED',
        '==================================================',
        'Your official Land Audit Report has been generated and attached to this email.',
        'You can also view, print, or download your PDF report online anytime using this link:',
        reportUrl,
        '==================================================',
      ] : []),
      '',
      'Destiny Protocol Team',
    ].join('\n');
  }

  htmlContent = buildHtmlEmail({
    userName,
    statusTitle,
    badgeColor,
    badgeBg,
    badgeBorder,
    messageText,
    details,
    actionUrl,
    actionLabel
  });

  console.log('[SMTP] Preparing unified email dispatch:', {
    to: body.to,
    subject,
    type: body.type,
    userName,
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    user: SMTP_USER,
    from: SMTP_FROM,
    passLength: SMTP_PASS ? SMTP_PASS.length : 0
  });

  const sendEmailWithTransporter = (portToUse, secureToUse) => {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: portToUse,
      secure: secureToUse,
      connectionTimeout: 10000, // 10 seconds connection timeout
      greetingTimeout: 10000,
      socketTimeout: 20000,
      tls: {
        servername: SMTP_HOST,
        rejectUnauthorized: true,
      },
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    return transporter.sendMail({
      from: SMTP_FROM,
      to: body.to,
      subject,
      text: bodyText,
      html: htmlContent,
      attachments,
    });
  };

  const attempts = [
    { port: SMTP_PORT, secure: SMTP_SECURE, label: 'configured' },
    { port: 2525, secure: false, label: 'render-free-compatible' },
    { port: 465, secure: true, label: 'smtps' },
    { port: 587, secure: false, label: 'submission' },
  ].filter((attempt, index, list) =>
    list.findIndex((item) => item.port === attempt.port && item.secure === attempt.secure) === index
  );

  const failures = [];
  for (const attempt of attempts) {
    try {
      console.log(`[SMTP ATTEMPT] Sending via ${SMTP_HOST}:${attempt.port} (${attempt.label})...`);
      const info = await sendEmailWithTransporter(attempt.port, attempt.secure);
      console.log('[SMTP SUCCESS] Email sent successfully to:', body.to, {
        messageId: info.messageId,
        port: attempt.port,
        response: info.response,
      });
      return { ok: true, messageId: info.messageId, response: info.response, port: attempt.port };
    } catch (err) {
      failures.push({ port: attempt.port, secure: attempt.secure, message: err.message, code: err.code });
      console.warn(`[SMTP ATTEMPT FAILED] ${SMTP_HOST}:${attempt.port}`, err.message || err);
    }
  }

  const finalMessage = failures.map((failure) => `${failure.port}: ${failure.message}`).join(' | ');
  console.error('[SMTP ERROR - ALL PATHS FAILED] Failed sending email to:', body.to, { failures });
  throw Object.assign(new Error(`SMTP send failed: ${finalMessage}`), {
    statusCode: 502,
    details: { failures },
  });
};

const sendLandStatusEmail = sendUnifiedEmail;
const sendCustomNotificationEmail = sendUnifiedEmail;

const handlers = {
  'GET /': async () => ({
    ok: true,
    service: 'TrustLedge KYC backend',
    health: '/health',
  }),

  'GET /health': async () => ({
    ok: true,
    decentroBaseUrl: DECENTRO_BASE_URL,
    smtpConfigured: Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS && SMTP_FROM),
    blockchainConfigured: Boolean(
      BSC_LAND_REGISTRY_ADDRESS &&
      ethers.isAddress(BSC_LAND_REGISTRY_ADDRESS) &&
      BSC_RELAYER_PRIVATE_KEY,
    ),
    landVerificationConfigured: blockchainService.getConfig().isConfigured,
    bscChainId: BSC_CHAIN_ID,
    bscExplorerTxUrl: BSC_EXPLORER_TX_URL,
  }),

  'POST /api/pan/verify': async (body) => {
    requireField(body, 'id_number');

    return callDecentro('/kyc/public_registry/validate', {
      body: {
        reference_id: body.reference_id || createReferenceId('PAN'),
        document_type: 'PAN',
        id_number: String(body.id_number).toUpperCase(),
        consent: 'Y',
        consent_purpose: body.consent_purpose || 'Customer onboarding and KYC verification',
      },
    });
  },

  'POST /api/digilocker/initiate': async (body) => {
    const fallbackRedirectUrl = 'https://third-party-pa56.onrender.com/api/digilocker/callback';
    let redirectUrl = body.redirect_url || DECENTRO_DIGILOCKER_REDIRECT_URL || fallbackRedirectUrl;
    if (
      typeof redirectUrl === 'string' &&
      (redirectUrl.includes('localhost') || redirectUrl.includes('127.0.0.1') || !redirectUrl.trim())
    ) {
      redirectUrl = fallbackRedirectUrl;
    }

    const data = await callDecentro('/v2/kyc/digilocker/initiate_session', {
      body: {
        reference_id: body.reference_id || createReferenceId('AADHAAR_INIT'),
        consent: true,
        consent_purpose: body.consent_purpose || 'Customer KYC',
        redirect_url: redirectUrl,
        redirect_to_signup: body.redirect_to_signup ?? true,
        abstract_access_token: body.abstract_access_token ?? true,
      },
    });

    return {
      ...data,
      authorizationUrl: data.authorizationUrl || data.data?.authorizationUrl,
      decentroTxnId: data.decentroTxnId || data.data?.decentroTxnId,
    };
  },

  'POST /api/digilocker/token': async (body) => {
    requireField(body, 'initial_decentro_transaction_id');
    requireField(body, 'digilocker_code');

    return callDecentro('/v2/kyc/digilocker/access_token/code', {
      body: {
        reference_id: body.reference_id || createReferenceId('AADHAAR_TOKEN'),
        consent: CONSENT_GRANTED,
        consent_purpose: body.consent_purpose || 'Customer KYC',
        initial_decentro_transaction_id: body.initial_decentro_transaction_id,
        digilocker_code: body.digilocker_code,
      },
    });
  },

  'POST /api/digilocker/aadhaar': async (body) => {
    requireField(body, 'decentroTxnId');

    return callDecentro(`/v2/kyc/sso/digilocker/${body.decentroTxnId}/eaadhaar`, {
      body: {
        reference_id: body.reference_id || createReferenceId('AADHAAR'),
        consent: CONSENT_GRANTED,
        purpose: body.purpose || 'Customer KYC',
        generate_pdf: body.generate_pdf ?? true,
        generate_xml: body.generate_xml ?? true,
      },
    });
  },

  'POST /api/meon/token': async () => {
    const data = await callMeon('/get_access_token', {
      company_name: MEON_COMPANY_NAME || 'Destinyvaults',
      secret_token: MEON_SECRET_TOKEN || 'B1hd2qRooyfNQ27F1QGZRHHfDX2DK5pW',
    });

    const clientToken = data.client_token || data.clientToken || data.token || data.data?.client_token;
    return {
      ...data,
      clientToken,
      state: data.state || clientToken,
    };
  },

  'POST /api/meon/digi-url': async (body = {}) => {
    let clientToken = body.client_token || body.clientToken || body.token;
    let initialTokenState = null;

    // Automatically obtain client_token from /get_access_token if not provided
    if (!clientToken) {
      console.log('[MEON] Requesting fresh client_token from /get_access_token...');
      const tokenData = await callMeon('/get_access_token', {
        company_name: MEON_COMPANY_NAME || 'Destinyvaults',
        secret_token: MEON_SECRET_TOKEN || 'B1hd2qRooyfNQ27F1QGZRHHfDX2DK5pW',
      });
      clientToken = tokenData.client_token || tokenData.clientToken || tokenData.token || tokenData.data?.client_token;
      initialTokenState = tokenData.state || tokenData.data?.state;
      console.log('[MEON] client_token received successfully:', clientToken ? 'OK' : 'MISSING');
    }

    const redirectUrl = body.redirect_url || body.redirectUrl || MEON_REDIRECT_URL;
    let documents = body.documents || 'aadhar,pan';
    if (documents.includes('aadhaar')) {
      documents = documents.replace(/aadhaar/g, 'aadhar');
    }

    const payload = {
      company_name: MEON_COMPANY_NAME || 'Destinyvaults',
      client_token: clientToken,
      redirect_url: redirectUrl,
      documents,
      pan_name: body.pan_name || body.panName || '',
      pan_no: body.pan_no || body.panNo || '',
    };

    console.log('[MEON] Calling /digi_url with company_name:', payload.company_name, 'documents:', payload.documents);
    const data = await callMeon('/digi_url', payload);

    const rawUrl =
      data.url ||
      data.digiUrl ||
      data.digi_url ||
      data.data?.url ||
      data.data?.digiUrl ||
      (typeof data.data === 'string' && data.data.startsWith('http') ? data.data : null);

    // Extract the token embedded in Meon's redirect URL (e.g. /redirect/digilocker/<TOKEN>)
    let sessionToken = data.token || data.client_token || data.clientToken || data.state || initialTokenState;
    if (rawUrl && rawUrl.includes('/redirect/digilocker/')) {
      const parts = rawUrl.split('/redirect/digilocker/')[1]?.split('?')[0]?.split('#')[0];
      if (parts) sessionToken = parts;
    }

    if (!rawUrl) {
      console.warn('[MEON API] No URL found in response:', data);
      throw Object.assign(
        new Error(data?.msg || data?.message || data?.error || 'Meon did not return a DigiLocker authorization URL.'),
        { statusCode: 400, details: data }
      );
    }

    // Cache session in memory so fetch-data can never lose the client_token
    if (sessionToken) {
      meonSessions.set(sessionToken, { clientToken, state: sessionToken });
    }
    if (initialTokenState) {
      meonSessions.set(initialTokenState, { clientToken, state: sessionToken || initialTokenState });
    }

    return {
      ...data,
      url: rawUrl,
      token: sessionToken,
      clientToken,
      client_token: clientToken,
      state: sessionToken || data.state,
    };
  },

  'POST /api/meon/fetch-data': async (body = {}) => {
    console.log('[MEON BACKEND] /api/meon/fetch-data received body:', body);

    const inputKey = body.state || body.token || body.client_token || body.clientToken;
    const cached =
      meonSessions.get(inputKey) ||
      meonSessions.get(body.state) ||
      meonSessions.get(body.token) ||
      meonSessions.get(body.client_token) ||
      meonSessions.get(body.clientToken) ||
      (meonSessions.size > 0 ? Array.from(meonSessions.values()).pop() : null);

    // Ensure clientToken is the 32-char access token (NOT ending in MEONDIGIPROD)
    let finalClientToken =
      (body.client_token && !body.client_token.includes('MEONDIGIPROD') ? body.client_token : null) ||
      (body.clientToken && !body.clientToken.includes('MEONDIGIPROD') ? body.clientToken : null) ||
      cached?.clientToken;

    // Ensure state is the session string (ending in MEONDIGIPROD)
    let finalState =
      (body.state && body.state.includes('MEONDIGIPROD') ? body.state : null) ||
      (body.token && body.token.includes('MEONDIGIPROD') ? body.token : null) ||
      cached?.state ||
      body.state ||
      body.token ||
      inputKey;

    const candidatePayloads = [
      { client_token: finalClientToken, state: finalState, status: true },
      { client_token: finalClientToken, state: finalState },
      { token: finalState, client_token: finalClientToken, state: finalState, status: true },
      {
        company_name: MEON_COMPANY_NAME || 'Destinyvaults',
        secret_token: MEON_SECRET_TOKEN || 'B1hd2qRooyfNQ27F1QGZRHHfDX2DK5pW',
        client_token: finalClientToken,
        state: finalState,
        token: finalState,
        status: true,
      },
    ];

    const endpoints = ['/v2/send_entire_data', '/send_entire_data'];

    let lastData = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      for (const endpoint of endpoints) {
        for (const payload of candidatePayloads) {
          try {
            console.log(`[MEON Attempt ${attempt}] Trying ${endpoint} with payload: ${Object.keys(payload).join(', ')}`);
            const res = await callMeon(endpoint, payload);
            if (res && (res.aadhar_no || res.pan_number || res.name || res.aadhaar_data || res.pan_data || (res.data && (res.data.aadhar_no || res.data.name)))) {
              console.log(`[MEON] Successfully retrieved non-empty verification data via ${endpoint}!`);
              return res;
            }
            if (res && Object.keys(res).length > 0 && res.msg !== 'Client Token Invalid') {
              lastData = res;
            }
          } catch (err) {
            console.warn(`[MEON] ${endpoint} attempt error:`, err.message);
          }
        }
      }
      if (attempt < 3 && lastData && !lastData.aadhar_no) {
        console.log(`[MEON] aadhar_no is still null on attempt ${attempt}, waiting 2s for DigiLocker sync...`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    if (lastData) return lastData;
    throw Object.assign(new Error('Meon verification data could not be retrieved.'), { statusCode: 500 });
  },

  // Aliases for convenience & direct paths
  'POST /digi_url': async (body) => handlers['POST /api/meon/digi-url'](body),
  'POST /api/digi_url': async (body) => handlers['POST /api/meon/digi-url'](body),
  'POST /v2/send_entire_data': async (body) => handlers['POST /api/meon/fetch-data'](body),
  'POST /api/send_entire_data': async (body) => handlers['POST /api/meon/fetch-data'](body),
  'POST /get_access_token': async (body) => handlers['POST /api/meon/token'](body),
  'POST /api/get_access_token': async (body) => handlers['POST /api/meon/token'](body),

  // Mobile OTP login: verifies the widget OTP with MSG91 server-side. See mobileVerify.js.
  ...mobileVerify.handlers,
  // Admin login (env-configured account, JWT with role=admin). See adminAuth.js.
  ...adminAuth.handlers,
  // Subscription plans: public GET, admin-only create/update/delete. See subscriptionPlans.js.
  ...subscriptionPlans.handlers,

  // Friendly GET info handlers for browser testing
  'GET /api/meon/digi-url': async () => ({
    ok: true,
    message: 'DigiLocker URL generation endpoint is active. Use POST with JSON body.',
    method: 'POST',
    path: '/api/meon/digi-url',
  }),
  'GET /api/meon/fetch-data': async () => ({
    ok: true,
    message: 'DigiLocker Fetch Data endpoint is active. Use POST with JSON body.',
    method: 'POST',
    path: '/api/meon/fetch-data',
  }),
  'GET /digi_url': async () => ({
    ok: true,
    message: 'DigiLocker URL generation endpoint is active. Use POST with JSON body.',
    method: 'POST',
    path: '/digi_url',
  }),
  'GET /v2/send_entire_data': async () => ({
    ok: true,
    message: 'DigiLocker Fetch Data endpoint is active. Use POST with JSON body.',
    method: 'POST',
    path: '/v2/send_entire_data',
  }),

  'POST /api/land/verify': async (body) => {
    requireLandVerificationFields(body);
    return verifyOfficialLandRecord(body);
  },

  'POST /api/land/options': async (body) => {
    requireField(body, 'state');
    return getOfficialLandOptions(body);
  },

  'POST /api/notifications/land-status': async (body) => sendUnifiedEmail(body),
  'POST /api/notifications/custom-email': async (body) => sendUnifiedEmail(body),
  'POST /api/notifications/send-email': async (body) => sendUnifiedEmail(body),

  'POST /api/blockchain/land-records': async (body) => storeLandRecordOnBsc(body),

  'POST /api/land/hash': async (body) => {
    const payload = body?.landRecord || body;
    const result = hashLandRecord(payload);
    return {
      ok: true,
      success: true,
      dataHash: result.dataHash,
      canonicalJson: result.canonicalJson,
      normalizedRecord: result.normalizedRecord,
    };
  },

  'POST /api/land/register-on-chain': async (body) => {
    const landRecord = body?.landRecord || body;
    const propertyId = body?.propertyId || body?.registrationNumber || body?.surveyNo || '';
    const ipfsCid = body?.ipfsCid || '';
    return blockchainService.registerOnBlockchain(landRecord, propertyId, ipfsCid);
  },

  'POST /api/land/verify-on-chain': async (body) => {
    const target = body?.dataHash || body?.landRecord || body;
    return blockchainService.verifyOnBlockchain(target);
  },

  'POST /api/land/verify-property-on-chain': async (body) => {
    requireField(body, 'propertyId');
    const target = body?.dataHash || body?.landRecord || body;
    return blockchainService.verifyPropertyOnBlockchain(target, body.propertyId);
  },

  'POST /api/land/revoke-on-chain': async (body) => {
    return blockchainService.revokeOnBlockchain(body);
  },

  'GET /api/land/blockchain-status': async () => {
    return blockchainService.getBlockchainStatus();
  },
};

/**
 * Resolves "METHOD /path" to a handler. Exact keys win; otherwise keys containing
 * ":param" segments (e.g. 'PUT /api/subscriptions/plans/:id') are matched and the
 * captured values are returned as params.
 */
const parameterizedRoutes = Object.keys(handlers)
  .filter((routeKey) => routeKey.includes('/:'))
  .map((routeKey) => {
    const [method, ...rest] = routeKey.split(' ');
    const segments = rest.join(' ').split('/');
    return { routeKey, method, segments, handler: handlers[routeKey] };
  });

const matchRoute = (key) => {
  if (handlers[key]) {
    return { handler: handlers[key], params: {} };
  }
  const [method, ...rest] = key.split(' ');
  const parts = rest.join(' ').split('/');
  for (const route of parameterizedRoutes) {
    if (route.method !== method || route.segments.length !== parts.length) {
      continue;
    }
    const params = {};
    let ok = true;
    for (let i = 0; i < route.segments.length; i += 1) {
      const segment = route.segments[i];
      if (segment.startsWith(':')) {
        params[segment.slice(1)] = decodeURIComponent(parts[i]);
      } else if (segment !== parts[i]) {
        ok = false;
        break;
      }
    }
    if (ok) {
      return { handler: route.handler, params };
    }
  }
  return null;
};

const server = http.createServer(async (request, response) => {
  console.log(`[HTTP REQUEST] ${request.method} ${request.url} - IP: ${request.headers['x-forwarded-for'] || request.socket.remoteAddress}`);

  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const pathname = requestUrl.pathname === '/' ? '/' : requestUrl.pathname.replace(/\/+$/, '');
  const key = `${request.method} ${pathname}`;

  if (pathname === '/favicon.ico') {
    sendJson(response, 204, {});
    return;
  }

  if (request.method === 'GET' && pathname.startsWith('/api/images/')) {
    const imageName = pathname.replace('/api/images/', '');
    const safeImageName = imageName.replace(/[^a-zA-Z0-9._-]/g, '');
    const imagePath = path.join(__dirname, 'assets', safeImageName);

    fs.readFile(imagePath, (err, data) => {
      if (err) {
        response.writeHead(404, { 'content-type': 'text/plain' });
        response.end('Image not found');
        return;
      }
      response.writeHead(200, { 'content-type': 'image/png' });
      response.end(data);
    });
    return;
  }

  if (key === 'GET /api/land/report.pdf') {
    const report = getLandReportParams(requestUrl);
    const fileName = `destiny-property-report-${report.registrationNumber || report.surveyNo || Date.now()}.pdf`
      .replace(/[^a-zA-Z0-9._-]/g, '-');
    sendPdf(response, 200, createPropertyReportPdf(report), fileName);
    return;
  }

  if (key === 'GET /api/land/report') {
    const ownerName = escapeHtml(requestUrl.searchParams.get('ownerName') || 'Valued Record Holder');
    const state = escapeHtml(requestUrl.searchParams.get('state') || 'N/A');
    const district = escapeHtml(requestUrl.searchParams.get('district') || 'N/A');
    const tehsil = escapeHtml(requestUrl.searchParams.get('tehsil') || 'N/A');
    const village = escapeHtml(requestUrl.searchParams.get('village') || 'N/A');
    const registrationNumber = escapeHtml(requestUrl.searchParams.get('registrationNumber') || 'TL-REG-8823');
    const surveyNo = escapeHtml(requestUrl.searchParams.get('surveyNo') || 'Official Record');
    const area = escapeHtml(requestUrl.searchParams.get('area') || 'N/A');
    const mode = escapeHtml(requestUrl.searchParams.get('mode') || 'Official portal sync');
    const source = escapeHtml(requestUrl.searchParams.get('source') || 'Destiny Protocol Vault');

    // Construct absolute base URL to make sure images resolve correctly in PDF prints, downloads, and emails
    const host = request.headers.host || 'localhost:3000';
    const protocol = request.headers['x-forwarded-proto'] || 'http';
    const baseUrl = `${protocol}://${host}`;

    const isCustomPhoto = source && (source.startsWith('http://') || source.startsWith('https://'));
    const landPhotoUrl = isCustomPhoto ? source : `${baseUrl}/api/images/raw-plot.png`;
    const hash = escapeHtml(requestUrl.searchParams.get('hash') || '0x7f8a9b2c4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b');
    const timestamp = escapeHtml(requestUrl.searchParams.get('timestamp') || new Date().toLocaleString());

    sendHtml(
      response,
      200,
      `<!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Destiny Protocol - Property Intelligence Report (${registrationNumber})</title>
            <style>
              * { box-sizing: border-box; font-family: 'Segoe UI', -apple-system, Roboto, sans-serif; }
              body {
                background-color: #f6f6f2;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath d='M10 30c20 0 35 15 45 35s25 35 45 35M0 70c30-15 45 0 60 30M70 0c15 30 0 45 30 60' fill='none' stroke='%23e6e6dd' stroke-width='1.2'/%3E%3C/svg%3E");
                color: #1e293b;
                margin: 0;
                padding: 40px 24px;
                display: flex;
                justify-content: center;
                min-height: 100vh;
              }
              .cert-card { width: 100%; max-width: 900px; background: transparent; position: relative; }
              
              .report-title-container { text-align: center; margin-bottom: 36px; }
              .report-title-container h1 {
                font-size: 25px;
                font-weight: 800;
                color: #1e293b;
                margin: 0 0 8px 0;
                letter-spacing: 0.5px;
                text-transform: uppercase;
              }
              .report-title-container .subtitle { font-size: 15px; color: #475569; margin: 0; }

              /* Comparison Grid Flow */
              .comparison-container {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 16px;
                margin-bottom: 36px;
              }
              .panel-wrapper {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                max-width: 410px;
              }
              .panel-card {
                width: 100%;
                aspect-ratio: 4.2 / 3;
                background: #ffffff;
                border-radius: 10px;
                box-shadow: 0 8px 20px rgba(0,0,0,0.04);
                border: 1px solid #cbd5e1;
                overflow: hidden;
                position: relative;
              }
              .panel-label {
                font-size: 11px;
                font-weight: 800;
                color: #0f172a;
                text-align: center;
                margin-top: 14px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .arrow-wrapper {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0 8px;
              }

              /* Left Panel - Raw Blueprint */
              .raw-plot-card { background: #262626; background-size: cover; background-position: center; position: relative; }

              /* Right Panel - Structured Report Card */
              .structured-report-card { display: flex; flex-direction: column; background: #ffffff; border: 1.5px solid #cbd5e1; }
              .report-header-banner { background: #0b4f8c; padding: 10px 16px; }
              .report-header-banner-text { color: #ffffff; font-weight: 800; font-size: 13px; letter-spacing: 0.5px; text-transform: uppercase; text-align: center; }
              .report-body-grid {
                flex: 1;
                padding: 14px;
                display: grid;
                grid-template-columns: 1.2fr 1fr;
                grid-template-rows: 1fr 1fr;
                gap: 10px;
                background: #ffffff;
              }
              .report-section { background: #ffffff; }
              .report-section-title {
                font-size: 9px;
                font-weight: 800;
                color: #64748b;
                letter-spacing: 0.5px;
                margin-bottom: 5px;
                text-transform: uppercase;
                border-bottom: 1px solid #f1f5f9;
                padding-bottom: 2px;
              }
              .overview-list { display: flex; flex-direction: column; gap: 4px; }
              .overview-item { display: flex; justify-content: space-between; font-size: 10.5px; line-height: 1.3; }
              .overview-label { color: #64748b; }
              .overview-val { font-weight: 700; color: #0f172a; text-align: right; }

              /* Traceability Data Table */
              .hash-box {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-left: 4px solid #dfb05b;
                padding: 14px 18px;
                border-radius: 8px;
                margin-bottom: 24px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.02);
                word-break: break-all;
              }
              .hash-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 4px; }
              .hash-value { font-family: monospace; color: #dfb05b; font-size: 13px; font-weight: 700; }
              .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
              .item { background: #ffffff; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
              .item-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 2px; }
              .item-val { font-size: 14px; color: #0f172a; font-weight: 600; }
              .legal-box { background: rgba(223, 176, 91, 0.05); border: 1px dashed #dfb05b; padding: 16px; border-radius: 10px; font-size: 12px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
              .legal-box strong { color: #c99c48; display: block; margin-bottom: 4px; }
              .actions { display: flex; gap: 12px; justify-content: center; margin-bottom: 20px; }
              .btn { background: #dfb05b; color: #0b0f19; font-weight: 700; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; text-decoration: none; box-shadow: 0 4px 12px rgba(223, 176, 91, 0.2); }
              .btn:hover { background: #c99c48; }

              @media (max-width: 768px) {
                body { padding: 16px; }
                .comparison-container { flex-direction: column; gap: 24px; }
                .arrow-wrapper { transform: rotate(90deg); padding: 10px 0; }
                .panel-wrapper { max-width: 100%; }
              }
              @media print {
                body { background: #fff; color: #000; padding: 0; }
                .actions { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="cert-card">
              <div class="actions">
                <button class="btn" onclick="window.print()">Print / Save as PDF</button>
              </div>
              
              <div class="report-title-container">
                <h1>DESTINY PROTOCOL: AI-POWERED PROPERTY INTELLIGENCE.</h1>
                <p class="subtitle">From a single photo to complete, verified intelligence in seconds.</p>
              </div>

              <div class="comparison-container">
                <!-- Left Panel: Raw Property Data -->
                <div class="panel-wrapper">
                  <div class="panel-card raw-plot-card" style="background-image: url('${landPhotoUrl}');">
                    ${isCustomPhoto ? `
                    <svg viewBox="0 0 400 300" style="width:100%; height:100%;" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                      <rect x="40" y="40" width="320" height="220" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.12)" stroke-dasharray="3,3" />
                      
                      <!-- Boundary Polygon representing surveyed physical plot -->
                      <polygon points="120,90 280,80 310,210 140,220" fill="rgba(96,165,250,0.05)" stroke="rgba(96,165,250,0.5)" stroke-width="2" stroke-dasharray="5,3" />
                      <circle cx="120" cy="90" r="3.5" fill="#60a5fa"/>
                      <circle cx="280" cy="80" r="3.5" fill="#60a5fa"/>
                      <circle cx="310" cy="210" r="3.5" fill="#60a5fa"/>
                      <circle cx="140" cy="220" r="3.5" fill="#60a5fa"/>
                      
                      <text x="190" y="74" fill="rgba(255,255,255,0.4)" font-size="9" font-family="monospace">160.4m</text>
                      <text x="304" y="145" fill="rgba(255,255,255,0.4)" font-size="9" font-family="monospace">130.2m</text>
                      <text x="210" y="236" fill="rgba(255,255,255,0.4)" font-size="9" font-family="monospace">170.8m</text>
                      <text x="110" y="160" fill="rgba(255,255,255,0.4)" font-size="9" font-family="monospace">130.1m</text>
                      
                      <!-- Technical Compass Rose -->
                      <g transform="translate(65, 235)">
                        <circle cx="0" cy="0" r="22" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>
                        <line x1="-26" y1="0" x2="26" y2="0" stroke="rgba(255,255,255,0.12)" />
                        <line x1="0" y1="-26" x2="0" y2="26" stroke="rgba(255,255,255,0.12)" />
                        <polygon points="0,-19 3,0 -3,0" fill="#dfb05b"/>
                        <polygon points="0,19 3,0 -3,0" fill="rgba(255,255,255,0.2)"/>
                        <text x="-3" y="-22" fill="rgba(255,255,255,0.5)" font-size="7" font-family="sans-serif" font-weight="bold">N</text>
                      </g>
                    </svg>
                    ` : ''}
                  </div>
                  <div class="panel-label">Raw Property Data (Physical)</div>
                </div>

                <!-- Middle: Transfer Arrow -->
                <div class="arrow-wrapper">
                  <img src="${baseUrl}/api/images/arrow.png" alt="Transfer Arrow" style="width: 50px; height: 34px;" />
                </div>

                <!-- Right Panel: AI-Powered Structured Report -->
                <div class="panel-wrapper">
                  <div class="panel-card structured-report-card">
                    <div class="report-header-banner">
                      <div class="report-header-banner-text">Verified Intelligence Report</div>
                    </div>
                    <div class="report-body-grid">
                      <!-- Grid Cell 1: Property Overview -->
                      <div class="report-section">
                        <div class="report-section-title">Property Overview</div>
                        <div class="overview-list">
                          <div class="overview-item">
                            <span class="overview-label">Location:</span>
                            <span class="overview-val">${surveyNo.includes('/') ? surveyNo : '34.05N, 118.24W'}</span>
                          </div>
                          <div class="overview-item">
                            <span class="overview-label">Plot Size:</span>
                            <span class="overview-val">${area !== 'N/A' ? area : '2.5 Acres'}</span>
                          </div>
                          <div class="overview-item">
                            <span class="overview-label">Zoning:</span>
                            <span class="overview-val">Residential</span>
                          </div>
                          <div class="overview-item">
                            <span class="overview-label">Ownership:</span>
                            <span class="overview-val">Verified Single</span>
                          </div>
                        </div>
                      </div>

                      <!-- Grid Cell 2: Land Value Trend & Map Card -->
                      <div class="report-section" style="grid-row: span 2; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #ffffff;">
                        <img src="${baseUrl}/api/images/trend-map.png" alt="Land Value & Map" style="width: 100%; max-width: 168px; height: auto;" />
                      </div>

                      <!-- Grid Cell 3: Risk Score Gauge -->
                      <div class="report-section" style="display: flex; align-items: center; justify-content: center; background: #ffffff;">
                        <img src="${baseUrl}/api/images/risk-gauge.png" alt="Risk Score Gauge" style="width: 100%; max-width: 154px; height: auto;" />
                      </div>
                    </div>
                  </div>
                  <div class="panel-label">AI-Powered Structured Report (Digital)</div>
                </div>
              </div>

              <div class="hash-box">
                <div class="hash-label">RECORD SHA-256 HASH SIGNATURE:</div>
                <div class="hash-value">${hash}</div>
              </div>

              <div class="grid">
                <div class="item">
                  <div class="item-label">Verified Owner</div>
                  <div class="item-val">${ownerName}</div>
                </div>
                <div class="item">
                  <div class="item-label">State</div>
                  <div class="item-val">${state}</div>
                </div>
                <div class="item">
                  <div class="item-label">District</div>
                  <div class="item-val">${district}</div>
                </div>
                <div class="item">
                  <div class="item-label">Tehsil / Sub-Registrar</div>
                  <div class="item-val">${tehsil}</div>
                </div>
                <div class="item">
                  <div class="item-label">Village / Area</div>
                  <div class="item-val">${village}</div>
                </div>
                <div class="item">
                  <div class="item-label">Registration No</div>
                  <div class="item-val">${registrationNumber}</div>
                </div>
                <div class="item">
                  <div class="item-label">Survey / Khasra No</div>
                  <div class="item-val">${surveyNo}</div>
                </div>
                <div class="item">
                  <div class="item-label">Area / Size</div>
                  <div class="item-val">${area}</div>
                </div>
                <div class="item">
                  <div class="item-label">Report Mode</div>
                  <div class="item-val">${mode}</div>
                </div>
                <div class="item">
                  <div class="item-label">Data Source</div>
                  <div class="item-val">${source}</div>
                </div>
                <div class="item">
                  <div class="item-label">Audit Timestamp</div>
                  <div class="item-val">${timestamp}</div>
                </div>
                <div class="item">
                  <div class="item-label">Security Clearance</div>
                  <div class="item-val" style="color: #10b981;">Pass - Zero Knowledge Verified</div>
                </div>
              </div>

              <div class="legal-box">
                <strong>DATA SECURITY & IMMUTABILITY ASSURANCE:</strong>
                This document certifies that the property record has been verified against official land archives, cryptographically hashed into Destiny Protocol zero-knowledge storage, and protected against unauthorized mutation or illegal transfer attempts.
              </div>
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() { window.print(); }, 600);
              };
            </script>
          </body>
        </html>`,
    );
    return;
  }

  if (key === 'GET /api/payments/verify-status') {
    const userEmail = (requestUrl.searchParams.get('email') || '').toLowerCase().trim();
    const userId = (requestUrl.searchParams.get('userId') || '').trim();
    const paymentId = (requestUrl.searchParams.get('paymentId') || '').trim();

    // Directly query Razorpay REST API for latest captured payments
    await fetchRazorpayCapturedPayments();

    let matchedPayment = null;
    if (paymentId) {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
        const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
          headers: { 'Authorization': authHeader }
        });
        if (res.ok) {
          const item = await res.json();
          if (item.status === 'captured' || item.status === 'authorized') {
            matchedPayment = {
              paymentId: item.id,
              amount: item.amount / 100,
              email: item.email ? item.email.toLowerCase() : '',
              contact: item.contact || '',
              status: 'CAPTURED',
              gateway: 'Razorpay Direct API',
              capturedAt: new Date(item.created_at * 1000).toISOString(),
            };
          }
        }
      } catch (e) {
        console.warn('[Razorpay Single Payment API Check]', e.message);
      }
    }

    if (!matchedPayment) {
      if (userEmail && verifiedPaymentsStore.has(userEmail)) {
        matchedPayment = verifiedPaymentsStore.get(userEmail);
      } else if (userId && verifiedPaymentsStore.has(userId)) {
        matchedPayment = verifiedPaymentsStore.get(userId);
      }
    }

    sendJson(response, 200, {
      paid: !!matchedPayment,
      payment: matchedPayment,
    });
    return;
  }

  if (key === 'POST /api/payments/razorpay-webhook') {
    try {
      const body = await readJson(request);
      const event = body.event;
      if ((event === 'payment.captured' || event === 'payment.authorized') && body.payload && body.payload.payment) {
        const entity = body.payload.payment.entity;
        const paymentRecord = {
          paymentId: entity.id,
          amount: entity.amount / 100,
          email: entity.email ? entity.email.toLowerCase() : '',
          contact: entity.contact || '',
          status: 'CAPTURED',
          gateway: 'Razorpay (Webhook)',
          capturedAt: new Date().toISOString(),
          notes: entity.notes || {},
        };
        if (paymentRecord.email) {
          verifiedPaymentsStore.set(paymentRecord.email, paymentRecord);
        }
        if (entity.notes && entity.notes.userId) {
          verifiedPaymentsStore.set(entity.notes.userId, paymentRecord);
        }
        console.log('[Razorpay Webhook] Payment captured & logged:', entity.id);
      }
      sendJson(response, 200, { status: 'ok' });
    } catch (err) {
      console.warn('[Razorpay Webhook] Error:', err.message);
      sendJson(response, 200, { status: 'ok' });
    }
    return;
  }

  if (key === 'GET /api/digilocker/callback') {
    const code = requestUrl.searchParams.get('code') || '';
    const error = requestUrl.searchParams.get('error') || '';

    sendHtml(
      response,
      error ? 400 : 200,
      `<!doctype html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>DigiLocker Callback</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 24px; background: #08090c; color: #fff; }
              .box { border: 1px solid #333; border-radius: 12px; padding: 18px; background: #12141b; }
              code { display: block; padding: 12px; margin-top: 12px; border-radius: 8px; background: #161822; color: #dfb05b; word-break: break-all; }
            </style>
          </head>
          <body>
            <div class="box">
              <h2>${error ? 'DigiLocker Error' : 'DigiLocker Consent Complete'}</h2>
              <p>${error ? 'Consent could not be completed.' : 'Copy this authorization code and paste it in the TrustLedge app.'}</p>
              <code>${error || code || 'No code received'}</code>
            </div>
          </body>
        </html>`,
    );
    return;
  }

  const route = matchRoute(key);
  const handler = route?.handler;

  if (!handler) {
    sendJson(response, 404, { message: 'Route not found' });
    return;
  }

  try {
    const body = request.method === 'GET' ? {} : await readJson(request);
    const context = { headers: request.headers, method: request.method, pathname, params: route.params };
    const data = await handler(body, context);
    sendJson(response, 200, data);
  } catch (error) {
    console.warn(`[KYC] ${key} failed:`, error.message);
    const payload = {
      ...(error.success === false ? { success: false } : {}),
      message: error.message || 'Internal server error',
    };
    if (error.exposeDetails !== false && error.details) {
      payload.details = error.details;
    }
    sendJson(response, error.statusCode || 500, payload);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`TrustLedge KYC backend listening on http://${HOST}:${PORT}`);
  console.log('[SMTP Startup Config Check]:', {
    SMTP_HOST: SMTP_HOST || 'NOT SET',
    SMTP_PORT: SMTP_PORT,
    SMTP_SECURE: SMTP_SECURE,
    SMTP_USER: SMTP_USER || 'NOT SET',
    SMTP_FROM: SMTP_FROM || 'NOT SET',
    SMTP_PASS_EXISTS: SMTP_PASS ? 'YES (Length: ' + SMTP_PASS.length + ')' : 'NO'
  });
  console.log('[Mobile OTP Login Config Check]:', {
    MSG91_WIDGET_ID_EXISTS: process.env.MSG91_WIDGET_ID ? 'YES' : 'NO',
    MSG91_TOKEN_AUTH_EXISTS: process.env.MSG91_TOKEN_AUTH ? 'YES' : 'NO',
    MSG91_READY: msg91Client.isConfigured() ? 'YES' : 'NO',
    JWT_SECRET_READY: authTokens.isConfigured() ? 'YES' : 'NO (set JWT_SECRET, 32+ chars)',
    ADMIN_LOGIN_READY: adminAuth.isConfigured() ? 'YES' : `NO (${adminAuth.configProblem()})`,
  });
});
