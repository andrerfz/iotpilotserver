import DeviceCommandsPage from './DeviceCommandsPage';

export default function CommandsPageRoute({ params }: { params: { id: string } }) {
    return <DeviceCommandsPage params={params} />;
}