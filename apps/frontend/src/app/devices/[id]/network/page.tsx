import DeviceNetworkPage from './DeviceNetworkPage';

export default function NetworkPageRoute({ params }: { params: { id: string } }) {
    return <DeviceNetworkPage params={params} />;
}
