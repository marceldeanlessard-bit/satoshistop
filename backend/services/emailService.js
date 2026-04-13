const nodemailer = require('nodemailer');
const logger = require('../middleware/logger');

/**
 * Email service configuration
 */

// Create transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Verify connection
transporter
  .verify()
  .then(() => logger.info('Email service configured and connected'))
  .catch((err) => logger.warn('Email service configuration failed:', err.message));

/**
 * Send verification email
 */
const sendVerificationEmail = async (email, magicLink) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px;">
          <h1 style="color: #333;">Verify Your Email</h1>
          <p>Click the link below to verify your email address and complete your registration:</p>
          <div style="margin: 30px 0;">
            <a href="${magicLink}" style="background-color: #ffd700; color: #000; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: bold; display: inline-block;">
              Verify Email
            </a>
          </div>
          <p style="color: #666; font-size: 12px;">Or copy and paste this link: ${magicLink}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">If you didn't create this account, please ignore this email.</p>
          <p style="color: #999; font-size: 12px;">© 2024 SatoshiStop. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: email,
      subject: 'Verify Your SatoshiStop Account',
      html: htmlContent,
    });
    logger.info(`Verification email sent to ${email}`);
  } catch (error) {
    logger.error('Failed to send verification email:', error);
    throw error;
  }
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (email, resetLink) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px;">
          <h1 style="color: #333;">Reset Your Password</h1>
          <p>We received a request to reset your password. Click the link below to set a new password:</p>
          <div style="margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #ffd700; color: #000; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #666; font-size: 12px;">This link expires in 1 hour.</p>
          <p style="color: #666; font-size: 12px;">Or copy and paste this link: ${resetLink}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">If you didn't request a password reset, please ignore this email.</p>
          <p style="color: #999; font-size: 12px;">© 2024 SatoshiStop. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: email,
      subject: 'Reset Your SatoshiStop Password',
      html: htmlContent,
    });
    logger.info(`Password reset email sent to ${email}`);
  } catch (error) {
    logger.error('Failed to send password reset email:', error);
    throw error;
  }
};

/**
 * Send order confirmation email
 */
const sendOrderConfirmationEmail = async (email, order, userName) => {
  const itemsHtml = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.productName}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px;">
          <h1 style="color: #333;">Order Confirmation</h1>
          <p>Hi ${userName},</p>
          <p>Your order #${order.orderNumber} has been confirmed!</p>
          
          <h3>Order Details:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f9f9f9;">
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Product</th>
                <th style="padding: 8px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
                <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="margin-top: 20px; text-align: right;">
            <p><strong>Subtotal:</strong> $${order.subtotal.toFixed(2)}</p>
            <p><strong>Shipping:</strong> $${order.shippingCost.toFixed(2)}</p>
            <p style="font-size: 18px;"><strong>Total:</strong> $${order.total.toFixed(2)}</p>
          </div>

          <h3>Shipping Address:</h3>
          <p>${order.shippingAddress}</p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p>You can track your order on your dashboard.</p>
          <p style="color: #999; font-size: 12px;">© 2024 SatoshiStop. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: email,
      subject: `Order Confirmation #${order.orderNumber}`,
      html: htmlContent,
    });
    logger.info(`Order confirmation email sent to ${email}`);
  } catch (error) {
    logger.error('Failed to send order confirmation email:', error);
    throw error;
  }
};

/**
 * Send seller notification email
 */
const sendSellerNotificationEmail = async (sellerEmail, notification) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px;">
          <h1 style="color: #333;">${notification.title || 'New Notification'}</h1>
          <p>${notification.message}</p>
          <div style="margin: 20px 0;">
            <a href="${notification.actionUrl || 'https://satoshi-stop.com'}" style="background-color: #ffd700; color: #000; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: bold; display: inline-block;">
              View Details
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">© 2024 SatoshiStop. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: sellerEmail,
      subject: notification.title || 'SatoshiStop Notification',
      html: htmlContent,
    });
  } catch (error) {
    logger.error('Failed to send seller notification email:', error);
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendSellerNotificationEmail,
  transporter,
};
