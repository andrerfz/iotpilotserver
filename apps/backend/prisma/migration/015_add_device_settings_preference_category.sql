-- Migration 015: Add DEVICE_SETTINGS to PreferenceCategory enum
ALTER TYPE "PreferenceCategory" ADD VALUE IF NOT EXISTS 'DEVICE_SETTINGS';
