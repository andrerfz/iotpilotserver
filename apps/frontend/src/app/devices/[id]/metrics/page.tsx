import DeviceMetricsPage from './DeviceMetricsPage';

export default function MetricsPageRoute({ params }: { params: { id: string } }) {
    return <DeviceMetricsPage params={params} />;
}
