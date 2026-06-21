import cron from 'node-cron';
import Invoice from '../models/Invoice';
import Settings from '../models/Settings';
import ReminderLog from '../models/ReminderLog';
import { generateInvoicePDF } from './pdfService';
import { sendEmail } from './emailService';
import { sendWhatsApp } from './whatsappService';
import { logger } from '../utils/logger';

const REMINDER_INTERVAL_DAYS = 7;

export function startReminderScheduler(): void {
  // Run every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    logger.info('⏰ Running invoice reminder scheduler...');
    await processReminders();
  });

  // Also mark overdue invoices
  cron.schedule('0 0 * * *', async () => {
    logger.info('⏰ Checking for overdue invoices...');
    await markOverdueInvoices();
  });

  logger.info('✅ Reminder scheduler started');
}

async function markOverdueInvoices(): Promise<void> {
  try {
    const result = await Invoice.updateMany(
      { status: 'pending', dueDate: { $lt: new Date() } },
      { status: 'overdue' }
    );
    if (result.modifiedCount > 0) {
      logger.info(`Marked ${result.modifiedCount} invoices as overdue`);
    }
  } catch (error) {
    logger.error('Error marking overdue invoices:', error);
  }
}

async function processReminders(): Promise<void> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - REMINDER_INTERVAL_DAYS);

    // Find pending invoices that haven't had a reminder in 7 days (or never)
    const invoices = await Invoice.find({
      status: { $in: ['pending', 'overdue'] },
      $or: [
        { lastReminderSent: { $exists: false } },
        { lastReminderSent: { $lte: sevenDaysAgo } },
      ],
    });

    logger.info(`Found ${invoices.length} invoices needing reminders`);

    for (const invoice of invoices) {
      try {
        const settings = await Settings.findOne({ userId: invoice.createdBy });
        if (!settings) continue;

        let emailSent = false;
        let whatsappSent = false;

        // Send email reminder
        if (settings.email?.smtpHost && settings.email?.smtpUser) {
          try {
            const pdfBuffer = await generateInvoicePDF(invoice, settings);
            await sendEmail(invoice, settings, pdfBuffer, 'reminder');
            emailSent = true;

            await ReminderLog.create({
              invoice: invoice._id,
              clientName: invoice.clientName,
              type: 'email',
              status: 'sent',
              message: `Reminder sent for invoice ${invoice.invoiceNumber}`,
            });
          } catch (emailError) {
            logger.error(`Email reminder failed for invoice ${invoice.invoiceNumber}:`, emailError);
            await ReminderLog.create({
              invoice: invoice._id,
              clientName: invoice.clientName,
              type: 'email',
              status: 'failed',
              error: String(emailError),
            });
          }
        }

        // Send WhatsApp reminder
        if (settings.whatsapp?.apiUrl && settings.whatsapp?.apiKey) {
          try {
            await sendWhatsApp(invoice, settings, 'reminder');
            whatsappSent = true;

            await ReminderLog.create({
              invoice: invoice._id,
              clientName: invoice.clientName,
              type: 'whatsapp',
              status: 'sent',
              message: `WhatsApp reminder sent for invoice ${invoice.invoiceNumber}`,
            });
          } catch (waError) {
            logger.error(`WhatsApp reminder failed for invoice ${invoice.invoiceNumber}:`, waError);
            await ReminderLog.create({
              invoice: invoice._id,
              clientName: invoice.clientName,
              type: 'whatsapp',
              status: 'failed',
              error: String(waError),
            });
          }
        }

        // Update last reminder sent timestamp
        if (emailSent || whatsappSent) {
          await Invoice.findByIdAndUpdate(invoice._id, {
            lastReminderSent: new Date(),
            $inc: { reminderCount: 1 },
          });
        }
      } catch (invoiceError) {
        logger.error(`Error processing reminder for invoice ${invoice._id}:`, invoiceError);
      }
    }

    logger.info('✅ Reminder processing complete');
  } catch (error) {
    logger.error('Error in processReminders:', error);
  }
}

// Export for manual triggering
export { processReminders, markOverdueInvoices };
