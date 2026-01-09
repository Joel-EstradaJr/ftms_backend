import { prisma } from '@/lib/prisma';
import { google } from 'googleapis';

export type DriveUploadResult = { fileId: string; name?: string; mimeType?: string; size?: number };

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`Missing env ${name}`);
  return v;
}

export async function getOAuth2Client() {
  const clientId = getEnv('GOOGLE_CLIENT_ID');
  const clientSecret = getEnv('GOOGLE_CLIENT_SECRET');
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob';
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  // Load tokens from DB (single row approach with id='drive')
  let tokenRow = await (prisma as any).googleOAuthToken.findUnique({ where: { id: 'drive' } });
  if (!tokenRow) {
    // If not present, try to seed from env REFRESH TOKEN
    const refresh = process.env.GOOGLE_REFRESH_TOKEN;
    if (!refresh) throw new Error('No stored Google OAuth token and GOOGLE_REFRESH_TOKEN env not set');
    tokenRow = await (prisma as any).googleOAuthToken.create({ data: { id: 'drive', refresh_token: refresh } });
  }

  const tokens: any = {
    refresh_token: tokenRow.refresh_token,
  };
  if (tokenRow.access_token) tokens.access_token = tokenRow.access_token;
  if (tokenRow.expiry_date) tokens.expiry_date = new Date(tokenRow.expiry_date).getTime();
  if (tokenRow.scope) tokens.scope = tokenRow.scope;
  if (tokenRow.token_type) tokens.token_type = tokenRow.token_type;

  oauth2Client.setCredentials(tokens);

  // Auto-refresh hook: persist updated tokens
  oauth2Client.on('tokens', async (t: any) => {
    try {
      await (prisma as any).googleOAuthToken.update({
        where: { id: 'drive' },
        data: {
          access_token: t.access_token || null,
          scope: t.scope || null,
          token_type: t.token_type || null,
          expiry_date: t.expiry_date ? new Date(t.expiry_date) : null,
        }
      });
    } catch (e) {
      console.warn('[Drive] Failed to persist refreshed tokens', e);
    }
  });

  return oauth2Client;
}

export async function getDrive() {
  const auth = await getOAuth2Client();
  return google.drive({ version: 'v3', auth });
}

export async function uploadToDrive(params: { name: string; mimeType: string; buffer: Buffer; folderId?: string }): Promise<DriveUploadResult> {
  const drive = await getDrive();
  const folderId = params.folderId || getEnv('GOOGLE_DRIVE_REVENUE_FOLDER_ID');

  const res = await drive.files.create({
    requestBody: {
      name: params.name,
      parents: [folderId],
    },
    media: {
      mimeType: params.mimeType,
      body: Buffer.isBuffer(params.buffer) ? ReadableFromBuffer(params.buffer) : undefined as any,
    },
    fields: 'id, name, mimeType, size',
  } as any);
  const file = res.data as any;
  return { fileId: file.id, name: file.name, mimeType: file.mimeType, size: file.size ? Number(file.size) : undefined };
}

export async function deleteFromDrive(fileId: string) {
  const drive = await getDrive();
  await drive.files.delete({ fileId });
}

export async function getDriveFileMetadata(fileId: string) {
  const drive = await getDrive();
  const res = await drive.files.get({ fileId, fields: 'id, name, mimeType, size, webViewLink, webContentLink' });
  return res.data;
}

export async function downloadDriveFileBuffer(fileId: string): Promise<{ buffer: Buffer; mimeType?: string; name?: string }>{
  const drive = await getDrive();
  // First fetch metadata for headers
  const meta = await drive.files.get({ fileId, fields: 'id, name, mimeType' });
  const resp: any = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' } as any);
  const data: ArrayBuffer = resp.data as ArrayBuffer;
  const buffer = Buffer.from(data as any);
  return { buffer, mimeType: (meta.data as any).mimeType, name: (meta.data as any).name };
}

// Helper to convert Buffer to a Readable stream
function ReadableFromBuffer(buffer: Buffer) {
  const { Readable } = require('stream');
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}
