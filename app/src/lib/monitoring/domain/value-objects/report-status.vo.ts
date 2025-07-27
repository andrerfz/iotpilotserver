import {ValueObject} from '@/lib/shared/domain/interfaces/value-object.interface';

export type ReportStatusType = 'pending' | 'in_progress' | 'completed' | 'failed';

export class ReportStatus extends ValueObject {
    private static readonly VALID_STATUSES: ReportStatusType[] = ['pending', 'in_progress', 'completed', 'failed'];

    constructor(private readonly _value: ReportStatusType) {
        super();
        if (!_value) {
            throw new Error('Report status cannot be empty');
        }
        if (!ReportStatus.VALID_STATUSES.includes(_value)) {
            throw new Error(`Invalid report status: ${_value}. Valid values are: ${ReportStatus.VALID_STATUSES.join(', ')}`);
        }
    }

    get value(): ReportStatusType {
        return this._value;
    }

    getValue(): ReportStatusType {
        return this._value;
    }

    equals(other: ValueObject): boolean {
        return other instanceof ReportStatus && this._value === (other as ReportStatus).value;
    }

    static create(value: ReportStatusType): ReportStatus {
        return new ReportStatus(value);
    }

    isPending(): boolean {
        return this._value === 'pending';
    }

    isInProgress(): boolean {
        return this._value === 'in_progress';
    }

    isCompleted(): boolean {
        return this._value === 'completed';
    }

    isFailed(): boolean {
        return this._value === 'failed';
    }

    canTransitionTo(newStatus: ReportStatus): boolean {
        // Pending can transition to in_progress, completed, or failed
        if (this.isPending()) {
            return newStatus.isInProgress() || newStatus.isCompleted() || newStatus.isFailed();
        }
        
        // In progress can transition to completed or failed
        if (this.isInProgress()) {
            return newStatus.isCompleted() || newStatus.isFailed();
        }
        
        // Completed and failed are terminal states
        return false;
    }

    toString(): string {
        return this._value;
    }
}