import DeviceStoragePage from './DeviceStoragePage';

export default function StoragePageRoute({ params }: { params: { id: string } }) {
    return <DeviceStoragePage params={params} />;
}
