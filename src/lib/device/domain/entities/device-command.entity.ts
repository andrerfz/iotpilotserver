class DeviceCommand {
  constructor(
    public readonly commandName: string,
    public readonly payload: Record<string, any>,
  ) {}
}

export {DeviceCommand};