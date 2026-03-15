/**
 * Main type definitions for the application
 */

// Example user type
export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Re-export other type modules
export * from './models';
export * from './api';