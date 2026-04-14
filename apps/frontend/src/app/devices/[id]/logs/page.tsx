import DeviceLogsPage from './DeviceLogsPage';

export default function LogsPageRoute({ params }: { params: { id: string } }) {
    return <DeviceLogsPage params={params} />;
}
