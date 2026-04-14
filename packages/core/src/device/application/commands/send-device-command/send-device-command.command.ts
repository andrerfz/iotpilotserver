import {Command} from '@iotpilot/core/shared/domain/command';

export class SendDeviceCommand extends Command {
    constructor(
        public readonly deviceId: string,
        public readonly command: string,
        public readonly parameters?: Record<string, any>
    ) {
        super();
    }
}


