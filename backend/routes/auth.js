const express = require('express');
const crypto = require('crypto');
const { ethers } = require('ethers');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const nodemailer = require('nodemailer');
const auth = require('../middleware/auth');
const { get, run } = require('../db');
const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const FACEBOOK_CLIENT_ID = process.env.FACEBOOK_CLIENT_ID || '';
const FACEBOOK_CLIENT_SECRET = process.env.FACEBOOK_CLIENT_SECRET || '';

const generateToken = () => crypto.randomBytes(24).toString('hex');
const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => ({
  salt,
  hash: crypto.scryptSync(password, salt, 64).toString('hex')
});
const verifyPassword = (password, salt, hash) => {
  return crypto.scryptSync(password, salt, 64).toString('hex') === hash;
};

const createSessionForUser = async (userId) => {
  const token = generateToken();
  const refreshToken = generateToken();
  const now = new Date().toISOString();
  const accessExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await run('INSERT INTO sessions (token, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)', [token, userId, now, accessExpiresAt]);
  await run('INSERT INTO refresh_tokens (token, userId, createdAt, expiresAt, revoked) VALUES (?, ?, ?, ?, 0)', [refreshToken, userId, now, refreshExpiresAt]);

  return { token, refreshToken, accessExpiresAt };
};

const findOrCreateUserByEmail = async (email, name = 'Satoshi User') => {
  const canonicalEmail = email.toLowerCase();
  let user = await get('SELECT * FROM users WHERE email = ?', [canonicalEmail]);
  if (!user) {
    const timestamp = new Date().toISOString();
    const id = `user-${crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(8).toString('hex')}`;
    await run(
      'INSERT INTO users (id, name, email, wallet, reputation, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, canonicalEmail, '', 80, timestamp]
    );
    user = await get('SELECT * FROM users WHERE id = ?', [id]);
  }
  return user;
};

const renderTokenRedirectPage = (token, refreshToken) => {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Authentication Complete</title></head><body><p>Authentication complete. Redirecting...</p><script>
    localStorage.setItem('satoshi_token', ${JSON.stringify(token)});
    localStorage.setItem('satoshi_refresh_token', ${JSON.stringify(refreshToken)});
    window.location = ${JSON.stringify(FRONTEND_URL)};
  </script></body></html>`;
};

const generateChallenge = ({ wallet, domain, nonce, issuedAt, expiresAt }) => {
  return `${domain} wants you to sign in with your Ethereum account:` +
    `\n${wallet}\n\n` +
    `Nonce: ${nonce}\n` +
    `Issued At: ${issuedAt}\n` +
    `Expiration Time: ${expiresAt}`;
};

const transporter = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
  : null;

const sendMagicLinkEmail = async (email, magicLink) => {
  if (!transporter) {
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@satoshi-stop.local',
    to: email,
    subject: 'Your Satoshi Stop magic login link',
    text: `Use this link to sign in:\n\n${magicLink}`,
    html: `<p>Use this link to sign in:</p><p><a href="${magicLink}">${magicLink}</a></p>`
  });
};

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: `${BASE_URL}/api/auth/oauth/google/callback`
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      const name = profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() || 'Google User';
      if (!email) {
        return done(new Error('Google profile did not include email')); 
      }
      const user = await findOrCreateUserByEmail(email, name);
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));
}

if (FACEBOOK_CLIENT_ID && FACEBOOK_CLIENT_SECRET) {
  passport.use(new FacebookStrategy({
    clientID: FACEBOOK_CLIENT_ID,
    clientSecret: FACEBOOK_CLIENT_SECRET,
    callbackURL: `${BASE_URL}/api/auth/oauth/facebook/callback`,
    profileFields: ['id', 'displayName', 'emails', 'name']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      const name = profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() || 'Facebook User';
      if (!email) {
        return done(new Error('Facebook profile did not include email')); 
      }
      const user = await findOrCreateUserByEmail(email, name);
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));
}

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));
router.use(passport.initialize());

router.post('/challenge', async (req, res, next) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress is required' });
    }

    const wallet = ethers.getAddress(walletAddress);
    const domain = req.headers.origin || req.headers.host || 'satoshi-stop';
    const nonce = crypto.randomBytes(16).toString('hex');
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const challenge = generateChallenge({ wallet, domain, nonce, issuedAt, expiresAt });

    await run(
      'INSERT INTO login_challenges (wallet, challenge, expiresAt) VALUES (?, ?, ?) ON CONFLICT(wallet) DO UPDATE SET challenge = excluded.challenge, expiresAt = excluded.expiresAt',
      [wallet, challenge, expiresAt]
    );

    res.json({ challenge, expiresAt, domain, nonce, issuedAt });
  } catch (err) {
    next(err);
  }
});

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existingUser = await get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const { hash, salt } = hashPassword(password);
    const timestamp = new Date().toISOString();
    const id = `user-${crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(8).toString('hex')}`;
    await run(
      'INSERT INTO users (id, name, email, wallet, reputation, createdAt, passwordHash, passwordSalt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name || 'Satoshi User', email.toLowerCase(), '', 80, timestamp, hash, salt]
    );

    const user = await get('SELECT * FROM users WHERE id = ?', [id]);
    const token = generateToken();
    const refreshToken = generateToken();
    const accessExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await run('INSERT INTO sessions (token, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)', [token, id, timestamp, accessExpiresAt]);
    await run('INSERT INTO refresh_tokens (token, userId, createdAt, expiresAt, revoked) VALUES (?, ?, ?, ?, 0)', [refreshToken, id, timestamp, refreshExpiresAt]);

    res.json({ user, token, refreshToken, expiresAt: accessExpiresAt });
  } catch (err) {
    next(err);
  }
});

router.post('/login/email', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const timestamp = new Date().toISOString();
    const token = generateToken();
    const refreshToken = generateToken();
    const accessExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await run('INSERT INTO sessions (token, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)', [token, user.id, timestamp, accessExpiresAt]);
    await run('INSERT INTO refresh_tokens (token, userId, createdAt, expiresAt, revoked) VALUES (?, ?, ?, ?, 0)', [refreshToken, user.id, timestamp, refreshExpiresAt]);

    res.json({ user, token, refreshToken, expiresAt: accessExpiresAt });
  } catch (err) {
    next(err);
  }
});

router.post('/login/guest', async (req, res, next) => {
  try {
    const timestamp = new Date().toISOString();
    const id = `guest-${crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(8).toString('hex')}`;
    await run(
      'INSERT INTO users (id, name, email, wallet, reputation, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [id, `Guest ${id.slice(6)}`, '', '', 50, timestamp]
    );

    const { token, refreshToken, accessExpiresAt } = await createSessionForUser(id);
    const user = await get('SELECT * FROM users WHERE id = ?', [id]);
    res.json({ user, token, refreshToken, expiresAt: accessExpiresAt });
  } catch (err) {
    next(err);
  }
});

router.post('/magic-link', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required to send a magic link' });
    }

    const user = await findOrCreateUserByEmail(email, 'Magic Link User');
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const timestamp = new Date().toISOString();
    const magicLink = `${BASE_URL}/api/auth/login/magic?token=${token}`;

    await run(
      'INSERT INTO magic_links (token, userId, email, createdAt, expiresAt, used) VALUES (?, ?, ?, ?, ?, 0)',
      [token, user.id, email.toLowerCase(), timestamp, expiresAt]
    );

    await sendMagicLinkEmail(email, magicLink);

    res.json({ message: 'Magic link created', magicLink: transporter ? undefined : magicLink });
  } catch (err) {
    next(err);
  }
});

router.get('/login/magic', async (req, res, next) => {
  try {
    const token = req.query.token;
    if (!token) {
      return res.status(400).send('Magic token is required');
    }

    const link = await get('SELECT * FROM magic_links WHERE token = ?', [token]);
    if (!link || link.used || new Date(link.expiresAt) < new Date()) {
      return res.status(400).send('Magic link is invalid or expired');
    }

    await run('UPDATE magic_links SET used = 1 WHERE token = ?', [token]);
    const session = await createSessionForUser(link.userId);
    res.send(renderTokenRedirectPage(session.token, session.refreshToken));
  } catch (err) {
    next(err);
  }
});

router.post('/login/magic', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Magic token is required' });
    }

    const link = await get('SELECT * FROM magic_links WHERE token = ?', [token]);
    if (!link || link.used || new Date(link.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'Magic link is invalid or expired' });
    }

    await run('UPDATE magic_links SET used = 1 WHERE token = ?', [token]);
    const { token: accessToken, refreshToken, accessExpiresAt } = await createSessionForUser(link.userId);
    const user = await get('SELECT * FROM users WHERE id = ?', [link.userId]);
    res.json({ user, token: accessToken, refreshToken, expiresAt: accessExpiresAt });
  } catch (err) {
    next(err);
  }
});

router.get('/oauth/google', (req, res, next) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(501).json({ error: 'Google OAuth is not configured' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/oauth/google/callback', passport.authenticate('google', { failureRedirect: `${FRONTEND_URL}/?authFailed=google` }), async (req, res, next) => {
  try {
    const user = req.user;
    const session = await createSessionForUser(user.id);
    res.send(renderTokenRedirectPage(session.token, session.refreshToken));
  } catch (err) {
    next(err);
  }
});

router.get('/oauth/facebook', (req, res, next) => {
  if (!FACEBOOK_CLIENT_ID || !FACEBOOK_CLIENT_SECRET) {
    return res.status(501).json({ error: 'Facebook OAuth is not configured' });
  }
  passport.authenticate('facebook', { scope: ['email'] })(req, res, next);
});

router.get('/oauth/facebook/callback', passport.authenticate('facebook', { failureRedirect: `${FRONTEND_URL}/?authFailed=facebook` }), async (req, res, next) => {
  try {
    const user = req.user;
    const session = await createSessionForUser(user.id);
    res.send(renderTokenRedirectPage(session.token, session.refreshToken));
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { walletAddress, signature } = req.body;
    if (!walletAddress || !signature) {
      return res.status(400).json({ error: 'walletAddress and signature are required' });
    }

    const wallet = ethers.getAddress(walletAddress);
    const challengeRow = await get('SELECT * FROM login_challenges WHERE wallet = ?', [wallet]);

    if (!challengeRow) {
      return res.status(400).json({ error: 'Challenge not found. Please request a new challenge.' });
    }

    if (new Date(challengeRow.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'Challenge expired. Please request a new challenge.' });
    }

    let signer;
    try {
      signer = ethers.verifyMessage(challengeRow.challenge, signature);
    } catch (verificationError) {
      return res.status(400).json({ error: 'Signature verification failed' });
    }

    if (ethers.getAddress(signer) !== wallet) {
      return res.status(400).json({ error: 'Signature does not match wallet address' });
    }

    let user = await get('SELECT * FROM users WHERE wallet = ?', [wallet]);
    const timestamp = new Date().toISOString();

    if (!user) {
      const id = `user-${crypto.randomUUID ? crypto.randomUUID() : wallet.slice(2, 10)}`;
      await run(
        'INSERT INTO users (id, name, email, wallet, reputation, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [id, 'Satoshi Collector', '', wallet, 96, timestamp]
      );
      user = await get('SELECT * FROM users WHERE id = ?', [id]);
    }

    const token = generateToken();
    const refreshToken = generateToken();
    const accessExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await run('INSERT INTO sessions (token, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)', [token, user.id, timestamp, accessExpiresAt]);
    await run('INSERT INTO refresh_tokens (token, userId, createdAt, expiresAt, revoked) VALUES (?, ?, ?, ?, 0)', [refreshToken, user.id, timestamp, refreshExpiresAt]);
    await run('DELETE FROM login_challenges WHERE wallet = ?', [wallet]);

    res.json({ user, token, refreshToken, expiresAt: accessExpiresAt });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken is required' });
    }

    const tokenRow = await get('SELECT * FROM refresh_tokens WHERE token = ?', [refreshToken]);
    if (!tokenRow || tokenRow.revoked) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    if (new Date(tokenRow.expiresAt) < new Date()) {
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    const user = await get('SELECT * FROM users WHERE id = ?', [tokenRow.userId]);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const newAccessToken = generateToken();
    const newRefreshToken = generateToken();
    const now = new Date().toISOString();
    const accessExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await run('UPDATE refresh_tokens SET revoked = 1 WHERE token = ?', [refreshToken]);
    await run('INSERT INTO sessions (token, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)', [newAccessToken, user.id, now, accessExpiresAt]);
    await run('INSERT INTO refresh_tokens (token, userId, createdAt, expiresAt, revoked) VALUES (?, ?, ?, ?, 0)', [newRefreshToken, user.id, now, refreshExpiresAt]);

    res.json({ token: newAccessToken, refreshToken: newRefreshToken, expiresAt: accessExpiresAt });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const { refreshToken } = req.body || {};

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      await run('DELETE FROM sessions WHERE token = ?', [token]);
    }

    if (refreshToken) {
      await run('UPDATE refresh_tokens SET revoked = 1 WHERE token = ?', [refreshToken]);
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.post('/logout-all', auth.verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    await run('DELETE FROM sessions WHERE userId = ?', [userId]);
    await run('UPDATE refresh_tokens SET revoked = 1 WHERE userId = ?', [userId]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.get('/me', auth.verifyToken, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
