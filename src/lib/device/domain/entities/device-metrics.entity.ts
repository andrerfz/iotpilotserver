class DeviceMetrics {
  constructor(
    public readonly cpuUsage: number,
    public readonly memoryUsage: number,
    public readonly networkStats: Record<string, string>,
  ) {}
}

export {DeviceMetrics};