/**
 * Redis and Bull Queue Setup for Background Jobs
 */

import Queue from 'bull';
import config from '../config/index';

// Create Redis connection options
const redisOptions = {
  redis: {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
  },
};

// Job Queues
export const emailQueue = new Queue('email', redisOptions);
export const cleanupQueue = new Queue('cleanup', redisOptions);
export const notificationQueue = new Queue('notification', redisOptions);
export const analyticsQueue = new Queue('analytics', redisOptions);

// Job Types
export interface EmailJob {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

export interface CleanupJob {
  type: 'inactive_rooms' | 'old_messages' | 'orphaned_files';
  olderThan?: Date;
  roomId?: string;
}

export interface NotificationJob {
  userId: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  type: 'push' | 'email' | 'in_app';
}

export interface AnalyticsJob {
  event: string;
  userId?: string;
  roomId?: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

// Email Queue Processors
emailQueue.process('welcome', async (job) => {
  const { to, data } = job.data as EmailJob;
  console.log(`Sending welcome email to ${to}`);
  
  // TODO: Implement email sending logic
  // This would integrate with SendGrid, Mailgun, etc.
  
  return { sent: true, to };
});

emailQueue.process('room_invite', async (job) => {
  const { to, data } = job.data as EmailJob;
  console.log(`Sending room invite email to ${to}`);
  
  // TODO: Implement room invite email
  
  return { sent: true, to };
});

emailQueue.process('password_reset', async (job) => {
  const { to, data } = job.data as EmailJob;
  console.log(`Sending password reset email to ${to}`);
  
  // TODO: Implement password reset email
  
  return { sent: true, to };
});

// Cleanup Queue Processors
cleanupQueue.process('inactive_rooms', async (job) => {
  const { olderThan } = job.data as CleanupJob;
  console.log(`Cleaning up inactive rooms older than ${olderThan}`);
  
  // TODO: Implement room cleanup logic
  // - Mark rooms as inactive if no activity for X days
  // - Delete orphaned room data
  
  return { cleaned: 0 };
});

cleanupQueue.process('old_messages', async (job) => {
  const { olderThan } = job.data as CleanupJob;
  console.log(`Cleaning up old messages older than ${olderThan}`);
  
  // TODO: Implement message cleanup
  // - Archive old messages to cold storage
  // - Delete messages from inactive rooms
  
  return { archived: 0, deleted: 0 };
});

cleanupQueue.process('orphaned_files', async (job) => {
  console.log('Cleaning up orphaned files');
  
  // TODO: Implement file cleanup
  // - Find files not referenced by any messages
  // - Delete from FileFlow storage
  
  return { deleted: 0 };
});

// Notification Queue Processors
notificationQueue.process('push', async (job) => {
  const { userId, title, body, data } = job.data as NotificationJob;
  console.log(`Sending push notification to user ${userId}`);
  
  // TODO: Implement push notification logic
  // This would integrate with Firebase FCM, Apple Push, etc.
  
  return { sent: true, userId };
});

notificationQueue.process('in_app', async (job) => {
  const { userId, title, body, data } = job.data as NotificationJob;
  console.log(`Creating in-app notification for user ${userId}`);
  
  // TODO: Store notification in database for in-app display
  
  return { created: true, userId };
});

// Analytics Queue Processors
analyticsQueue.process('track_event', async (job) => {
  const { event, userId, roomId, data, timestamp } = job.data as AnalyticsJob;
  console.log(`Tracking event: ${event} for user ${userId}`);
  
  // TODO: Send to analytics service (Google Analytics, Mixpanel, etc.)
  
  return { tracked: true, event };
});

// Job Scheduling Functions
export const scheduleEmail = async (
  template: string,
  to: string,
  data: Record<string, unknown>,
  delay?: number
): Promise<void> => {
  const jobData: EmailJob = {
    to,
    subject: getEmailSubject(template, data),
    template,
    data,
  };

  const options = delay ? { delay } : {};
  await emailQueue.add(template, jobData, options);
};

export const scheduleCleanup = async (
  type: CleanupJob['type'],
  options: Partial<CleanupJob> = {}
): Promise<void> => {
  const jobData: CleanupJob = {
    type,
    ...options,
  };

  await cleanupQueue.add(type, jobData);
};

export const scheduleNotification = async (
  userId: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {},
  type: NotificationJob['type'] = 'in_app'
): Promise<void> => {
  const jobData: NotificationJob = {
    userId,
    title,
    body,
    data,
    type,
  };

  await notificationQueue.add(type, jobData);
};

export const trackEvent = async (
  event: string,
  data: Record<string, unknown> = {},
  userId?: string,
  roomId?: string
): Promise<void> => {
  const jobData: AnalyticsJob = {
    event,
    userId,
    roomId,
    data,
    timestamp: new Date(),
  };

  await analyticsQueue.add('track_event', jobData);
};

// Recurring Jobs Setup
export const setupRecurringJobs = (): void => {
  // Clean up inactive rooms daily at 2 AM
  cleanupQueue.add(
    'inactive_rooms',
    {
      type: 'inactive_rooms',
      olderThan: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    {
      repeat: { cron: '0 2 * * *' }, // Daily at 2 AM
      removeOnComplete: 5,
      removeOnFail: 10,
    }
  );

  // Clean up old messages weekly
  cleanupQueue.add(
    'old_messages',
    {
      type: 'old_messages',
      olderThan: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days
    },
    {
      repeat: { cron: '0 3 * * 0' }, // Weekly on Sunday at 3 AM
      removeOnComplete: 5,
      removeOnFail: 10,
    }
  );

  // Clean up orphaned files daily
  cleanupQueue.add(
    'orphaned_files',
    { type: 'orphaned_files' },
    {
      repeat: { cron: '0 4 * * *' }, // Daily at 4 AM
      removeOnComplete: 5,
      removeOnFail: 10,
    }
  );
};

// Error Handling
emailQueue.on('failed', (job, err) => {
  console.error(`Email job ${job.id} failed:`, err);
});

cleanupQueue.on('failed', (job, err) => {
  console.error(`Cleanup job ${job.id} failed:`, err);
});

notificationQueue.on('failed', (job, err) => {
  console.error(`Notification job ${job.id} failed:`, err);
});

analyticsQueue.on('failed', (job, err) => {
  console.error(`Analytics job ${job.id} failed:`, err);
});

// Completed job logging
emailQueue.on('completed', (job) => {
  console.log(`Email job ${job.id} completed`);
});

cleanupQueue.on('completed', (job) => {
  console.log(`Cleanup job ${job.id} completed`);
});

// Helper function to get email subjects
function getEmailSubject(template: string, data: Record<string, unknown>): string {
  const subjects: Record<string, string> = {
    welcome: 'Welcome to VoiceFlow!',
    room_invite: `You've been invited to join ${data.roomName || 'a room'} on VoiceFlow`,
    password_reset: 'Reset your VoiceFlow password',
  };

  return subjects[template] || 'VoiceFlow Notification';
}

export default {
  emailQueue,
  cleanupQueue,
  notificationQueue,
  analyticsQueue,
  scheduleEmail,
  scheduleCleanup,
  scheduleNotification,
  trackEvent,
  setupRecurringJobs,
};