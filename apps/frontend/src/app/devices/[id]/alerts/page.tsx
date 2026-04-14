import DeviceAlertsPage from './DeviceAlertsPage';

interface PageProps {
    params: {
        id: string;
    };
}

export default function AlertsPage({ params }: PageProps) {
    return <DeviceAlertsPage params={params} />;
}
