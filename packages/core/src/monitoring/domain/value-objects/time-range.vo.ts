import {ValueObject} from '@iotpilot/core/shared/domain/interfaces/value-object.interface';

export class TimeRange extends ValueObject {
    constructor(
        private readonly _startTime: Date,
        private readonly _endTime: Date
    ) {
        super();
        if (!_startTime) {
            throw new Error('Start time cannot be empty');
        }
        if (!_endTime) {
            throw new Error('End time cannot be empty');
        }
        if (_startTime > _endTime) {
            throw new Error('Start time cannot be after end time');
        }
    }

    get startTime(): Date {
        return new Date(this._startTime);
    }

    get endTime(): Date {
        return new Date(this._endTime);
    }

    getStartTime(): Date {
        return new Date(this._startTime);
    }

    getEndTime(): Date {
        return new Date(this._endTime);
    }

    getDurationInMilliseconds(): number {
        return this._endTime.getTime() - this._startTime.getTime();
    }

    getDurationInSeconds(): number {
        return this.getDurationInMilliseconds() / 1000;
    }

    getDurationInMinutes(): number {
        return this.getDurationInSeconds() / 60;
    }

    getDurationInHours(): number {
        return this.getDurationInMinutes() / 60;
    }

    includes(date: Date): boolean {
        return date >= this._startTime && date <= this._endTime;
    }

    overlaps(other: TimeRange): boolean {
        return (
            (this._startTime <= other.endTime && this._endTime >= other.startTime) ||
            (other.startTime <= this._endTime && other.endTime >= this._startTime)
        );
    }

    equals(other: ValueObject): boolean {
        return (
            other instanceof TimeRange &&
            this._startTime.getTime() === (other as TimeRange).startTime.getTime() &&
            this._endTime.getTime() === (other as TimeRange).endTime.getTime()
        );
    }

    static create(startTime: Date, endTime: Date): TimeRange {
        return new TimeRange(startTime, endTime);
    }

    static createFromDuration(startTime: Date, durationInMilliseconds: number): TimeRange {
        const endTime = new Date(startTime.getTime() + durationInMilliseconds);
        return new TimeRange(startTime, endTime);
    }

    static createLast24Hours(): TimeRange {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
        return new TimeRange(startTime, endTime);
    }

    static createLastHour(): TimeRange {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - 60 * 60 * 1000);
        return new TimeRange(startTime, endTime);
    }

    toString(): string {
        return `${this._startTime.toISOString()} - ${this._endTime.toISOString()}`;
    }
}